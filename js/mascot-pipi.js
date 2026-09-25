/**
 * 伴学萌宠：魔法团子·皮皮 (Mascot Pipi)
 * 1. 软萌带翅膀的魔法团子形象，会呼吸、眨眼、扇动翅膀
 * 2. 实时情绪气泡交互：答对欢呼、连续连击戴皇冠、做错温柔抱抱
 * 3. 点击戳戳乐：咯咯笑、心心喷涌、搞怪音效
 * 4. 支持展开与折叠最小化
 */

class MascotPipi {
  constructor() {
    this.container = null;
    this.speechBubble = null;
    this.avatar = null;
    this.isMinimized = false;
    this.bubbleTimer = null;
    this.audioCtx = null;

    this.cheerPhrases = [
      '哇！你真是拼音小天才！✨',
      '太准啦！小耳朵真灵敏！👂',
      '太棒啦！星星又多了一颗！⭐',
      '连对好厉害，皮皮给你比个大心！💖',
      '越来越熟练了，拼音小勇士！🏆'
    ];

    this.comfortPhrases = [
      '别着急，深呼吸，皮皮陪你再听一次哦～💪',
      '没关系，探索就像寻宝，我们再试一次！🌈',
      '好棒的尝试！听仔细点，你一定可以的！✨'
    ];

    this.init();
  }

  ensureAudioContext() {
    if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  init() {
    if (document.getElementById('mascot-pipi-container')) return;

    this.container = document.createElement('div');
    this.container.id = 'mascot-pipi-container';
    this.container.className = 'fixed bottom-5 right-5 z-40 select-none flex flex-col items-end pointer-events-auto transition-all duration-300';

    this.container.innerHTML = `
      <!-- 萌宠对话气泡 -->
      <div id="pipi-speech-bubble" class="hidden mb-2 mr-2 bg-white/95 backdrop-blur-md text-amber-950 border-2 border-amber-300 px-3.5 py-2 rounded-2xl shadow-xl max-w-[210px] text-xs font-black relative animate-bounce">
        <span id="pipi-speech-text">嗨！我是魔法团子皮皮，今天一起冒险吧～✨</span>
        <div class="absolute -bottom-2 right-8 w-3 h-3 bg-white border-r-2 border-b-2 border-amber-300 transform rotate-45"></div>
      </div>

      <!-- 皮皮本体与控制栏 -->
      <div class="relative flex items-center">
        <!-- 最小化/展开切换小按钮 -->
        <button id="btn-toggle-pipi" class="absolute -top-2 -left-2 w-6 h-6 bg-amber-400 hover:bg-amber-500 active:scale-95 text-white rounded-full flex items-center justify-center text-xs font-bold shadow z-10" title="收起/展开萌宠">
          －
        </button>

        <!-- 皮皮动态形象 -->
        <div id="pipi-avatar-box" class="cursor-pointer transition-transform duration-300 active:scale-90 hover:scale-105" title="点击戳一戳皮皮！">
          <svg class="w-24 h-24 drop-shadow-xl" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <style>
              .pipi-float { animation: pipiFloat 3s ease-in-out infinite; transform-origin: center; }
              .pipi-wing-l { animation: wingFlapL 1.2s ease-in-out infinite alternate; transform-origin: 25px 48px; }
              .pipi-wing-r { animation: wingFlapR 1.2s ease-in-out infinite alternate; transform-origin: 75px 48px; }
              .pipi-blush { animation: blushPulse 2s ease-in-out infinite; }
              @keyframes pipiFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
              @keyframes wingFlapL { 0% { transform: rotate(-8deg); } 100% { transform: rotate(18deg); } }
              @keyframes wingFlapR { 0% { transform: rotate(8deg); } 100% { transform: rotate(-18deg); } }
              @keyframes blushPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.9; } }
            </style>

            <g class="pipi-float">
              <!-- 左小翅膀 (仙气淡紫蓝) -->
              <path class="pipi-wing-l" d="M26 48 C14 36, 6 42, 10 56 C14 64, 25 58, 28 52 Z" fill="#C7D2FE" stroke="#818CF8" stroke-width="2" />
              <!-- 右小翅膀 -->
              <path class="pipi-wing-r" d="M74 48 C86 36, 94 42, 90 56 C86 64, 75 58, 72 52 Z" fill="#C7D2FE" stroke="#818CF8" stroke-width="2" />

              <!-- 白胖软萌团子身体 -->
              <ellipse cx="50" cy="54" rx="34" ry="30" fill="#FFFDF7" stroke="#FDE68A" stroke-width="3" />
              
              <!-- 肚皮淡奶黄暖光高光 -->
              <ellipse cx="50" cy="58" rx="24" ry="20" fill="#FEF3C7" opacity="0.6" />

              <!-- 粉嘟嘟小腮红 -->
              <ellipse class="pipi-blush" cx="30" cy="56" rx="5" ry="3.5" fill="#F472B6" />
              <ellipse class="pipi-blush" cx="70" cy="56" rx="5" ry="3.5" fill="#F472B6" />

              <!-- 水灵灵大眼睛 (会眨眼微笑) -->
              <g id="pipi-eyes-normal">
                <circle cx="38" cy="48" r="4.5" fill="#1E293B" />
                <circle cx="36.5" cy="46" r="1.8" fill="#FFFFFF" />
                <circle cx="62" cy="48" r="4.5" fill="#1E293B" />
                <circle cx="60.5" cy="46" r="1.8" fill="#FFFFFF" />
              </g>

              <!-- 甜甜微翘微笑小嘴 -->
              <path id="pipi-mouth" d="M46 56 Q50 61, 54 56" stroke="#BE185D" stroke-width="2.2" stroke-linecap="round" fill="none" />

              <!-- 头顶金色小王冠 / 魔法星 -->
              <g id="pipi-crown">
                <path d="M42 27 L46 21 L50 26 L54 21 L58 27 Z" fill="#FBBF24" stroke="#D97706" stroke-width="1.5" />
                <circle cx="50" cy="19" r="2" fill="#F43F5E" />
              </g>
            </g>
          </svg>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    this.speechBubble = document.getElementById('pipi-speech-bubble');
    this.avatar = document.getElementById('pipi-avatar-box');

    this.bindEvents();

    // 进场打招呼
    setTimeout(() => {
      this.speak('嗨！我是魔法团子皮皮，今天一起快乐闯关吧～✨', true);
    }, 1200);
  }

  bindEvents() {
    // 戳一戳互动
    this.avatar?.addEventListener('click', () => {
      this.pokePipi();
    });

    // 最小化 / 展开按钮
    const toggleBtn = document.getElementById('btn-toggle-pipi');
    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMinimize();
    });
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    const toggleBtn = document.getElementById('btn-toggle-pipi');
    if (this.isMinimized) {
      if (this.avatar) this.avatar.style.transform = 'scale(0.55)';
      if (this.speechBubble) this.speechBubble.classList.add('hidden');
      if (toggleBtn) toggleBtn.innerText = '＋';
    } else {
      if (this.avatar) this.avatar.style.transform = 'scale(1)';
      if (toggleBtn) toggleBtn.innerText = '－';
      this.speak('皮皮回来啦！加油！', false);
    }
  }

  /**
   * 戳一戳皮皮互动
   */
  pokePipi() {
    if (this.isMinimized) {
      this.toggleMinimize();
      return;
    }

    // 身体Q弹晃动
    if (this.avatar) {
      this.avatar.classList.add('animate-spin');
      setTimeout(() => this.avatar?.classList.remove('animate-spin'), 600);
    }

    // 喷涌爱心特效
    this.burstHearts();

    // 播放咯咯笑纯音效
    this.playGiggleChime();

    const pokeTexts = [
      '嘻嘻，好痒呀！💖 加油拼读哦！',
      '皮皮最喜欢爱动脑筋的小朋友啦！✨',
      '摸摸小翅膀，今天一定能通关！🎉',
      '哇！被你戳中啦～一起冲呀！🚀'
    ];
    const picked = pokeTexts[Math.floor(Math.random() * pokeTexts.length)];
    this.speak(picked, false);
  }

  /**
   * 答对题目时的欢呼互动
   * @param {number} streak - 当前连对次数
   */
  cheerOnCorrect(streak = 1) {
    if (this.isMinimized) return;

    // 欢乐小跳跃
    if (this.avatar) {
      this.avatar.classList.add('animate-bounce');
      setTimeout(() => this.avatar?.classList.remove('animate-bounce'), 800);
    }

    let text = this.cheerPhrases[Math.floor(Math.random() * this.cheerPhrases.length)];
    if (streak >= 3) {
      text = `🔥 哇！${streak}连对！你的拼音小耳朵太神准啦！`;
    }

    this.speak(text, false);
  }

  /**
   * 答错或失误时的温暖打气安慰
   */
  reassureOnMistake() {
    if (this.isMinimized) return;
    const text = this.comfortPhrases[Math.floor(Math.random() * this.comfortPhrases.length)];
    this.speak(text, false);
  }

  /**
   * 说话并弹出萌宠对话泡
   */
  speak(text, withAudio = false) {
    if (!this.speechBubble || this.isMinimized) return;

    const textEl = document.getElementById('pipi-speech-text');
    if (textEl) textEl.innerText = text;

    this.speechBubble.classList.remove('hidden');

    clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => {
      if (this.speechBubble) this.speechBubble.classList.add('hidden');
    }, 3800);

    // 陪伴小精灵使用清脆灵动的魔法音阶音效，绝不使用冰冷机械合成音
    if (withAudio) {
      this.playGiggleChime();
    }
  }

  /**
   * 戳戳乐爱心粒子特效
   */
  burstHearts() {
    if (!this.avatar || !this.avatar.getBoundingClientRect) return;
    const rect = this.avatar.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    for (let i = 0; i < 6; i++) {
      const heart = document.createElement('div');
      heart.className = 'fixed z-50 pointer-events-none select-none text-xl transition-all duration-700';
      heart.innerText = ['💖', '✨', '⭐', '🎈'][Math.floor(Math.random() * 4)];
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;
      heart.style.transform = 'scale(0.5)';
      heart.style.opacity = '1';
      document.body.appendChild(heart);

      requestAnimationFrame(() => {
        const destX = x + (Math.random() * 120 - 60);
        const destY = y - (Math.random() * 80 + 30);
        heart.style.left = `${destX}px`;
        heart.style.top = `${destY}px`;
        heart.style.transform = 'scale(1.2)';
        heart.style.opacity = '0';

        setTimeout(() => heart.remove(), 700);
      });
    }
  }

  /**
   * 播放清脆活泼的可爱咯咯笑音效
   */
  playGiggleChime() {
    try {
      this.ensureAudioContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      [659.25, 783.99, 987.77, 1318.51].forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.12, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.15);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.16);
      });
    } catch (e) {}
  }
}

window.mascotPipi = new MascotPipi();
