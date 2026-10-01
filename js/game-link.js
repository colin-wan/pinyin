/**
 * 统编人教版小学语文一年级 汉字拼音四重连线游戏 (PinyinDecomposeLinkGame)
 * 涵盖：一年级上册 (300+字) 与 一年级下册 (400+字)
 * 核心机制：将汉字音节拆解为【声母】、【韵母】与【声调】四列连线
 * 模式：
 *   1. 常规巩固练习模式：5题通关获取星币
 *   2. 限时挑战模式：在指定时间（默认20分钟，可自由调节1-60分）内正确完成指定题数（默认20题，可自由调节5-50题），
 *      达到目标立即停止计时并记录完成情况（实际用时、正确率、错误数、历史战报档案）。
 * 交互：支持手指/笔拖拽划线与点选端点双模式，防误触，防作弊
 */

class PinyinDecomposeLinkGame {
  constructor(containerId) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.currentBook = 'all'; // 'all', 'vol1', 'vol2'
    this.currentUnit = 'all';
    this.score = 0;
    this.streak = 0;
    this.correctCount = 0;
    this.targetCorrect = 5;

    // 挑战模式专属状态 (支持自定义 20分钟·20题，均可灵活调节)
    this.gameMode = 'practice'; // 'practice' (5题巩固) 或 'challenge' (限时挑战)
    this.challengeDurationMinutes = 20; // 默认 20 分钟 (1-60 可调)
    this.challengeTargetQuestions = 20; // 默认 20 题 (5-50 可调)
    this.challengeTotalSeconds = 20 * 60;
    this.challengeTimeRemaining = 20 * 60;
    this.challengeTimer = null;
    this.challengeMistakes = 0;
    this.challengeStartTime = null;

    this.currentQuestion = null;
    this.currentStep = 0; // 0: select/confirm char, 1: connect to initial, 2: connect to final, 3: connect to tone, 4: complete
    this.connectedCards = {
      col1: null,
      col2: null,
      col3: null,
      col4: null
    };

    this.completedLines = []; // Array of { fromCard, toCard, colFrom, colTo }
    this.dragState = {
      isDragging: false,
      fromCol: null,
      fromCard: null,
      startX: 0,
      startY: 0
    };

    this.isLocked = false;
    this.boundResize = () => this.redrawAllLines();
    if (typeof window !== 'undefined') {
      window.activeLinkGame = this;
      if (window.app) window.app.topLinkGame = this;
    }
    this.initGlobalHooks();
  }

  initGlobalHooks() {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('resize', this.boundResize);
      window.addEventListener('orientationchange', () => {
        setTimeout(this.boundResize, 200);
      });
    }
  }

  destroy() {
    this.stopChallengeTimer();
    this.cleanupGestureListeners();
    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('resize', this.boundResize);
    }
  }

  /**
   * 格式化秒数为 MM:SS 格式
   */
  formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  /**
   * 格式化用时为中文字符串
   */
  formatElapsedCn(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m > 0) {
      return `${m} 分 ${sec} 秒`;
    }
    return `${sec} 秒`;
  }

  stopChallengeTimer() {
    if (this.challengeTimer) {
      clearInterval(this.challengeTimer);
      this.challengeTimer = null;
    }
  }

  updateTimerDisplay() {
    const timerEl = this.container.querySelector('#challenge-timer-display');
    if (!timerEl) return;
    timerEl.innerText = this.formatTime(this.challengeTimeRemaining);
    if (this.challengeTimeRemaining <= 120) {
      timerEl.classList.add('text-rose-400', 'animate-pulse');
      timerEl.classList.remove('text-yellow-300');
    } else {
      timerEl.classList.remove('text-rose-400', 'animate-pulse');
      timerEl.classList.add('text-yellow-300');
    }
  }

  /**
   * 历史挑战战报读写
   */
  getChallengeHistory() {
    try {
      const raw = localStorage.getItem('PINYIN_LINK_CHALLENGE_HISTORY_V1');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveChallengeRecord(record) {
    try {
      const history = this.getChallengeHistory();
      const newRecord = {
        id: 'chal_' + Date.now(),
        date: new Date().toLocaleDateString('zh-CN'),
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        ...record
      };
      history.unshift(newRecord);
      localStorage.setItem('PINYIN_LINK_CHALLENGE_HISTORY_V1', JSON.stringify(history.slice(0, 50)));
    } catch (e) {}
  }

  clearChallengeHistory() {
    try {
      localStorage.removeItem('PINYIN_LINK_CHALLENGE_HISTORY_V1');
    } catch (e) {}
  }

  /**
   * 获取当前符合筛选条件的生字数据库
   */
  getAllVocabulary() {
    const v1 = (window.TEXTBOOK_HANZI_DATA || []).map(item => ({ ...item, book: 1 }));
    const v2 = (window.TEXTBOOK_HANZI_VOL2_DATA || []).map(item => ({ ...item, book: 2 }));
    return [...v1, ...v2];
  }

  getFilteredPool() {
    let pool = this.getAllVocabulary();
    if (this.currentBook === 'vol1') {
      pool = pool.filter(item => item.book === 1);
    } else if (this.currentBook === 'vol2') {
      pool = pool.filter(item => item.book === 2);
    }

    if (this.currentUnit && this.currentUnit !== 'all') {
      pool = pool.filter(item => item.unit && item.unit.includes(this.currentUnit));
    }

    return pool.length > 0 ? pool : this.getAllVocabulary();
  }

  /**
   * 收集当前册次包含的所有教学单元名称
   */
  getAvailableUnits() {
    let pool = this.getAllVocabulary();
    if (this.currentBook === 'vol1') {
      pool = pool.filter(item => item.book === 1);
    } else if (this.currentBook === 'vol2') {
      pool = pool.filter(item => item.book === 2);
    }

    const unitsSet = new Set();
    pool.forEach(item => {
      if (item.unit) {
        unitsSet.add(item.unit);
      }
    });
    return Array.from(unitsSet);
  }

  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * 生成一道四列连线题目
   */
  generateQuestion() {
    const pool = this.getFilteredPool();
    if (!pool || pool.length === 0) return null;

    // 随机选择目标汉字
    const target = pool[Math.floor(Math.random() * pool.length)];

    // 第1列：目标汉字 + 2个同册干扰字
    const otherChars = pool.filter(c => c.char !== target.char);
    const distractorsCol1 = this.shuffle(otherChars).slice(0, 2);
    const col1Cards = this.shuffle([target, ...distractorsCol1]);

    // 第2列：声母候选 (1正确 + 3干扰)
    const allInitials = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w'];
    const otherInitials = allInitials.filter(i => i !== target.initial);
    const distractorInitials = this.shuffle(otherInitials).slice(0, 3);
    
    const col2Cards = this.shuffle([
      {
        val: target.initial,
        isCorrect: true,
        display: target.initial === '' ? '无声母' : target.initial,
        sub: target.initial === '' ? '零声母' : '声母',
        isZero: target.initial === ''
      },
      ...distractorInitials.map(init => ({
        val: init,
        isCorrect: false,
        display: init,
        sub: '声母',
        isZero: false
      }))
    ]);

    // 第3列：韵母候选 (1正确 + 3干扰)
    const allFinals = [
      'a', 'o', 'e', 'i', 'u', 'ü',
      'ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe', 'er',
      'an', 'en', 'in', 'un', 'ün',
      'ang', 'eng', 'ing', 'ong'
    ];
    const otherFinals = allFinals.filter(f => f !== target.final);
    const distractorFinals = this.shuffle(otherFinals).slice(0, 3);

    const col3Cards = this.shuffle([
      {
        val: target.final,
        isCorrect: true,
        display: target.final,
        sub: '韵母'
      },
      ...distractorFinals.map(f => ({
        val: f,
        isCorrect: false,
        display: f,
        sub: '韵母'
      }))
    ]);

    // 第4列：声调 (固定显示完整的5个标准调项：一声、二声、三声、四声、轻声)
    const toneDefinitions = [
      { val: 1, mark: 'ˉ', name: '一声 (阴平)', desc: '高平一声 ˉ', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300' },
      { val: 2, mark: 'ˊ', name: '二声 (阳平)', desc: '上扬二声 ˊ', badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
      { val: 3, mark: 'ˇ', name: '三声 (上声)', desc: '转弯三声 ˇ', badgeColor: 'bg-sky-100 text-sky-900 border-sky-300' },
      { val: 4, mark: 'ˋ', name: '四声 (去声)', desc: '下降四声 ˋ', badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
      { val: 0, mark: '·', name: '轻声 (不标调)', desc: '短轻平 ·', badgeColor: 'bg-purple-100 text-purple-900 border-purple-300' }
    ];

    const col4Cards = toneDefinitions.map(t => ({
      ...t,
      isCorrect: t.val === target.tone
    }));

    return {
      target,
      col1: col1Cards,
      col2: col2Cards,
      col3: col3Cards,
      col4: col4Cards
    };
  }

  /**
   * 启动挑战模式
   */
  startChallenge(customMin = null, customQ = null) {
    if (customMin) this.challengeDurationMinutes = Math.max(1, Math.min(60, parseInt(customMin, 10)));
    if (customQ) this.challengeTargetQuestions = Math.max(5, Math.min(50, parseInt(customQ, 10)));

    this.stopChallengeTimer();
    this.gameMode = 'challenge';
    this.challengeTotalSeconds = this.challengeDurationMinutes * 60;
    this.challengeTimeRemaining = this.challengeTotalSeconds;
    this.correctCount = 0;
    this.challengeMistakes = 0;
    this.score = 0;
    this.streak = 0;
    this.challengeStartTime = Date.now();

    this.render();

    // 启动 1 秒倒计时时钟
    this.challengeTimer = setInterval(() => {
      this.challengeTimeRemaining -= 1;
      this.updateTimerDisplay();
      if (this.challengeTimeRemaining <= 0) {
        this.handleChallengeTimeout();
      }
    }, 1000);

    if (window.mascotPipi) {
      window.mascotPipi.speak(`限时挑战启动！请在 ${this.challengeDurationMinutes} 分钟内答对 ${this.challengeTargetQuestions} 题，加油哦！`);
    }
  }

  /**
   * 倒计时自然耗尽超时处理
   */
  handleChallengeTimeout() {
    this.stopChallengeTimer();
    const totalTries = this.correctCount + this.challengeMistakes;
    const accuracy = totalTries > 0 ? Math.round((this.correctCount / totalTries) * 100) : 0;
    const isSuccess = this.correctCount >= this.challengeTargetQuestions;

    // 记录完成情况
    this.saveChallengeRecord({
      targetQuestions: this.challengeTargetQuestions,
      completedQuestions: this.correctCount,
      durationMinutes: this.challengeDurationMinutes,
      elapsedSeconds: this.challengeTotalSeconds,
      mistakes: this.challengeMistakes,
      accuracy: accuracy,
      score: this.score,
      isSuccess: isSuccess,
      bookName: this.currentBook === 'vol1' ? '一年级上册' : (this.currentBook === 'vol2' ? '一年级下册' : '上下册全集')
    });

    this.showChallengeTimeoutModal(this.correctCount, accuracy);
  }

  /**
   * 渲染整个游戏组件主框架
   */
  render() {
    if (!this.container) return;

    const availableUnits = this.getAvailableUnits();
    const isChallenge = this.gameMode === 'challenge';
    const targetQ = isChallenge ? this.challengeTargetQuestions : this.targetCorrect;

    this.container.innerHTML = `
      <div id="link-game-root" class="w-full bg-gradient-to-b from-amber-50/95 via-orange-50/80 to-yellow-50/95 rounded-3xl p-3 sm:p-5 md:p-6 shadow-xl border-4 ${isChallenge ? 'border-rose-400' : 'border-amber-300'} select-none relative overflow-hidden transition-all duration-300">
        
        <!-- 装饰性漂浮微章 -->
        <div class="absolute -right-8 -top-8 text-8xl opacity-10 pointer-events-none select-none">${isChallenge ? '⚡' : '🔗'}</div>
        <div class="absolute -left-8 -bottom-8 text-8xl opacity-10 pointer-events-none select-none">✨</div>

        <!-- 顶栏状态与控制 -->
        <div class="flex flex-col md:flex-row items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl shadow-sm border border-amber-200 mb-3">
          <!-- 标题徽章 -->
          <div class="flex items-center space-x-2.5">
            <span class="text-3xl sm:text-4xl animate-bounce">${isChallenge ? '⚡' : '🔗'}</span>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="font-black text-amber-950 text-base sm:text-lg md:text-xl">
                  ${isChallenge ? '拼音连线 · 限时挑战' : '汉字拼音四重连线'}
                </h3>
                <span class="${isChallenge ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-300'} text-[11px] font-black px-2 py-0.5 rounded-full border">
                  ${isChallenge ? '限时冲刺' : '统编一年级全册'}
                </span>
              </div>
              <p class="text-xs text-amber-700 font-bold mt-0.5">汉字 ➔ 声母 ➔ 韵母 ➔ 声调 · 完整拼音链路组装</p>
            </div>
          </div>

          <!-- 模式切换与战报入口 -->
          <div class="flex items-center space-x-2">
            <button id="btn-switch-practice" class="px-3 py-1.5 rounded-xl font-black text-xs transition ${!isChallenge ? 'bg-amber-500 text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-amber-100'}">
              🌱 常规练习 (5题)
            </button>
            <button id="btn-open-challenge-setup" class="px-3 py-1.5 rounded-xl font-black text-xs transition ${isChallenge ? 'bg-rose-500 text-white shadow-sm ring-2 ring-rose-300' : 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'} flex items-center space-x-1">
              <span>⚡</span>
              <span>限时挑战 (${this.challengeDurationMinutes}分·${this.challengeTargetQuestions}题)</span>
            </button>
            <button id="btn-open-history" class="px-2.5 py-1.5 rounded-xl font-bold text-xs bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 transition flex items-center space-x-1 shadow-xs" title="查看历史战报档案">
              <span>📜</span>
              <span class="hidden sm:inline">战报档案</span>
            </button>
          </div>

          <!-- 答对统计与积分 -->
          <div class="flex items-center space-x-2 sm:space-x-3">
            <div class="${isChallenge ? 'bg-rose-100/90 border-rose-300 text-rose-950' : 'bg-emerald-100/90 border-emerald-300 text-emerald-950'} px-3.5 py-1.5 rounded-full border font-black text-xs sm:text-sm flex items-center space-x-1.5 shadow-sm">
              <span>🎯 答对:</span>
              <span id="link-correct-count" class="${isChallenge ? 'text-rose-700' : 'text-emerald-700'} text-base font-black">${this.correctCount}/${targetQ}</span>
            </div>
            <div class="bg-amber-100/90 px-3.5 py-1.5 rounded-full border border-amber-300 text-amber-950 font-black text-xs sm:text-sm flex items-center space-x-1 shadow-sm">
              <span>⭐ 得分:</span>
              <span id="link-game-score" class="text-amber-600 text-base font-black">${this.score}</span>
            </div>
            <div class="bg-orange-100/90 px-3.5 py-1.5 rounded-full border border-orange-300 text-orange-950 font-black text-xs flex items-center space-x-1 shadow-sm">
              <span>🔥 连对:</span>
              <span id="link-game-streak" class="text-orange-600 text-sm font-black">${this.streak}</span>
            </div>
          </div>
        </div>

        ${isChallenge ? `
          <!-- 挑战模式专属状态横幅 (倒计时 + 进度条 + 控制) -->
          <div id="challenge-active-hud" class="bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 rounded-2xl p-3 sm:p-4 text-white shadow-lg mb-3 border-2 border-white/40 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
            <!-- 倒计时区 -->
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center text-2xl shadow-inner animate-pulse">
                ⏱️
              </div>
              <div>
                <div class="text-[11px] font-bold text-white/90">挑战倒计时 (${this.challengeDurationMinutes}分钟挑战)</div>
                <div id="challenge-timer-display" class="font-mono text-2xl sm:text-3xl font-black tracking-wider text-yellow-300 drop-shadow">
                  ${this.formatTime(this.challengeTimeRemaining)}
                </div>
              </div>
            </div>

            <!-- 目标进度区 -->
            <div class="flex-1 max-w-sm w-full px-2">
              <div class="flex items-center justify-between text-xs font-black mb-1">
                <span>🎯 目标: 完成 ${this.challengeTargetQuestions} 题</span>
                <span id="challenge-progress-text">${this.correctCount}/${this.challengeTargetQuestions}</span>
              </div>
              <div class="w-full bg-black/25 rounded-full h-3.5 p-0.5 border border-white/30 shadow-inner">
                <div id="challenge-progress-bar" class="bg-gradient-to-r from-yellow-300 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-sm" style="width: ${Math.min(100, Math.round((this.correctCount / this.challengeTargetQuestions) * 100))}%;"></div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center space-x-2 shrink-0">
              <button id="btn-adjust-challenge-params" class="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-xs border border-white/40 transition active:scale-95 shadow-sm flex items-center space-x-1 cursor-pointer">
                <span>⚙️</span>
                <span>调节参数</span>
              </button>
              <button id="btn-abort-challenge" class="px-3 py-1.5 bg-rose-700/90 hover:bg-rose-800 text-white rounded-xl font-bold text-xs border border-white/30 transition active:scale-95 shadow-sm flex items-center space-x-1 cursor-pointer">
                <span>🛑</span>
                <span>退出挑战</span>
              </button>
            </div>
          </div>
        ` : `
          <!-- 常规练习模式提示条 -->
          <div class="flex flex-wrap items-center justify-between bg-amber-100/80 border border-amber-200 px-3 py-1.5 rounded-xl text-xs text-amber-900 font-bold mb-3 gap-2">
            <div class="flex items-center space-x-1.5">
              <span>🌱</span>
              <span>当前模式：<strong>常规巩固练习</strong>（答对 5 题通关）</span>
            </div>
            <button id="btn-quick-challenge-trigger" class="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1 rounded-xl font-black text-xs shadow-xs transition active:scale-95 flex items-center space-x-1 cursor-pointer">
              <span>⚡</span>
              <span>开启 20分钟·20题 挑战模式</span>
            </button>
          </div>
        `}

        <!-- 筛选栏：册次切换与单元筛选 -->
        <div class="flex flex-wrap items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-amber-200/80">
          <!-- 册次选择器 (上册 / 下册 / 全集) -->
          <div class="flex items-center space-x-1.5">
            <button class="link-book-btn px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm transition ${this.currentBook === 'all' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-neutral-700 hover:bg-amber-100'}" data-book="all">
              🚀 上下册全集 (700+字)
            </button>
            <button class="link-book-btn px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm transition ${this.currentBook === 'vol1' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-neutral-700 hover:bg-amber-100'}" data-book="vol1">
              🌟 一年级上册
            </button>
            <button class="link-book-btn px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm transition ${this.currentBook === 'vol2' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-neutral-700 hover:bg-amber-100'}" data-book="vol2">
              🌸 一年级下册
            </button>
          </div>

          <!-- 单元与控制按钮 -->
          <div class="flex items-center space-x-2">
            <select id="link-unit-select" class="text-xs bg-white border border-amber-300 text-neutral-800 rounded-xl px-2.5 py-1.5 font-bold shadow-sm focus:outline-none max-w-[160px] sm:max-w-[200px]">
              <option value="all">📚 课文/识字单元 (全部)</option>
              ${availableUnits.map(u => `<option value="${u}" ${this.currentUnit === u ? 'selected' : ''}>${u}</option>`).join('')}
            </select>

            <button id="btn-link-reset-line" class="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-1 cursor-pointer">
              <span>↩</span>
              <span>重连</span>
            </button>

            <button id="btn-link-skip" class="px-3 py-1.5 bg-white hover:bg-amber-100 text-neutral-700 border border-amber-300 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-1 cursor-pointer">
              <span>⏭️</span>
              <span>换题</span>
            </button>
          </div>
        </div>

        <!-- 任务指引横幅 -->
        <div id="link-mission-banner" class="bg-gradient-to-r ${isChallenge ? 'from-rose-500 via-orange-500 to-rose-500 border-rose-300' : 'from-amber-400 via-orange-400 to-amber-400 border-amber-200'} text-white p-3 rounded-2xl shadow-md mb-3 flex items-center justify-between gap-3 border-2">
          <div class="flex items-center space-x-2.5">
            <span class="text-2xl animate-pulse">🎯</span>
            <div>
              <div class="text-xs font-bold text-amber-100">当前任务：</div>
              <div id="link-mission-text" class="text-sm sm:text-base font-black">
                请先在左侧选择目标汉字并连出它的声母、韵母与声调！
              </div>
            </div>
          </div>
          <button id="btn-play-mission-audio" class="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-xs border border-white/40 shadow-sm transition active:scale-95 shrink-0 flex items-center space-x-1 cursor-pointer">
            <span>🔊</span>
            <span>读题目</span>
          </button>
        </div>

        <!-- 连线核心舞台容器 (四列 + 覆盖式SVG画布) -->
        <div id="link-stage-wrapper" class="relative w-full rounded-2xl bg-white/60 p-2 sm:p-4 border-2 border-amber-200 shadow-inner overflow-hidden" style="touch-action: none;">
          
          <!-- SVG 连线画布 (透明覆盖在上层) -->
          <svg id="link-svg-canvas" class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 20;">
            <defs>
              <!-- 动态渐变彩虹线 -->
              <linearGradient id="lineGradActive" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#f59e0b" />
                <stop offset="100%" stop-color="#10b981" />
              </linearGradient>
              <linearGradient id="lineGradSuccess" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#10b981" />
                <stop offset="100%" stop-color="#06b6d4" />
              </linearGradient>
              <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <!-- 已锁定的正确连线组 -->
            <g id="svg-completed-group"></g>

            <!-- 正在拖拽的动态手指轨迹线 -->
            <path id="svg-drag-line" d="" fill="none" stroke="url(#lineGradActive)" stroke-width="5" stroke-linecap="round" stroke-dasharray="8 6" filter="url(#glowEffect)" opacity="0" />
          </svg>

          <!-- 四列网格 -->
          <div class="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 relative" style="z-index: 10;">
            
            <!-- 第 1 列：【汉字】 -->
            <div class="flex flex-col items-center">
              <div class="w-full text-center py-1.5 mb-2 rounded-xl bg-amber-200/80 text-amber-950 font-black text-xs sm:text-sm border border-amber-300 shadow-xs">
                🀄 汉字
              </div>
              <div id="col1-container" class="w-full space-y-3 flex flex-col justify-around flex-1 py-1"></div>
            </div>

            <!-- 第 2 列：【声母】 -->
            <div class="flex flex-col items-center">
              <div class="w-full text-center py-1.5 mb-2 rounded-xl bg-sky-200/80 text-sky-950 font-black text-xs sm:text-sm border border-sky-300 shadow-xs">
                🍃 声母
              </div>
              <div id="col2-container" class="w-full space-y-3 flex flex-col justify-around flex-1 py-1"></div>
            </div>

            <!-- 第 3 列：【韵母】 -->
            <div class="flex flex-col items-center">
              <div class="w-full text-center py-1.5 mb-2 rounded-xl bg-purple-200/80 text-purple-950 font-black text-xs sm:text-sm border border-purple-300 shadow-xs">
                🌸 韵母
              </div>
              <div id="col3-container" class="w-full space-y-3 flex flex-col justify-around flex-1 py-1"></div>
            </div>

            <!-- 第 4 列：【声调】 -->
            <div class="flex flex-col items-center">
              <div class="w-full text-center py-1.5 mb-2 rounded-xl bg-emerald-200/80 text-emerald-950 font-black text-xs sm:text-sm border border-emerald-300 shadow-xs">
                🎵 声调
              </div>
              <div id="col4-container" class="w-full space-y-2 flex flex-col justify-around flex-1 py-1"></div>
            </div>

          </div>
        </div>

        <!-- 底部操作提示 -->
        <div class="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500 font-bold px-1">
          <div class="flex items-center space-x-2 text-amber-800">
            <span>💡 提示：</span>
            <span>手指从圆点拖出彩线连接，或按顺序轻触端点自动连线。</span>
          </div>
          <div class="text-[11px] text-neutral-400">
            ${isChallenge ? `限时挑战中：达到 ${this.challengeTargetQuestions} 题立即停止计时并记录战报！` : '常规练习中：每轮答对 5 题即可赢得全屏礼花与星币大奖！'}
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
    this.startNewQuestion();
  }

  /**
   * 绑定顶栏控制器与交互事件
   */
  bindEvents() {
    // 切换为常规模式
    const practiceBtn = this.container.querySelector('#btn-switch-practice');
    if (practiceBtn) {
      practiceBtn.addEventListener('click', () => {
        if (this.gameMode === 'practice') return;
        this.stopChallengeTimer();
        this.gameMode = 'practice';
        this.correctCount = 0;
        this.render();
      });
    }

    // 打开挑战配置弹窗
    const setupBtn = this.container.querySelector('#btn-open-challenge-setup');
    if (setupBtn) {
      setupBtn.addEventListener('click', () => {
        this.showChallengeSetupModal();
      });
    }

    // 快捷开启挑战按钮
    const quickChallengeBtn = this.container.querySelector('#btn-quick-challenge-trigger');
    if (quickChallengeBtn) {
      quickChallengeBtn.addEventListener('click', () => {
        this.showChallengeSetupModal();
      });
    }

    // 挑战微调参数按钮
    const adjustBtn = this.container.querySelector('#btn-adjust-challenge-params');
    if (adjustBtn) {
      adjustBtn.addEventListener('click', () => {
        this.showChallengeSetupModal();
      });
    }

    // 终止挑战按钮
    const abortBtn = this.container.querySelector('#btn-abort-challenge');
    if (abortBtn) {
      abortBtn.addEventListener('click', () => {
        if (confirm('确定要退出当前限时挑战吗？本次答题计时将终止。')) {
          this.stopChallengeTimer();
          this.gameMode = 'practice';
          this.correctCount = 0;
          this.render();
        }
      });
    }

    // 打开历史战报档案
    const historyBtn = this.container.querySelector('#btn-open-history');
    if (historyBtn) {
      historyBtn.addEventListener('click', () => {
        this.showChallengeHistoryModal();
      });
    }

    // 册次按钮切换
    this.container.querySelectorAll('.link-book-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const book = e.currentTarget.dataset.book;
        if (this.currentBook === book) return;
        this.currentBook = book;
        this.currentUnit = 'all';
        this.render();
      });
    });

    // 单元筛选下拉
    const unitSelect = this.container.querySelector('#link-unit-select');
    if (unitSelect) {
      unitSelect.addEventListener('change', (e) => {
        this.currentUnit = e.target.value;
        this.startNewQuestion();
      });
    }

    // 重置当前连线
    const resetBtn = this.container.querySelector('#btn-link-reset-line');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetCurrentChain();
      });
    }

    // 换一题 / 跳过
    const skipBtn = this.container.querySelector('#btn-link-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        this.startNewQuestion();
      });
    }

    // 播放题目读音
    const audioBtn = this.container.querySelector('#btn-play-mission-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        this.playMissionAudio();
      });
    }

    // 舞台触摸/鼠标手势连线处理
    this.setupGestureInteraction();
  }

  /**
   * 挑战模式参数配置弹窗 (时长与题数可自由调节)
   */
  showChallengeSetupModal() {
    let tempMin = this.challengeDurationMinutes;
    let tempQ = this.challengeTargetQuestions;
    let tempBook = this.currentBook;

    const modal = document.createElement('div');
    modal.id = 'link-challenge-setup-modal';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn';
    modal.innerHTML = `
      <div class="bg-gradient-to-b from-rose-50 via-amber-50 to-orange-50 rounded-3xl p-5 sm:p-7 max-w-lg w-full border-4 border-rose-400 shadow-2xl text-center select-none space-y-4">
        
        <div class="flex items-center justify-between pb-2 border-b border-rose-200">
          <div class="flex items-center space-x-2">
            <span class="text-3xl animate-bounce">⚡</span>
            <div class="text-left">
              <h3 class="text-lg sm:text-xl font-black text-rose-950">拼音连线 · 限时挑战设置</h3>
              <p class="text-xs text-rose-700 font-bold">在规定时间内完成指定题数，自动停止计时并记录战报！</p>
            </div>
          </div>
          <button id="btn-close-setup" class="text-neutral-400 hover:text-neutral-600 text-2xl font-black transition p-1 cursor-pointer">×</button>
        </div>

        <!-- 快捷预设档位 -->
        <div>
          <div class="text-xs font-bold text-neutral-600 text-left mb-1.5 flex items-center space-x-1">
            <span>⚡ 快捷推荐档位:</span>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button class="preset-btn p-2 rounded-2xl border-2 border-rose-200 bg-white hover:bg-rose-50 text-neutral-800 transition active:scale-95 text-center font-bold text-xs cursor-pointer" data-min="10" data-q="10">
              <div class="text-sm font-black text-rose-600">10分钟</div>
              <div class="text-[11px] text-neutral-500">10道题 (日常热身)</div>
            </button>
            <button class="preset-btn p-2 rounded-2xl border-2 border-rose-400 bg-rose-100 text-rose-950 transition active:scale-95 text-center font-bold text-xs shadow-xs cursor-pointer" data-min="20" data-q="20">
              <div class="text-sm font-black text-rose-700">20分钟 ⭐</div>
              <div class="text-[11px] text-rose-800 font-extrabold">20道题 (标准挑战)</div>
            </button>
            <button class="preset-btn p-2 rounded-2xl border-2 border-rose-200 bg-white hover:bg-rose-50 text-neutral-800 transition active:scale-95 text-center font-bold text-xs cursor-pointer" data-min="30" data-q="30">
              <div class="text-sm font-black text-amber-600">30分钟</div>
              <div class="text-[11px] text-neutral-500">30道题 (高能进阶)</div>
            </button>
          </div>
        </div>

        <!-- 自定义调节器 (时间和题数均可自由微调) -->
        <div class="bg-white/85 p-3.5 rounded-2xl border border-rose-200 space-y-3">
          <!-- 挑战时长调节 -->
          <div class="flex items-center justify-between">
            <div class="text-left">
              <div class="text-xs font-black text-neutral-800">⏱️ 挑战限时 (分钟)</div>
              <div class="text-[10px] text-neutral-500">范围: 1 - 60 分钟</div>
            </div>
            <div class="flex items-center space-x-2">
              <button id="btn-dec-min" class="w-8 h-8 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-black text-lg flex items-center justify-center transition active:scale-90 cursor-pointer">-</button>
              <span id="display-min-val" class="w-12 text-center font-mono font-black text-xl text-rose-900">${tempMin}</span>
              <button id="btn-inc-min" class="w-8 h-8 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-black text-lg flex items-center justify-center transition active:scale-90 cursor-pointer">+</button>
            </div>
          </div>

          <!-- 目标题数调节 -->
          <div class="flex items-center justify-between pt-2 border-t border-rose-100">
            <div class="text-left">
              <div class="text-xs font-black text-neutral-800">🎯 达标题目数 (题)</div>
              <div class="text-[10px] text-neutral-500">范围: 5 - 50 题</div>
            </div>
            <div class="flex items-center space-x-2">
              <button id="btn-dec-q" class="w-8 h-8 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 font-black text-lg flex items-center justify-center transition active:scale-90 cursor-pointer">-</button>
              <span id="display-q-val" class="w-12 text-center font-mono font-black text-xl text-amber-900">${tempQ}</span>
              <button id="btn-inc-q" class="w-8 h-8 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 font-black text-lg flex items-center justify-center transition active:scale-90 cursor-pointer">+</button>
            </div>
          </div>

          <!-- 题库册次范围 -->
          <div class="flex items-center justify-between pt-2 border-t border-rose-100">
            <div class="text-xs font-black text-neutral-800 text-left">
              📚 题目字库
            </div>
            <div class="flex items-center space-x-1" id="setup-book-group">
              <button class="setup-book-btn px-2.5 py-1 rounded-xl text-xs font-bold ${tempBook === 'all' ? 'bg-amber-500 text-white shadow-xs' : 'bg-neutral-100 text-neutral-600'} cursor-pointer" data-book="all">全册</button>
              <button class="setup-book-btn px-2.5 py-1 rounded-xl text-xs font-bold ${tempBook === 'vol1' ? 'bg-amber-500 text-white shadow-xs' : 'bg-neutral-100 text-neutral-600'} cursor-pointer" data-book="vol1">上册</button>
              <button class="setup-book-btn px-2.5 py-1 rounded-xl text-xs font-bold ${tempBook === 'vol2' ? 'bg-amber-500 text-white shadow-xs' : 'bg-neutral-100 text-neutral-600'} cursor-pointer" data-book="vol2">下册</button>
            </div>
          </div>
        </div>

        <!-- 启动与取消 -->
        <div class="pt-2 flex space-x-3">
          <button id="btn-start-challenge-confirm" class="flex-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 hover:from-rose-600 hover:to-orange-600 text-white font-extrabold py-3 px-6 rounded-2xl shadow-lg border border-rose-300 transition active:scale-95 text-base flex items-center justify-center space-x-1.5 cursor-pointer">
            <span>🚀</span>
            <span>开启挑战！(<span id="btn-summary-text">${tempMin}分钟·${tempQ}题</span>)</span>
          </button>
          <button id="btn-cancel-setup" class="px-5 py-3 bg-white hover:bg-neutral-100 text-neutral-700 font-bold rounded-2xl border border-neutral-200 transition text-sm cursor-pointer">
            取消
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

    const updateSummary = () => {
      const minEl = modal.querySelector('#display-min-val');
      const qEl = modal.querySelector('#display-q-val');
      const sumEl = modal.querySelector('#btn-summary-text');
      if (minEl) minEl.innerText = tempMin;
      if (qEl) qEl.innerText = tempQ;
      if (sumEl) sumEl.innerText = `${tempMin}分钟·${tempQ}题`;
    };

    // 预设点击
    modal.querySelectorAll('.preset-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        tempMin = parseInt(e.currentTarget.dataset.min, 10);
        tempQ = parseInt(e.currentTarget.dataset.q, 10);
        modal.querySelectorAll('.preset-btn').forEach(btn => {
          btn.classList.remove('border-rose-400', 'bg-rose-100', 'text-rose-950');
          btn.classList.add('border-rose-200', 'bg-white', 'text-neutral-800');
        });
        e.currentTarget.classList.add('border-rose-400', 'bg-rose-100', 'text-rose-950');
        e.currentTarget.classList.remove('border-rose-200', 'bg-white', 'text-neutral-800');
        updateSummary();
      });
    });

    // 分钟加减
    modal.querySelector('#btn-dec-min')?.addEventListener('click', () => {
      if (tempMin > 1) { tempMin -= 1; updateSummary(); }
    });
    modal.querySelector('#btn-inc-min')?.addEventListener('click', () => {
      if (tempMin < 60) { tempMin += 1; updateSummary(); }
    });

    // 题数加减
    modal.querySelector('#btn-dec-q')?.addEventListener('click', () => {
      if (tempQ > 5) { tempQ -= 1; updateSummary(); }
    });
    modal.querySelector('#btn-inc-q')?.addEventListener('click', () => {
      if (tempQ < 50) { tempQ += 1; updateSummary(); }
    });

    // 册次切换
    modal.querySelectorAll('.setup-book-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        tempBook = e.currentTarget.dataset.book;
        modal.querySelectorAll('.setup-book-btn').forEach(btn => {
          btn.classList.remove('bg-amber-500', 'text-white', 'shadow-xs');
          btn.classList.add('bg-neutral-100', 'text-neutral-600');
        });
        e.currentTarget.classList.add('bg-amber-500', 'text-white', 'shadow-xs');
        e.currentTarget.classList.remove('bg-neutral-100', 'text-neutral-600');
      });
    });

    const closeModal = () => modal.remove();
    modal.querySelector('#btn-close-setup')?.addEventListener('click', closeModal);
    modal.querySelector('#btn-cancel-setup')?.addEventListener('click', closeModal);

    // 确认开启挑战
    modal.querySelector('#btn-start-challenge-confirm')?.addEventListener('click', () => {
      closeModal();
      this.currentBook = tempBook;
      this.startChallenge(tempMin, tempQ);
    });
  }

  /**
   * 挑战成功结算弹窗 (达成目标题数后停止计时并记录)
   */
  showChallengeVictoryModal(elapsedSeconds, accuracy) {
    this.isLocked = true;
    if (window.audioEngine) {
      window.audioEngine.stopAllAudio();
      window.audioEngine.playFanfare();
    }
    if (window.celebrationFX) {
      window.celebrationFX.launchConfetti(4500);
    }
    if (window.app && window.app.state) {
      window.app.state.addStars(10);
    }
    if (window.mascotPipi) {
      window.mascotPipi.speak(`🎉 太棒啦！在规定的 ${this.challengeDurationMinutes} 分钟内答对了全部 ${this.challengeTargetQuestions} 题！金牌大满贯！`, true);
    }

    const modal = document.createElement('div');
    modal.id = 'challenge-victory-modal';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn';
    modal.innerHTML = `
      <div class="bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-100 rounded-3xl p-6 sm:p-8 max-w-md w-full border-4 border-amber-400 shadow-2xl text-center select-none space-y-4">
        <div class="text-7xl animate-bounce">🥇 🏆 ⚡</div>
        <h3 class="text-2xl sm:text-3xl font-black text-amber-950">
          挑战大捷！金牌达成！
        </h3>
        <p class="text-sm font-extrabold text-emerald-600">
          已锁表停止计时 · 荣获 10 颗闪亮星币 ⭐！
        </p>

        <div class="bg-white/90 p-4 rounded-2xl border border-amber-200 text-xs font-bold text-amber-950 text-left space-y-2">
          <div class="flex items-center justify-between pb-1.5 border-b border-amber-100">
            <span>⏱️ 实际耗时:</span>
            <span class="font-mono text-base font-black text-rose-600">${this.formatElapsedCn(elapsedSeconds)}</span>
          </div>
          <div class="flex items-center justify-between pb-1.5 border-b border-amber-100">
            <span>🎯 完成题数:</span>
            <span class="font-black text-sm text-emerald-700">${this.challengeTargetQuestions} / ${this.challengeTargetQuestions} 题 (100%)</span>
          </div>
          <div class="flex items-center justify-between pb-1.5 border-b border-amber-100">
            <span>📊 答题正确率:</span>
            <span class="font-black text-sm text-indigo-700">${accuracy}%</span>
          </div>
          <div class="flex items-center justify-between">
            <span>📚 挑战字库:</span>
            <span class="font-bold text-neutral-600">${this.currentBook === 'vol1' ? '一年级上册' : (this.currentBook === 'vol2' ? '一年级下册' : '统编一年级全册')}</span>
          </div>
        </div>

        <div class="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
          <button id="btn-chal-again" class="flex-1 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-extrabold py-3 px-4 rounded-2xl shadow-lg border border-rose-300 transition active:scale-95 text-sm cursor-pointer">
            🔄 再战一轮
          </button>
          <button id="btn-chal-view-history" class="flex-1 bg-white hover:bg-amber-100 text-amber-900 font-extrabold py-3 px-4 rounded-2xl shadow-md border border-amber-300 transition active:scale-95 text-sm cursor-pointer">
            📜 战报档案
          </button>
          <button id="btn-chal-back-practice" class="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-3 px-4 rounded-2xl border border-neutral-300 transition text-sm cursor-pointer">
            🌱 常规练习
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-chal-again')?.addEventListener('click', () => {
      modal.remove();
      this.startChallenge();
    });

    modal.querySelector('#btn-chal-view-history')?.addEventListener('click', () => {
      modal.remove();
      this.showChallengeHistoryModal();
    });

    modal.querySelector('#btn-chal-back-practice')?.addEventListener('click', () => {
      modal.remove();
      this.gameMode = 'practice';
      this.correctCount = 0;
      this.render();
    });
  }

  /**
   * 挑战时间用尽结算弹窗
   */
  showChallengeTimeoutModal(completed, accuracy) {
    this.isLocked = true;
    if (window.audioEngine) {
      window.audioEngine.stopAllAudio();
      window.audioEngine.playStar();
    }
    if (window.mascotPipi) {
      window.mascotPipi.speak(`时间到啦！本次完成了 ${completed} 道生字连线，非常努力，休息一下继续挑战吧！`);
    }

    const modal = document.createElement('div');
    modal.id = 'challenge-timeout-modal';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn';
    modal.innerHTML = `
      <div class="bg-gradient-to-b from-orange-50 to-amber-100 rounded-3xl p-6 sm:p-8 max-w-md w-full border-4 border-orange-300 shadow-2xl text-center select-none space-y-4">
        <div class="text-7xl animate-pulse">⏰ 🥈 ⭐</div>
        <h3 class="text-2xl sm:text-3xl font-black text-amber-950">
          倒计时结束！战报结算
        </h3>
        <p class="text-sm font-extrabold text-orange-700">
          已停止计时 · 战绩已永久记录进档案
        </p>

        <div class="bg-white/90 p-4 rounded-2xl border border-amber-200 text-xs font-bold text-amber-950 text-left space-y-2">
          <div class="flex items-center justify-between pb-1.5 border-b border-amber-100">
            <span>⏱️ 规定限时:</span>
            <span class="font-mono text-sm font-black text-neutral-800">${this.challengeDurationMinutes} 分钟</span>
          </div>
          <div class="flex items-center justify-between pb-1.5 border-b border-amber-100">
            <span>🎯 最终完成:</span>
            <span class="font-black text-sm text-orange-600">${completed} / ${this.challengeTargetQuestions} 题</span>
          </div>
          <div class="flex items-center justify-between pb-1.5 border-b border-amber-100">
            <span>📊 答题正确率:</span>
            <span class="font-black text-sm text-indigo-700">${accuracy}%</span>
          </div>
          <div class="text-[11px] text-neutral-500 pt-1">
            💡 坚持不懈是成功的基石！多练几次熟悉声韵调拆解，一定能拿到金牌！
          </div>
        </div>

        <div class="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
          <button id="btn-timeout-retry" class="flex-1 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-extrabold py-3 px-4 rounded-2xl shadow-lg border border-rose-300 transition active:scale-95 text-sm cursor-pointer">
            🔄 再次挑战
          </button>
          <button id="btn-timeout-history" class="flex-1 bg-white hover:bg-amber-100 text-amber-900 font-extrabold py-3 px-4 rounded-2xl shadow-md border border-amber-300 transition active:scale-95 text-sm cursor-pointer">
            📜 查看战报
          </button>
          <button id="btn-timeout-practice" class="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-3 px-4 rounded-2xl border border-neutral-300 transition text-sm cursor-pointer">
            🌱 常规练习
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-timeout-retry')?.addEventListener('click', () => {
      modal.remove();
      this.startChallenge();
    });

    modal.querySelector('#btn-timeout-history')?.addEventListener('click', () => {
      modal.remove();
      this.showChallengeHistoryModal();
    });

    modal.querySelector('#btn-timeout-practice')?.addEventListener('click', () => {
      modal.remove();
      this.gameMode = 'practice';
      this.correctCount = 0;
      this.render();
    });
  }

  /**
   * 挑战战报历史记录档案弹窗
   */
  showChallengeHistoryModal() {
    const history = this.getChallengeHistory();
    const modal = document.createElement('div');
    modal.id = 'challenge-history-modal';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn';

    const renderList = () => {
      if (history.length === 0) {
        return `
          <div class="py-12 text-center text-neutral-400 space-y-2">
            <div class="text-5xl">📜</div>
            <p class="text-sm font-bold">暂无挑战战报记录</p>
            <p class="text-xs">快去开启一次【20分钟·20题】限时挑战，挑战成功后将在此记录战报！</p>
          </div>
        `;
      }

      return `
        <div class="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          ${history.map((item, idx) => {
            const isGold = item.isSuccess;
            return `
              <div class="p-3 rounded-2xl border ${isGold ? 'border-amber-300 bg-amber-50/70' : 'border-neutral-200 bg-white'} shadow-xs flex items-center justify-between gap-3 text-left">
                <div class="flex items-center space-x-2.5">
                  <div class="text-2xl">${isGold ? '🥇' : '🥈'}</div>
                  <div>
                    <div class="flex items-center space-x-2">
                      <span class="font-black text-xs text-neutral-900">${item.date} ${item.time}</span>
                      <span class="text-[10px] font-bold px-1.5 py-0.2 rounded-full ${isGold ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}">
                        ${isGold ? '挑战成功' : '超时结算'}
                      </span>
                    </div>
                    <div class="text-[11px] text-neutral-500 font-bold mt-0.5">
                      目标: ${item.targetQuestions} 题 · 用时: <span class="text-neutral-800 font-black">${this.formatElapsedCn(item.elapsedSeconds)}</span> (限时 ${item.durationMinutes}分)
                    </div>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <div class="font-mono text-sm font-black text-rose-600">${item.completedQuestions}/${item.targetQuestions} 题</div>
                  <div class="text-[11px] font-bold text-neutral-500">正确率: ${item.accuracy}%</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    };

    modal.innerHTML = `
      <div class="bg-gradient-to-b from-amber-50 via-white to-amber-50 rounded-3xl p-5 sm:p-7 max-w-lg w-full border-4 border-amber-300 shadow-2xl select-none space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-amber-200">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">📜</span>
            <div class="text-left">
              <h3 class="text-lg font-black text-amber-950">拼音连线 · 挑战战报档案</h3>
              <p class="text-xs text-amber-700 font-bold">永久记录每次限时挑战的用时、题数与正确率</p>
            </div>
          </div>
          <button id="btn-close-history" class="text-neutral-400 hover:text-neutral-600 text-2xl font-black transition p-1 cursor-pointer">×</button>
        </div>

        <div id="history-content-box">
          ${renderList()}
        </div>

        <div class="pt-2 flex items-center justify-between border-t border-amber-200">
          ${history.length > 0 ? `
            <button id="btn-clear-history" class="text-xs text-neutral-400 hover:text-rose-600 font-bold transition flex items-center space-x-1 cursor-pointer">
              <span>🗑️</span>
              <span>清空历史记录</span>
            </button>
          ` : '<div></div>'}
          <button id="btn-close-history-bottom" class="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs shadow-sm transition active:scale-95 cursor-pointer">
            确定
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#btn-close-history')?.addEventListener('click', closeModal);
    modal.querySelector('#btn-close-history-bottom')?.addEventListener('click', closeModal);

    modal.querySelector('#btn-clear-history')?.addEventListener('click', () => {
      if (confirm('确定要清空所有挑战历史战报吗？')) {
        this.clearChallengeHistory();
        modal.remove();
        this.showChallengeHistoryModal();
      }
    });
  }

  /**
   * 开始一题新题目
   */
  startNewQuestion() {
    this.currentQuestion = this.generateQuestion();
    if (!this.currentQuestion) return;

    this.currentStep = 0;
    this.connectedCards = { col1: null, col2: null, col3: null, col4: null };
    this.completedLines = [];
    this.isLocked = false;

    // 清空 SVG 连线
    const g = this.container.querySelector('#svg-completed-group');
    if (g) g.innerHTML = '';
    const dragLine = this.container.querySelector('#svg-drag-line');
    if (dragLine) {
      dragLine.setAttribute('d', '');
      dragLine.style.opacity = '0';
    }

    // 更新任务提示文本
    const missionText = this.container.querySelector('#link-mission-text');
    if (missionText) {
      const t = this.currentQuestion.target;
      const wordHint = t.words && t.words[0] ? `（${t.words[0]}）` : '';
      missionText.innerHTML = `
        请把汉字【<strong class="text-white text-base sm:text-lg underline underline-offset-4 decoration-amber-200">${t.char}</strong>】${wordHint} 连向它的声母、韵母与声调！
      `;
    }

    // 渲染第 1 列卡片 (汉字)
    const col1Box = this.container.querySelector('#col1-container');
    if (col1Box) {
      col1Box.innerHTML = this.currentQuestion.col1.map(item => {
        const isTarget = item.char === this.currentQuestion.target.char;
        return `
          <div class="link-card link-col1-card group relative bg-white hover:bg-amber-50/80 active:scale-95 rounded-2xl p-2.5 sm:p-3 border-2 ${isTarget ? 'border-amber-400 shadow-md ring-2 ring-amber-300/60' : 'border-neutral-200 shadow-xs'} transition flex flex-col items-center justify-center cursor-pointer min-h-[96px] sm:min-h-[110px]"
               data-col="1" data-char="${item.char}" data-target="${isTarget}">
            <!-- 田字格浅底背景框 -->
            <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-red-200 bg-red-50/30 flex items-center justify-center relative shadow-inner mb-1">
              <span class="text-2xl sm:text-3xl font-black text-neutral-900">${item.char}</span>
              ${isTarget ? '<span class="absolute -top-2 -right-2 text-xs">🎯</span>' : ''}
            </div>
            <div class="text-[11px] text-neutral-500 font-bold truncate max-w-[80px]">
              ${item.words && item.words[0] ? item.words[0] : ''}
            </div>
            <!-- 右侧连线触手圆点 (out) -->
            <span class="link-anchor link-anchor-out absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-400 border-2 border-white shadow-sm flex items-center justify-center transition group-hover:scale-125">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-900"></span>
            </span>
          </div>
        `;
      }).join('');
    }

    // 渲染第 2 列卡片 (声母)
    const col2Box = this.container.querySelector('#col2-container');
    if (col2Box) {
      col2Box.innerHTML = this.currentQuestion.col2.map(item => {
        return `
          <div class="link-card link-col2-card group relative bg-white hover:bg-sky-50 active:scale-95 rounded-2xl p-2 sm:p-2.5 border-2 border-neutral-200 shadow-xs transition flex flex-col items-center justify-center cursor-pointer min-h-[68px] sm:min-h-[76px]"
               data-col="2" data-val="${item.val}" data-correct="${item.isCorrect}">
            <!-- 左侧连线触手圆点 (in) -->
            <span class="link-anchor link-anchor-in absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-sky-300 border-2 border-white shadow-sm flex items-center justify-center transition group-hover:scale-125"></span>
            
            <div class="font-pinyin text-xl sm:text-2xl font-black ${item.isZero ? 'text-sky-800 text-sm sm:text-base' : 'text-neutral-800'}">
              ${item.display}
            </div>
            <div class="text-[10px] text-sky-700 font-bold opacity-75">
              ${item.sub}
            </div>

            <!-- 右侧连线触手圆点 (out) -->
            <span class="link-anchor link-anchor-out absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-sky-400 border-2 border-white shadow-sm flex items-center justify-center transition group-hover:scale-125">
              <span class="w-1.5 h-1.5 rounded-full bg-sky-900"></span>
            </span>
          </div>
        `;
      }).join('');
    }

    // 渲染第 3 列卡片 (韵母)
    const col3Box = this.container.querySelector('#col3-container');
    if (col3Box) {
      col3Box.innerHTML = this.currentQuestion.col3.map(item => {
        return `
          <div class="link-card link-col3-card group relative bg-white hover:bg-purple-50 active:scale-95 rounded-2xl p-2 sm:p-2.5 border-2 border-neutral-200 shadow-xs transition flex flex-col items-center justify-center cursor-pointer min-h-[68px] sm:min-h-[76px]"
               data-col="3" data-val="${item.val}" data-correct="${item.isCorrect}">
            <!-- 左侧连线触手圆点 (in) -->
            <span class="link-anchor link-anchor-in absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-purple-300 border-2 border-white shadow-sm flex items-center justify-center transition group-hover:scale-125"></span>
            
            <div class="font-pinyin text-xl sm:text-2xl font-black text-neutral-800">
              ${item.display}
            </div>
            <div class="text-[10px] text-purple-700 font-bold opacity-75">
              ${item.sub}
            </div>

            <!-- 右侧连线触手圆点 (out) -->
            <span class="link-anchor link-anchor-out absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-purple-400 border-2 border-white shadow-sm flex items-center justify-center transition group-hover:scale-125">
              <span class="w-1.5 h-1.5 rounded-full bg-purple-900"></span>
            </span>
          </div>
        `;
      }).join('');
    }

    // 渲染第 4 列卡片 (声调)
    const col4Box = this.container.querySelector('#col4-container');
    if (col4Box) {
      col4Box.innerHTML = this.currentQuestion.col4.map(item => {
        return `
          <div class="link-card link-col4-card group relative bg-white hover:bg-emerald-50 active:scale-95 rounded-2xl p-1.5 sm:p-2 border-2 border-neutral-200 shadow-xs transition flex items-center justify-between px-3 cursor-pointer min-h-[52px] sm:min-h-[58px]"
               data-col="4" data-tone="${item.val}" data-correct="${item.isCorrect}">
            <!-- 左侧连线触手圆点 (in) -->
            <span class="link-anchor link-anchor-in absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow-sm flex items-center justify-center transition group-hover:scale-125"></span>
            
            <div class="flex items-center space-x-2">
              <span class="text-2xl sm:text-3xl font-black text-emerald-800 font-pinyin leading-none">${item.mark}</span>
              <span class="text-xs font-bold text-neutral-700">${item.name}</span>
            </div>
            <span class="text-[10px] font-bold text-emerald-600/70 hidden sm:inline">${item.val === 0 ? '不标调' : item.val + '声'}</span>
          </div>
        `;
      }).join('');
    }

    // 自动高亮并选中 Col 1 中的目标字作为起点
    const targetCard = this.container.querySelector(`.link-col1-card[data-target="true"]`);
    if (targetCard) {
      this.connectedCards.col1 = targetCard;
      this.currentStep = 1;
      targetCard.classList.remove('border-neutral-200');
      targetCard.classList.add('border-amber-500', 'bg-amber-100/70', 'ring-4', 'ring-amber-300/80', 'scale-[1.02]');
    }

    // 防作弊打卡新题目
    if (window.antiCheat) {
      window.antiCheat.markQuestionStart(350);
    }

    // 朗读任务提示
    this.playMissionAudio();
  }

  /**
   * 朗读当前题目语音提示
   */
  playMissionAudio() {
    if (!this.currentQuestion) return;
    const t = this.currentQuestion.target;
    if (window.audioEngine) {
      window.audioEngine.stopAllAudio();
      window.audioEngine.speak(`【${t.char}】`);
    }
  }

  /**
   * 选中卡片并驱动游戏流程状态
   */
  selectCard(cardEl, col) {
    if (!cardEl) return;

    if (col === 1) {
      // 选汉字
      const isTarget = cardEl.dataset.target === 'true';
      if (!isTarget) {
        // 提示应连目标字
        if (window.audioEngine) {
          window.audioEngine.playGentleOops();
          window.audioEngine.speak(`请连出目标字【${this.currentQuestion.target.char}】哦`);
        }
        cardEl.classList.add('animate-shake');
        setTimeout(() => cardEl.classList.remove('animate-shake'), 500);
        return;
      }

      // 清空之前未完成的连线 (无递归)
      this.clearChainLines();
      this.connectedCards.col1 = cardEl;
      this.currentStep = 1;

      // 视觉激活高亮
      cardEl.classList.remove('border-neutral-200');
      cardEl.classList.add('border-amber-500', 'bg-amber-100/70', 'ring-4', 'ring-amber-300/80', 'scale-[1.02]');

      const t = this.currentQuestion.target;
      if (window.audioEngine) {
        window.audioEngine.speak(t.char);
      }
    }
  }

  /**
   * 尝试将当前链路连接到指定卡片
   */
  tryConnectTo(targetCardEl, targetCol) {
    if (this.isLocked || !targetCardEl) return;

    // 检查防作弊冷冻期
    if (window.antiCheat && window.antiCheat.isFrozen) {
      return;
    }

    // 如果目标是 Col 1，切换起点字
    if (targetCol === 1) {
      this.selectCard(targetCardEl, 1);
      return;
    }

    // 校验连线步骤顺序 (必须 1 -> 2 -> 3 -> 4)
    if (targetCol !== this.currentStep + 1) {
      const stepNames = ['', '汉字', '声母', '韵母', '声调'];
      if (window.audioEngine) {
        window.audioEngine.playGentleOops();
        window.audioEngine.speak(`请先连【${stepNames[this.currentStep + 1]}】哦！`);
      }
      targetCardEl.classList.add('animate-shake');
      setTimeout(() => targetCardEl.classList.remove('animate-shake'), 450);
      return;
    }

    // 校验正确性
    const isCorrect = targetCardEl.dataset.correct === 'true';
    const fromColKey = `col${this.currentStep}`;
    const toColKey = `col${targetCol}`;
    const fromCardEl = this.connectedCards[fromColKey];

    if (!fromCardEl) {
      this.resetCurrentChain();
      return;
    }

    if (isCorrect) {
      // 答对了当前节点
      this.connectedCards[toColKey] = targetCardEl;
      
      // 连线特效
      this.drawPermanentLine(fromCardEl, targetCardEl, this.currentStep, targetCol);

      // 高亮目标卡片
      targetCardEl.classList.remove('border-neutral-200');
      targetCardEl.classList.add('border-emerald-500', 'bg-emerald-50', 'ring-3', 'ring-emerald-300', 'scale-105');

      // 播放对应部件发音
      this.playComponentAudio(targetCol, targetCardEl);

      // 步进
      this.currentStep = targetCol;

      // 检查整条音节链路是否完成 (达到第4步：声调)
      if (this.currentStep === 4) {
        this.handleChainSuccess();
      }
    } else {
      // 选错了
      this.handleMistake(targetCardEl, targetCol);
    }
  }

  /**
   * 播放连对组件的专属发音
   */
  playComponentAudio(col, cardEl) {
    if (!window.audioEngine) return;
    const t = this.currentQuestion.target;

    if (col === 2) {
      // 声母
      if (t.initial === '') {
        window.audioEngine.speak('零声母');
      } else {
        window.audioEngine.speak(t.initial);
      }
    } else if (col === 3) {
      // 韵母
      window.audioEngine.speak(t.final);
    } else if (col === 4) {
      // 声调
      const toneNames = ['轻声', '第一声', '第二声', '第三声', '第四声'];
      window.audioEngine.speak(toneNames[t.tone] || '一声');
    }
  }

  /**
   * 错误处理
   */
  handleMistake(cardEl, col) {
    if (window.antiCheat) {
      window.antiCheat.recordMistake();
    }
    if (window.screenTimeLock) {
      window.screenTimeLock.recordAnswer(false);
    }
    if (window.audioEngine) {
      window.audioEngine.playGentleOops();
    }

    if (this.gameMode === 'challenge') {
      this.challengeMistakes += 1;
    }

    cardEl.classList.add('animate-shake', 'border-rose-400', 'bg-rose-50');
    setTimeout(() => {
      cardEl.classList.remove('animate-shake', 'border-rose-400', 'bg-rose-50');
    }, 500);

    const stepNames = ['', '汉字', '声母', '韵母', '声调'];
    const t = this.currentQuestion.target;
    if (window.audioEngine) {
      window.audioEngine.speak(`再想想，【${t.char}】的${stepNames[col]}是哪一个呢？`);
    }

    this.streak = 0;
    this.updateStatsUI();
  }

  /**
   * 链路全部拼合成功
   */
  handleChainSuccess() {
    this.isLocked = true;
    const t = this.currentQuestion.target;

    if (window.antiCheat) {
      window.antiCheat.recordAnswerTime();
    }
    if (window.screenTimeLock) {
      window.screenTimeLock.recordAnswer(true);
    }

    // 更新积分与连对
    this.score += 10;
    this.streak += 1;
    this.correctCount += 1;
    this.updateStatsUI();

    // 庆祝动效
    const lastCard = this.connectedCards.col4;
    if (window.celebrationFX) {
      window.celebrationFX.registerCorrect(lastCard);
    }

    // 全链条发光脉冲
    this.pulseWholeChain();

    // 智能连读发音："m - ā -> mā! 妈妈的妈！"
    setTimeout(() => {
      if (window.audioEngine) {
        window.audioEngine.playSuccess();
        const pinyinWithTone = t.pinyin;
        const wordText = t.words && t.words[0] ? `${t.words[0]}的${t.char}` : t.char;
        const initialSpell = t.initial ? `${t.initial}，` : '';
        window.audioEngine.speak(`${initialSpell}${t.final}，${pinyinWithTone}！${wordText}！`);
      }
    }, 400);

    // 模式通关校验
    if (this.gameMode === 'challenge') {
      // 挑战模式：更新进度条
      const progText = this.container.querySelector('#challenge-progress-text');
      if (progText) progText.innerText = `${this.correctCount}/${this.challengeTargetQuestions}`;
      const progBar = this.container.querySelector('#challenge-progress-bar');
      if (progBar) {
        const pct = Math.min(100, Math.round((this.correctCount / this.challengeTargetQuestions) * 100));
        progBar.style.width = `${pct}%`;
      }

      // 核心需求：在指定时间（如20分钟）内至少正确完成指定题数（如20题）后，立即停止计时，并记录完成情况
      if (this.correctCount >= this.challengeTargetQuestions) {
        this.stopChallengeTimer();
        const elapsedSeconds = this.challengeTotalSeconds - this.challengeTimeRemaining;
        const totalTries = this.correctCount + this.challengeMistakes;
        const accuracy = totalTries > 0 ? Math.round((this.correctCount / totalTries) * 100) : 100;

        // 保存战报至本地历史档案
        this.saveChallengeRecord({
          targetQuestions: this.challengeTargetQuestions,
          completedQuestions: this.correctCount,
          durationMinutes: this.challengeDurationMinutes,
          elapsedSeconds: elapsedSeconds,
          mistakes: this.challengeMistakes,
          accuracy: accuracy,
          score: this.score,
          isSuccess: true,
          bookName: this.currentBook === 'vol1' ? '一年级上册' : (this.currentBook === 'vol2' ? '一年级下册' : '上下册全集')
        });

        setTimeout(() => {
          this.showChallengeVictoryModal(elapsedSeconds, accuracy);
        }, 2200);
        return;
      } else {
        setTimeout(() => {
          this.startNewQuestion();
        }, 2200);
        return;
      }
    } else {
      // 常规练习模式 (5 题通关)
      if (this.correctCount >= this.targetCorrect) {
        setTimeout(() => {
          this.showVictoryModal();
        }, 2200);
      } else {
        setTimeout(() => {
          this.startNewQuestion();
        }, 2300);
      }
    }
  }

  pulseWholeChain() {
    Object.values(this.connectedCards).forEach(card => {
      if (card) {
        card.classList.add('ring-4', 'ring-yellow-400', 'scale-105');
        setTimeout(() => {
          card.classList.remove('ring-4', 'ring-yellow-400', 'scale-105');
        }, 1200);
      }
    });

    const g = this.container.querySelector('#svg-completed-group');
    if (g) {
      g.querySelectorAll('path').forEach(p => {
        p.setAttribute('stroke', '#facc15');
        p.setAttribute('stroke-width', '8');
      });
    }
  }

  /**
   * 清理已画的连接线与高亮 (不递归)
   */
  clearChainLines() {
    this.completedLines = [];
    const g = this.container.querySelector('#svg-completed-group');
    if (g) g.innerHTML = '';

    const dragLine = this.container.querySelector('#svg-drag-line');
    if (dragLine) {
      dragLine.style.opacity = '0';
      dragLine.setAttribute('d', '');
    }

    // 取消所有卡片选中高亮
    this.container.querySelectorAll('.link-card').forEach(card => {
      card.classList.remove(
        'border-emerald-500', 'bg-emerald-50', 'ring-3', 'ring-emerald-300',
        'border-amber-500', 'bg-amber-100/70', 'ring-4', 'ring-amber-300/80',
        'ring-4', 'ring-yellow-400', 'scale-105', 'scale-[1.02]'
      );
      card.classList.add('border-neutral-200');
    });

    this.connectedCards = { col1: null, col2: null, col3: null, col4: null };
  }

  /**
   * 重设当前正在连的线
   */
  resetCurrentChain() {
    this.clearChainLines();
    this.currentStep = 0;

    // 恢复 Col 1 目标字高亮并作为起点
    const targetCard = this.container.querySelector(`.link-col1-card[data-target="true"]`);
    if (targetCard) {
      this.connectedCards.col1 = targetCard;
      this.currentStep = 1;
      targetCard.classList.remove('border-neutral-200');
      targetCard.classList.add('border-amber-500', 'bg-amber-100/70', 'ring-4', 'ring-amber-300/80', 'scale-[1.02]');
    }
  }

  updateStatsUI() {
    const s = this.container.querySelector('#link-game-score');
    if (s) s.innerText = this.score;

    const st = this.container.querySelector('#link-game-streak');
    if (st) st.innerText = this.streak;

    const c = this.container.querySelector('#link-correct-count');
    const targetQ = this.gameMode === 'challenge' ? this.challengeTargetQuestions : this.targetCorrect;
    if (c) c.innerText = `${this.correctCount}/${targetQ}`;
  }

  /**
   * 绘制永久锁定连接线
   */
  drawPermanentLine(fromCard, toCard, fromCol, toCol) {
    const svgEl = this.container.querySelector('#link-svg-canvas');
    const g = this.container.querySelector('#svg-completed-group');
    if (!svgEl || !g) return;

    this.completedLines.push({ fromCard, toCard, fromCol, toCol });

    const p1 = this.getAnchorCoords(fromCard, 'out', svgEl);
    const p2 = this.getAnchorCoords(toCard, 'in', svgEl);
    const pathD = this.computeBezier(p1.x, p1.y, p2.x, p2.y);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'url(#lineGradSuccess)');
    path.setAttribute('stroke-width', '6');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('filter', 'url(#glowEffect)');
    path.classList.add('animate-fadeIn');

    g.appendChild(path);
  }

  /**
   * 重新计算并重绘所有完成的线（适应 iPad 屏幕旋转与缩放）
   */
  redrawAllLines() {
    const svgEl = this.container.querySelector('#link-svg-canvas');
    const g = this.container.querySelector('#svg-completed-group');
    if (!svgEl || !g) return;

    g.innerHTML = '';
    this.completedLines.forEach(line => {
      const p1 = this.getAnchorCoords(line.fromCard, 'out', svgEl);
      const p2 = this.getAnchorCoords(line.toCard, 'in', svgEl);
      const pathD = this.computeBezier(p1.x, p1.y, p2.x, p2.y);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathD);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'url(#lineGradSuccess)');
      path.setAttribute('stroke-width', '6');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('filter', 'url(#glowEffect)');
      g.appendChild(path);
    });
  }

  getAnchorCoords(cardEl, side, svgEl) {
    if (!cardEl || !svgEl) return { x: 0, y: 0 };
    const anchor = side === 'out'
      ? (cardEl.querySelector('.link-anchor-out') || cardEl)
      : (cardEl.querySelector('.link-anchor-in') || cardEl);
    if (!anchor || typeof anchor.getBoundingClientRect !== 'function') return { x: 0, y: 0 };
    const rect = anchor.getBoundingClientRect();
    const svgRect = svgEl.getBoundingClientRect();
    return {
      x: (rect.left + rect.width / 2) - svgRect.left,
      y: (rect.top + rect.height / 2) - svgRect.top
    };
  }

  computeBezier(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1) * 0.55;
    const cx1 = x1 + dx;
    const cx2 = x2 - dx;
    return `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
  }

  /**
   * 清理注册在 window 上的手势监听器，防止多重绑定与内存泄漏
   */
  cleanupGestureListeners() {
    if (this._onPointerMove) {
      window.removeEventListener('pointermove', this._onPointerMove);
      this._onPointerMove = null;
    }
    if (this._onPointerUp) {
      window.removeEventListener('pointerup', this._onPointerUp);
      window.removeEventListener('pointercancel', this._onPointerUp);
      this._onPointerUp = null;
    }
  }

  /**
   * 建立触屏与鼠标手势引擎 (拖拽划线 + 点击直连双兼容)
   */
  setupGestureInteraction() {
    this.cleanupGestureListeners();
    const stage = this.container.querySelector('#link-stage-wrapper');
    const svgEl = this.container.querySelector('#link-svg-canvas');
    const dragLine = this.container.querySelector('#svg-drag-line');
    if (!stage || !svgEl || !dragLine) return;

    let hasMoved = false;

    const onPointerDown = (e) => {
      if (this.isLocked) return;

      const card = e.target.closest('.link-card');
      if (!card) return;

      const col = parseInt(card.dataset.col, 10);
      hasMoved = false;

      // 允许从当前正在等待下一步的节点拖出 (如：Step 1 时可从 Col 1 拖出，Step 2 时可从 Col 2 拖出)
      if (col === this.currentStep || (col === 1 && this.currentStep === 0)) {
        if (col === 1 && this.currentStep === 0) {
          this.selectCard(card, 1);
        }

        const startPos = this.getAnchorCoords(card, 'out', svgEl);
        this.dragState = {
          isDragging: true,
          fromCol: col,
          fromCard: card,
          startX: startPos.x,
          startY: startPos.y
        };

        dragLine.style.opacity = '1';
        dragLine.setAttribute('d', `M ${startPos.x} ${startPos.y} L ${startPos.x} ${startPos.y}`);
        e.preventDefault();
      }
    };

    const onPointerMove = (e) => {
      if (!this.dragState.isDragging) return;
      hasMoved = true;

      const svgRect = svgEl.getBoundingClientRect();
      const currentX = e.clientX - svgRect.left;
      const currentY = e.clientY - svgRect.top;

      const d = this.computeBezier(this.dragState.startX, this.dragState.startY, currentX, currentY);
      dragLine.setAttribute('d', d);

      // 检查当前手指/鼠标滑入哪张候选卡片
      const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
      const hoveredCard = elemBelow ? elemBelow.closest('.link-card') : null;

      this.container.querySelectorAll('.link-card').forEach(c => {
        if (c !== this.connectedCards.col1 && c !== this.connectedCards.col2 && c !== this.connectedCards.col3 && c !== this.connectedCards.col4) {
          c.classList.remove('ring-4', 'ring-sky-400');
        }
      });

      if (hoveredCard) {
        const hCol = parseInt(hoveredCard.dataset.col, 10);
        if (hCol === this.dragState.fromCol + 1) {
          hoveredCard.classList.add('ring-4', 'ring-sky-400');
        }
      }
    };

    const onPointerUp = (e) => {
      const wasDragging = this.dragState.isDragging;
      this.dragState.isDragging = false;
      dragLine.style.opacity = '0';
      dragLine.setAttribute('d', '');

      // 移除临时悬停高亮
      this.container.querySelectorAll('.link-card').forEach(c => {
        if (c !== this.connectedCards.col1 && c !== this.connectedCards.col2 && c !== this.connectedCards.col3 && c !== this.connectedCards.col4) {
          c.classList.remove('ring-4', 'ring-sky-400');
        }
      });

      // 寻找松手或点击位置的卡片
      const elemBelow = document.elementFromPoint(e.clientX, e.clientY);
      const cardUnderPointer = elemBelow ? elemBelow.closest('.link-card') : null;

      if (wasDragging && hasMoved) {
        // 拖拽划线释放
        if (cardUnderPointer) {
          const toCol = parseInt(cardUnderPointer.dataset.col, 10);
          this.tryConnectTo(cardUnderPointer, toCol);
        }
      } else {
        // 点击模式 (Tap / Click Mode)
        const clickedCard = cardUnderPointer || e.target.closest('.link-card');
        if (clickedCard) {
          const col = parseInt(clickedCard.dataset.col, 10);
          this.tryConnectTo(clickedCard, col);
        }
      }
    };

    this._onPointerMove = onPointerMove;
    this._onPointerUp = onPointerUp;

    stage.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  /**
   * 常规模式答对 5 次通关弹窗
   */
  showVictoryModal() {
    this.isLocked = true;
    if (window.audioEngine) {
      window.audioEngine.stopAllAudio();
      window.audioEngine.playFanfare();
    }
    if (window.celebrationFX) {
      window.celebrationFX.launchConfetti(4000);
    }
    if (window.app && window.app.state) {
      window.app.state.addStars(5);
    }
    if (window.mascotPipi) {
      window.mascotPipi.speak('🎉 太棒啦！拼音连线答对 5 题通关！声韵调拆解完全掌握！', true);
    }

    const modal = document.createElement('div');
    modal.id = 'link-victory-modal';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn';
    modal.innerHTML = `
      <div class="bg-gradient-to-b from-amber-50 to-orange-100 rounded-3xl p-6 sm:p-8 max-w-md w-full border-4 border-amber-400 shadow-2xl text-center select-none space-y-4">
        <div class="text-7xl animate-bounce">🏆 🌟 🔗</div>
        <h3 class="text-2xl sm:text-3xl font-black text-amber-950">
          恭喜通关！答对 5 题达成！
        </h3>
        <p class="text-sm font-extrabold text-emerald-600">
          已获得 5 颗闪亮星币 ⭐ · 汉字声韵调组装大师！
        </p>

        <div class="bg-white/80 p-3.5 rounded-2xl border border-amber-200 text-xs font-bold text-amber-900 leading-relaxed text-left space-y-1">
          <p>🎯 <strong>学习总结</strong>：顺利通过统编人教版一年级生字声韵调拆解连线考验！</p>
          <p>✨ <strong>最终得分</strong>：<span class="text-amber-600 font-black text-sm">${this.score}</span> 分</p>
          <p>🔥 <strong>最大连对</strong>：<span class="text-orange-600 font-black text-sm">${this.streak}</span> 题</p>
        </div>

        <div class="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
          <button id="btn-victory-replay" class="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-3 px-4 rounded-2xl shadow-lg border border-amber-300 transition active:scale-95 text-sm cursor-pointer">
            🔄 再练一轮
          </button>
          <button id="btn-victory-try-challenge" class="flex-1 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-extrabold py-3 px-4 rounded-2xl shadow-lg border border-rose-300 transition active:scale-95 text-sm cursor-pointer">
            ⚡ 挑战模式
          </button>
          <button id="btn-victory-switch" class="flex-1 bg-white hover:bg-amber-100 text-amber-900 font-extrabold py-3 px-4 rounded-2xl shadow-md border border-amber-300 transition active:scale-95 text-sm cursor-pointer">
            📚 换教材
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-victory-replay')?.addEventListener('click', () => {
      modal.remove();
      this.correctCount = 0;
      this.render();
    });

    modal.querySelector('#btn-victory-try-challenge')?.addEventListener('click', () => {
      modal.remove();
      this.showChallengeSetupModal();
    });

    modal.querySelector('#btn-victory-switch')?.addEventListener('click', () => {
      modal.remove();
      this.currentBook = this.currentBook === 'vol1' ? 'vol2' : 'vol1';
      this.correctCount = 0;
      this.render();
    });
  }

  /**
   * 静态工具：呼起历史战报档案弹窗 (供家长小助手等跨组件调用)
   */
  static showHistoryModal() {
    const dummy = new PinyinDecomposeLinkGame();
    dummy.showChallengeHistoryModal();
  }

  /**
   * 静态工具：刷新家长小助手中的挑战战报摘要卡片
   */
  static updateParentSummary() {
    const box = document.getElementById('parent-link-challenge-summary');
    if (!box) return;
    const g = new PinyinDecomposeLinkGame();
    const history = g.getChallengeHistory();
    if (!history || history.length === 0) {
      box.innerHTML = `
        <div class="flex items-center justify-between text-neutral-500 py-1">
          <span>暂无挑战记录，鼓励孩子前往【拼音连线】开启 20分钟·20题 限时冲刺！</span>
        </div>
      `;
    } else {
      const latest = history[0];
      const isGold = latest.isSuccess;
      box.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-base">${isGold ? '🥇' : '🥈'}</span>
            <div>
              <div class="font-bold text-neutral-800 text-xs">
                最新战报：${latest.completedQuestions}/${latest.targetQuestions} 题 (${isGold ? '<span class="text-emerald-600 font-black">挑战成功</span>' : '<span class="text-orange-600 font-bold">超时结算</span>'})
              </div>
              <div class="text-[10px] text-neutral-500">
                用时: ${g.formatElapsedCn(latest.elapsedSeconds)} (限时 ${latest.durationMinutes}分) · 正确率: ${latest.accuracy}% · ${latest.date} ${latest.time || ''}
              </div>
            </div>
          </div>
          <div class="text-right">
            <span class="text-[11px] font-black text-rose-600">累计挑战 ${history.length} 次</span>
          </div>
        </div>
      `;
    }
  }
}

// 挂载至全局与系统集成
if (typeof window !== 'undefined') {
  window.PinyinDecomposeLinkGame = PinyinDecomposeLinkGame;

  // 1. 集成进 HanziPinyinGameHub (汉字拼音乐园第4模式)
  const hookHanziHub = () => {
    if (typeof HanziPinyinGameHub !== 'undefined' && !HanziPinyinGameHub._linkHooked) {
      HanziPinyinGameHub._linkHooked = true;

      const origRender = HanziPinyinGameHub.prototype.render;
      HanziPinyinGameHub.prototype.render = function() {
        origRender.call(this);
        if (!this.container) return;
        const btnGroup = this.container.querySelector('.hanzi-mode-btn')?.parentElement;
        if (btnGroup && !btnGroup.querySelector('.hanzi-mode-btn[data-mode="link"]')) {
          const linkBtn = document.createElement('button');
          linkBtn.className = `hanzi-mode-btn px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition ${this.mode === 'link' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-neutral-700 hover:bg-amber-100'}`;
          linkBtn.dataset.mode = 'link';
          linkBtn.innerHTML = '🔗 拼音大连线';
          linkBtn.addEventListener('click', () => {
            this.mode = 'link';
            this.correctCount = 0;
            this.render();
          });
          btnGroup.appendChild(linkBtn);
        }
      };

      const origRenderStage = HanziPinyinGameHub.prototype.renderStage;
      HanziPinyinGameHub.prototype.renderStage = function() {
        if (this.mode === 'link') {
          const stage = document.getElementById('hanzi-game-stage');
          if (!stage) return;
          stage.innerHTML = '<div id="hub-link-game-subcontainer" class="w-full"></div>';
          this.subLinkGame = new PinyinDecomposeLinkGame('hub-link-game-subcontainer');
          this.subLinkGame.render();
          return;
        }
        origRenderStage.call(this);
      };
    }
  };

  // 2. 集成进 App (view-games 与 view-link 顶层导航，以及家长小助手)
  const hookApp = () => {
    const AppClass = (typeof PinyinApp !== 'undefined') ? PinyinApp : ((typeof window !== 'undefined' && window.PinyinApp) ? window.PinyinApp : (window.app ? window.app.constructor : null));
    if (AppClass && !AppClass._linkHooked) {
      AppClass._linkHooked = true;

      // 扩展 launchGame
      const origLaunchGame = AppClass.prototype.launchGame;
      AppClass.prototype.launchGame = function(gameName) {
        if (gameName === 'link') {
          const stage = document.getElementById('active-game-stage');
          if (!stage) return;
          stage.innerHTML = '<div id="hub-games-link-subcontainer" class="w-full"></div>';
          this.gamesLinkGame = new PinyinDecomposeLinkGame('hub-games-link-subcontainer');
          this.gamesLinkGame.render();
          return;
        }
        origLaunchGame.call(this, gameName);
      };

      // 扩展 renderGamesHub
      const origRenderGamesHub = AppClass.prototype.renderGamesHub;
      AppClass.prototype.renderGamesHub = function() {
        origRenderGamesHub.call(this);
        const hub = document.getElementById('games-content-area');
        if (!hub) return;
        const tabRow = hub.querySelector('.game-select-tab')?.parentElement;
        if (tabRow && !tabRow.querySelector('.game-select-tab[data-game="link"]')) {
          const linkTab = document.createElement('button');
          linkTab.className = 'game-select-tab px-5 py-2.5 rounded-2xl font-extrabold text-sm transition bg-white text-neutral-700 hover:bg-amber-100 shrink-0';
          linkTab.dataset.game = 'link';
          linkTab.innerHTML = '🔗 拼音大连线 (新)';
          linkTab.addEventListener('click', (e) => {
            hub.querySelectorAll('.game-select-tab').forEach(t => {
              t.classList.remove('bg-amber-500', 'text-white', 'shadow-md');
              t.classList.add('bg-white', 'text-neutral-700');
            });
            e.currentTarget.classList.add('bg-amber-500', 'text-white', 'shadow-md');
            e.currentTarget.classList.remove('bg-white', 'text-neutral-700');
            this.launchGame('link');
          });
          tabRow.appendChild(linkTab);
        }
      };

      // 扩展 showView 支持 view-link
      const origShowView = AppClass.prototype.showView;
      AppClass.prototype.showView = function(viewId) {
        origShowView.call(this, viewId);
        if (viewId === 'view-link') {
          const container = document.getElementById('link-game-container');
          if (container) {
            container.innerHTML = '';
            this.topLinkGame = new PinyinDecomposeLinkGame('link-game-container');
            this.topLinkGame.render();
          }
        }
      };

      // 扩展 openParentModal 自动同步挑战战报
      const origOpenParentModal = AppClass.prototype.openParentModal;
      AppClass.prototype.openParentModal = function() {
        if (origOpenParentModal) origOpenParentModal.call(this);
        if (typeof PinyinDecomposeLinkGame !== 'undefined' && PinyinDecomposeLinkGame.updateParentSummary) {
          PinyinDecomposeLinkGame.updateParentSummary();
        }
      };
    }

    // 如果 window.app 实例已经创建，直接增强其实例方法
    if (typeof window !== 'undefined' && window.app && !window.app._linkInstanceHooked) {
      window.app._linkInstanceHooked = true;
      const appInst = window.app;
      const instShowView = appInst.showView.bind(appInst);
      appInst.showView = function(viewId) {
        instShowView(viewId);
        if (viewId === 'view-link') {
          const container = document.getElementById('link-game-container');
          if (container) {
            container.innerHTML = '';
            appInst.topLinkGame = new PinyinDecomposeLinkGame('link-game-container');
            appInst.topLinkGame.render();
          }
        }
      };

      const instOpenParentModal = appInst.openParentModal ? appInst.openParentModal.bind(appInst) : null;
      if (instOpenParentModal) {
        appInst.openParentModal = function() {
          instOpenParentModal();
          if (typeof PinyinDecomposeLinkGame !== 'undefined' && PinyinDecomposeLinkGame.updateParentSummary) {
            PinyinDecomposeLinkGame.updateParentSummary();
          }
        };
      }
    }
  };

  hookHanziHub();
  hookApp();

  // 全局直接点击兜底保障
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      // 家长小助手战报档案入口
      const parentHistoryBtn = e.target.closest('#btn-parent-open-link-history');
      if (parentHistoryBtn) {
        PinyinDecomposeLinkGame.showHistoryModal();
        return;
      }

      const btn = e.target.closest('.nav-btn[data-view="view-link"]');
      if (btn) {
        document.querySelectorAll('.main-view').forEach(v => v.classList.add('hidden'));
        const linkView = document.getElementById('view-link');
        if (linkView) linkView.classList.remove('hidden');

        document.querySelectorAll('.nav-btn').forEach(b => {
          b.classList.remove('bg-amber-400', 'text-amber-950', 'shadow-md');
          b.classList.add('text-neutral-600', 'hover:bg-amber-100');
        });
        btn.classList.add('bg-amber-400', 'text-amber-950', 'shadow-md');
        btn.classList.remove('text-neutral-600', 'hover:bg-amber-100');

        const container = document.getElementById('link-game-container');
        if (container) {
          container.innerHTML = '';
          const g = new PinyinDecomposeLinkGame('link-game-container');
          window.activeLinkGame = g;
          if (window.app) window.app.topLinkGame = g;
          g.render();
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      hookHanziHub();
      hookApp();
    });
  } else {
    hookHanziHub();
    hookApp();
  }
}
