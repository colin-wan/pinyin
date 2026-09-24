/**
 * 游戏2：拼读小火车（解决“拼读连不起来”核心攻坚器）
 * 1. 动态呈现两车厢滑行靠近、碰撞合读的生动过程
 * 2. 严谨支持标准普通话合法音节与词汇图文联想
 * 3. 包含“慢速渐进带读”与“自由撞碰拼装”两大模式
 */

class TrainBlenderGame {
  constructor(containerId) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    this.currentInitial = 'b';
    this.currentFinal = 'a';
    this.currentToneIndex = 3; // 默认 4 声 à (爸爸)
    this.isAnimating = false;
    this.animWatchdog = null;
    this.stepTimer = null;

    // 常用合法拼读组合库
    this.blendDict = {
      'b-a-4': { syllable: 'bà', word: '爸爸 bàba', icon: '👨', tip: 'b...à...bà 爸爸' },
      'm-a-1': { syllable: 'mā', word: '妈妈 māma', icon: '👩', tip: 'm...ā...mā 妈妈' },
      'd-a-3': { syllable: 'dǎ', word: '打靶 dǎ bǎ', icon: '🎯', tip: 'd...ǎ...dǎ 打靶' },
      't-u-3': { syllable: 'tǔ', word: '土地 tǔ dì', icon: '🌱', tip: 't...ǔ...tǔ 土地' },
      'p-o-1': { syllable: 'pō', word: '山坡 shānpō', icon: '⛰️', tip: 'p...ō...pō 山坡' },
      'g-e-1': { syllable: 'gē', word: '哥哥 gēge', icon: '👦', tip: 'g...ē...gē 哥哥' },
      'k-e-3': { syllable: 'kě', word: '口渴 kǒukě', icon: '🥛', tip: 'k...ě...kě 口渴' },
      'h-e-1': { syllable: 'hē', word: '喝水 hēshuǐ', icon: '🥤', tip: 'h...ē...hē 喝水' },
      'b-o-2': { syllable: 'bó', word: '伯伯 bóbo', icon: '👴', tip: 'b...ó...bó 伯伯' },
      'n-i-2': { syllable: 'ní', word: '泥土 nítǔ', icon: '🪴', tip: 'n...í...ní 泥土' },
      'l-u-4': { syllable: 'lù', word: '马路 mǎlù', icon: '🛣️', tip: 'l...ù...lù 马路' },
      'q-i-2': { syllable: 'qí', word: '骑马 qímǎ', icon: '🐎', tip: 'q...í...qí 骑马' },
      'x-i-1': { syllable: 'xī', word: '西瓜 xīguā', icon: '🍉', tip: 'x...ī...xī 西瓜' }
    };

    this.initialOptions = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x'];
    this.finalOptions = [
      { base: 'a', tones: ['ā', 'á', 'ǎ', 'à'] },
      { base: 'o', tones: ['ō', 'ó', 'ǒ', 'ò'] },
      { base: 'e', tones: ['ē', 'é', 'ě', 'è'] },
      { base: 'i', tones: ['ī', 'í', 'ǐ', 'ì'] },
      { base: 'u', tones: ['ū', 'ú', 'ǔ', 'ù'] }
    ];
  }

  render(preSelect = null) {
    if (!this.container) return;
    this.resetAnimation();
    if (preSelect) {
      this.currentInitial = preSelect.initial || this.currentInitial;
      this.currentFinal = preSelect.final || this.currentFinal;
    }

    const curFinalObj = this.finalOptions.find(f => f.base === this.currentFinal) || this.finalOptions[0];
    const curToneChar = curFinalObj.tones[this.currentToneIndex] || curFinalObj.tones[0];

    this.container.innerHTML = `
      <div class="w-full bg-gradient-to-b from-amber-50 to-orange-100 rounded-3xl p-5 shadow-lg border-4 border-amber-300 select-none">
        <!-- 标题与口诀 -->
        <div class="flex flex-col md:flex-row items-center justify-between gap-3 mb-4 bg-white/80 p-3.5 rounded-2xl shadow-sm">
          <div class="flex items-center space-x-2.5">
            <span class="text-3xl">🚂</span>
            <div>
              <h3 class="font-extrabold text-amber-900 text-lg">拼读小火车·连读助推器</h3>
              <p class="text-xs text-amber-700 font-medium">老师秘诀：“声母轻短韵母重，两音相碰猛一碰！”</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <span class="bg-amber-100 text-amber-800 text-xs px-3 py-1.5 rounded-full font-bold">专门解决“拼读连不起来”难题</span>
          </div>
        </div>

        <!-- 铁轨与火车动效舞台 -->
        <div class="relative w-full h-52 bg-gradient-to-b from-sky-100 via-emerald-50 to-emerald-100 rounded-2xl overflow-hidden border-2 border-amber-200 flex items-center justify-center p-4">
          <!-- 背景云朵与小树 -->
          <div class="absolute top-2 left-8 text-2xl opacity-60">☁️</div>
          <div class="absolute top-5 right-12 text-xl opacity-60">☁️</div>
          <div class="absolute bottom-8 left-4 text-2xl opacity-40">🌲</div>
          <div class="absolute bottom-8 right-6 text-2xl opacity-40">🌳</div>

          <!-- 铁轨 -->
          <div class="absolute bottom-6 left-0 right-0 h-4 bg-amber-800/20 border-t-2 border-b-2 border-amber-900/40 flex items-center justify-around">
            ${Array(20).fill(0).map(() => '<div class="w-1.5 h-full bg-amber-900/40"></div>').join('')}
          </div>

          <!-- 火车车厢容器 -->
          <div id="train-track-stage" class="relative w-full max-w-lg h-36 flex items-center justify-between px-6 z-10">
            <!-- 声母车厢 (左) -->
            <div id="train-initial-car" class="flex flex-col items-center transition-all duration-500 transform translate-x-0">
              <span class="text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full mb-1">声母 (轻短)</span>
              <div class="w-20 h-20 bg-sky-500 text-white rounded-2xl flex items-center justify-center text-4xl font-extrabold shadow-lg border-4 border-sky-300">
                <span id="train-initial-text">${this.currentInitial}</span>
              </div>
              <div class="flex space-x-3 -mt-2">
                <div class="w-5 h-5 bg-neutral-800 rounded-full border-2 border-neutral-400"></div>
                <div class="w-5 h-5 bg-neutral-800 rounded-full border-2 border-neutral-400"></div>
              </div>
            </div>

            <!-- 碰撞提示连接符 / 闪电星星 -->
            <div id="train-collision-center" class="flex flex-col items-center">
              <span id="train-spark" class="text-3xl opacity-0 transition-opacity">⚡</span>
              <span class="text-amber-600 font-extrabold text-2xl tracking-widest">+</span>
            </div>

            <!-- 韵母车厢 (右) -->
            <div id="train-final-car" class="flex flex-col items-center transition-all duration-500 transform translate-x-0">
              <span class="text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full mb-1">韵母 (响亮)</span>
              <div class="w-20 h-20 bg-rose-500 text-white rounded-2xl flex items-center justify-center text-4xl font-extrabold shadow-lg border-4 border-rose-300">
                <span id="train-final-text">${curToneChar}</span>
              </div>
              <div class="flex space-x-3 -mt-2">
                <div class="w-5 h-5 bg-neutral-800 rounded-full border-2 border-neutral-400"></div>
                <div class="w-5 h-5 bg-neutral-800 rounded-full border-2 border-neutral-400"></div>
              </div>
            </div>
          </div>

          <!-- 拼读合体成功弹窗 / 结果展示 -->
          <div id="train-result-box" class="absolute inset-0 bg-white/95 backdrop-blur-md rounded-2xl z-20 flex flex-col items-center justify-center hidden p-4 shadow-xl border-4 border-amber-400 animate-fadeIn">
            <div class="text-5xl mb-1 animate-bounce" id="train-result-icon">👨</div>
            <div class="text-amber-600 text-sm font-bold" id="train-result-py">b - à -> bà</div>
            <div class="text-4xl font-extrabold text-neutral-800 my-1 font-mono tracking-wider" id="train-result-word">爸爸 bàba</div>
            <div class="text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full font-bold mt-1">拼对啦！太棒了！</div>
          </div>
        </div>

        <!-- 步骤提示与慢拼播放按钮 -->
        <div class="mt-4 flex flex-col items-center">
          <div id="train-status-tip" class="text-amber-900 font-bold text-sm mb-2 text-center h-6">
            点击下方大按钮，听小火车慢速拼读连读！
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
            <button id="btn-train-blend" class="flex-1 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-extrabold text-lg py-3 px-5 rounded-2xl shadow-lg border-2 border-amber-300 flex items-center justify-center space-x-2 transition cursor-pointer">
              <span class="text-xl">🚂</span>
              <span>两音相碰·连读发音！</span>
            </button>
            <button id="btn-train-replay" class="w-full sm:w-auto bg-white hover:bg-amber-100 active:scale-95 text-amber-950 font-black text-base py-3 px-4 rounded-2xl shadow border-2 border-amber-300 flex items-center justify-center space-x-1.5 transition cursor-pointer shrink-0">
              <span class="text-lg">🔊</span>
              <span>重播读音</span>
            </button>
          </div>
        </div>

        <!-- 自由拼音选择器（点按切换） -->
        <div class="mt-5 pt-4 border-t-2 border-amber-200/80">
          <div class="text-xs font-bold text-amber-900 mb-2">💡 换一换字母，探索更多拼读：</div>

          <!-- 声母行 -->
          <div class="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            <span class="text-xs text-sky-800 font-bold shrink-0">选声母:</span>
            ${this.initialOptions.map(init => `
              <button class="train-pick-init shrink-0 w-9 h-9 rounded-xl font-extrabold text-base transition ${this.currentInitial === init ? 'bg-sky-500 text-white shadow-md scale-105' : 'bg-white text-sky-900 hover:bg-sky-100'}" data-initial="${init}">
                ${init}
              </button>
            `).join('')}
          </div>

          <!-- 韵母与声调行 -->
          <div class="flex items-center space-x-2 overflow-x-auto pt-2 pb-1 scrollbar-none">
            <span class="text-xs text-rose-800 font-bold shrink-0">选韵母:</span>
            ${this.finalOptions.map(fin => `
              <button class="train-pick-final shrink-0 w-9 h-9 rounded-xl font-extrabold text-base transition ${this.currentFinal === fin.base ? 'bg-rose-500 text-white shadow-md scale-105' : 'bg-white text-rose-900 hover:bg-rose-100'}" data-final="${fin.base}">
                ${fin.base}
              </button>
            `).join('')}

            <span class="text-xs text-amber-800 font-bold shrink-0 ml-2">选声调:</span>
            ${[0, 1, 2, 3].map(tIdx => `
              <button class="train-pick-tone shrink-0 w-8 h-8 rounded-lg font-extrabold text-sm transition ${this.currentToneIndex === tIdx ? 'bg-amber-500 text-white shadow' : 'bg-white text-amber-900 hover:bg-amber-100'}" data-tone="${tIdx}">
                ${['1声', '2声', '3声', '4声'][tIdx]}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    if (!this.container) return;

    // 连读播放按钮 (严格从当前容器内查找，支持多次点击与快速打断重放)
    const blendBtn = this.container.querySelector('#btn-train-blend');
    if (blendBtn) {
      blendBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.playBlendingAnimation();
      };
    }

    // 重播读音按钮
    const replayBtn = this.container.querySelector('#btn-train-replay');
    if (replayBtn) {
      replayBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.playDirectAudio();
      };
    }

    // 选择声母
    this.container.querySelectorAll('.train-pick-init').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const init = e.currentTarget.dataset.initial;
        this.currentInitial = init;
        this.render();
        if (window.audioEngine) window.audioEngine.speak(init);
      };
    });

    // 选择韵母
    this.container.querySelectorAll('.train-pick-final').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const fin = e.currentTarget.dataset.final;
        this.currentFinal = fin;
        this.render();
        if (window.audioEngine) window.audioEngine.speak(fin);
      };
    });

    // 选择声调
    this.container.querySelectorAll('.train-pick-tone').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const t = parseInt(e.currentTarget.dataset.tone);
        this.currentToneIndex = t;
        this.render();
      };
    });
  }

  /**
   * 安全重置小火车动效与按钮状态，杜绝任何中间状态卡死
   */
  resetAnimation() {
    this.isAnimating = false;
    if (this.animWatchdog) {
      clearTimeout(this.animWatchdog);
      this.animWatchdog = null;
    }
    if (this.stepTimer) {
      clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }

    if (!this.container) return;

    const initialCar = this.container.querySelector('#train-initial-car');
    const finalCar = this.container.querySelector('#train-final-car');
    const spark = this.container.querySelector('#train-spark');
    const tip = this.container.querySelector('#train-status-tip');
    const resultBox = this.container.querySelector('#train-result-box');
    const blendBtn = this.container.querySelector('#btn-train-blend');

    if (initialCar) {
      initialCar.style.transform = 'translateX(0)';
      initialCar.classList.remove('scale-110');
    }
    if (finalCar) {
      finalCar.style.transform = 'translateX(0)';
      finalCar.classList.remove('scale-110');
    }
    if (spark) spark.classList.add('opacity-0');
    if (resultBox) resultBox.classList.add('hidden');
    if (tip) tip.innerText = '点击下方大按钮，听小火车慢速拼读连读！';
    if (blendBtn) {
      blendBtn.classList.remove('ring-4', 'ring-amber-300', 'animate-pulse');
      blendBtn.innerHTML = `
        <span class="text-xl">🚂</span>
        <span>两音相碰·连读发音！</span>
      `;
    }
  }

  /**
   * 重播读音：直接朗读当前两音节合成音或声母韵母发音
   */
  playDirectAudio() {
    if (this.isAnimating) {
      this.resetAnimation();
    }
    if (window.audioEngine) {
      window.audioEngine.stopAllAudio();
      window.audioEngine.ensureAudioContext();
      const curFinalObj = this.finalOptions.find(f => f.base === this.currentFinal) || this.finalOptions[0];
      const curToneChar = curFinalObj.tones[this.currentToneIndex];
      const key = `${this.currentInitial}-${this.currentFinal}-${this.currentToneIndex + 1}`;
      const blendResult = this.blendDict[key];
      const targetSound = blendResult ? blendResult.syllable : `${this.currentInitial}${curToneChar}`;
      window.audioEngine.speak(targetSound);
    }
  }

  /**
   * 触发小火车滑行对撞与连读语音流程
   */
  playBlendingAnimation() {
    // 若当前正在播放中，点击可立刻重置并重新触发，保证绝不死机
    if (this.isAnimating) {
      this.resetAnimation();
    }
    this.isAnimating = true;

    if (window.audioEngine) {
      window.audioEngine.ensureAudioContext();
    }

    if (!this.container) return;

    const initialCar = this.container.querySelector('#train-initial-car');
    const finalCar = this.container.querySelector('#train-final-car');
    const spark = this.container.querySelector('#train-spark');
    const tip = this.container.querySelector('#train-status-tip');
    const resultBox = this.container.querySelector('#train-result-box');
    const blendBtn = this.container.querySelector('#btn-train-blend');

    if (blendBtn) {
      blendBtn.classList.add('ring-4', 'ring-amber-300', 'animate-pulse');
      blendBtn.innerHTML = `
        <span class="text-xl">🚂</span>
        <span>正在相碰拼读中...</span>
      `;
    }

    const curFinalObj = this.finalOptions.find(f => f.base === this.currentFinal) || this.finalOptions[0];
    const curToneChar = curFinalObj.tones[this.currentToneIndex];

    const key = `${this.currentInitial}-${this.currentFinal}-${this.currentToneIndex + 1}`;
    const blendResult = this.blendDict[key] || {
      syllable: `${this.currentInitial}${curToneChar}`,
      word: `${this.currentInitial}${curToneChar}`,
      icon: '✨',
      tip: `${this.currentInitial} 与 ${curToneChar} 拼读`
    };

    // 步骤 1：读声母
    if (tip) tip.innerText = `第一步：声母轻短读【${this.currentInitial}】...`;
    if (initialCar) initialCar.classList.add('scale-110');

    // 安全超时保护：无论任何异常，最长 6.5 秒必然自动复位归位
    clearTimeout(this.animWatchdog);
    this.animWatchdog = setTimeout(() => {
      this.resetAnimation();
    }, 6500);

    const handleStep = (step, text) => {
      if (step === 2) {
        // 步骤 2：读韵母
        if (initialCar) initialCar.classList.remove('scale-110');
        if (finalCar) finalCar.classList.add('scale-110');
        if (tip) tip.innerText = `第二步：韵母响亮读【${curToneChar}】...`;
      } else if (step === 3) {
        // 步骤 3：滑行碰撞！
        if (finalCar) finalCar.classList.remove('scale-110');
        if (tip) tip.innerText = `第三步：两节车厢开动相碰！${this.currentInitial}...${curToneChar}...`;
        if (initialCar) initialCar.style.transform = 'translateX(90px)';
        if (finalCar) finalCar.style.transform = 'translateX(-90px)';
        if (spark) spark.classList.remove('opacity-0');
      } else if (step === 4) {
        // 步骤 4：合体成功！
        if (tip) tip.innerText = `猛一碰！合读：【${blendResult.syllable}】！`;
        if (resultBox) {
          const iconEl = this.container.querySelector('#train-result-icon');
          const pyEl = this.container.querySelector('#train-result-py');
          const wordEl = this.container.querySelector('#train-result-word');
          if (iconEl) iconEl.innerText = blendResult.icon;
          if (pyEl) pyEl.innerText = `${this.currentInitial} - ${curToneChar} -> ${blendResult.syllable}`;
          if (wordEl) wordEl.innerText = blendResult.word;
          resultBox.classList.remove('hidden');
        }
      } else if (step === 5) {
        // 结束归位
        clearTimeout(this.stepTimer);
        this.stepTimer = setTimeout(() => {
          this.resetAnimation();
          if (tip) tip.innerText = '太棒啦！还可以换其他字母继续拼读哦！';
        }, 1600);
      }
    };

    if (window.audioEngine) {
      window.audioEngine.playBlendLadder({
        initial: this.currentInitial,
        tone: curToneChar,
        syllable: blendResult.syllable,
        word: blendResult.word
      }, handleStep);
    } else {
      // 离线/无音频引擎纯视觉定时降级方案
      handleStep(1, this.currentInitial);
      this.stepTimer = setTimeout(() => {
        handleStep(2, curToneChar);
        this.stepTimer = setTimeout(() => {
          handleStep(3, `${this.currentInitial}—>${curToneChar}`);
          this.stepTimer = setTimeout(() => {
            handleStep(4, blendResult.syllable);
            this.stepTimer = setTimeout(() => {
              handleStep(5, 'done');
            }, 1200);
          }, 800);
        }, 800);
      }, 800);
    }
  }
}

if (typeof window !== 'undefined') {
  window.TrainBlenderGame = TrainBlenderGame;
}
