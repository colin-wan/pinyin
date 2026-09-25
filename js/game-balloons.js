/**
 * 游戏1：气球派对（听音戳气球）
 * 训练听力辨音敏锐度，强化字母与声调的音形对应
 */

class BalloonGame {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.score = 0;
    this.correctCount = 0;
    this.targetCorrect = 5;
    this.target = null;
    this.balloons = [];
    this.timer = null;
    this.isPlaying = false;
    this.colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
  }

  start(lessonLetters = ['a', 'o', 'e', 'i', 'u', 'ü']) {
    if (!this.container) return;
    this.isPlaying = true;
    this.score = 0;
    this.correctCount = 0;
    this.lettersPool = lessonLetters && lessonLetters.length > 0 ? lessonLetters : ['a', 'o', 'e', 'b', 'p', 'm', 'f'];
    this.renderLayout();
    this.nextRound();
  }

  stop() {
    this.isPlaying = false;
    if (this.timer) clearInterval(this.timer);
    if (this.container) this.container.innerHTML = '';
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="relative w-full h-[460px] bg-gradient-to-b from-sky-100 to-sky-200 rounded-3xl overflow-hidden shadow-inner border-4 border-sky-300 select-none">
        <!-- 顶栏状态 -->
        <div class="absolute top-3 left-4 right-4 flex items-center justify-between z-20 bg-white/85 backdrop-blur-md px-5 py-2.5 rounded-full shadow-sm">
          <div class="flex items-center space-x-2">
            <span class="text-xl">🎈</span>
            <span class="font-bold text-sky-800 text-sm sm:text-base">已答对: <span id="balloon-correct-count" class="text-amber-500 font-extrabold text-xl sm:text-2xl">${this.correctCount}</span>/5</span>
            <span class="text-xs text-sky-600 font-bold ml-1 sm:ml-2">(得分: <span id="balloon-score">${this.score}</span>)</span>
          </div>

          <div class="flex items-center space-x-3">
            <button id="balloon-replay-audio" class="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-500 active:scale-95 text-amber-950 font-bold px-4 py-1.5 rounded-full shadow transition cursor-pointer">
              <span class="text-lg">🔊</span>
              <span>重播读音</span>
            </button>
          </div>
        </div>

        <!-- 听力重播读音主按钮 (彻底移除“请戳破气球”文字，完全基于纯正人声听辨) -->
        <div class="absolute top-16 left-0 right-0 text-center z-10 pointer-events-auto">
          <button id="balloon-center-listen-btn" class="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-black px-6 py-2.5 rounded-full shadow-lg text-base sm:text-lg border-2 border-white/60 transition cursor-pointer">
            <span class="text-2xl animate-pulse">🔊</span>
            <span>重播读音 (听音辨字母)</span>
          </button>
        </div>

        <!-- 气球上升活动区域 -->
        <div id="balloon-sky" class="relative w-full h-full overflow-hidden"></div>
      </div>
    `;

    document.getElementById('balloon-replay-audio')?.addEventListener('click', () => {
      this.playTargetAudio();
    });
    document.getElementById('balloon-center-listen-btn')?.addEventListener('click', () => {
      this.playTargetAudio();
    });
  }

  nextRound() {
    if (!this.isPlaying) return;
    this.tapLocked = false;

    // 随机选择目标字母
    const randomIndex = Math.floor(Math.random() * this.lettersPool.length);
    this.target = this.lettersPool[randomIndex];

    this.playTargetAudio();
    this.spawnBalloons();
  }

  playTargetAudio() {
    if (window.audioEngine && this.target) {
      window.audioEngine.stopAllAudio();
      // 100% 统编人教版真人母带 MP3 发音 (bo1.mp3, a1.mp3 等，自然纯正)
      window.audioEngine.speak(this.target);
    }
  }

  spawnBalloons() {
    const sky = document.getElementById('balloon-sky');
    if (!sky) return;
    sky.innerHTML = '';

    // 生成包含正确目标及3个混淆项的4个气球
    const roundLetters = [this.target];
    const pool = [...this.lettersPool].filter(l => l !== this.target);
    while (roundLetters.length < 4 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      roundLetters.push(pool.splice(idx, 1)[0]);
    }
    // 打乱顺序
    roundLetters.sort(() => Math.random() - 0.5);

    roundLetters.forEach((letter, idx) => {
      const balloon = document.createElement('div');
      const color = this.colors[idx % this.colors.length];
      const leftPercent = 12 + idx * 22; // 水平间距分布均匀

      balloon.className = 'absolute cursor-pointer select-none transition-transform active:scale-95';
      balloon.style.left = `${leftPercent}%`;
      balloon.style.bottom = '-110px';
      balloon.style.transition = 'bottom 4.5s ease-out, transform 0.2s';

      balloon.innerHTML = `
        <div class="relative flex flex-col items-center">
          <!-- 气球球体 -->
          <div class="w-20 h-24 rounded-full flex items-center justify-center text-white font-extrabold text-3xl shadow-lg border-2 border-white/40" style="background-color: ${color}">
            <span class="drop-shadow-md select-none pointer-events-none">${letter}</span>
            <div class="absolute top-2 left-3 w-4 h-6 bg-white/40 rounded-full blur-[1px]"></div>
          </div>
          <!-- 气球绳子 -->
          <div class="w-0.5 h-12 bg-amber-700/60 mt-0.5"></div>
        </div>
      `;

      balloon.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.handleBalloonTap(letter, balloon);
      });

      sky.appendChild(balloon);

      // 启动上升动画
      setTimeout(() => {
        balloon.style.bottom = `${180 + Math.random() * 80}px`;
      }, 50 + idx * 100);
    });
  }

  handleBalloonTap(letter, balloonEl) {
    if (!this.isPlaying || this.tapLocked) return;

    if (letter === this.target) {
      // 戳对啦！防重点击
      this.tapLocked = true;
      if (window.audioEngine) {
        window.audioEngine.stopAllAudio();
        window.audioEngine.playBalloonPop();
        window.audioEngine.playSuccess();
        // 播放真人母带发音强化确认
        setTimeout(() => {
          if (window.audioEngine) window.audioEngine.speak(this.target);
        }, 220);
      }

      this.score += 10;
      this.correctCount += 1;
      const scoreEl = document.getElementById('balloon-score');
      if (scoreEl) scoreEl.innerText = this.score;
      const correctEl = document.getElementById('balloon-correct-count');
      if (correctEl) correctEl.innerText = this.correctCount;

      if (window.screenTimeLock) {
        window.screenTimeLock.recordAnswer(true);
      }

      // 爆炸动效
      balloonEl.innerHTML = `
        <div class="text-4xl animate-ping flex items-center justify-center w-20 h-24">
          ✨🎉⭐
        </div>
      `;

      if (this.correctCount >= this.targetCorrect) {
        // 答对5次，通关完成！
        setTimeout(() => {
          this.showVictory();
        }, 700);
      } else {
        setTimeout(() => {
          this.nextRound();
        }, 900);
      }
    } else {
      // 戳错啦，温和抖动并以真人母带读出戳错的音，再回放正确音
      if (window.screenTimeLock) {
        window.screenTimeLock.recordAnswer(false);
      }
      if (window.audioEngine) {
        window.audioEngine.stopAllAudio();
        window.audioEngine.playGentleOops();
        // 纯真人母带读出错误字母，然后重放目标字母
        setTimeout(() => {
          if (window.audioEngine) {
            window.audioEngine.speak(letter, () => {
              setTimeout(() => {
                this.playTargetAudio();
              }, 500);
            });
          }
        }, 250);
      }
      balloonEl.classList.add('animate-shake');
      setTimeout(() => balloonEl.classList.remove('animate-shake'), 500);

      // 记录到错题本
      if (window.appState) {
        window.appState.recordMistake(this.target, `听辨混淆为 ${letter}`);
      }
    }
  }

  showVictory() {
    this.isPlaying = false;
    this.tapLocked = true;
    if (window.audioEngine) {
      window.audioEngine.stopAllAudio();
      window.audioEngine.playFanfare();
    }
    if (window.celebrationFX) {
      window.celebrationFX.launchConfetti(3500);
    }
    if (window.app && window.app.state) {
      window.app.state.addStars(5);
    }
    if (window.mascotPipi) {
      window.mascotPipi.speak('🎉 太棒啦！气球派对答对 5 次大获全胜！获得 5 颗星币！', true);
    }

    const sky = document.getElementById('balloon-sky');
    if (!sky) return;
    sky.innerHTML = `
      <div class="absolute inset-0 flex items-center justify-center p-4 z-30">
        <div class="bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-2xl border-4 border-amber-400 text-center space-y-4 max-w-md animate-fadeIn">
          <div class="text-6xl animate-bounce">🏆 🎈 ⭐</div>
          <h4 class="text-2xl sm:text-3xl font-black text-amber-950">太棒啦！答对 5 次挑战成功！</h4>
          <p class="text-sm font-extrabold text-emerald-600">已获得 5 颗闪亮星币 ⭐ · 听音辨字母全通关！</p>
          <div class="pt-2 flex justify-center space-x-3">
            <button id="btn-balloon-restart" class="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 active:scale-95 text-white font-extrabold text-base py-3 px-7 rounded-2xl shadow-lg border border-amber-300 transition cursor-pointer">
              🔄 再玩一次
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-balloon-restart')?.addEventListener('click', () => {
      this.start(this.lettersPool);
    });
  }
}

if (typeof window !== 'undefined') {
  window.BalloonGame = BalloonGame;
}
