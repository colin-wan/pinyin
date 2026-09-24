/**
 * 四线三格规范书写与描红涂鸦板 (StrokeCanvas)
 * 1. 严格符合人教版一年级小学拼音规范的四线三格（上格、中格、下格）
 * 2. 专为 iPad 触控优化：支持 touchstart / touchmove / touchend，防手掌误触与防页面滑动
 * 3. 浅灰底模虚线描红，孩子可沿着标准字形临摹
 * 4. 动画笔顺示范提示、清除、换色、点赞通关特效
 */

class PinyinStrokeCanvas {
  constructor(canvasId, containerId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById(containerId);

    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.brushColor = '#2563EB'; // 默认蓝色
    this.brushWidth = 7; // 适合儿童手指粗细的标准画笔
    this.currentLetter = 'a';
    this.hasDrawn = false;

    this.initCanvasSize();
    this.bindEvents();
    this.drawBackground();
  }

  initCanvasSize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    // 设置高分辨率画布，避免 Retina 屏幕模糊
    const width = rect.width || 360;
    const height = rect.height || 260;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);
    this.displayW = width;
    this.displayH = height;
  }

  /**
   * 绘制标准的拼音四线三格
   * 第一线、第四线为浅蓝虚线；第二线、第三线（中格）为基准实线
   */
  drawBackground() {
    if (!this.ctx) return;
    const w = this.displayW;
    const h = this.displayH;

    // 清空重绘
    this.ctx.clearRect(0, 0, w, h);

    // 四条线的纵坐标（三等分高度，上下留少许边距）
    const padding = 20;
    const usableH = h - padding * 2;
    const step = usableH / 3;

    const y1 = padding;
    const y2 = padding + step;
    const y3 = padding + step * 2;
    const y4 = padding + usableH;

    this.lineYs = [y1, y2, y3, y4];

    // 中格微粉底色，提示孩子字主要写在中格
    this.ctx.fillStyle = 'rgba(254, 243, 199, 0.45)';
    this.ctx.fillRect(0, y2, w, step);

    // 绘制 4 条线
    const lines = [
      { y: y1, color: '#93C5FD', dash: [4, 4], width: 1.5 }, // 第一线（上）
      { y: y2, color: '#EF4444', dash: [], width: 2 },       // 第二线（红实线-中格上线）
      { y: y3, color: '#EF4444', dash: [], width: 2 },       // 第三线（红实线-中格下线）
      { y: y4, color: '#93C5FD', dash: [4, 4], width: 1.5 }  // 第四线（下）
    ];

    lines.forEach(l => {
      this.ctx.beginPath();
      this.ctx.setLineDash(l.dash);
      this.ctx.strokeStyle = l.color;
      this.ctx.lineWidth = l.width;
      this.ctx.moveTo(10, l.y);
      this.ctx.lineTo(w - 10, l.y);
      this.ctx.stroke();
    });

    this.ctx.setLineDash([]); // 还原线型

    // 绘制浅色水印字模（供孩子描红）
    this.drawTraceGuide();
  }

  /**
   * 绘制浅灰色描红字模
   */
  drawTraceGuide() {
    if (!this.currentLetter) return;
    const w = this.displayW;
    const h = this.displayH;
    const ctx = this.ctx;

    ctx.save();
    ctx.font = 'bold 120px "KaiTi", "STKaiti", "PingFang SC", "Comic Sans MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(203, 213, 225, 0.48)'; // 浅灰透明，方便描红

    // 计算根据拼音字母在四线格的垂直偏移
    let yOffset = h / 2 - 4;
    if (['b', 'd', 't', 'k', 'l', 'f', 'h'].includes(this.currentLetter)) {
      yOffset -= 18; // 占上格
    } else if (['p', 'q', 'g', 'y'].includes(this.currentLetter)) {
      yOffset += 24; // 占下格
    } else if (this.currentLetter === 'j') {
      yOffset += 4; // 占三格
    }

    ctx.fillText(this.currentLetter, w / 2, yOffset);
    ctx.restore();
  }

  /**
   * 设置当前描红的字母并重置画布
   */
  setLetter(letter) {
    this.currentLetter = letter;
    this.hasDrawn = false;
    this.clear();
  }

  /**
   * 清除画布
   */
  clear() {
    this.initCanvasSize();
    this.drawBackground();
    this.hasDrawn = false;
  }

  /**
   * 更改笔刷颜色
   */
  setColor(color) {
    this.brushColor = color;
  }

  /**
   * 绑定鼠标与触屏（iPad/平板特别优化）事件
   */
  bindEvents() {
    const canvas = this.canvas;
    if (!canvas) return;

    // 获取坐标（考虑高分屏和页面缩放）
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const startDraw = (e) => {
      e.preventDefault(); // 阻止 iPad 默认滚动
      this.isDrawing = true;
      this.hasDrawn = true;
      const pos = getPos(e);
      this.lastX = pos.x;
      this.lastY = pos.y;
    };

    const drawing = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);

      this.ctx.beginPath();
      this.ctx.strokeStyle = this.brushColor;
      this.ctx.lineWidth = this.brushWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();

      this.lastX = pos.x;
      this.lastY = pos.y;
    };

    const stopDraw = () => {
      this.isDrawing = false;
    };

    // 触摸事件（iPad/手机优先）
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', drawing, { passive: false });
    canvas.addEventListener('touchend', stopDraw, { passive: false });
    canvas.addEventListener('touchcancel', stopDraw, { passive: false });

    // 鼠标事件（PC/Mac 支持）
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', drawing);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    // 窗口尺寸变化重新适配
    window.addEventListener('resize', () => {
      this.initCanvasSize();
      this.drawBackground();
    });
  }

  /**
   * 规范笔顺示范动画
   */
  demonstrate() {
    this.clear();
    const w = this.displayW;
    const h = this.displayH;
    const ctx = this.ctx;

    // 简单笔画动画
    let progress = 0;
    const timer = setInterval(() => {
      progress += 0.05;
      if (progress >= 1) {
        clearInterval(timer);
        if (window.audioEngine) window.audioEngine.playSuccess();
        return;
      }
      this.drawBackground();
      ctx.save();
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.font = 'bold 120px "KaiTi", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(16, 185, 129, ${progress})`;
      ctx.fillText(this.currentLetter, w / 2, h / 2 - 4);
      ctx.restore();
    }, 40);
  }
}

if (typeof window !== 'undefined') {
  window.PinyinStrokeCanvas = PinyinStrokeCanvas;
}
