/**
 * 游戏4：火眼金睛大对决（易混字母分类与专项突击）
 * 专治一年级孩子最头疼的易错对子：
 * b-d、p-q、f-t、z-zh、c-ch、s-sh、ui-iu
 */

class ConfusionDiffGame {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.pairIndex = 0;
    this.score = 0;
    this.correctCount = 0;
    this.targetCorrect = 5;
    this.targetItem = null;

    this.pairs = (window.PINYIN_DATA && window.PINYIN_DATA.confusionPairs) || [
      {
        pair: ['b', 'd'],
        title: '右下圆 b 与 左下圆 d',
        ruleSong: '右下半圆 b b b，收音机朝右；左下半圆 d d d，小马奔跑踏踏踏',
        items: [
          { text: 'b', label: '右下圆 b (播)' },
          { text: 'd', label: '左下圆 d (得)' }
        ]
      },
      {
        pair: ['p', 'q'],
        title: '右上圆 p 与 左上圆 q',
        ruleSong: '右上圆圈 p p p，山坡上滑滑梯；左上圆圈 q q q，七只气球飞满天',
        items: [
          { text: 'p', label: '右上圆 p (坡)' },
          { text: 'q', label: '左上圆 q (七)' }
        ]
      },
      {
        pair: ['f', 't'],
        title: '一根拐棍 f 与 伞柄朝下 t',
        ruleSong: '一根拐棍手扶好 f f f，伞柄朝下挂门边 t t t',
        items: [
          { text: 'f', label: '拐棍朝上 f (佛)' },
          { text: 't', label: '伞柄朝下 t (特)' }
        ]
      },
      {
        pair: ['z', 'zh'],
        title: '平舌音 z 与 翘舌音 zh',
        ruleSong: '平平舌尖读 z z z，卷卷舌尖读 zh zh zh',
        items: [
          { text: 'z', label: '平舌 z (做)' },
          { text: 'zh', label: '翘舌 zh (知)' }
        ]
      }
    ];
  }

  render() {
    if (!this.container) return;
    const curPair = this.pairs[this.pairIndex];

    this.container.innerHTML = `
      <div class="w-full bg-gradient-to-b from-purple-50 to-pink-50 rounded-3xl p-5 shadow-lg border-4 border-purple-200 select-none">
        <!-- 顶栏标题 -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-2 bg-white/85 p-3 rounded-2xl shadow-sm mb-4">
          <div class="flex items-center space-x-2.5">
            <span class="text-3xl">🧐</span>
            <div>
              <h3 class="font-extrabold text-purple-950 text-lg">火眼金睛·易混字母大对决</h3>
              <p class="text-xs text-purple-700 font-medium">看清口诀不迷路，彻底分清相似拼音！</p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <span class="text-sm font-bold text-purple-900 bg-purple-100 px-3 py-1 rounded-full">已答对: <span id="diff-correct-count" class="text-amber-500 font-extrabold text-lg">${this.correctCount}</span>/5</span>
          </div>

          <!-- 对决组切换 -->
          <div class="flex items-center space-x-1.5 overflow-x-auto">
            ${this.pairs.map((p, idx) => `
              <button class="diff-pair-btn px-2.5 py-1 text-xs rounded-xl font-bold transition ${this.pairIndex === idx ? 'bg-purple-600 text-white shadow' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}" data-pair-idx="${idx}">
                ${p.pair[0]} vs ${p.pair[1]}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 口诀提示卡 -->
        <div class="bg-gradient-to-r from-amber-100 via-rose-100 to-amber-100 border-2 border-amber-300 p-3 rounded-2xl shadow-sm text-center mb-4">
          <div class="text-xs font-bold text-amber-800">💡 记口诀小妙招：</div>
          <div class="text-base font-extrabold text-purple-900 mt-1">${curPair.ruleSong}</div>
        </div>

        <!-- 听音辨别对决台 -->
        <div class="bg-white/80 p-6 rounded-2xl border-2 border-purple-100 shadow-sm flex flex-col items-center">
          <div class="text-xs text-purple-600 font-bold mb-3">听一听，然后选择对应的大字母篮子：</div>

          <!-- 发音按钮 -->
          <button id="diff-play-sound" class="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 text-white font-black px-7 py-3 rounded-full shadow-lg transition mb-6 cursor-pointer">
            <span class="text-2xl animate-pulse">🔊</span>
            <span class="text-lg">重播读音 (听题目发音)</span>
          </button>

          <!-- 两个大选项框 -->
          <div class="grid grid-cols-2 gap-6 w-full max-w-md">
            ${curPair.items.map(item => `
              <button class="diff-choice-btn flex flex-col items-center justify-center p-6 rounded-3xl border-4 border-purple-200 bg-gradient-to-b from-white to-purple-50 hover:border-purple-500 hover:shadow-xl active:scale-95 transition" data-char="${item.text}">
                <div class="text-6xl font-black text-purple-900 font-mono tracking-wider mb-2">${item.text}</div>
                <div class="text-xs font-extrabold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">${item.label}</div>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.randomTarget();
  }

  bindEvents() {
    // 切换对比组
    this.container.querySelectorAll('.diff-pair-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.pairIndex = parseInt(e.currentTarget.dataset.pairIdx);
        this.render();
      });
    });

    // 播放题目音频
    document.getElementById('diff-play-sound')?.addEventListener('click', () => {
      this.playTargetAudio();
    });

    // 点击大选项
    this.container.querySelectorAll('.diff-choice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const char = e.currentTarget.dataset.char;
        this.handleChoice(char, e.currentTarget);
      });
    });
  }

  randomTarget() {
    this.choiceLocked = false;
    const curPair = this.pairs[this.pairIndex];
    const targetIdx = Math.floor(Math.random() * curPair.items.length);
    this.targetItem = curPair.items[targetIdx];
    if (window.antiCheat) {
      window.antiCheat.markQuestionStart(400);
    }
    setTimeout(() => {
      this.playTargetAudio();
    }, 350);
  }

  playTargetAudio() {
    if (window.audioEngine && this.targetItem) {
      window.audioEngine.stopAllAudio();
      window.audioEngine.speakInitial(this.targetItem.text, true);
    }
  }

  handleChoice(chosenChar, btnEl) {
    if (!this.targetItem || this.choiceLocked) return;

    if (window.antiCheat && !window.antiCheat.canAnswer(btnEl)) {
      return;
    }

    if (window.antiCheat) {
      window.antiCheat.recordAnswerTime();
    }

    this.choiceLocked = true;

    if (chosenChar === this.targetItem.text) {
      // 答对啦！
      this.correctCount += 1;
      const countEl = document.getElementById('diff-correct-count');
      if (countEl) countEl.innerText = this.correctCount;

      if (window.screenTimeLock) {
        window.screenTimeLock.recordAnswer(true);
      }
      if (window.celebrationFX) {
        window.celebrationFX.registerCorrect(btnEl);
      }
      if (window.audioEngine) {
        window.audioEngine.stopAllAudio();
        window.audioEngine.playSuccess();
        setTimeout(() => {
          if (window.audioEngine) {
            // 直接播放该声母纯正真人录音 (bo1.mp3, de1.mp3 等，杜绝机械合成)
            window.audioEngine.speak(chosenChar);
          }
        }, 180);
      }
      btnEl.classList.add('border-emerald-500', 'bg-emerald-50');

      if (this.correctCount >= this.targetCorrect) {
        if (window.app && window.app.state) {
          window.app.state.addStars(5);
        }
        setTimeout(() => {
          btnEl.classList.remove('border-emerald-500', 'bg-emerald-50');
          this.showVictory();
        }, 800);
      } else {
        if (window.app && window.app.state) {
          window.app.state.addStars(1);
        }
        setTimeout(() => {
          btnEl.classList.remove('border-emerald-500', 'bg-emerald-50');
          this.randomTarget();
        }, 1100);
      }
    } else {
      if (window.antiCheat) {
        window.antiCheat.recordMistake();
      }
      // 答错啦，播放温和提示音，并播放所点字母的真人录音
      if (window.screenTimeLock) {
        window.screenTimeLock.recordAnswer(false);
      }
      if (window.celebrationFX) {
        window.celebrationFX.registerMistake();
      }
      if (window.audioEngine) {
        window.audioEngine.stopAllAudio();
        window.audioEngine.playGentleOops();
        setTimeout(() => {
          if (window.audioEngine) {
            window.audioEngine.speak(chosenChar);
          }
        }, 180);
      }
      btnEl.classList.add('border-rose-400', 'animate-shake');
      setTimeout(() => {
        btnEl.classList.remove('border-rose-400', 'animate-shake');
        this.choiceLocked = false;
      }, 700);

      // 记入错题本
      if (window.appState) {
        window.appState.recordMistake(
          this.targetItem.text,
          `在 ${this.pairs[this.pairIndex].pair.join(' 与 ')} 对决中误选`
        );
      }
    }
  }

  showVictory() {
    this.choiceLocked = true;
    if (window.audioEngine) {
      window.audioEngine.stopAllAudio();
      window.audioEngine.playFanfare();
    }
    if (window.celebrationFX) {
      window.celebrationFX.launchConfetti(3500);
    }
    if (window.mascotPipi) {
      window.mascotPipi.speak('🎉 太棒啦！火眼金睛答对 5 次挑战成功！再也没有难得倒你的相似拼音啦！', true);
    }

    if (!this.container) return;
    this.container.innerHTML = `
      <div class="w-full bg-gradient-to-b from-purple-50 to-pink-50 rounded-3xl p-6 sm:p-8 shadow-lg border-4 border-purple-300 text-center select-none animate-fadeIn my-2">
        <div class="max-w-md mx-auto space-y-4">
          <div class="text-6xl animate-bounce">🏆 🧐 ⭐</div>
          <h4 class="text-2xl sm:text-3xl font-black text-purple-950">太棒啦！答对 5 次挑战成功！</h4>
          <p class="text-sm font-extrabold text-emerald-600">已获得 5 颗闪亮星币 ⭐ · 易混拼音辨析全通关！</p>
          <div class="bg-white/80 p-3.5 rounded-2xl border border-purple-200 text-xs font-bold text-purple-900 leading-relaxed">
            ${this.pairs[this.pairIndex].ruleSong}
          </div>
          <div class="pt-2 flex justify-center space-x-3">
            <button id="btn-diff-restart" class="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 active:scale-95 text-white font-extrabold text-base py-3 px-7 rounded-2xl shadow-lg border border-purple-300 transition cursor-pointer">
              🔄 再玩一次
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-diff-restart')?.addEventListener('click', () => {
      this.correctCount = 0;
      this.render();
    });
  }
}

if (typeof window !== 'undefined') {
  window.ConfusionDiffGame = ConfusionDiffGame;
}
