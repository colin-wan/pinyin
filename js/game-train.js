/**
 * 游戏2：拼读小火车（解决“拼读连不起来”核心攻坚器）
 * 1. 动态呈现两车厢滑行靠近、碰撞合读的生动过程
 * 2. 严格遵循普通话声韵配合表：非法组合碰撞不成功（弹回并给出教育性解释）
 * 3. 严格遵循一年级统编教材：课本有的生字突出显示汉字与词组，课本无此生字仅显示纯拼音音节
 * 4. 支持 ü 韵母与 j q x 拼写脱帽规则（j-ü -> ju）
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

    // 普通话合法声韵配合表（现代汉语权威音系规范与统编小学语文拼音教学要求）
    this.legalCombos = {
      b: ['a', 'o', 'i', 'u'],
      p: ['a', 'o', 'i', 'u'],
      m: ['a', 'o', 'e', 'i', 'u'],
      f: ['a', 'o', 'u'],
      d: ['a', 'e', 'i', 'u'],
      t: ['a', 'e', 'i', 'u'],
      n: ['a', 'e', 'i', 'u', 'ü'],
      l: ['a', 'e', 'i', 'u', 'ü'],
      g: ['a', 'e', 'u'],
      k: ['a', 'e', 'u'],
      h: ['a', 'e', 'u'],
      j: ['i', 'ü'],
      q: ['i', 'ü'],
      x: ['i', 'ü']
    };

    this.initialOptions = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x'];
    this.finalOptions = [
      { base: 'a', tones: ['ā', 'á', 'ǎ', 'à'] },
      { base: 'o', tones: ['ō', 'ó', 'ǒ', 'ò'] },
      { base: 'e', tones: ['ē', 'é', 'ě', 'è'] },
      { base: 'i', tones: ['ī', 'í', 'ǐ', 'ì'] },
      { base: 'u', tones: ['ū', 'ú', 'ǔ', 'ù'] },
      { base: 'ü', tones: ['ǖ', 'ǘ', 'ǚ', 'ǜ'] }
    ];
  }

  /**
   * 判断声母与韵母在普通话中是否为合法拼读组合
   */
  isValidCombo(initial, finalBase) {
    const list = this.legalCombos[initial];
    return list ? list.includes(finalBase) : false;
  }

  /**
   * 生成非法组合的儿童友好拼音语音学指导提示
   */
  getInvalidReason(initial, finalBase) {
    if (['j', 'q', 'x'].includes(initial)) {
      if (finalBase === 'u') {
        return `声母【${initial}】不和单韵母【u】相拼哦！\n“小ü见到 j q x，脱帽敬礼走过去”，想拼读请选择韵母【ü】！`;
      }
      return `声母【${initial}】是舌面前音，只能和【i】和【ü】相拼，不能和【${finalBase}】相拼哦！`;
    }
    if (['b', 'p', 'f'].includes(initial) && finalBase === 'e') {
      return `声母【${initial}】不能和单韵母【e】相拼哦！换个韵母【a】或【o】试试吧！`;
    }
    if (initial === 'f' && finalBase === 'i') {
      return `声母【f】不能和韵母【i】相拼哦！试试韵母【a】、【o】或【u】吧！`;
    }
    if (['d', 't', 'n', 'l'].includes(initial) && finalBase === 'o') {
      return `声母【${initial}】不能直接和单韵母【o】相拼（需要加介母 u 变成 ${initial}uo 呢）！`;
    }
    if (['g', 'k', 'h'].includes(initial) && ['i', 'ü'].includes(finalBase)) {
      return `声母【${initial}】不能和齐齿呼【i】或撮口呼【ü】相拼哦！试试【a】、【e】或【u】吧！`;
    }
    if (['g', 'k', 'h'].includes(initial) && finalBase === 'o') {
      return `声母【${initial}】不能直接和单韵母【o】相拼（需要加介母 u 变成 ${initial}uo 呢）！`;
    }
    if (finalBase === 'ü' && !['n', 'l', 'j', 'q', 'x'].includes(initial)) {
      return `韵母【ü】只能和 n、l、j、q、x 相拼，不能和声母【${initial}】相拼哦！`;
    }
    return `普通话中没有【${initial}】和【${finalBase}】的音节组合哦，换一个字母试试看！`;
  }

  /**
   * 构造标准规范的拼音音节字符串 (支持 j q x 与 ü 结合脱帽)
   */
  constructSyllable(initial, finalBase, toneIdx) {
    const curFinalObj = this.finalOptions.find(f => f.base === finalBase) || this.finalOptions[0];
    const curToneChar = curFinalObj.tones[toneIdx] || curFinalObj.tones[0];

    if (['j', 'q', 'x'].includes(initial) && finalBase === 'ü') {
      // 规则：“小ü见到 j q x，脱帽敬个礼，摘掉帽子还读ü”，书写为 ju, qu, xu
      const uTones = ['ū', 'ú', 'ǔ', 'ù'];
      return `${initial}${uTones[toneIdx] || uTones[0]}`;
    }
    return `${initial}${curToneChar}`;
  }

  /**
   * 检索一年级语文统编教材生字表 (如课本有则返回生字与组词，课本无则返回空数组)
   */
  getTextbookHanzi(initial, finalBase, toneIdx) {
    const toneNum = toneIdx + 1;
    const allData = (typeof window !== 'undefined' && window.TEXTBOOK_HANZI_DATA)
      ? window.TEXTBOOK_HANZI_DATA
      : (typeof TEXTBOOK_HANZI_DATA !== 'undefined' ? TEXTBOOK_HANZI_DATA : []);
    return allData.filter(item => {
      if (item.tone !== toneNum) return false;
      if (item.initial !== initial) return false;
      if (['j', 'q', 'x'].includes(initial)) {
        if (finalBase === 'ü') {
          return item.final === 'ü' || item.final === 'u';
        }
        return item.final === finalBase;
      }
      return item.final === finalBase;
    });
  }

  render(preSelect = null) {
    if (!this.container) return;
    this.resetAnimation();
    if (preSelect) {
      this.currentInitial = preSelect.initial || this.currentInitial;
      this.currentFinal = preSelect.final || this.currentFinal;
    }

    const isValid = this.isValidCombo(this.currentInitial, this.currentFinal);
    const curFinalObj = this.finalOptions.find(f => f.base === this.currentFinal) || this.finalOptions[0];
    const curToneChar = curFinalObj.tones[this.currentToneIndex] || curFinalObj.tones[0];
    const syllable = this.constructSyllable(this.currentInitial, this.currentFinal, this.currentToneIndex);
    const textbookMatches = isValid ? this.getTextbookHanzi(this.currentInitial, this.currentFinal, this.currentToneIndex) : [];

    let initialTipHtml = '';
    if (!isValid) {
      initialTipHtml = `<span class="text-rose-600 font-extrabold flex items-center justify-center gap-1">⚠️ 提示：【${this.currentInitial}】与【${curToneChar}】不能相拼，相碰会弹开哦！</span>`;
    } else if (textbookMatches.length > 0) {
      const charsStr = textbookMatches.map(m => m.char).join('、');
      initialTipHtml = `<span class="text-emerald-700 font-extrabold flex items-center justify-center gap-1">📖 课本生字：可拼出【${charsStr}】，点击小火车相碰吧！</span>`;
    } else {
      initialTipHtml = `<span class="text-amber-800 font-bold flex items-center justify-center gap-1">✨ 标准音节：可练习连读【${syllable}】，点击小火车相碰吧！</span>`;
    }

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
            <span class="bg-amber-100 text-amber-800 text-xs px-3 py-1.5 rounded-full font-bold">课本同步生字 · 严谨普通话拼读</span>
          </div>
        </div>

        <!-- 铁轨与火车动效舞台 -->
        <div class="relative w-full h-56 bg-gradient-to-b from-sky-100 via-emerald-50 to-emerald-100 rounded-2xl overflow-hidden border-2 border-amber-200 flex items-center justify-center p-4">
          <!-- 背景云朵与小树 -->
          <div class="absolute top-2 left-8 text-2xl opacity-60">☁️</div>
          <div class="absolute top-5 right-12 text-xl opacity-60">☁️</div>
          <div class="absolute bottom-8 left-4 text-2xl opacity-40">🌲</div>
          <div class="absolute bottom-8 right-6 text-2xl opacity-40">🌳</div>

          <!-- 铁轨 -->
          <div class="absolute bottom-6 left-0 right-0 h-4 bg-amber-800/20 border-t-2 border-b-2 border-amber-900/40 flex items-center justify-around">
            ${Array(20).fill(0).map(() => '<div class="w-1.5 h-full bg-amber-900/40"></div>').join('')}
          </div>

          <!-- 悬挂式可拉动【呜呜汽笛拉绳】 -->
          <div id="train-whistle-cord" class="absolute top-2 left-1/2 transform -translate-x-1/2 z-30 cursor-pointer flex flex-col items-center group active:translate-y-2 transition-transform" title="拉动绳子鸣响汽笛！">
            <div class="w-1.5 h-6 bg-amber-400 border border-amber-600 rounded-full shadow"></div>
            <div class="w-7 h-7 bg-gradient-to-b from-yellow-300 to-amber-500 rounded-full border-2 border-amber-600 shadow-md flex items-center justify-center text-xs font-bold text-amber-950 group-hover:scale-110 active:scale-95 transition">
              🔔
            </div>
            <span class="text-[10px] bg-white/95 text-amber-950 font-black px-2 py-0.5 rounded-full shadow mt-0.5 whitespace-nowrap border border-amber-300 animate-pulse">
              🔔 拉汽笛相碰！
            </span>
          </div>

          <!-- 烟囱喷出的彩色爱心/云朵烟雾容器 -->
          <div id="train-smoke-container" class="absolute inset-0 pointer-events-none z-20 overflow-hidden"></div>

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
            <!-- 动态填充内容 -->
          </div>
        </div>

        <!-- 步骤提示与慢拼播放按钮 -->
        <div class="mt-4 flex flex-col items-center">
          <div id="train-status-tip" class="text-amber-900 font-bold text-sm mb-2 text-center h-6">
            ${initialTipHtml}
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
            <button id="btn-train-blend" class="flex-1 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-extrabold text-lg py-3 px-5 rounded-2xl shadow-lg border-2 border-amber-300 flex items-center justify-center space-x-2 transition cursor-pointer">
              <span class="text-xl">🚂</span>
              <span>${!isValid ? '两音相碰·看能不能拼！' : '两音相碰·连读发音！'}</span>
            </button>
            <button id="btn-train-replay" class="w-full sm:w-auto bg-white hover:bg-amber-100 active:scale-95 text-amber-950 font-black text-base py-3 px-4 rounded-2xl shadow border-2 border-amber-300 flex items-center justify-center space-x-1.5 transition cursor-pointer shrink-0">
              <span class="text-lg">🔊</span>
              <span>重播读音</span>
            </button>
          </div>
        </div>

        <!-- 自由拼音选择器（点按切换） -->
        <div class="mt-5 pt-4 border-t-2 border-amber-200/80">
          <div class="text-xs font-bold text-amber-900 mb-2">💡 换一换字母，探索课本生字与拼读规则：</div>

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

    // 互动汽笛拉绳
    const whistleCord = this.container.querySelector('#train-whistle-cord');
    if (whistleCord) {
      whistleCord.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.pullWhistleCord();
      };
    }

    // 连读播放按钮
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
   * 手动拉动汽笛绳：鸣响汽笛、喷出彩虹烟雾并启动拼读碰撞
   */
  pullWhistleCord() {
    const cord = this.container.querySelector('#train-whistle-cord');
    if (cord) {
      cord.style.transform = 'translate(-50%, 14px) scale(0.95)';
      setTimeout(() => {
        cord.style.transform = 'translate(-50%, 0) scale(1)';
      }, 250);
    }

    this.spawnRainbowSmoke();

    const isValid = this.isValidCombo(this.currentInitial, this.currentFinal);
    if (window.mascotPipi) {
      if (isValid) {
        window.mascotPipi.speak('汽笛鸣响啦！两列小火车开动相碰！🚂💨');
      } else {
        window.mascotPipi.speak('汽笛鸣响啦！看看这两个字母能不能碰！🚂');
      }
    }

    this.playBlendingAnimation();
  }

  /**
   * 喷出彩色爱心、星星与烟雾特效
   */
  spawnRainbowSmoke() {
    const smokeContainer = this.container.querySelector('#train-smoke-container');
    if (!smokeContainer) return;

    const emojis = ['☁️', '💖', '🌈', '⭐', '💨', '✨'];
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const puff = document.createElement('div');
        puff.className = 'absolute text-2xl transition-all duration-1000 pointer-events-none select-none';
        puff.innerText = emojis[i % emojis.length];
        puff.style.left = `${35 + Math.random() * 30}%`;
        puff.style.top = '55%';
        puff.style.opacity = '1';
        puff.style.transform = 'scale(0.5)';
        smokeContainer.appendChild(puff);

        requestAnimationFrame(() => {
          puff.style.top = `${8 + Math.random() * 20}%`;
          puff.style.left = `${parseFloat(puff.style.left) + (Math.random() * 24 - 12)}%`;
          puff.style.transform = 'scale(1.4) rotate(20deg)';
          puff.style.opacity = '0';

          setTimeout(() => puff.remove(), 1050);
        });
      }, i * 80);
    }
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
      initialCar.style.transition = 'all 0.4s ease-out';
      initialCar.style.transform = 'translateX(0)';
      initialCar.classList.remove('scale-110');
    }
    if (finalCar) {
      finalCar.style.transition = 'all 0.4s ease-out';
      finalCar.style.transform = 'translateX(0)';
      finalCar.classList.remove('scale-110');
    }
    if (spark) {
      spark.innerText = '⚡';
      spark.classList.add('opacity-0');
    }
    if (resultBox) resultBox.classList.add('hidden');

    const isValid = this.isValidCombo(this.currentInitial, this.currentFinal);
    const curFinalObj = this.finalOptions.find(f => f.base === this.currentFinal) || this.finalOptions[0];
    const curToneChar = curFinalObj.tones[this.currentToneIndex] || curFinalObj.tones[0];
    const syllable = this.constructSyllable(this.currentInitial, this.currentFinal, this.currentToneIndex);
    const textbookMatches = isValid ? this.getTextbookHanzi(this.currentInitial, this.currentFinal, this.currentToneIndex) : [];

    if (tip) {
      if (!isValid) {
        tip.innerHTML = `<span class="text-rose-600 font-extrabold flex items-center justify-center gap-1">⚠️ 提示：【${this.currentInitial}】与【${curToneChar}】不能相拼，相碰会弹开哦！</span>`;
      } else if (textbookMatches.length > 0) {
        const charsStr = textbookMatches.map(m => m.char).join('、');
        tip.innerHTML = `<span class="text-emerald-700 font-extrabold flex items-center justify-center gap-1">📖 课本生字：可拼出【${charsStr}】，点击小火车相碰吧！</span>`;
      } else {
        tip.innerHTML = `<span class="text-amber-800 font-bold flex items-center justify-center gap-1">✨ 标准音节：可练习连读【${syllable}】，点击小火车相碰吧！</span>`;
      }
    }

    if (blendBtn) {
      blendBtn.classList.remove('ring-4', 'ring-amber-300', 'animate-pulse');
      if (!isValid) {
        blendBtn.innerHTML = `
          <span class="text-xl">🚂</span>
          <span>两音相碰·看能不能拼！</span>
        `;
      } else {
        blendBtn.innerHTML = `
          <span class="text-xl">🚂</span>
          <span>两音相碰·连读发音！</span>
        `;
      }
    }
  }

  /**
   * 重播读音：直接朗读当前两音节合成音
   */
  playDirectAudio() {
    if (this.isAnimating) {
      this.resetAnimation();
    }
    const isValid = this.isValidCombo(this.currentInitial, this.currentFinal);
    const curFinalObj = this.finalOptions.find(f => f.base === this.currentFinal) || this.finalOptions[0];
    const curToneChar = curFinalObj.tones[this.currentToneIndex] || curFinalObj.tones[0];
    const syllable = this.constructSyllable(this.currentInitial, this.currentFinal, this.currentToneIndex);

    if (window.audioEngine) {
      window.audioEngine.stopAllAudio();
      window.audioEngine.ensureAudioContext();

      if (!isValid) {
        window.audioEngine.playGentleOops();
        const tip = this.container ? this.container.querySelector('#train-status-tip') : null;
        if (tip) tip.innerText = `⚠️ 当前【${this.currentInitial}】与【${curToneChar}】不能相拼，请换一个字母！`;
        if (window.mascotPipi) {
          window.mascotPipi.speak('这两个字母不能相拼哦，换一个试试吧！');
        }
        return;
      }

      window.audioEngine.speak(syllable);
    }
  }

  /**
   * 触发小火车滑行对撞与连读语音流程
   */
  playBlendingAnimation() {
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

    const isValid = this.isValidCombo(this.currentInitial, this.currentFinal);
    const curFinalObj = this.finalOptions.find(f => f.base === this.currentFinal) || this.finalOptions[0];
    const curToneChar = curFinalObj.tones[this.currentToneIndex] || curFinalObj.tones[0];
    const syllable = this.constructSyllable(this.currentInitial, this.currentFinal, this.currentToneIndex);
    const textbookMatches = isValid ? this.getTextbookHanzi(this.currentInitial, this.currentFinal, this.currentToneIndex) : [];
    const reason = !isValid ? this.getInvalidReason(this.currentInitial, this.currentFinal) : '';

    // 步骤 1：读声母
    if (tip) tip.innerText = `第一步：声母轻短读【${this.currentInitial}】...`;
    if (initialCar) initialCar.classList.add('scale-110');

    // 安全超时保护：最长 7 秒必然自动复位归位
    clearTimeout(this.animWatchdog);
    this.animWatchdog = setTimeout(() => {
      this.resetAnimation();
    }, 7000);

    const handleStep = (step, data) => {
      if (step === 2) {
        // 步骤 2：读韵母
        if (initialCar) initialCar.classList.remove('scale-110');
        if (finalCar) finalCar.classList.add('scale-110');
        if (tip) tip.innerText = `第二步：韵母响亮读【${curToneChar}】...`;
      } else if (step === 3) {
        // 步骤 3：两车滑行加速靠拢！
        if (finalCar) finalCar.classList.remove('scale-110');
        if (tip) tip.innerText = `第三步：两节车厢开动相碰！${this.currentInitial}...${curToneChar}...`;
        if (initialCar) {
          initialCar.style.transition = 'all 0.5s ease-in';
          initialCar.style.transform = 'translateX(90px)';
        }
        if (finalCar) {
          finalCar.style.transition = 'all 0.5s ease-in';
          finalCar.style.transform = 'translateX(-90px)';
        }
        if (spark) {
          spark.innerText = '⚡';
          spark.classList.remove('opacity-0');
        }
      } else if (step === 4) {
        // 步骤 4：碰撞判断
        if (!isValid) {
          // ===============================
          // 碰撞不成功！弹回与友好提示
          // ===============================
          if (initialCar) {
            initialCar.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
            initialCar.style.transform = 'translateX(-25px)';
            setTimeout(() => {
              if (initialCar) initialCar.style.transform = 'translateX(0)';
            }, 300);
          }
          if (finalCar) {
            finalCar.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
            finalCar.style.transform = 'translateX(25px)';
            setTimeout(() => {
              if (finalCar) finalCar.style.transform = 'translateX(0)';
            }, 300);
          }
          if (spark) {
            spark.innerText = '💥';
            spark.classList.remove('opacity-0');
          }

          if (tip) tip.innerText = `⚠️ 碰不起来哦！【${this.currentInitial}】与【${curToneChar}】不能相拼。`;

          if (window.mascotPipi) {
            window.mascotPipi.speak('哎呀，这两个字母碰不起来哦！换个字母再试一次吧！');
          }

          if (resultBox) {
            resultBox.className = 'absolute inset-0 bg-white/95 backdrop-blur-md rounded-2xl z-20 flex flex-col items-center justify-center p-4 shadow-xl border-4 border-rose-400 animate-fadeIn';
            resultBox.innerHTML = `
              <div class="text-4xl mb-1 animate-bounce">💥 🚂 🚫</div>
              <div class="text-xs text-rose-800 bg-rose-100 border border-rose-300 px-3 py-1 rounded-full font-black tracking-wide mb-1">
                ⚠️ 碰撞不成功 · 不能相拼
              </div>
              <div class="text-xl font-black text-rose-950 my-1">
                【${this.currentInitial}】与【${curToneChar}】碰不起来！
              </div>
              <div class="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3 my-1.5 text-center max-w-xs font-medium leading-relaxed shadow-sm whitespace-pre-line">
                ${reason}
              </div>
              <button id="btn-result-close" class="mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-white font-black text-xs px-4 py-2 rounded-xl shadow-md cursor-pointer active:scale-95 transition">
                我知道啦，换字母重试 🔄
              </button>
            `;
            resultBox.classList.remove('hidden');

            const closeBtn = resultBox.querySelector('#btn-result-close');
            if (closeBtn) {
              closeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.resetAnimation();
              };
            }
          }

        } else {
          // ===============================
          // 碰撞成功！
          // ===============================
          if (spark) {
            spark.innerText = '✨';
            spark.classList.remove('opacity-0');
          }
          if (tip) tip.innerText = `猛一碰！合读：【${syllable}】！`;

          if (window.mascotPipi) {
            window.mascotPipi.playGiggleChime();
          }

          if (resultBox) {
            if (textbookMatches.length > 0) {
              // 课本生字模式：如语文课本中有的字就显示出来
              const primaryChar = textbookMatches[0].char;
              const allChars = textbookMatches.map(m => m.char).join('、');
              const wordsList = textbookMatches.flatMap(m => m.words).slice(0, 3).join(' · ');
              const unit = textbookMatches[0].unit;

              resultBox.className = 'absolute inset-0 bg-white/95 backdrop-blur-md rounded-2xl z-20 flex flex-col items-center justify-center p-4 shadow-xl border-4 border-amber-400 animate-fadeIn';
              resultBox.innerHTML = `
                <div class="text-xs text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full font-black tracking-wide mb-1 flex items-center gap-1">
                  <span>📖 统编一年级课本生字</span>
                  <span class="text-amber-600 font-normal">| ${unit}</span>
                </div>
                <div class="text-xs text-amber-600 font-extrabold my-0.5">
                  ${this.currentInitial} + ${curToneChar} ➔ <span class="text-amber-800 font-black text-sm">${syllable}</span>
                </div>
                <div class="text-5xl font-black text-amber-950 my-1 font-serif tracking-wider">
                  ${textbookMatches.length > 1 ? allChars : primaryChar}
                </div>
                <div class="text-base font-bold text-amber-800 my-0.5">
                  ${wordsList}
                </div>
                <div class="flex items-center gap-2 mt-2">
                  <span class="text-xs text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full font-bold">🌟 拼对啦！课本里的生字学会啦！</span>
                  <button id="btn-result-replay" class="text-xs bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-900 font-black px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer shadow-sm border border-amber-300">
                    <span>🔊 听读音</span>
                  </button>
                </div>
              `;
            } else {
              // 纯拼音音节模式：不在课本的字不用显示，只显示拼音音节
              resultBox.className = 'absolute inset-0 bg-white/95 backdrop-blur-md rounded-2xl z-20 flex flex-col items-center justify-center p-4 shadow-xl border-4 border-sky-400 animate-fadeIn';
              resultBox.innerHTML = `
                <div class="text-xs text-sky-800 bg-sky-100 border border-sky-300 px-3 py-1 rounded-full font-black tracking-wide mb-1 flex items-center gap-1">
                  <span>✨ 标准普通话拼音音节</span>
                  <span class="text-sky-600 font-normal">(纯音节练读)</span>
                </div>
                <div class="text-xs text-sky-600 font-extrabold my-0.5">
                  ${this.currentInitial} + ${curToneChar} ➔
                </div>
                <div class="text-5xl font-black text-sky-950 my-1 font-mono tracking-wider">
                  ${syllable}
                </div>
                <div class="text-xs text-slate-500 font-medium my-0.5">
                  一年级课本暂无此生字，专心练习拼读连读发音哦！
                </div>
                <div class="flex items-center gap-2 mt-2">
                  <span class="text-xs text-sky-700 bg-sky-100 px-3 py-1 rounded-full font-bold">🎉 发音很标准！太棒了！</span>
                  <button id="btn-result-replay" class="text-xs bg-sky-100 hover:bg-sky-200 active:scale-95 text-sky-900 font-black px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer shadow-sm border border-sky-300">
                    <span>🔊 听读音</span>
                  </button>
                </div>
              `;
            }
            resultBox.classList.remove('hidden');

            const replayBtn = resultBox.querySelector('#btn-result-replay');
            if (replayBtn) {
              replayBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.audioEngine) window.audioEngine.speak(syllable);
              };
            }
          }
        }
      } else if (step === 5) {
        // 步骤 5：完成归位
        clearTimeout(this.stepTimer);
        this.stepTimer = setTimeout(() => {
          this.resetAnimation();
          if (tip) {
            if (!isValid) {
              tip.innerText = '换一个可以相拼的字母，再试一次吧！';
            } else {
              tip.innerText = '太棒啦！还可以换其他字母继续拼读哦！';
            }
          }
        }, 1800);
      }
    };

    if (window.audioEngine) {
      window.audioEngine.playBlendLadder({
        initial: this.currentInitial,
        tone: curToneChar,
        syllable: syllable,
        isInvalid: !isValid,
        reason: reason
      }, handleStep);
    } else {
      // 离线/无音频引擎纯视觉定时降级方案
      handleStep(1, this.currentInitial);
      this.stepTimer = setTimeout(() => {
        handleStep(2, curToneChar);
        this.stepTimer = setTimeout(() => {
          handleStep(3, `${this.currentInitial}—>${curToneChar}`);
          this.stepTimer = setTimeout(() => {
            handleStep(4, { isInvalid: !isValid, syllable, reason });
            this.stepTimer = setTimeout(() => {
              handleStep(5, 'done');
            }, 1800);
          }, 800);
        }, 800);
      }, 800);
    }
  }
}

if (typeof window !== 'undefined') {
  window.TrainBlenderGame = TrainBlenderGame;
}
