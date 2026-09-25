/**
 * iPad 屏幕时间锁与 15 分钟激励控制引擎 (ScreenTimeLockController)
 * 核心机制：
 * 1. 学习时长必须 >= 15 分钟 (900秒，具备防挂机交互检测)
 * 2. 学习答题正确率必须 >= 90% (至少答满20道题确保真实学懂与统计样本量)
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
    this.minQuestions = 20; // 计算正确率与达标判定的题目数量不低于20题
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
      shortcutLockName: '拼音奖励15分钟恢复锁定',
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

      // 3. 学习时间累加：防挂机机制与防切屏后台挂机机制
      const isHidden = document.hidden || (window.antiCheat && !window.antiCheat.isTabActive);
      const isIdle = (Date.now() - this.lastInteractionTime) > 60000;
      if (!isIdle && !isHidden) {
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
    const questionsAnswered = this.state.sessionQuestionsAnswered || 0;
    const accuracyReached = accuracy >= reqAcc && questionsAnswered >= this.minQuestions;

    // 【防作弊核验】：如果作答平均思考时长低于 1.0 秒，判定为脚本或恶意盲选，不允许通过作弊手段解锁屏幕时间奖励
    let isCheatSuspicious = false;
    if (window.antiCheat && window.antiCheat.stats.totalAnswerCount >= 10) {
      const avgMs = window.antiCheat.stats.totalAnswerTimeMs / window.antiCheat.stats.totalAnswerCount;
      if (avgMs < 1000) {
        isCheatSuspicious = true;
      }
    }

    if (timeReached && accuracyReached && !isCheatSuspicious) {
      this.state.isRewardUnlocked = true;
      this.saveState();
      this.notifyRewardReady();
    }
  }

  notifyRewardReady() {
    this.updateStatusWidgets();
    if (window.audioEngine) {
      window.audioEngine.playScreenTimeRewardFanfare();
    }
    // 弹出欢庆弹窗
    this.showRewardReadyModal();
  }

  /**
   * 学生主动点击领取 15 分钟奖励
   */
  claimReward(force = false) {
    if (!this.state.isRewardUnlocked && !force) {
      this.state.isRewardUnlocked = true;
    }

    this.state.isRewardUnlocked = false;
    this.state.isRewardActive = true;
    this.state.rewardRemainingSeconds = this.rewardDurationSeconds;
    this.state.isScreenRestricted = false;
    this.saveState();

    if (window.audioEngine) {
      window.audioEngine.playScreenTimeRewardFanfare();
    }

    // 五彩纸屑庆祝
    if (window.celebrationFx) {
      window.celebrationFx.burst(window.innerWidth / 2, window.innerHeight / 2, 50);
    }

    // 伴学小精灵语音
    if (window.mascotPipi) {
      window.mascotPipi.speak('🎉 15分钟 iPad 奖励时间已开启！尽情享受吧！');
    }

    // 如果开启了快捷指令联动，唤起快捷指令解锁 iPad 专注模式或打开特定App
    if (this.state.enableShortcutTrigger && this.state.shortcutName) {
      this.triggerShortcut(this.state.shortcutName, 'unlock');
    }

    this.hideRewardReadyModal();
    this.hideRewardStatusModal();
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
    }

    // 唤起快捷指令恢复 iPad 学习专注模式锁定
    if (this.state.enableShortcutTrigger && this.state.shortcutName) {
      this.triggerShortcut(this.state.shortcutName, 'lock');
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

  /**
   * 触发 Apple Shortcuts (快捷指令) URL Scheme
   * 彻底摒弃被 iOS Safari 沙盒屏蔽的 iframe，采用原生 <a> 链接直接由用户手势链触发与 window.location.href 双重保障
   * @param {string} shortcutName - 快捷指令名称（如“拼音奖励15分钟”）
   * @param {string} action - 'unlock' (解除娱乐限制) 或 'lock' (恢复学习锁定)
   * @returns {{ url: string, targetName: string, action: string } | null}
   */
  triggerShortcut(shortcutName, action = 'unlock') {
    if (!this.state.enableShortcutTrigger) return null;
    let baseName = (shortcutName || this.state.shortcutName || '拼音奖励15分钟').trim();
    if (!baseName) return null;

    let targetName = baseName;
    if (action === 'lock') {
      if (this.state.shortcutLockName && this.state.shortcutLockName.trim()) {
        targetName = this.state.shortcutLockName.trim();
      } else if (!targetName.includes('恢复锁定') && !targetName.includes('锁定')) {
        targetName = `${baseName}恢复锁定`;
      }
    }

    const url = `shortcuts://run-shortcut?name=${encodeURIComponent(targetName)}&input=${encodeURIComponent(action)}`;

    try {
      // 1. 优先通过动态原生 <a> 标签触发，直接继承用户点击手势
      const a = document.createElement('a');
      a.href = url;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 400);

      // 2. 双重保障：若处于用户直接手势事件中，触发 location.href
      setTimeout(() => {
        try {
          if (!document.hidden && window.location.href.indexOf('shortcuts:') === -1) {
            window.location.href = url;
          }
        } catch (e) {}
      }, 100);

      return { url, targetName, action };
    } catch (e) {
      console.warn('Shortcut trigger failed:', e);
      try {
        window.location.href = url;
      } catch (err) {}
      return { url, targetName, action };
    }
  }

  /**
   * 直接在 iPad 上呼起打开快捷指令 App（用于家长首次配置或查看指令）
   */
  openShortcutsApp() {
    const url = 'shortcuts://';
    try {
      const a = document.createElement('a');
      a.href = url;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 400);
    } catch (e) {
      window.location.href = url;
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
      accEl.innerText = `${acc}% (${count}/${this.minQuestions}题)`;
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
      rewardBtn.disabled = false;
      rewardBtn.classList.add('cursor-pointer');
      if (this.state.isRewardUnlocked) {
        rewardBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-neutral-200', 'text-neutral-500', 'opacity-70', 'bg-amber-100', 'text-amber-800', 'bg-emerald-600');
        rewardBtn.classList.add('bg-gradient-to-r', 'from-emerald-500', 'to-teal-500', 'text-white', 'animate-bounce', 'shadow-lg');
        rewardBtn.innerHTML = `<span>🎁 领取 15 分钟 iPad 屏幕奖励！</span>`;
      } else if (this.state.isRewardActive) {
        rewardBtn.classList.remove('animate-bounce', 'from-emerald-500', 'to-teal-500', 'opacity-70', 'bg-amber-100', 'text-amber-800');
        rewardBtn.classList.add('bg-emerald-600', 'text-white', 'hover:bg-emerald-700');
        const rm = Math.floor(this.state.rewardRemainingSeconds / 60);
        const rs = this.state.rewardRemainingSeconds % 60;
        rewardBtn.innerHTML = `<span>⏳ 奖励使用中: ${rm}:${rs.toString().padStart(2, '0')}</span>`;
      } else {
        rewardBtn.classList.add('opacity-85', 'bg-amber-100', 'text-amber-900', 'hover:bg-amber-200');
        rewardBtn.classList.remove('animate-bounce', 'from-emerald-500', 'to-teal-500', 'text-white', 'shadow-lg', 'bg-emerald-600');
        const needMin = Math.max(0, 15 - Math.floor(this.state.sessionStudySeconds / 60));
        rewardBtn.innerHTML = `<span>🔒 奖15分钟 (需学满15分/正确率${this.getTargetAccuracy()}%)</span>`;
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
      badge.className = 'fixed bottom-5 right-5 z-40 bg-white/95 border-4 border-emerald-400 p-3.5 rounded-3xl shadow-2xl flex items-center space-x-3 select-none backdrop-blur-md animate-fadeIn cursor-pointer hover:scale-105 transition';
      badge.title = '点击查看奖励详情与家长设置';
      badge.innerHTML = `
        <span class="text-3xl animate-spin">⏱️</span>
        <div>
          <div class="text-[11px] font-bold text-emerald-800">iPad 屏幕奖励剩余时间</div>
          <div id="floating-reward-timer" class="text-2xl font-black text-emerald-600 font-mono tracking-wider">15:00</div>
        </div>
      `;
      badge.onclick = () => {
        this.showRewardStatusModal();
      };
      document.body.appendChild(badge);
    }
    badge.classList.remove('hidden');
  }

  hideFloatingRewardBadge() {
    const badge = document.getElementById('floating-reward-badge');
    if (badge) badge.classList.add('hidden');
  }

  /**
   * 弹出专为解决“点击领取无反应”精心设计的【iPad 屏幕时间奖励中心】弹窗
   * 无论未达标、已达标、或使用中，均有即时生动的可视化响应与操作入口
   */
  showRewardStatusModal() {
    let modal = document.getElementById('modal-reward-status-center');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-reward-status-center';
      modal.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none';
      document.body.appendChild(modal);
    }

    const studySeconds = this.state.sessionStudySeconds || 0;
    const studyMinutes = Math.floor(studySeconds / 60);
    const targetMinutes = Math.floor(this.targetStudySeconds / 60); // 15 分钟
    const minutesRemaining = Math.max(0, targetMinutes - studyMinutes);
    const timeProgress = Math.min(100, Math.round((studySeconds / this.targetStudySeconds) * 100));
    const timeReached = studySeconds >= this.targetStudySeconds;

    const accuracy = this.getAccuracy();
    const reqAccuracy = this.getTargetAccuracy();
    const questionsAnswered = this.state.sessionQuestionsAnswered || 0;
    const minQuestions = this.minQuestions; // 20 题
    const accuracyReached = accuracy >= reqAccuracy && questionsAnswered >= minQuestions;

    const isUnlocked = this.state.isRewardUnlocked || (timeReached && accuracyReached);
    const isActive = this.state.isRewardActive;

    if (isActive) {
      const rm = Math.floor(this.state.rewardRemainingSeconds / 60);
      const rs = this.state.rewardRemainingSeconds % 60;
      modal.innerHTML = `
        <div class="bg-gradient-to-b from-emerald-50 via-teal-50 to-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border-4 border-emerald-400 text-center space-y-4">
          <div class="text-6xl animate-bounce">⏱️ 🎮 🎈</div>
          <div>
            <span class="bg-emerald-500 text-white font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">
              iPad 奖励使用中
            </span>
            <h3 class="text-2xl font-black text-emerald-950 mt-2">15 分钟自由屏幕时间</h3>
            <p class="text-xs text-emerald-800 mt-1 font-medium">小勇士正在享受自由屏幕时间，玩耍结束后会自动提醒休息哦！</p>
          </div>

          <div class="bg-white/90 p-5 rounded-2xl border-2 border-emerald-200 shadow-inner flex flex-col items-center justify-center">
            <span class="text-xs text-neutral-500 font-bold mb-1">倒计时剩余</span>
            <div id="reward-modal-countdown" class="text-5xl font-black text-emerald-600 font-mono tracking-wider">
              ${rm.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}
            </div>
          </div>

          <div class="space-y-2 pt-2">
            <button id="btn-close-reward-status-modal" class="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold text-sm py-3 rounded-2xl shadow transition cursor-pointer">
              我知道啦，继续玩耍 ✨
            </button>
            <button id="btn-parent-end-reward" class="w-full bg-white hover:bg-neutral-100 active:scale-95 text-neutral-600 font-bold text-xs py-2 rounded-xl transition cursor-pointer border border-neutral-200">
              🔑 家长提前结束奖励并开始新学习
            </button>
          </div>
        </div>
      `;
    } else if (isUnlocked) {
      modal.innerHTML = `
        <div class="bg-gradient-to-b from-white via-amber-50 to-orange-50 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border-4 border-amber-400 text-center space-y-4">
          <div class="text-6xl animate-bounce">🎁 🏆 ⭐</div>
          <div>
            <span class="bg-amber-400 text-amber-950 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider">
              达标奖励已解锁
            </span>
            <h3 class="text-2xl font-black text-amber-950 mt-2">太棒啦！15分钟奖励已到手！</h3>
            <p class="text-xs sm:text-sm text-neutral-700 mt-1 font-bold leading-relaxed">
              小勇士本轮学满 15 分钟，且完成不少于 20 题、答题正确率达到 ${reqAccuracy}% 以上！现在可以尽情享受 15 分钟 iPad 屏幕使用奖励啦！
            </p>
          </div>

          <div class="bg-amber-100/70 p-3 rounded-2xl text-xs text-amber-900 font-extrabold flex items-center justify-center gap-1.5">
            <span>⏱️ 提示：点击领取后开始 15 分钟倒计时，到期后自动恢复锁定哦！</span>
          </div>

          <div class="space-y-2 pt-2">
            <button id="btn-claim-reward-now-action" class="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 active:scale-95 text-white font-black text-base py-3.5 rounded-2xl shadow-xl transition cursor-pointer">
              🎉 立即开启 15 分钟 iPad 奖励！
            </button>
            <button id="btn-close-reward-status-modal" class="w-full text-xs text-neutral-500 hover:text-neutral-700 py-1.5 cursor-pointer font-bold">
              稍后领取
            </button>
          </div>
        </div>
      `;
    } else {
      modal.innerHTML = `
        <div class="bg-gradient-to-b from-white via-amber-50 to-orange-50 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border-4 border-amber-400 text-left space-y-4">
          <div class="text-center">
            <div class="text-5xl mb-2 animate-bounce">🎁 🔒 ⏱️</div>
            <span class="bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs px-3 py-0.5 rounded-full">
              达成双项指标即可自动解锁
            </span>
            <h3 class="text-xl sm:text-2xl font-black text-amber-950 mt-1.5">15分钟 iPad 屏幕奖励进度</h3>
          </div>

          <div class="space-y-3 bg-white/90 p-4 rounded-2xl border border-amber-200 shadow-sm text-xs">
            <div>
              <div class="flex items-center justify-between font-bold mb-1.5">
                <span class="text-neutral-700 flex items-center gap-1">
                  <span>⏱️ 学习时长:</span>
                  <span class="text-amber-950 font-black">${studyMinutes} 分钟 / 15 分钟</span>
                </span>
                <span class="${timeReached ? 'text-emerald-600 bg-emerald-100' : 'text-amber-700 bg-amber-100'} font-extrabold px-2 py-0.5 rounded-full text-[11px]">
                  ${timeReached ? '✅ 时长已达标' : '⏳ 还差 ' + minutesRemaining + ' 分钟'}
                </span>
              </div>
              <div class="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                <div class="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-500" style="width: ${timeProgress}%"></div>
              </div>
            </div>

            <div class="pt-2 border-t border-neutral-100">
              <div class="flex items-center justify-between font-bold mb-1.5">
                <span class="text-neutral-700 flex items-center gap-1">
                  <span>🎯 答题正确率:</span>
                  <span class="text-amber-950 font-black">${accuracy}% (${questionsAnswered}/${minQuestions}题)</span>
                </span>
                <span class="${accuracyReached ? 'text-emerald-600 bg-emerald-100' : 'text-amber-700 bg-amber-100'} font-extrabold px-2 py-0.5 rounded-full text-[11px]">
                  ${accuracyReached ? '✅ 正确率已达标 (' + questionsAnswered + '题)' : '门槛 ≥ ' + reqAccuracy + '% (需满20题，当前' + questionsAnswered + '题)'}
                </span>
              </div>
              <div class="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                <div class="${accuracy >= reqAccuracy ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'} h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, accuracy)}%"></div>
              </div>
            </div>
          </div>

          <!-- 防作弊实时检测与家长监督卡片 -->
          <div class="bg-indigo-50/90 p-3.5 rounded-2xl border-2 border-indigo-200 text-xs space-y-1.5">
            <div class="flex items-center justify-between font-black text-indigo-950">
              <span class="flex items-center gap-1">
                <span>🛡️ 防作弊与真实学习检测</span>
              </span>
              <span class="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                ✓ 实时守护中
              </span>
            </div>
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-neutral-600 text-[11px] pt-1 border-t border-indigo-100">
              <div>🚫 乱点秒选拦截: <span class="font-extrabold text-amber-800">${window.antiCheat ? window.antiCheat.stats.spamBlocked : 0} 次</span></div>
              <div>☝️ 多指抢按拦截: <span class="font-extrabold text-amber-800">${window.antiCheat ? window.antiCheat.stats.multiTouchBlocked : 0} 次</span></div>
              <div>👀 切屏后台挂机: <span class="font-extrabold text-amber-800">${window.antiCheat ? window.antiCheat.stats.tabSwitchPaused : 0} 次</span></div>
              <div>⏱️ 平均答题思考: <span class="font-extrabold text-emerald-700">${window.antiCheat ? window.antiCheat.getAverageAnswerTimeStr() : '计算中'}</span></div>
            </div>
          </div>

          <div class="bg-amber-100/70 p-3 rounded-xl text-xs text-amber-950 font-bold text-center leading-relaxed">
            💪 小勇士加油！多做练习与游戏、认真答对题目，就能自动开启 15 分钟 iPad 屏幕奖励啦！
          </div>

          <div class="space-y-2 pt-1">
            <button id="btn-parent-manual-reward" class="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 active:scale-95 text-white font-black text-sm py-2.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer">
              <span>🔑 家长密码一键直接发放奖励</span>
            </button>
            <button id="btn-close-reward-status-modal" class="w-full bg-white hover:bg-neutral-100 active:scale-95 text-neutral-700 font-extrabold text-xs py-2 rounded-xl border border-neutral-200 transition cursor-pointer">
              我知道啦，继续去学习 💪
            </button>
          </div>
        </div>
      `;
    }

    modal.classList.remove('hidden');

    modal.querySelectorAll('#btn-close-reward-status-modal').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        this.hideRewardStatusModal();
      };
    });

    const claimNowBtn = modal.querySelector('#btn-claim-reward-now-action');
    if (claimNowBtn) {
      claimNowBtn.onclick = (e) => {
        e.preventDefault();
        this.claimReward(true);
      };
    }

    const manualRewardBtn = modal.querySelector('#btn-parent-manual-reward');
    if (manualRewardBtn) {
      manualRewardBtn.onclick = (e) => {
        e.preventDefault();
        this.hideRewardStatusModal();
        this.requestParentPin({
          title: '🔑 家长直接发放奖励',
          desc: '请输入 4 位家长密码（默认 1234），验证成功后将直接为孩子发放 15 分钟奖励！',
          onSuccess: () => {
            this.claimReward(true);
          }
        });
      };
    }

    const parentEndRewardBtn = modal.querySelector('#btn-parent-end-reward');
    if (parentEndRewardBtn) {
      parentEndRewardBtn.onclick = (e) => {
        e.preventDefault();
        this.hideRewardStatusModal();
        this.requestParentPin({
          title: '🔑 家长结束奖励',
          desc: '请输入 4 位家长密码（默认 1234），提前结束屏幕奖励并开始新一轮学习：',
          onSuccess: () => {
            this.state.isRewardActive = false;
            this.state.rewardRemainingSeconds = 0;
            this.saveState();
            this.hideFloatingRewardBadge();
            this.startNewStudySession();
          }
        });
      };
    }

    if (window.mascotPipi) {
      window.mascotPipi.playGiggleChime();
    }
  }

  hideRewardStatusModal() {
    const modal = document.getElementById('modal-reward-status-center');
    if (modal) modal.classList.add('hidden');
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
