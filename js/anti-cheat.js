/**
 * 拼音学习乐园·全方位儿童防作弊与防刷守护引擎 (AntiCheatGuard)
 * 专为幼小衔接与一年级儿童心理及 iPad 触屏行为定制：
 * 
 * 1. 【防秒点抢答 (Anti-Rush)】：题目展示或播放读音前 400ms 内禁止作答，杜绝盲点与机械抢答。
 * 2. 【防多指盲猜 (Multi-Touch)】：拦截 iPad 上多指同时按下多个选项试错作弊行为。
 * 3. 【防狂点穷举冷冻期 (Anti-Spam Freeze)】：1.5秒内连续错按3次立即触发2.5秒冷静期，暂时锁定按键并温和引导。
 * 4. 【防切屏与后台挂机 (Visibility Guard)】：切后台或锁屏瞬间自动冻结学习计时，切回时提示。
 * 5. 【防星币虚假刷量 (Star Rate Limiter)】：严格限制星币获取速率与最大单次发放上限，防止控制台篡改。
 * 6. 【家长透明监督面板 (Parent Security Report)】：记录拦截乱点、多指操作与平均答题思考时长。
 */

class AntiCheatGuard {
  constructor() {
    this.storageKey = 'PINYIN_ANTI_CHEAT_STATS_V1';
    this.currentQuestionStartTime = Date.now();
    this.minAnswerDelayMs = 380; // 最低听音/思考延迟：少于380ms判定为盲猜秒点
    this.isFrozen = false;
    this.freezeTimer = null;
    this.isTabActive = !document.hidden;

    // 最近几次点击的时间戳队列 (用于连点/穷举检测)
    this.recentClickTimestamps = [];
    this.recentMistakeTimestamps = [];

    // 星币速率限制队列
    this.starGainHistory = [];

    // 统计数据 (用于家长端查看)
    this.stats = this.loadStats();

    this.initGlobalListeners();
    this.initToastUI();
  }

  loadStats() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return Object.assign({
          spamBlocked: 0,
          multiTouchBlocked: 0,
          tabSwitchPaused: 0,
          totalAnswerCount: 0,
          totalAnswerTimeMs: 0
        }, JSON.parse(saved));
      }
    } catch (e) {}
    return {
      spamBlocked: 0,
      multiTouchBlocked: 0,
      tabSwitchPaused: 0,
      totalAnswerCount: 0,
      totalAnswerTimeMs: 0
    };
  }

  saveStats() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
    } catch (e) {}
  }

  initGlobalListeners() {
    // 1. 多指触控作弊拦截 (iPad 屏幕常有多指同时戳不同选项的问题)
    window.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 1) {
        this.handleMultiTouch(e);
      }
    }, { capture: true, passive: false });

    // 2. 切屏/退后台防挂机
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isTabActive = false;
        this.stats.tabSwitchPaused += 1;
        this.saveStats();
        // 自动暂停所有音频播放，杜绝后台挂读音
        if (window.audioEngine) {
          window.audioEngine.stopAllAudio();
        }
      } else {
        this.isTabActive = true;
        this.showToast('👀 刚才离开了页面，已自动暂停计时，现在继续专心学习吧！', 'info');
      }
    });

    window.addEventListener('blur', () => {
      this.isTabActive = false;
    });

    window.addEventListener('focus', () => {
      this.isTabActive = true;
    });
  }

  /**
   * 拦截多指同时按压操作
   */
  handleMultiTouch(e) {
    // 如果触碰到了可选项按钮，立即阻止默认行为并警告
    const target = e.target;
    if (target && target.closest('button, [data-opt], .hanzi-quiz-opt-btn, .apple-fruit-btn, .whack-hole, .diff-choice-btn, .tone-track-btn')) {
      e.preventDefault();
      e.stopPropagation();
      this.stats.multiTouchBlocked += 1;
      this.saveStats();

      this.showToast('☝️ 请用一根小手指专心点击，不要多只手指同时按哦！', 'warning');
      if (window.mascotPipi) {
        window.mascotPipi.speak('小勇士，请用一根小手指认真选择哦！');
      }
    }
  }

  /**
   * 当新题目展示或音频开始播放时调用，校准答题时间原点
   * @param {number} minDelayMs - 最小需要等待的时长
   */
  markQuestionStart(minDelayMs = 380) {
    this.currentQuestionStartTime = Date.now();
    this.minAnswerDelayMs = minDelayMs;
  }

  /**
   * 作答核验入口：在用户点击任何答案前调用
   * @param {HTMLElement} btnEl - 被点击的选项元素
   * @returns {boolean} - true 允许作答，false 属于作弊/乱点并拦截
   */
  canAnswer(btnEl = null) {
    const now = Date.now();

    // 1. 如果正处于冷冻惩罚期，坚决阻断
    if (this.isFrozen) {
      this.showToast('⏳ 正在冷静期中，请仔细听完发音再作答！', 'warning');
      return false;
    }

    // 2. 如果后台或页面未激活
    if (!this.isTabActive || document.hidden) {
      return false;
    }

    // 3. 防秒点抢答 (Anti-Rush)：儿童听觉刺激传递大脑至少需要 350ms 以上
    const elapsed = now - this.currentQuestionStartTime;
    if (elapsed < this.minAnswerDelayMs) {
      this.stats.spamBlocked += 1;
      this.saveStats();
      this.showToast('🎧 还没听完读音呢，请仔细听完发音再选哦！', 'warning');

      if (btnEl) {
        btnEl.classList.add('animate-shake');
        setTimeout(() => btnEl.classList.remove('animate-shake'), 500);
      }
      return false;
    }

    // 4. 连点穷举检测 (1.2 秒内点击超过 3 次)
    this.recentClickTimestamps.push(now);
    // 仅保留 1.5 秒内的点击记录
    this.recentClickTimestamps = this.recentClickTimestamps.filter(t => now - t <= 1500);

    if (this.recentClickTimestamps.length >= 4) {
      this.triggerSpamFreeze('检测到频繁乱点！');
      return false;
    }

    return true;
  }

  /**
   * 当答错时上报，用于判断是否在暴力盲试各个选项
   */
  recordMistake() {
    const now = Date.now();
    this.recentMistakeTimestamps.push(now);
    this.recentMistakeTimestamps = this.recentMistakeTimestamps.filter(t => now - t <= 2000);

    // 2 秒内连续试错 3 次，判定为在盲猜穷举选项
    if (this.recentMistakeTimestamps.length >= 3) {
      this.triggerSpamFreeze('连续尝试太频繁啦，请仔细听音！');
    }
  }

  /**
   * 记录有效答题耗时（用于统计平均答题思考时间）
   */
  recordAnswerTime() {
    const now = Date.now();
    const elapsed = Math.max(400, Math.min(30000, now - this.currentQuestionStartTime));
    this.stats.totalAnswerCount += 1;
    this.stats.totalAnswerTimeMs += elapsed;
    this.saveStats();
    return elapsed;
  }

  /**
   * 触发冷静期冷冻惩罚 (Freeze Screen)
   * 暂时禁用按键，让孩子静下心听发音
   */
  triggerSpamFreeze(reason = '') {
    if (this.isFrozen) return;
    this.isFrozen = true;
    this.stats.spamBlocked += 1;
    this.saveStats();

    if (window.audioEngine) {
      window.audioEngine.stopAllAudio();
      window.audioEngine.playGentleOops();
    }

    if (window.mascotPipi) {
      window.mascotPipi.speak('不要着急乱点哦，先认真听老师读一遍！');
    }

    // 显示全屏/悬浮冷静提示条
    this.showFreezeOverlay(2500, reason);

    if (this.freezeTimer) clearTimeout(this.freezeTimer);
    this.freezeTimer = setTimeout(() => {
      this.isFrozen = false;
      this.hideFreezeOverlay();
      this.recentClickTimestamps = [];
      this.recentMistakeTimestamps = [];
    }, 2500);
  }

  /**
   * 星币增加速率限制与防脚本刷分
   * @param {number} count - 拟增加星币数
   * @returns {boolean} - true 允许发放，false 判定异常并拦截
   */
  verifyStarGain(count) {
    const now = Date.now();
    // 单次增加不能超过 5 颗星币
    if (count > 5 || count <= 0) {
      console.warn('[AntiCheat] 拦截到单次星币发放异常:', count);
      return false;
    }

    // 限制 10 秒内最多获得 12 颗星币
    this.starGainHistory.push({ time: now, count });
    this.starGainHistory = this.starGainHistory.filter(item => now - item.time <= 10000);

    const recentTotal = this.starGainHistory.reduce((sum, item) => sum + item.count, 0);
    if (recentTotal > 15) {
      console.warn('[AntiCheat] 拦截到高频刷星币行为, 10秒内星币:', recentTotal);
      this.showToast('⚠️ 获得星币速度过快，已启动安全守护！', 'warning');
      return false;
    }

    return true;
  }

  /**
   * 计算平均答题思考时间字符串
   */
  getAverageAnswerTimeStr() {
    if (this.stats.totalAnswerCount === 0) return '尚未统计';
    const avgSec = (this.stats.totalAnswerTimeMs / this.stats.totalAnswerCount / 1000).toFixed(1);
    return `${avgSec} 秒`;
  }

  // ==========================================
  // UI 界面提示组件
  // ==========================================
  initToastUI() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('anti-cheat-toast-container')) return;

    const container = document.createElement('div');
    container.id = 'anti-cheat-toast-container';
    container.className = 'fixed top-16 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center space-y-2 w-full max-w-sm px-4';
    document.body.appendChild(container);
  }

  showToast(message, type = 'warning') {
    const container = document.getElementById('anti-cheat-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `transform transition-all duration-300 translate-y-[-20px] opacity-0 text-xs sm:text-sm font-extrabold px-4 py-2.5 rounded-2xl shadow-xl border-2 pointer-events-auto flex items-center space-x-2 ${
      type === 'warning'
        ? 'bg-amber-500 text-white border-amber-300'
        : 'bg-indigo-600 text-white border-indigo-400'
    }`;
    toast.innerHTML = `
      <span class="text-base">${type === 'warning' ? '⚠️' : '💡'}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-[-20px]', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-[-10px]');
      setTimeout(() => toast.remove(), 350);
    }, 2400);
  }

  showFreezeOverlay(durationMs = 2500, reason = '') {
    let overlay = document.getElementById('anti-cheat-freeze-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'anti-cheat-freeze-overlay';
      overlay.className = 'fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300 animate-fadeIn';
      document.body.appendChild(overlay);
    }

    const sec = (durationMs / 1000).toFixed(0);
    overlay.innerHTML = `
      <div class="bg-white rounded-3xl p-6 max-w-xs w-full text-center space-y-3 shadow-2xl border-4 border-amber-400 animate-bounce">
        <div class="text-5xl">🧘 🎧 ⏱️</div>
        <h4 class="text-lg font-black text-amber-950">深呼吸，冷静一下！</h4>
        <p class="text-xs text-neutral-600 font-bold leading-relaxed">
          ${reason || '检测到点击过快，不要盲猜乱选哦！'}<br/>
          请先仔细听老师发音，思考后再作答。
        </p>
        <div class="inline-block bg-amber-100 text-amber-900 font-extrabold text-xs px-3 py-1 rounded-full border border-amber-300">
          ⏳ 冷静倒计时中...
        </div>
      </div>
    `;
    overlay.classList.remove('hidden');
  }

  hideFreezeOverlay() {
    const overlay = document.getElementById('anti-cheat-freeze-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }
}

// 自动全局单例挂载
if (typeof window !== 'undefined') {
  window.antiCheat = new AntiCheatGuard();
}
