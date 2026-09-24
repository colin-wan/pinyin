/**
 * 游戏3：声调过山车（小汽车爬坡与四声辨析）
 * 专攻：一声平、二声扬、三声拐弯、四声降，生动解决二声与三声滑音混淆难题
 */

class ToneRollercoasterGame {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentLetter = 'a';
    this.targetToneIndex = 1; // 0: 1声, 1: 2声, 2: 3声, 3: 4声
    this.score = 0;
    this.isPlaying = false;

    this.tonesMap = {
      'a': ['ā', 'á', 'ǎ', 'à'],
      'o': ['ō', 'ó', 'ǒ', 'ò'],
      'e': ['ē', 'é', 'ě', 'è'],
      'i': ['ī', 'í', 'ǐ', 'ì'],
      'u': ['ū', 'ú', 'ǔ', 'ù'],
      'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ']
    };

    this.trackDescriptions = [
      { name: '一声平', mark: '—', desc: '平平稳稳一条线，发音高平不改变', carClass: 'translate-x-4' },
      { name: '二声扬', mark: '／', desc: '从下往上冲山坡，嗓音向上扬起来', carClass: 'translate-x-20 -translate-y-8 rotate-[-20deg]' },
      { name: '三声拐弯', mark: '∨', desc: '先下山谷再上坡，拐个小弯唱支歌', carClass: 'translate-x-36 translate-y-2' },
      { name: '四声降', mark: '＼', desc: '高处直接滑下来，干净利落真痛快', carClass: 'translate-x-52 translate-y-6 rotate-[25deg]' }
    ];
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="w-full bg-gradient-to-b from-indigo-50 to-blue-100 rounded-3xl p-5 shadow-lg border-4 border-indigo-200 select-none">
        <!-- 顶栏标题 -->
        <div class="flex items-center justify-between bg-white/85 p-3 rounded-2xl shadow-sm mb-4">
          <div class="flex items-center space-x-2.5">
            <span class="text-3xl">🎢</span>
            <div>
              <h3 class="font-extrabold text-indigo-950 text-lg">声调过山车·四声魔毯</h3>
              <p class="text-xs text-indigo-700 font-medium">口诀：一声平，二声扬，三声拐弯，四声降！</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-sm font-bold text-indigo-900">得分: <span id="tone-game-score" class="text-amber-500 font-extrabold text-xl">0</span></span>
          </div>
        </div>

        <!-- 过山车跑道与小汽车动效区 -->
        <div class="relative w-full h-48 bg-gradient-to-b from-sky-200 via-indigo-100 to-indigo-200 rounded-2xl overflow-hidden border-2 border-indigo-300 p-4 flex flex-col justify-between">
          <!-- 跑道与小汽车 SVG (viewBox 0 0 600 180 像素级物理对齐) -->
          <svg id="tone-coaster-svg" class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 180" preserveAspectRatio="none">
            <!-- 一声平线 (蓝色) 轨道基座与主轨道 -->
            <path d="M 35,70 L 145,70" stroke="#DBEAFE" stroke-width="14" stroke-linecap="round" fill="none" />
            <path id="tone-path-0" d="M 35,70 L 145,70" stroke="#3B82F6" stroke-width="6" stroke-linecap="round" fill="none" />

            <!-- 二声上坡 (绿色) 轨道基座与主轨道 -->
            <path d="M 175,115 L 285,40" stroke="#D1FAE5" stroke-width="14" stroke-linecap="round" fill="none" />
            <path id="tone-path-1" d="M 175,115 L 285,40" stroke="#10B981" stroke-width="6" stroke-linecap="round" fill="none" />

            <!-- 三声拐弯下上坡 (橙色) 轨道基座与主轨道 -->
            <path d="M 315,50 Q 375,145 435,50" stroke="#FEF3C7" stroke-width="14" stroke-linecap="round" fill="none" />
            <path id="tone-path-2" d="M 315,50 Q 375,145 435,50" stroke="#F59E0B" stroke-width="6" stroke-linecap="round" fill="none" />

            <!-- 四声下冲坡 (红色) 轨道基座与主轨道 -->
            <path d="M 465,40 L 575,115" stroke="#FFE4E6" stroke-width="14" stroke-linecap="round" fill="none" />
            <path id="tone-path-3" d="M 465,40 L 575,115" stroke="#EF4444" stroke-width="6" stroke-linecap="round" fill="none" />

            <!-- 跑道上的小汽车 (以轮子接地点 (0, 0) 为中心，严丝合缝吸附在铁轨表面) -->
            <g id="tone-car-g" transform="translate(35, 70) rotate(0)">
              <g transform="translate(0, -3)">
                <!-- 车身主体 -->
                <rect x="-18" y="-14" width="36" height="13" rx="4" fill="#EF4444" stroke="#991B1B" stroke-width="1.5" />
                <!-- 车顶驾驶舱 -->
                <path d="M -10,-14 Q -4,-24 3,-24 Q 10,-24 13,-14 Z" fill="#93C5FD" stroke="#991B1B" stroke-width="1.2" />
                <!-- 左右车轮 (接地点在 y = 3，经 translate(0, -3) 后精准切合在 y = 0 轨道线上) -->
                <circle cx="-10" cy="3" r="4.5" fill="#1F2937" stroke="#4B5563" stroke-width="1.2" />
                <circle cx="10" cy="3" r="4.5" fill="#1F2937" stroke="#4B5563" stroke-width="1.2" />
                <circle cx="-10" cy="3" r="1.8" fill="#E5E7EB" />
                <circle cx="10" cy="3" r="1.8" fill="#E5E7EB" />
                <!-- 前车灯 -->
                <circle cx="17" cy="-8" r="2" fill="#FDE047" />
              </g>
            </g>
          </svg>

          <!-- 4个跑道名称与字母音节展示 -->
          <div class="relative z-10 grid grid-cols-4 gap-2 mt-auto pb-1 text-center">
            ${[0, 1, 2, 3].map(idx => `
              <div class="bg-white/85 backdrop-blur-sm p-1.5 rounded-xl border border-indigo-200 shadow-sm cursor-pointer hover:bg-white active:scale-95 transition tone-track-btn" data-tone-idx="${idx}">
                <div class="text-xs font-extrabold ${['text-blue-600', 'text-emerald-600', 'text-amber-600', 'text-rose-600'][idx]}">
                  ${this.trackDescriptions[idx].name}
                </div>
                <div class="text-2xl font-black text-indigo-950 font-mono my-0.5" id="tone-char-${idx}">
                  ${this.tonesMap[this.currentLetter][idx]}
                </div>
                <div class="text-[10px] text-neutral-500 font-bold">
                  ${this.trackDescriptions[idx].mark}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 闯关挑战区：听音选声调 -->
        <div class="mt-4 bg-white/90 p-4 rounded-2xl shadow-sm border border-indigo-100 flex flex-col items-center">
          <div class="flex items-center space-x-3 mb-3">
            <button id="tone-listen-btn" class="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-95 text-white font-black px-6 py-2.5 rounded-full shadow-lg text-sm sm:text-base transition cursor-pointer">
              <span class="text-xl animate-pulse">🔊</span>
              <span>重播读音 (听题目声调)</span>
            </button>
            <span class="text-xs text-indigo-700 font-medium">听小汽车发的是几声，然后点击对应跑道！</span>
          </div>

          <!-- 切换韵母母音 -->
          <div class="flex items-center space-x-2 text-xs font-bold text-indigo-900 mt-1">
            <span>换一个字母：</span>
            ${['a', 'o', 'e', 'i', 'u', 'ü'].map(l => `
              <button class="tone-pick-letter px-2.5 py-1 rounded-lg ${this.currentLetter === l ? 'bg-indigo-600 text-white shadow' : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'} transition cursor-pointer" data-letter="${l}">
                ${l}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.randomTarget();
    setTimeout(() => this.resetCarPosition(), 60);
  }

  bindEvents() {
    // 监听4个声调跑道点击
    this.container.querySelectorAll('.tone-track-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const toneIdx = parseInt(e.currentTarget.dataset.toneIdx);
        this.handleToneSelect(toneIdx);
      });
    });

    // 播放题目发音
    document.getElementById('tone-listen-btn')?.addEventListener('click', () => {
      this.playTargetAudio();
    });

    // 换母音
    this.container.querySelectorAll('.tone-pick-letter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentLetter = e.currentTarget.dataset.letter;
        this.render();
      });
    });
  }

  resetCarPosition() {
    const path = document.getElementById('tone-path-0');
    const carG = document.getElementById('tone-car-g');
    if (path && carG) {
      const pt = path.getPointAtLength(0);
      carG.setAttribute('transform', `translate(${pt.x}, ${pt.y}) rotate(0)`);
    }
  }

  randomTarget() {
    this.targetToneIndex = Math.floor(Math.random() * 4);
    setTimeout(() => {
      this.playTargetAudio();
    }, 400);
  }

  playTargetAudio() {
    if (window.audioEngine) {
      window.audioEngine.stopAllAudio();
      window.audioEngine.speakTone(this.currentLetter, this.targetToneIndex);
    }
  }

  /**
   * 采用 SVG 矢量切线微分法，让小汽车轮子 100% 严丝合缝骑在轨道线上，平滑转弯与爬坡
   * @param {number} toneIdx 0:一声平, 1:二声扬, 2:三声拐弯, 3:四声降
   * @param {function} onFinished 动画结束回调
   */
  driveCar(toneIdx, onFinished = null) {
    const path = document.getElementById(`tone-path-${toneIdx}`);
    const carG = document.getElementById('tone-car-g');
    if (!path || !carG) {
      if (onFinished) onFinished();
      return;
    }

    if (this.carAnimFrame) {
      cancelAnimationFrame(this.carAnimFrame);
      this.carAnimFrame = null;
    }

    const totalLength = path.getTotalLength();
    const duration = toneIdx === 2 ? 1050 : 750;
    const startTime = performance.now();

    const frameStep = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      // 遵循真实物理惯性的缓动
      let easeProgress = progress;
      if (toneIdx === 0) {
        // 一声：平稳匀速
        easeProgress = progress;
      } else if (toneIdx === 1) {
        // 二声扬：向上冲坡加速
        easeProgress = Math.pow(progress, 1.25);
      } else if (toneIdx === 2) {
        // 三声拐弯：平滑正弦波穿越谷底
        easeProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);
      } else if (toneIdx === 3) {
        // 四声降：高处顺势急冲下坡
        easeProgress = Math.pow(progress, 1.4);
      }

      const dist = easeProgress * totalLength;
      const pt = path.getPointAtLength(dist);

      // 计算真实轨迹切线角度 (切线微分)
      const delta = 1.0;
      const ptAhead = path.getPointAtLength(Math.min(totalLength, dist + delta));
      const ptBehind = path.getPointAtLength(Math.max(0, dist - delta));
      const angleRad = Math.atan2(ptAhead.y - ptBehind.y, ptAhead.x - ptBehind.x);
      const angleDeg = angleRad * (180 / Math.PI);

      // 车身轮子精准贴合轨道线
      carG.setAttribute('transform', `translate(${pt.x}, ${pt.y}) rotate(${angleDeg})`);

      if (progress < 1) {
        this.carAnimFrame = requestAnimationFrame(frameStep);
      } else {
        this.carAnimFrame = null;
        if (onFinished) onFinished();
      }
    };

    this.carAnimFrame = requestAnimationFrame(frameStep);
  }

  handleToneSelect(selectedIdx) {
    if (this.isSelecting) return;
    this.isSelecting = true;

    // 1. 彻底清除重音并播放所选声调的真人母带 MP3 发音
    if (window.audioEngine) {
      window.audioEngine.stopAllAudio();
      window.audioEngine.speakTone(this.currentLetter, selectedIdx);
    }

    // 2. 小汽车沿对应真实声调轨迹飞驰
    this.driveCar(selectedIdx, () => {
      // 动画完成后进行判断
      if (selectedIdx === this.targetToneIndex) {
        if (window.audioEngine) {
          window.audioEngine.playSuccess();
        }
        this.score += 10;
        const s = document.getElementById('tone-game-score');
        if (s) s.innerText = this.score;

        if (window.screenTimeLock) {
          window.screenTimeLock.recordAnswer(true);
        }

        setTimeout(() => {
          this.isSelecting = false;
          this.randomTarget();
        }, 1100);
      } else {
        if (window.screenTimeLock) {
          window.screenTimeLock.recordAnswer(false);
        }
        if (window.audioEngine) {
          window.audioEngine.playGentleOops();
        }
        if (window.appState) {
          window.appState.recordMistake(
            this.tonesMap[this.currentLetter][this.targetToneIndex],
            `误选为${this.trackDescriptions[selectedIdx].name}`
          );
        }

        setTimeout(() => {
          this.isSelecting = false;
          // 重新播放目标题目的正确发音，并让小汽车在正确轨道示范飞驰一次
          this.playTargetAudio();
          this.driveCar(this.targetToneIndex);
        }, 900);
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.ToneRollercoasterGame = ToneRollercoasterGame;
}
