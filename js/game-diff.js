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
    this.choiceLocked = true;

    if (chosenChar === this.targetItem.text) {
      // 答对啦！
      if (window.screenTimeLock) {
        window.screenTimeLock.recordAnswer(true);
      }
      if (window.audioEngine) {
        window.audioEngine.stopAllAudio();
        window.audioEngine.playSuccess();
        setTimeout(() => {
          if (window.audioEngine) {
            const sound = window.audioEngine.phoneticMap[chosenChar] || chosenChar;
            window.audioEngine.speak(`太棒啦！认得很准，这是声母 ${sound}！`);
          }
        }, 200);
      }
      btnEl.classList.add('border-emerald-500', 'bg-emerald-50');

      setTimeout(() => {
        btnEl.classList.remove('border-emerald-500', 'bg-emerald-50');
        this.randomTarget();
      }, 1500);
    } else {
      // 答错啦，针对性提示口诀
      if (window.screenTimeLock) {
        window.screenTimeLock.recordAnswer(false);
      }
      if (window.audioEngine) {
        window.audioEngine.stopAllAudio();
        window.audioEngine.playGentleOops();
        setTimeout(() => {
          if (window.audioEngine) {
            const sound = window.audioEngine.phoneticMap[chosenChar] || chosenChar;
            window.audioEngine.speak(`这是声母 ${sound} 哦！口诀说：${this.pairs[this.pairIndex].ruleSong}`);
          }
        }, 200);
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
}

if (typeof window !== 'undefined') {
  window.ConfusionDiffGame = ConfusionDiffGame;
}
