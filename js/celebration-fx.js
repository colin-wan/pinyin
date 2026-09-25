/**
 * 拼音趣味正反馈系统 (CelebrationFX)
 * 1. Combo 连击系统 (2连对、3连对、超神连对火焰与升调音效)
 * 2. 物理星光喷泉 (从答题位置抛物线飞入顶部星星罐)
 * 3. 全屏彩带彩纸纸屑礼花 (通关高潮体验)
 */

class CelebrationFX {
  constructor() {
    this.comboCount = 0;
    this.comboTimer = null;
    this.audioCtx = null;
    this.canvas = null;
    this.ctx = null;
    this.confettiParticles = [];
    this.confettiRunning = false;

    this.initConfettiCanvas();
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

  initConfettiCanvas() {
    if (document.getElementById('confetti-canvas')) return;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'confetti-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '9999';
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    window.addEventListener('resize', () => {
      if (this.canvas) {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      }
    });
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * 记录一次答对，触发连击激励、升调和飞星
   * @param {Element|TouchEvent|MouseEvent} sourceElement - 点击的按钮或元素
   */
  registerCorrect(sourceElement = null) {
    this.comboCount++;
    this.playAscendingDing(this.comboCount);

    // 触发飞星到顶部星星栏
    if (sourceElement) {
      this.launchFlyingStars(sourceElement);
    }

    // 触发连击浮动横幅
    if (this.comboCount >= 2) {
      this.showComboBadge(this.comboCount, sourceElement);
    }

    // 通知伴学萌宠皮皮做庆祝互动
    if (window.mascotPipi) {
      window.mascotPipi.cheerOnCorrect(this.comboCount);
    }

    return this.comboCount;
  }

  /**
   * 记录一次失误或错误，重置连击并给予温柔安慰
   */
  registerMistake() {
    this.comboCount = 0;
    if (window.mascotPipi) {
      window.mascotPipi.reassureOnMistake();
    }
  }

  /**
   * 播放随连击数逐渐升高的清脆音乐音阶
   */
  playAscendingDing(streak = 1) {
    try {
      this.ensureAudioContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      // 随着连击递增的五度和弦频率
      const baseFreqs = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
      const noteIdx = Math.min(baseFreqs.length - 1, streak - 1);
      const freq = baseFreqs[noteIdx];

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch (e) {
      console.warn('Ascending ding error:', e);
    }
  }

  /**
   * 弹出华丽的连击文字浮标 (Combo Badge)
   */
  showComboBadge(streak, targetElement = null) {
    let oldBadge = document.getElementById('floating-combo-badge');
    if (oldBadge) oldBadge.remove();

    const badge = document.createElement('div');
    badge.id = 'floating-combo-badge';
    badge.className = 'fixed z-50 pointer-events-none select-none font-black flex items-center space-x-1.5 px-4 py-2 rounded-full shadow-2xl transition-all duration-300 transform -translate-x-1/2 animate-bounce';

    let text = `🔥 ${streak} 连对·太赞了！`;
    let bgClass = 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-2 border-amber-200';

    if (streak === 3) {
      text = `⚡ 3 连对·神准小耳朵！`;
      bgClass = 'bg-gradient-to-r from-sky-400 to-indigo-500 text-white border-2 border-sky-200';
    } else if (streak >= 5) {
      text = `👑 ${streak} 连对·超神拼音王！`;
      bgClass = 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-yellow-200 border-2 border-yellow-300';
    }

    badge.className += ` ${bgClass}`;
    badge.innerHTML = `<span class="text-xl">⭐</span><span class="text-base tracking-wide">${text}</span>`;

    // 优先显示在屏幕中上方偏右，不遮挡主视线
    badge.style.left = '50%';
    badge.style.top = '18%';
    document.body.appendChild(badge);

    setTimeout(() => {
      badge.style.opacity = '0';
      badge.style.transform = 'translate(-50%, -20px) scale(0.9)';
      setTimeout(() => badge.remove(), 400);
    }, 1500);
  }

  /**
   * 物理星星从答题点抛物线飞向顶部星星计数器
   */
  launchFlyingStars(sourceEl) {
    if (!sourceEl) return;
    const rect = sourceEl.getBoundingClientRect ? sourceEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2 };
    const startX = rect.left + (rect.width ? rect.width / 2 : 0);
    const startY = rect.top + (rect.height ? rect.height / 2 : 0);

    const destEl = document.getElementById('top-stars-count') || document.querySelector('.fa-star');
    let destX = 35;
    let destY = 25;
    if (destEl) {
      const dRect = destEl.getBoundingClientRect();
      destX = dRect.left + dRect.width / 2;
      destY = dRect.top + dRect.height / 2;
    }

    const starCount = 3;
    for (let i = 0; i < starCount; i++) {
      setTimeout(() => {
        const star = document.createElement('div');
        star.className = 'fixed z-50 pointer-events-none select-none text-2xl transition-all duration-700 ease-in-out';
        star.innerText = '⭐';
        star.style.left = `${startX + (Math.random() * 40 - 20)}px`;
        star.style.top = `${startY + (Math.random() * 40 - 20)}px`;
        star.style.transform = 'scale(0.5)';
        star.style.opacity = '1';
        star.style.filter = 'drop-shadow(0 0 8px #f59e0b)';
        document.body.appendChild(star);

        requestAnimationFrame(() => {
          star.style.transform = 'scale(1.4)';
          setTimeout(() => {
            star.style.left = `${destX}px`;
            star.style.top = `${destY}px`;
            star.style.transform = 'scale(0.6) rotate(180deg)';
            star.style.opacity = '0.9';

            setTimeout(() => {
              star.remove();
              // 顶部星星计数器弹跳反馈
              if (destEl) {
                destEl.classList.add('scale-125', 'text-yellow-300');
                setTimeout(() => destEl.classList.remove('scale-125', 'text-yellow-300'), 250);
              }
            }, 680);
          }, 80);
        });
      }, i * 120);
    }
  }

  /**
   * 全屏彩带礼花撒花 (Confetti)
   */
  launchConfetti(durationMs = 2800) {
    if (!this.canvas) this.initConfettiCanvas();
    if (!this.canvas || !this.ctx) return;
    this.canvas.style.display = 'block';
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#facc15'];
    this.confettiParticles = [];

    for (let i = 0; i < 90; i++) {
      this.confettiParticles.push({
        x: window.innerWidth * (0.2 + Math.random() * 0.6),
        y: window.innerHeight * 0.4 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 14 - 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 6,
        angle: Math.random() * 360,
        angleSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.45,
        opacity: 1
      });
    }

    this.confettiRunning = true;
    const startTime = Date.now();

    const animate = () => {
      if (!this.confettiRunning) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.confettiParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.angle += p.angleSpeed;

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.angle * Math.PI) / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        this.ctx.restore();
      });

      if (Date.now() - startTime < durationMs) {
        requestAnimationFrame(animate);
      } else {
        this.confettiRunning = false;
        this.canvas.style.display = 'none';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    };

    requestAnimationFrame(animate);
  }

  burst(x, y, count = 50) {
    this.launchConfetti(2800);
  }
}

window.celebrationFX = new CelebrationFX();
window.celebrationFx = window.celebrationFX;
