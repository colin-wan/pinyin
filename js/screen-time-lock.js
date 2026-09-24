/**
 * iPad 屏幕时间锁与 15 分钟激励控制引擎 (ScreenTimeLockController)
 * 核心机制：
 * 1. 学习时长必须 >= 15 分钟 (900秒，具备防挂机交互检测)
 * 2. 学习答题正确率必须 >= 90% (至少答满10道题确保真实学懂)
 * 3. 达标后自动解锁 15 分钟 iPad 屏幕时间奖励
 * 4. 15 分钟奖励倒计时归零后，自动恢复全屏锁定与响铃提醒
 * 5. 必须开始新一轮 15 分钟学习或由家长输入 4 位密码才能解除
 * 6. 支持 Apple Shortcuts (快捷指令) 与专注模式 URL Scheme 联动
 */

class ScreenTimeLockController {
  constructor() {
    this.storageKey = 'PINYIN_SCREEN_TIME_LOCK_V1';
    this.targetStudySeconds = 900; // 15 分钟 = 900 秒
    this.targetAccuracy = 90; // 90% 正确率
    this.minQuestions = 10; // 至少答10题以统计可信度
    this.rewardDurationSeconds = 900; // 15 分钟奖励时间

    this.state = this.loadState();

    this.lastInteractionTime = Date.now();
    this.trackerTimer = null;
    this.rewardTimer = null;
    this.pendingPinCallback = null;
    this.pendingPinCancelCallback = null;

    this.initInteractionListeners();
    this.startActiveTracker();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 如果上次处于奖励中，恢复时校准时间
        return Object.assign(this.getDefaultState(), parsed);
      }
    } catch (e) {
      console.warn('ScreenTime storage read error:', e);
    }
    return this.getDefaultState();
  }

  getDefaultState() {
    return {
      sessionStudySeconds: 0,
      sessionQuestionsAnswered: 0,
      sessionQuestionsCorrect: 0,
      isRewardUnlocked: false,
      isRewardActive: false,
      rewardRemainingSeconds: 900,
      isScreenRestricted: false,
      parentPin: '1234', // 默认家长管理密码
      shortcutName: '拼音奖励15分钟',
      enableShortcutTrigger: true,
      targetAccuracy: 90, // 家长可调整正确率门槛（默认 90%）
      lastSessionDate: new Date().toDateString()
    };
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.warn('ScreenTime storage save error:', e);
    }
  }

  initInteractionListeners() {
    const updateActivity = () => {
      this.lastInteractionTime = Date.now();
    };
    window.addEventListener('touchstart', updateActivity, { passive: true });
    window.addEventListener('click', updateActivity, { passive: true });
    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
  }

  getAccuracy() {
    if (this.state.sessionQuestionsAnswered === 0) return 0;
    return Math.round((this.state.sessionQuestionsCorrect / this.state.sessionQuestionsAnswered) * 100);
  }

  /**
   * 记录学生答题结果（测验、游戏、消消乐）
   * @param {boolean} isCorrect - 是否回答正确
   */
  recordAnswer(isCorrect) {
    this.state.sessionQuestionsAnswered += 1;
    if (isCorrect) {
      this.state.sessionQuestionsCorrect += 1;
    }
    this.checkUnlockConditions();
    this.updateStatusWidgets();
    this.saveState();
  }

  startActiveTracker() {
    if (this.trackerTimer) clearInterval(this.trackerTimer);
    this.trackerTimer = setInterval(() => {
      // 1. 如果当前处于全屏锁定状态，不计学习时间
      if (this.state.isScreenRestricted) {
        return;
      }

      // 2. 如果正在享受 15 分钟奖励时间，倒计时递减
      if (this.state.isRewardActive) {
        this.state.rewardRemainingSeconds -= 1;
        this.updateRewardWidget();

        // 奖励时间用尽！
        if (this.state.rewardRemainingSeconds <= 0) {
          this.triggerRewardExpiredLock();
        }
        this.saveState();
        return;
      }

      // 3. 学习时间累加：防挂机机制（如果超过60秒无任何点击交互，暂停计时）
      const isIdle = (Date.now() - this.lastInteractionTime) > 60000;
      if (!isIdle) {
        this.state.sessionStudySeconds += 1;
      }

      this.checkUnlockConditions();
      this.updateStatusWidgets();

      if (this.state.sessionStudySeconds % 15 === 0) {
        this.saveState();
      }
    }, 1000);
  }

  getTargetAccuracy() {
    return this.state.targetAccuracy || 90;
  }

  setTargetAccuracy(val) {
    const acc = parseInt(val, 10);
    if (!isNaN(acc) && acc >= 50 && acc <= 100) {
      this.state.targetAccuracy = acc;
      this.targetAccuracy = acc;
      this.saveState();
      this.checkUnlockConditions();
      this.updateStatusWidgets();
    }
  }

  checkUnlockConditions() {
    if (this.state.isRewardUnlocked || this.state.isRewardActive) return;

    const timeReached = this.state.sessionStudySeconds >= this.targetStudySeconds;
    const accuracy = this.getAccuracy();
    const reqAcc = this.getTargetAccuracy();
    const accuracyReached = accuracy >= reqAcc && this.state.sessionQuestionsAnswered >= this.minQuestions;

    if (timeReached && accuracyReached) {
      this.state.isRewardUnlocked = true;
      this.saveState();
      this.notifyRewardReady();
    }
  }

  notifyRewardReady() {
    this.updateStatusWidgets();
    if (window.audioEngine) {
      window.audioEngine.playScreenTimeRewardFanfare();
      setTimeout(() => {
        window.audioEngine.speak(`太棒啦！小勇士学习满15分钟，正确率达到${this.getTargetAccuracy()}%以上！15分钟iPad屏幕使用奖励已经解锁！`);
      }, 500);
    }
    // 弹出欢庆弹窗
    this.showRewardReadyModal();
  }

  /**
   * 学生主动点击领取 15 分钟奖励
   */
  claimReward() {
    if (!this.state.isRewardUnlocked) return;

    this.state.isRewardUnlocked = false;
    this.state.isRewardActive = true;
    this.state.rewardRemainingSeconds = this.rewardDurationSeconds;
    this.state.isScreenRestricted = false;
    this.saveState();

    if (window.audioEngine) {
      window.audioEngine.playScreenTimeRewardFanfare();
      window.audioEngine.speak('15分钟iPad屏幕使用奖励已开启！玩耍结束后会自动恢复锁定哦！');
    }

    // 如果开启了快捷指令联动，唤起快捷指令解锁 iPad 专注模式或打开特定App
    if (this.state.enableShortcutTrigger && this.state.shortcutName) {
      this.triggerShortcut(this.state.shortcutName);
    }

    this.hideRewardReadyModal();
    this.showFloatingRewardBadge();
    this.updateStatusWidgets();
  }

  /**
   * 15 分钟奖励到期：自动恢复锁定
   */
  triggerRewardExpiredLock() {
    this.state.isRewardActive = false;
    this.state.isRewardUnlocked = false;
    this.state.isScreenRestricted = true;
    this.state.rewardRemainingSeconds = 0;
    this.saveState();

    // 播放警报闹铃
    if (window.audioEngine) {
      window.audioEngine.playAlarmTimeout();
      setTimeout(() => {
        window.audioEngine.speak('小勇士，15分钟奖励时间已经到了！屏幕已恢复限制，请开始新一轮学习，或者请爸爸妈妈输入密码解锁！');
      }, 1000);
    }

    // 唤起快捷指令恢复 iPad 学习专注模式锁定
    if (this.state.enableShortcutTrigger && this.state.shortcutName) {
      this.triggerShortcut(`${this.state.shortcutName}恢复锁定`);
    }

    this.hideFloatingRewardBadge();
    this.showFullscreenLockModal();
  }

  /**
   * 开始新一轮 15 分钟学习（重置本轮时长与正确率计数器，解锁网页）
   */
  startNewStudySession() {
    this.state.sessionStudySeconds = 0;
    this.state.sessionQuestionsAnswered = 0;
    this.state.sessionQuestionsCorrect = 0;
    this.state.isRewardUnlocked = false;
    this.state.isRewardActive = false;
    this.state.isScreenRestricted = false;
    this.state.rewardRemainingSeconds = 900;
    this.saveState();

    this.hideFullscreenLockModal();
    this.updateStatusWidgets();

    if (window.audioEngine) {
      window.audioEngine.playSuccess();
      window.audioEngine.speak('新一轮拼音学习开始啦！满15分钟且正确率达到90%，可以再次解锁15分钟哦，加油！');
    }
  }

  /**
   * 家长通过 4 位密码解锁
   * @param {string} pin - 输入的密码
   */
  unlockByParentPin(pin) {
    if (pin === this.state.parentPin) {
      this.state.isScreenRestricted = false;
      this.saveState();
      this.hideFullscreenLockModal();

      const successCb = this.pendingPinCallback;
      this.hidePinKeypadModal(false);

      if (successCb) {
        try {
          successCb();
        } catch (e) {
          console.warn('PIN success callback error:', e);
        }
      } else {
        if (window.audioEngine) {
          window.audioEngine.playSuccess();
          window.audioEngine.speak('家长密码验证成功，屏幕限制已解除！');
        }
      }
      return true;
    }
    return false;
  }

  setParentPin(newPin) {
    if (/^\d{4}$/.test(newPin)) {
      this.state.parentPin = newPin;
      this.saveState();
      return true;
    }
    return false;
  }

  triggerShortcut(shortcutName) {
    try {
      const url = `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}`;
      // 通过隐藏 iframe 尝试触发 URL Scheme，不阻断网页流程
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 2000);
    } catch (e) {
      console.warn('Shortcut trigger failed:', e);
    }
  }

  // ==========================================
  // UI 渲染与状态条更新
  // ==========================================
  updateStatusWidgets() {
    // 1. 学习时长指示器
    const timeEl = document.getElementById('lock-study-time');
    const timeBar = document.getElementById('lock-study-bar');
    if (timeEl && timeBar) {
      const m = Math.floor(this.state.sessionStudySeconds / 60);
      const s = this.state.sessionStudySeconds % 60;
      const timeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      timeEl.innerText = `${timeStr} / 15:00`;

      const pct = Math.min(100, Math.round((this.state.sessionStudySeconds / this.targetStudySeconds) * 100));
      timeBar.style.width = `${pct}%`;
      if (pct >= 100) {
        timeBar.classList.replace('bg-amber-400', 'bg-emerald-500');
      } else {
        timeBar.classList.replace('bg-emerald-500', 'bg-amber-400');
      }
    }

    // 2. 正确率指示器
    const accEl = document.getElementById('lock-accuracy-val');
    const accBar = document.getElementById('lock-accuracy-bar');
    if (accEl && accBar) {
      const acc = this.getAccuracy();
      const count = this.state.sessionQuestionsAnswered;
      accEl.innerText = `${acc}% (${count}题)`;
      accBar.style.width = `${acc}%`;

      if (acc >= this.getTargetAccuracy() && count >= this.minQuestions) {
        accBar.classList.replace('bg-amber-400', 'bg-emerald-500');
      } else {
        accBar.classList.replace('bg-emerald-500', 'bg-amber-400');
      }
    }

    // 3. 屏幕奖励领取按钮
    const rewardBtn = document.getElementById('btn-claim-reward');
    if (rewardBtn) {
      if (this.state.isRewardUnlocked) {
        rewardBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-neutral-200', 'text-neutral-500');
        rewardBtn.classList.add('bg-gradient-to-r', 'from-emerald-500', 'to-teal-500', 'text-white', 'animate-bounce', 'shadow-lg');
        rewardBtn.innerHTML = `<span>🎁 领取 15 分钟 iPad 屏幕奖励！</span>`;
        rewardBtn.disabled = false;
      } else if (this.state.isRewardActive) {
        rewardBtn.classList.remove('animate-bounce');
        rewardBtn.classList.add('bg-emerald-600', 'text-white');
        const rm = Math.floor(this.state.rewardRemainingSeconds / 60);
        const rs = this.state.rewardRemainingSeconds % 60;
        rewardBtn.innerHTML = `<span>⏳ 奖励使用中: ${rm}:${rs.toString().padStart(2, '0')}</span>`;
        rewardBtn.disabled = true;
      } else {
        rewardBtn.classList.add('opacity-70', 'bg-amber-100', 'text-amber-800');
        rewardBtn.classList.remove('animate-bounce', 'from-emerald-500', 'to-teal-500', 'text-white', 'shadow-lg');
        const needMin = Math.max(0, 15 - Math.floor(this.state.sessionStudySeconds / 60));
        rewardBtn.innerHTML = `<span>🔒 奖15分钟 (还需学${needMin}分/正确率${this.getTargetAccuracy()}%)</span>`;
        rewardBtn.disabled = false;
      }
    }

    // 4. 同步页面各处正确率门槛选择器 (顶栏、家长看板首页、设置页)
    const curTargetStr = String(this.getTargetAccuracy());
    const topSelect = document.getElementById('top-target-accuracy-select');
    if (topSelect && topSelect.value !== curTargetStr) {
      topSelect.value = curTargetStr;
    }
    const statSelect = document.getElementById('parent-stat-accuracy-select');
    if (statSelect && statSelect.value !== curTargetStr) {
      statSelect.value = curTargetStr;
    }
    const settingsSelect = document.getElementById('parent-target-accuracy');
    if (settingsSelect && settingsSelect.value !== curTargetStr) {
      settingsSelect.value = curTargetStr;
    }

    // 检查是否显示锁定遮罩
    if (this.state.isScreenRestricted) {
      this.showFullscreenLockModal();
    }
  }

  updateRewardWidget() {
    const badgeTime = document.getElementById('floating-reward-timer');
    if (badgeTime) {
      const rm = Math.floor(this.state.rewardRemainingSeconds / 60);
      const rs = this.state.rewardRemainingSeconds % 60;
      badgeTime.innerText = `${rm.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
    }
  }

  showFloatingRewardBadge() {
    let badge = document.getElementById('floating-reward-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'floating-reward-badge';
      badge.className = 'fixed bottom-5 right-5 z-40 bg-white/95 border-4 border-emerald-400 p-3.5 rounded-3xl shadow-2xl flex items-center space-x-3 select-none backdrop-blur-md animate-fadeIn';
      badge.innerHTML = `
        <span class="text-3xl animate-spin">⏱️</span>
        <div>
          <div class="text-[11px] font-bold text-emerald-800">iPad 屏幕奖励剩余时间</div>
          <div id="floating-reward-timer" class="text-2xl font-black text-emerald-600 font-mono tracking-wider">15:00</div>
        </div>
      `;
      document.body.appendChild(badge);
    }
    badge.classList.remove('hidden');
  }

  hideFloatingRewardBadge() {
    const badge = document.getElementById('floating-reward-badge');
    if (badge) badge.classList.add('hidden');
  }

  showRewardReadyModal() {
    const modal = document.getElementById('modal-reward-ready');
    if (modal) modal.classList.remove('hidden');
  }

  hideRewardReadyModal() {
    const modal = document.getElementById('modal-reward-ready');
    if (modal) modal.classList.add('hidden');
  }

  showFullscreenLockModal() {
    const modal = document.getElementById('modal-screen-time-lock');
    if (modal) modal.classList.remove('hidden');
  }

  hideFullscreenLockModal() {
    const modal = document.getElementById('modal-screen-time-lock');
    if (modal) modal.classList.add('hidden');
  }

  /**
   * 触发密码验证弹窗并注册通过或取消回调
   * @param {object} options - { title, desc, onSuccess, onCancel }
   */
  requestParentPin({ title = '🔑 家长密码验证', desc = '请输入 4 位家长密码（默认 1234）', onSuccess = null, onCancel = null } = {}) {
    this.pendingPinCallback = onSuccess;
    this.pendingPinCancelCallback = onCancel;
    this.showPinKeypadModal(title, desc);
  }

  showPinKeypadModal(title = '🔑 家长密码验证', desc = '请输入 4 位家长密码（默认 1234）') {
    const modal = document.getElementById('modal-parent-pin-keypad');
    if (modal) {
      const titleEl = document.getElementById('pin-modal-title');
      if (titleEl) titleEl.innerText = title.replace(/^🔑\s*/, '');
      const descEl = document.getElementById('pin-modal-desc');
      if (descEl) descEl.innerText = desc;

      modal.classList.remove('hidden');
      this.currentPinInput = '';
      this.updatePinDotsDisplay();
    }
  }

  hidePinKeypadModal(isCancel = false) {
    const modal = document.getElementById('modal-parent-pin-keypad');
    if (modal) modal.classList.add('hidden');

    if (isCancel && this.pendingPinCancelCallback) {
      try {
        this.pendingPinCancelCallback();
      } catch (e) {
        console.warn('PIN cancel error:', e);
      }
    }

    this.pendingPinCallback = null;
    this.pendingPinCancelCallback = null;
    this.currentPinInput = '';
    this.updatePinDotsDisplay();
  }

  updatePinDotsDisplay() {
    const dots = document.querySelectorAll('.pin-digit-dot');
    dots.forEach((dot, idx) => {
      if (idx < (this.currentPinInput || '').length) {
        dot.classList.add('bg-sky-600', 'scale-110');
        dot.classList.remove('bg-neutral-200');
      } else {
        dot.classList.remove('bg-sky-600', 'scale-110');
        dot.classList.add('bg-neutral-200');
      }
    });
  }

  appendPinDigit(digit) {
    if ((this.currentPinInput || '').length < 4) {
      this.currentPinInput = (this.currentPinInput || '') + digit;
      this.updatePinDotsDisplay();

      if (this.currentPinInput.length === 4) {
        setTimeout(() => {
          const success = this.unlockByParentPin(this.currentPinInput);
          if (!success) {
            const keypad = document.getElementById('pin-keypad-box');
            if (keypad) {
              keypad.classList.add('animate-shake');
              setTimeout(() => keypad.classList.remove('animate-shake'), 500);
            }
            if (window.audioEngine) window.audioEngine.playGentleOops();
            this.currentPinInput = '';
            this.updatePinDotsDisplay();
          }
        }, 150);
      }
    }
  }

  deletePinDigit() {
    if (this.currentPinInput && this.currentPinInput.length > 0) {
      this.currentPinInput = this.currentPinInput.slice(0, -1);
      this.updatePinDotsDisplay();
    }
  }
}

// 挂载至全局
if (typeof window !== 'undefined') {
  window.screenTimeLock = new ScreenTimeLockController();
}
