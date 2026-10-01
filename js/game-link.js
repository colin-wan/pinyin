/**
 * 统编人教版小学语文一年级 汉字拼音四重连线游戏 (PinyinDecomposeLinkGame)
 * 涵盖：一年级上册 (300+字) 与 一年级下册 (400+字)
 * 核心机制：将汉字音节拆解为【声母】、【韵母】与【声调】四列连线
 * 交互：支持手指/笔拖拽划线与点选端点双模式，防误触，防作弊，答对5题通关
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
    if (typeof window !== 'undefined' && window.removeEventListener) {
      window.removeEventListener('resize', this.boundResize);
    }
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
   * 渲染整个游戏组件主框架
   */
  render() {
    if (!this.container) return;

    const availableUnits = this.getAvailableUnits();

    this.container.innerHTML = `
      <div id="link-game-root" class="w-full bg-gradient-to-b from-amber-50/95 via-orange-50/80 to-yellow-50/95 rounded-3xl p-3 sm:p-5 md:p-6 shadow-xl border-4 border-amber-300 select-none relative overflow-hidden">
        
        <!-- 装饰性漂浮微章 -->
        <div class="absolute -right-8 -top-8 text-8xl opacity-10 pointer-events-none select-none">🔗</div>
        <div class="absolute -left-8 -bottom-8 text-8xl opacity-10 pointer-events-none select-none">✨</div>

        <!-- 顶栏状态与控制 -->
        <div class="flex flex-col md:flex-row items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl shadow-sm border border-amber-200 mb-4">
          <!-- 标题徽章 -->
          <div class="flex items-center space-x-2.5">
            <span class="text-3xl sm:text-4xl animate-bounce">🔗</span>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="font-black text-amber-950 text-base sm:text-lg md:text-xl">汉字拼音四重连线</h3>
                <span class="bg-amber-100 text-amber-800 text-[11px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                  统编教材一年级全册
                </span>
              </div>
              <p class="text-xs text-amber-700 font-bold mt-0.5">汉字 ➔ 声母 ➔ 韵母 ➔ 声调 · 完整拼音链路组装</p>
            </div>
          </div>

          <!-- 答对统计与积分 -->
          <div class="flex items-center space-x-2 sm:space-x-3">
            <div class="bg-emerald-100/90 px-3.5 py-1.5 rounded-full border border-emerald-300 text-emerald-950 font-black text-xs sm:text-sm flex items-center space-x-1.5 shadow-sm">
              <span>🎯 答对:</span>
              <span id="link-correct-count" class="text-emerald-700 text-base font-black">${this.correctCount}/${this.targetCorrect}</span>
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

        <!-- 筛选栏：册次切换与单元筛选 -->
        <div class="flex flex-wrap items-center justify-between gap-2.5 mb-4 pb-3 border-b border-amber-200/80">
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

            <button id="btn-link-reset-line" class="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-1">
              <span>↩</span>
              <span>重连</span>
            </button>

            <button id="btn-link-skip" class="px-3 py-1.5 bg-white hover:bg-amber-100 text-neutral-700 border border-amber-300 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-1">
              <span>⏭️</span>
              <span>换题</span>
            </button>
          </div>
        </div>

        <!-- 任务指引横幅 -->
        <div id="link-mission-banner" class="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 text-white p-3 rounded-2xl shadow-md mb-4 flex items-center justify-between gap-3 border-2 border-amber-200">
          <div class="flex items-center space-x-2.5">
            <span class="text-2xl animate-pulse">🎯</span>
            <div>
              <div class="text-xs font-bold text-amber-100">当前闯关任务：</div>
              <div id="link-mission-text" class="text-sm sm:text-base font-black">
                请先在左侧选择目标汉字并连出它的声母、韵母与声调！
              </div>
            </div>
          </div>
          <button id="btn-play-mission-audio" class="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-xs border border-white/40 shadow-sm transition active:scale-95 shrink-0 flex items-center space-x-1">
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
            <span>手指从圆点拖出彩线连接，或按顺序轻触两个卡片端点自动连线。</span>
          </div>
          <div class="text-[11px] text-neutral-400">
            每轮答对 5 题即可赢得全屏礼花与星币大奖！
          </div>
        </div>

      </div>
    `;

    this.bindEvents();
    this.startNewQuestion();
  }

  /**
   * 绑定顶栏控制器事件
   */
  bindEvents() {
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
      this.selectCard(targetCard, 1);
    }

    // 防作弊打卡新题目
    if (window.antiCheat) {
      window.antiCheat.markQuestionStart(400);
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
      // 优先读目标汉字母带原音，再读提示词
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

    // 校验是否完成本轮 5 次答对通关
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
    if (c) c.innerText = `${this.correctCount}/${this.targetCorrect}`;
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
    const anchor = side === 'out'
      ? (cardEl.querySelector('.link-anchor-out') || cardEl)
      : (cardEl.querySelector('.link-anchor-in') || cardEl);
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
   * 建立触屏与鼠标手势引擎 (拖拽划线 + 点击直连双兼容)
   */
  setupGestureInteraction() {
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

    stage.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  /**
   * 答对 5 次挑战成功弹窗
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

        <div class="pt-2 flex flex-col sm:flex-row justify-center gap-3">
          <button id="btn-victory-replay" class="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-3 px-6 rounded-2xl shadow-lg border border-amber-300 transition active:scale-95 text-sm sm:text-base">
            🔄 再战一轮
          </button>
          <button id="btn-victory-switch" class="flex-1 bg-white hover:bg-amber-100 text-amber-900 font-extrabold py-3 px-6 rounded-2xl shadow-md border border-amber-300 transition active:scale-95 text-sm sm:text-base">
            📚 切换教材册次
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-victory-replay').addEventListener('click', () => {
      modal.remove();
      this.correctCount = 0;
      this.render();
    });

    modal.querySelector('#btn-victory-switch').addEventListener('click', () => {
      modal.remove();
      this.currentBook = this.currentBook === 'vol1' ? 'vol2' : 'vol1';
      this.correctCount = 0;
      this.render();
    });
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

  // 2. 集成进 App (view-games 与 view-link 顶层导航)
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
    }
  };

  hookHanziHub();
  hookApp();

  // 全局直接点击兜底保障
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
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


