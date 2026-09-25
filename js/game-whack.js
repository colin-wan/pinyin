/**
 * 趣味游戏5：拼音打地鼠·大作战 (Whack-a-Mole Game)
 * 1. 专为幼童设计的强视觉、强击打感的高手速听音互动游戏
 * 2. 彻底解决 b/d/p/q、ei/ie、an/ang 等形近音近难辨析的枯燥痛点
 * 3. 实时连击、卡通木槌击打、地鼠眼冒金星动效与丰厚星星奖励
 */

class WhackPinyinGame {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.score = 0;
    this.correctCount = 0;
    this.targetCorrect = 5;
    this.targetPinyin = 'b';
    this.holes = [];
    this.moleTimers = [];
    this.roundActive = false;
    this.audioCtx = null;

    // 常见高频易混题库 (纯净听音，无文字泄露)
    this.questionBank = [
      { target: 'b', group: ['b', 'd', 'p', 'q'] },
      { target: 'p', group: ['p', 'q', 'b', 'd'] },
      { target: 'd', group: ['d', 'b', 't', 'q'] },
      { target: 't', group: ['t', 'f', 'l', 'd'] },
      { target: 'n', group: ['n', 'm', 'u', 'h'] },
      { target: 'm', group: ['m', 'n', 'w', 'h'] },
      { target: 'f', group: ['f', 't', 'l', 'p'] },
      { target: 'k', group: ['k', 'h', 'g', 'x'] },
      { target: 'ai', group: ['ai', 'ei', 'ui', 'ao'] },
      { target: 'ie', group: ['ie', 'ei', 'ye', 'üe'] },
      { target: 'an', group: ['an', 'ang', 'en', 'ai'] },
      { target: 'ang', group: ['ang', 'an', 'eng', 'ong'] }
    ];

    this.currentQ = null;
  }

  ensureAudioContext() {
    if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
  }

  render() {
    if (!this.container) return;
    this.score = 0;
    this.correctCount = 0;

    this.container.innerHTML = `
      <div class="w-full bg-gradient-to-b from-emerald-100 via-amber-50 to-orange-100 rounded-3xl p-5 shadow-xl border-4 border-emerald-300 select-none">
        <!-- 顶部信息栏 -->
        <div class="flex items-center justify-between mb-4 bg-white/90 p-3.5 rounded-2xl shadow-sm border border-emerald-200">
          <div class="flex items-center space-x-2">
            <span class="text-3xl animate-bounce">🐹</span>
            <div>
              <h3 class="font-extrabold text-emerald-950 text-base sm:text-lg">拼音打地鼠·眼力大挑战</h3>
              <p class="text-xs text-emerald-700 font-bold" id="whack-title-tip">听准发音，迅速敲击顶着正确拼音的小地鼠！</p>
            </div>
          </div>

          <div class="flex items-center space-x-3 shrink-0">
            <div class="bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-300 text-xs font-black text-amber-900">
              得分: <span id="whack-score-val" class="text-amber-600 text-sm font-black">0</span>
            </div>
            <div class="bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 text-xs font-black text-emerald-900">
              已答对: <span id="whack-round-val" class="text-emerald-700 text-sm font-black">0/5</span>
            </div>
          </div>
        </div>

        <!-- 听音指示器与重播按钮 (纯听音无文字提示) -->
        <div class="flex items-center justify-center space-x-3 mb-5">
          <button id="btn-whack-replay" class="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 active:scale-95 text-white font-extrabold text-sm py-2.5 px-6 rounded-2xl shadow-lg border-2 border-amber-300 flex items-center space-x-2 transition cursor-pointer">
            <span class="text-xl">🔊</span>
            <span id="whack-target-label">重播发音 (仔细听)</span>
          </button>
        </div>

        <!-- 6个草地地鼠洞 (2行3列) -->
        <div id="whack-grid" class="grid grid-cols-3 gap-3.5 sm:gap-6 max-w-lg mx-auto py-2">
          ${[0, 1, 2, 3, 4, 5].map(idx => `
            <div class="whack-hole relative w-full h-28 sm:h-32 bg-amber-900/30 rounded-3xl overflow-hidden border-4 border-amber-800/40 shadow-inner flex items-end justify-center pb-2 cursor-pointer active:scale-95 transition" data-hole="${idx}">
              <!-- 泥土草地边缘 -->
              <div class="absolute inset-x-0 bottom-0 h-9 bg-amber-900/50 rounded-b-2xl border-t-4 border-emerald-500/80 z-20 flex justify-around items-center px-2">
                <span class="text-xs opacity-60">🌱</span>
                <span class="text-xs opacity-60">🌼</span>
                <span class="text-xs opacity-60">🌱</span>
              </div>

              <!-- 地鼠本体 (默认缩在洞底) -->
              <div id="mole-${idx}" class="mole-body relative z-10 w-20 sm:w-24 h-24 sm:h-28 bg-amber-600 rounded-t-full border-4 border-amber-700 shadow-md flex flex-col items-center pt-2 transition-all duration-300 transform translate-y-36">
                <!-- 地鼠头顶拼音头盔 -->
                <div class="mole-tag bg-white text-emerald-950 px-2.5 py-0.5 rounded-full text-base sm:text-lg font-black shadow border-2 border-emerald-400">
                  <span id="mole-text-${idx}">b</span>
                </div>
                <!-- 地鼠小耳朵 -->
                <div class="flex justify-between w-14 -mt-1 px-1">
                  <div class="w-3.5 h-3.5 bg-rose-300 rounded-full border border-amber-700"></div>
                  <div class="w-3.5 h-3.5 bg-rose-300 rounded-full border border-amber-700"></div>
                </div>
                <!-- 地鼠大眼睛与小鼻子 -->
                <div class="flex items-center space-x-2 mt-1">
                  <div class="w-2.5 h-2.5 bg-black rounded-full"></div>
                  <div class="w-3 h-2 bg-rose-500 rounded-full"></div>
                  <div class="w-2.5 h-2.5 bg-black rounded-full"></div>
                </div>
                <!-- 搞怪胡须 -->
                <div class="text-[10px] text-neutral-800 -mt-0.5 opacity-60">≡( •_• )≡</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
    this.startNewQuestion();
  }

  bindEvents() {
    // 重播读音按钮 (重播发音并唤出地鼠)
    const replayBtn = this.container.querySelector('#btn-whack-replay');
    replayBtn?.addEventListener('click', () => {
      this.replayCurrentQuestion();
    });

    // 敲击地鼠洞
    this.container.querySelectorAll('.whack-hole').forEach(holeEl => {
      holeEl.addEventListener('click', (e) => {
        const holeIdx = parseInt(holeEl.dataset.hole);
        this.hitHole(holeIdx, holeEl);
      });
    });
  }

  playTargetAudio() {
    if (window.audioEngine && this.currentQ) {
      window.audioEngine.speak(this.currentQ.target);
    }
  }

  replayCurrentQuestion() {
    this.playTargetAudio();
    if (this.roundActive) {
      // 触发重播时立即让地鼠重新钻出
      this.popMoles();
    }
  }

  startNewQuestion() {
    if (this.correctCount >= this.targetCorrect) {
      this.showVictory();
      return;
    }

    this.clearAllMoles();

    // 更新关卡文字
    const roundEl = this.container.querySelector('#whack-round-val');
    if (roundEl) roundEl.innerText = `${this.correctCount}/${this.targetCorrect}`;

    // 随机抽选一道题目
    this.currentQ = this.questionBank[Math.floor(Math.random() * this.questionBank.length)];
    this.targetPinyin = this.currentQ.target;

    // 保持提示为纯净重播按钮，杜绝文字泄题
    const labelBtn = this.container.querySelector('#whack-target-label');
    if (labelBtn) {
      labelBtn.innerText = `重播发音 (仔细听)`;
    }

    const titleTip = this.container.querySelector('#whack-title-tip');
    if (titleTip) {
      titleTip.innerText = `听准发音，迅速敲击顶着正确拼音的小地鼠！`;
    }

    // 立即朗读目标音
    this.playTargetAudio();

    // 延时 450ms 后地鼠钻出
    setTimeout(() => {
      this.popMoles();
    }, 450);
  }

  popMoles() {
    this.clearAllMoles();
    this.roundActive = true;

    // 随机选 3~4 个洞钻出地鼠
    const allHoles = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    const chosenHoles = allHoles.slice(0, 4);

    // 保证至少有一个是正确目标
    const correctHoleIdx = chosenHoles[0];

    // 混淆项
    const distractors = this.currentQ.group.filter(p => p !== this.targetPinyin);

    chosenHoles.forEach((holeIdx, i) => {
      const moleEl = this.container.querySelector(`#mole-${holeIdx}`);
      const textEl = this.container.querySelector(`#mole-text-${holeIdx}`);
      if (!moleEl || !textEl) return;

      const pinyinVal = (holeIdx === correctHoleIdx) ? this.targetPinyin : (distractors[i % distractors.length] || 'a');
      textEl.innerText = pinyinVal;
      moleEl.dataset.pinyin = pinyinVal;

      // 钻出地面
      moleEl.style.transform = 'translateY(0)';
    });

    // 4.2 秒未打中则缩回并在 400ms 后自动重新钻出，确保不会长时间空洞
    const tDown = setTimeout(() => {
      if (!this.roundActive) return;
      for (let i = 0; i < 6; i++) {
        const mole = this.container?.querySelector(`#mole-${i}`);
        if (mole) mole.style.transform = 'translateY(150px)';
      }
      const tUp = setTimeout(() => {
        if (this.roundActive) {
          this.popMoles();
        }
      }, 400);
      this.moleTimers.push(tUp);
    }, 4200);
    this.moleTimers.push(tDown);
  }

  clearAllMoles() {
    this.moleTimers.forEach(t => clearTimeout(t));
    this.moleTimers = [];
    for (let i = 0; i < 6; i++) {
      const mole = this.container?.querySelector(`#mole-${i}`);
      if (mole) mole.style.transform = 'translateY(150px)';
    }
  }

  hitHole(holeIdx, holeEl) {
    if (!this.roundActive) return;

    const moleEl = this.container.querySelector(`#mole-${holeIdx}`);
    if (!moleEl) return;

    const molePinyin = moleEl.dataset.pinyin;
    if (!molePinyin) return;

    if (molePinyin === this.targetPinyin) {
      // 答对啦！
      this.roundActive = false;
      this.score += 10;
      this.correctCount++;
      const scoreEl = this.container.querySelector('#whack-score-val');
      if (scoreEl) scoreEl.innerText = this.score;
      const roundEl = this.container.querySelector('#whack-round-val');
      if (roundEl) roundEl.innerText = `${this.correctCount}/${this.targetCorrect}`;

      // 卡通木槌打击音效
      this.playHammerSound();

      // 地鼠眼冒金星动效
      moleEl.classList.add('animate-shake');
      moleEl.style.transform = 'translateY(150px)';

      // 浮动 +10分 特效
      this.showHitScoreBadge(holeEl, '+10分 🎉');

      // 接入正反馈连击系统
      if (window.celebrationFX) {
        window.celebrationFX.registerCorrect(holeEl);
      }

      // 统计答题正确率
      if (window.screenTimeLock) {
        window.screenTimeLock.recordAnswer(true);
      }

      if (this.correctCount >= this.targetCorrect) {
        if (window.app && window.app.state) {
          window.app.state.addStars(5);
        }
        setTimeout(() => {
          moleEl.classList.remove('animate-shake');
          this.showVictory();
        }, 800);
      } else {
        if (window.app && window.app.state) {
          window.app.state.addStars(1);
        }
        setTimeout(() => {
          moleEl.classList.remove('animate-shake');
          this.startNewQuestion();
        }, 1100);
      }

    } else {
      // 敲错了
      this.playOopsSound();
      moleEl.style.transform = 'translateY(150px)';
      this.showHitScoreBadge(holeEl, '不对哦 💨', false);
      if (window.celebrationFX) {
        window.celebrationFX.registerMistake();
      }
      if (window.screenTimeLock) {
        window.screenTimeLock.recordAnswer(false);
      }
    }
  }

  showHitScoreBadge(anchorEl, text, isSuccess = true) {
    const rect = anchorEl.getBoundingClientRect();
    const badge = document.createElement('div');
    badge.className = `fixed z-50 pointer-events-none font-black text-sm px-3 py-1 rounded-full shadow-lg transition-all duration-700 transform -translate-x-1/2 ${isSuccess ? 'bg-amber-400 text-amber-950 border border-white' : 'bg-neutral-600 text-white'}`;
    badge.innerText = text;
    badge.style.left = `${rect.left + rect.width / 2}px`;
    badge.style.top = `${rect.top}px`;
    badge.style.opacity = '1';
    document.body.appendChild(badge);

    requestAnimationFrame(() => {
      badge.style.top = `${rect.top - 45}px`;
      badge.style.opacity = '0';
      badge.style.transform = 'translate(-50%, -10px) scale(1.1)';
      setTimeout(() => badge.remove(), 700);
    });
  }

  showVictory() {
    this.clearAllMoles();
    this.roundActive = false;
    if (window.audioEngine) {
      window.audioEngine.stopAllAudio();
      window.audioEngine.playFanfare();
    }
    if (window.celebrationFX) {
      window.celebrationFX.launchConfetti(3500);
    }
    if (window.mascotPipi) {
      window.mascotPipi.speak('🎉 太棒啦！地鼠大作战答对 5 次挑战成功！获得 5 颗星币！', true);
    }

    const grid = this.container.querySelector('#whack-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-3 bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-xl border-4 border-amber-400 text-center space-y-3 animate-fadeIn my-4">
          <div class="text-6xl animate-bounce">🏆 🐹 ⭐</div>
          <h4 class="text-2xl font-black text-amber-900">恭喜通关！答对 5 次挑战成功！</h4>
          <p class="text-sm font-bold text-emerald-600">最终得分：${this.score} 分 · 已获得 5 颗闪亮星币 ⭐ · 荣获【快手拼音小英雄】勋章！</p>
          <div class="pt-2 flex justify-center space-x-3">
            <button id="btn-whack-restart" class="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 active:scale-95 text-white font-extrabold text-base py-3 px-6 rounded-2xl shadow-lg border border-emerald-300 transition cursor-pointer">
              <span>🔄 再玩一次！</span>
            </button>
          </div>
        </div>
      `;

      this.container.querySelector('#btn-whack-restart')?.addEventListener('click', () => {
        this.render();
      });
    }
  }

  playHammerSound() {
    try {
      this.ensureAudioContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {}
  }

  playOopsSound() {
    try {
      this.ensureAudioContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }
}

if (typeof window !== 'undefined') {
  window.WhackPinyinGame = WhackPinyinGame;
}
