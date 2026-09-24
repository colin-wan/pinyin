/**
 * 拼音学习网站 核心应用控制器 (App Controller)
 * 1. 状态管理：关卡解锁、星星收集、打卡天数、学习时长、错题记录
 * 2. 界面切换：闯关地图、同步课堂、拼读实验室、游戏乐园、拼音全表
 * 3. 家长小助手：学情看板、拼读难点诊断、错题加油站、护眼定时与关卡管理
 */

class AppState {
  constructor() {
    this.storageKey = 'PINYIN_LEARN_PROGRESS_V1';
    this.data = this.loadData();
    this.startStudyTimer();
  }

  getDefaultData() {
    return {
      unlockedLessons: [1], // 默认从第1课 a o e 开始，按部就班
      completedLessons: {},  // { lessonId: { stars: 3, date: '...' } }
      stars: 0,
      currentLessonId: 1,
      mistakes: {},         // { 'b': { count: 2, reason: '...' } }
      studySecondsToday: 0,
      lastActiveDate: new Date().toDateString(),
      streakDays: 1,
      parentSettings: {
        eyeProtectMinutes: 15,
        unlockAll: false
      }
    };
  }

  loadData() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 跨天检查打卡天数
        const today = new Date().toDateString();
        if (parsed.lastActiveDate !== today) {
          parsed.studySecondsToday = 0;
          parsed.lastActiveDate = today;
          parsed.streakDays = (parsed.streakDays || 1) + 1;
        }
        return Object.assign(this.getDefaultData(), parsed);
      }
    } catch (e) {
      console.warn('Storage read error:', e);
    }
    return this.getDefaultData();
  }

  saveData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }

  startStudyTimer() {
    setInterval(() => {
      this.data.studySecondsToday += 1;
      // 每 30 秒自动存储
      if (this.data.studySecondsToday % 30 === 0) {
        this.saveData();
      }
      // 护眼提醒检查
      const limitSec = (this.data.parentSettings.eyeProtectMinutes || 15) * 60;
      if (this.data.studySecondsToday === limitSec) {
        this.triggerEyeProtectModal();
      }
    }, 1000);
  }

  triggerEyeProtectModal() {
    const modal = document.getElementById('modal-eye-protect');
    if (modal) modal.classList.remove('hidden');
    if (window.audioEngine) {
      window.audioEngine.speak('小勇士，已经学习了一会儿啦，快眨眨眼，看看窗外的风景吧！');
    }
  }

  addStars(count = 1) {
    this.data.stars += count;
    this.saveData();
    const starEl = document.getElementById('top-bar-stars');
    if (starEl) {
      starEl.innerText = this.data.stars;
      starEl.classList.add('scale-125', 'text-amber-400');
      setTimeout(() => starEl.classList.remove('scale-125', 'text-amber-400'), 400);
    }
  }

  recordMistake(letter, reason = '') {
    if (!letter) return;
    if (!this.data.mistakes[letter]) {
      this.data.mistakes[letter] = { count: 0, reason, lastTime: Date.now() };
    }
    this.data.mistakes[letter].count += 1;
    this.data.mistakes[letter].reason = reason;
    this.data.mistakes[letter].lastTime = Date.now();
    this.saveData();
  }

  completeLesson(lessonId, stars = 3) {
    this.data.completedLessons[lessonId] = {
      stars,
      date: new Date().toLocaleDateString()
    };
    // 解锁下一课
    const nextId = lessonId + 1;
    if (!this.data.unlockedLessons.includes(nextId) && nextId <= 13) {
      this.data.unlockedLessons.push(nextId);
    }
    this.addStars(stars);
    this.saveData();
  }

  isLessonUnlocked(lessonId) {
    if (this.data.parentSettings.unlockAll) return true;
    return this.data.unlockedLessons.includes(lessonId);
  }
}

// ==========================================
// 主应用渲染器
// ==========================================
class PinyinApp {
  constructor() {
    this.state = new AppState();
    window.appState = this.state;
    this.strokeCanvas = null;
    this.trainGame = null;
    this.balloonGame = null;
    this.toneGame = null;
    this.diffGame = null;
    this.hanziGame = null;
    this.currentLesson = null;
    this.currentLessonTab = 'read'; // read, tone, write, blend, quiz
    this.currentQuizIndex = 0;
  }

  init() {
    this.bindGlobalNavigation();
    this.renderTopBar();
    this.showView('view-map');
    this.renderMap();
    this.initParentAssistant();
  }

  renderTopBar() {
    const starEl = document.getElementById('top-bar-stars');
    if (starEl) starEl.innerText = this.state.data.stars;

    const streakEl = document.getElementById('top-bar-streak');
    if (streakEl) streakEl.innerText = this.state.data.streakDays || 1;
  }

  bindGlobalNavigation() {
    // 底部/顶部导航切换
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetView = e.currentTarget.dataset.view;
        this.showView(targetView);
      });
    });

    // 家长小助手按钮
    document.getElementById('btn-open-parent')?.addEventListener('click', () => {
      this.openParentModal();
    });

    // 护眼弹窗关闭按钮
    document.getElementById('btn-close-eye-protect')?.addEventListener('click', () => {
      document.getElementById('modal-eye-protect')?.classList.add('hidden');
    });

    // 屏幕时间奖励领取按钮（顶部）
    document.getElementById('btn-claim-reward')?.addEventListener('click', () => {
      if (window.screenTimeLock) {
        if (window.screenTimeLock.state.isRewardUnlocked) {
          window.screenTimeLock.claimReward();
        } else if (window.screenTimeLock.state.isRewardActive) {
          if (window.audioEngine) window.audioEngine.speak('15分钟奖励时间正在使用中哦！');
        } else {
          const timeRem = Math.max(0, 15 - Math.floor(window.screenTimeLock.state.sessionStudySeconds / 60));
          const acc = window.screenTimeLock.getAccuracy();
          if (window.audioEngine) {
            window.audioEngine.playGentleOops();
            window.audioEngine.speak(`小勇士加油！还需认真学习 ${timeRem} 分钟，且正确率达到 90% 以上（当前 ${acc}%）就可以自动解锁15分钟iPad屏幕使用奖励啦！`);
          }
        }
      }
    });

    // 弹窗中的立即领取按钮
    document.getElementById('btn-modal-claim-now')?.addEventListener('click', () => {
      if (window.screenTimeLock) {
        window.screenTimeLock.claimReward();
      }
    });

    // 超大音量增强开关
    document.getElementById('btn-toggle-volume-boost')?.addEventListener('click', () => {
      if (window.audioEngine) {
        const newState = !window.audioEngine.isBoosted;
        window.audioEngine.setVolumeBoost(newState);
        const textEl = document.getElementById('volume-boost-text');
        const iconEl = document.getElementById('volume-boost-icon');
        if (textEl) textEl.innerText = newState ? '超大音量: 开' : '超大音量: 关';
        if (iconEl) iconEl.innerText = newState ? '🔊' : '🔉';
        if (newState) {
          window.audioEngine.playSuccess();
          window.audioEngine.speak('超大音量增强已开启！发音更洪亮清晰！');
        } else {
          window.audioEngine.speak('超大音量增强已关闭');
        }
      }
    });

    // 屏幕锁：开始新一轮 15 分钟学习
    document.getElementById('btn-lock-start-new-session')?.addEventListener('click', () => {
      if (window.screenTimeLock) {
        window.screenTimeLock.startNewStudySession();
      }
      this.showView('view-map');
    });

    // 屏幕锁：家长密码覆盖
    document.getElementById('btn-lock-parent-override')?.addEventListener('click', () => {
      if (window.screenTimeLock) {
        window.screenTimeLock.showPinKeypadModal();
      }
    });

    // 密码触控小键盘按键
    document.getElementById('btn-close-pin-keypad')?.addEventListener('click', () => {
      if (window.screenTimeLock) window.screenTimeLock.hidePinKeypadModal(true);
    });
    document.querySelectorAll('.pin-num-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const num = e.currentTarget.dataset.num;
        if (window.screenTimeLock) window.screenTimeLock.appendPinDigit(num);
      });
    });
    document.getElementById('btn-pin-del')?.addEventListener('click', () => {
      if (window.screenTimeLock) window.screenTimeLock.deletePinDigit();
    });
    document.getElementById('btn-pin-clear')?.addEventListener('click', () => {
      if (window.screenTimeLock) {
        window.screenTimeLock.currentPinInput = '';
        window.screenTimeLock.updatePinDotsDisplay();
      }
    });
  }

  showView(viewId) {
    document.querySelectorAll('.main-view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 激活高亮导航按钮
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.dataset.view === viewId) {
        btn.classList.add('bg-amber-400', 'text-amber-950', 'shadow-md');
        btn.classList.remove('text-neutral-600', 'hover:bg-amber-100');
      } else {
        btn.classList.remove('bg-amber-400', 'text-amber-950', 'shadow-md');
        btn.classList.add('text-neutral-600', 'hover:bg-amber-100');
      }
    });

    if (viewId === 'view-map') {
      this.renderMap();
    } else if (viewId === 'view-lab') {
      this.renderBlenderLab();
    } else if (viewId === 'view-hanzi') {
      this.renderHanziHub();
    } else if (viewId === 'view-games') {
      this.renderGamesHub();
    } else if (viewId === 'view-chart') {
      this.renderPinyinChart();
    }
  }

  renderHanziHub() {
    const container = document.getElementById('hanzi-game-container');
    if (!container) return;
    this.hanziGame = new HanziPinyinGameHub('hanzi-game-container');
    this.hanziGame.render();
  }

  // ==========================================
  // 1. 通关打卡大地图 (按部就班模式)
  // ==========================================
  renderMap() {
    const container = document.getElementById('map-lessons-container');
    if (!container || !window.PINYIN_DATA) return;

    const lessons = window.PINYIN_DATA.lessons;
    container.innerHTML = `
      <div class="relative py-8 px-4 flex flex-col items-center">
        <!-- 蜿蜒小路背景示意 -->
        <div class="w-full max-w-xl space-y-6">
          ${lessons.map((lesson, idx) => {
            const isUnlocked = this.state.isLessonUnlocked(lesson.id);
            const isCompleted = !!this.state.data.completedLessons[lesson.id];
            const stars = isCompleted ? (this.state.data.completedLessons[lesson.id].stars || 3) : 0;
            const isCurrent = isUnlocked && !isCompleted;

            // 左右交错排版
            const alignClass = idx % 2 === 0 ? 'justify-start' : 'justify-end';

            return `
              <div class="flex ${alignClass} w-full">
                <div class="relative group cursor-pointer lesson-card-btn transition-all duration-300 transform hover:scale-105 active:scale-95" data-lesson-id="${lesson.id}">
                  <!-- 关卡卡片主体 -->
                  <div class="w-72 sm:w-80 rounded-3xl p-5 shadow-lg border-4 transition ${
                    isCurrent 
                      ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 border-white text-white ring-4 ring-amber-300 animate-pulse' 
                      : isCompleted 
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500 border-white text-white' 
                        : 'bg-neutral-100 border-neutral-300 text-neutral-400 cursor-not-allowed opacity-80'
                  }">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-bold px-2.5 py-1 rounded-full ${
                        isCurrent || isCompleted ? 'bg-black/20 text-white' : 'bg-neutral-200 text-neutral-500'
                      }">${lesson.unit}</span>
                      
                      <!-- 状态指示徽章 -->
                      ${isCompleted ? `
                        <span class="flex items-center space-x-0.5 bg-yellow-300 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-black shadow">
                          <span>${'⭐'.repeat(stars)}</span>
                        </span>
                      ` : isCurrent ? `
                        <span class="bg-white text-orange-600 text-xs px-2.5 py-0.5 rounded-full font-black shadow">
                          正在学 👉
                        </span>
                      ` : `
                        <span class="text-lg">🔒</span>
                      `}
                    </div>

                    <h4 class="text-2xl font-black tracking-wide">${lesson.title}</h4>
                    <p class="text-xs mt-1 line-clamp-1 opacity-90">${lesson.desc}</p>

                    <!-- 重点字母标签 -->
                    <div class="flex items-center space-x-2 mt-3">
                      ${lesson.targetLetters.map(l => `
                        <span class="w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-base font-mono shadow-sm ${
                          isUnlocked ? 'bg-white text-amber-900' : 'bg-neutral-200 text-neutral-400'
                        }">${l}</span>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // 绑定关卡点击
    container.querySelectorAll('.lesson-card-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lessonId = parseInt(e.currentTarget.dataset.lessonId);
        if (this.state.isLessonUnlocked(lessonId)) {
          this.openLesson(lessonId);
        } else {
          if (window.audioEngine) {
            window.audioEngine.playGentleOops();
            window.audioEngine.speak('前面的关卡还没通关哦，跟着小脚印一步步来吧！');
          }
        }
      });
    });
  }

  // ==========================================
  // 2. 课堂同步闯关
  // ==========================================
  openLesson(lessonId) {
    const lesson = window.PINYIN_DATA.lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    this.currentLesson = lesson;
    this.currentLessonTab = 'read';
    this.currentQuizIndex = 0;

    this.showView('view-lesson');
    this.renderLessonContainer();
    if (window.audioEngine) {
      window.audioEngine.speak(`进入${lesson.title}`);
    }
  }

  renderLessonContainer() {
    const container = document.getElementById('lesson-content-area');
    if (!container || !this.currentLesson) return;

    const lesson = this.currentLesson;

    container.innerHTML = `
      <div class="w-full max-w-4xl mx-auto space-y-4">
        <!-- 课堂顶部标题卡 -->
        <div class="bg-white/90 backdrop-blur-md rounded-3xl p-5 shadow-md border-4 border-amber-300 flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="flex items-center space-x-3">
            <button id="btn-back-to-map" class="w-11 h-11 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-2xl flex items-center justify-center font-bold text-xl shadow transition">
              ‹
            </button>
            <div>
              <span class="text-xs text-amber-700 font-extrabold bg-amber-50 px-2.5 py-0.5 rounded-full">${lesson.unit}</span>
              <h2 class="text-2xl font-black text-neutral-800">${lesson.title}</h2>
            </div>
          </div>

          <!-- 课堂五大步导航标签 -->
          <div class="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1">
            <button class="lesson-step-tab px-3.5 py-2 rounded-2xl text-sm font-extrabold transition ${this.currentLessonTab === 'read' ? 'bg-amber-500 text-white shadow-md' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}" data-tab="read">
              1. 认读儿歌
            </button>
            <button class="lesson-step-tab px-3.5 py-2 rounded-2xl text-sm font-extrabold transition ${this.currentLessonTab === 'tone' ? 'bg-amber-500 text-white shadow-md' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}" data-tab="tone">
              2. 四声小车
            </button>
            <button class="lesson-step-tab px-3.5 py-2 rounded-2xl text-sm font-extrabold transition ${this.currentLessonTab === 'write' ? 'bg-amber-500 text-white shadow-md' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}" data-tab="write">
              3. 四线描红
            </button>
            <button class="lesson-step-tab px-3.5 py-2 rounded-2xl text-sm font-extrabold transition ${this.currentLessonTab === 'blend' ? 'bg-amber-500 text-white shadow-md' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}" data-tab="blend">
              4. 慢速拼读
            </button>
            <button class="lesson-step-tab px-3.5 py-2 rounded-2xl text-sm font-extrabold transition ${this.currentLessonTab === 'quiz' ? 'bg-amber-500 text-white shadow-md' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}" data-tab="quiz">
              5. 通关测试 ⭐
            </button>
          </div>
        </div>

        <!-- 课堂步骤动态内容主体 -->
        <div id="lesson-step-content" class="min-h-[460px]"></div>
      </div>
    `;

    // 绑定返回
    document.getElementById('btn-back-to-map')?.addEventListener('click', () => {
      this.showView('view-map');
    });

    // 绑定步骤标签
    container.querySelectorAll('.lesson-step-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.currentLessonTab = e.currentTarget.dataset.tab;
        this.renderLessonContainer();
      });
    });

    this.renderCurrentLessonTabContent();
  }

  renderCurrentLessonTabContent() {
    const stage = document.getElementById('lesson-step-content');
    if (!stage || !this.currentLesson) return;
    const lesson = this.currentLesson;

    if (this.currentLessonTab === 'read') {
      // 步骤 1：认读儿歌
      stage.innerHTML = `
        <div class="bg-white rounded-3xl p-6 shadow-md border-4 border-amber-200 space-y-6">
          <!-- 核心字母大卡片 -->
          <div class="flex flex-wrap items-center justify-center gap-6 py-4">
            ${lesson.targetLetters.map(letter => `
              <div class="lesson-letter-card flex flex-col items-center bg-gradient-to-b from-amber-50 to-orange-50 hover:to-orange-100 border-4 border-amber-300 rounded-3xl p-6 shadow-md cursor-pointer transition active:scale-95 group" data-letter="${letter}">
                <span class="text-7xl font-black text-amber-900 font-mono tracking-wider group-hover:scale-110 transition-transform">${letter}</span>
                <span class="mt-3 text-xs font-bold text-amber-800 bg-amber-200/80 px-3 py-1 rounded-full flex items-center space-x-1">
                  <span>🔊 点击发音</span>
                </span>
              </div>
            `).join('')}
          </div>

          <!-- 儿歌与记忆口诀 -->
          <div class="bg-gradient-to-r from-amber-100 via-orange-100 to-amber-100 border-2 border-amber-300 p-5 rounded-2xl shadow-sm text-center">
            <div class="flex items-center justify-center space-x-2 text-amber-900 font-bold mb-1">
              <span class="text-2xl">🎵</span>
              <span class="text-sm">人教统编版·同步记忆口诀</span>
            </div>
            <p class="text-xl font-extrabold text-amber-950 mt-2 leading-relaxed tracking-wide">${lesson.rhyme}</p>
            <button id="btn-speak-rhyme" class="mt-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold px-5 py-2 rounded-full shadow text-sm transition">
              🔊 朗读儿歌口诀
            </button>
          </div>

          <!-- 教师贴士 -->
          <div class="bg-sky-50 border border-sky-200 p-4 rounded-2xl text-xs text-sky-800 leading-relaxed font-medium">
            💡 <strong>老师辅导小妙招：</strong> ${lesson.guideText}
          </div>
        </div>
      `;

      // 绑定大字母点击发音
      stage.querySelectorAll('.lesson-letter-card').forEach(card => {
        card.addEventListener('click', (e) => {
          const l = e.currentTarget.dataset.letter;
          if (window.audioEngine) window.audioEngine.speak(l);
        });
      });

      document.getElementById('btn-speak-rhyme')?.addEventListener('click', () => {
        if (window.audioEngine) window.audioEngine.speak(lesson.rhyme);
      });

    } else if (this.currentLessonTab === 'tone') {
      // 步骤 2：四声小车
      stage.innerHTML = `<div id="lesson-tone-stage"></div>`;
      const toneGame = new ToneRollercoasterGame('lesson-tone-stage');
      toneGame.currentLetter = lesson.targetLetters[0] || 'a';
      toneGame.render();

    } else if (this.currentLessonTab === 'write') {
      // 步骤 3：四线描红
      stage.innerHTML = `
        <div class="bg-white rounded-3xl p-5 shadow-md border-4 border-amber-200 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-extrabold text-neutral-800">四线三格规范书写与描红</h3>
              <p class="text-xs text-neutral-500">手指或触控笔沿着灰色虚线字模描一描，练习正确占格！</p>
            </div>
            <!-- 切换正在描红的字母 -->
            <div class="flex space-x-2">
              ${lesson.targetLetters.map((l, i) => `
                <button class="lesson-write-letter-btn px-3 py-1.5 rounded-xl font-mono text-base font-extrabold transition ${i === 0 ? 'bg-amber-500 text-white shadow' : 'bg-neutral-100 text-neutral-700'}" data-letter="${l}">
                  ${l}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- 画布容器 (iPad 高清优化) -->
          <div class="relative w-full flex justify-center bg-amber-50/50 p-2 rounded-2xl border-2 border-dashed border-amber-300">
            <canvas id="lesson-stroke-canvas" class="w-full max-w-lg h-64 bg-white rounded-xl shadow-inner touch-none cursor-crosshair"></canvas>
          </div>

          <!-- 画笔工具条 -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-bold text-neutral-600">彩色画笔:</span>
              ${['#2563EB', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'].map(col => `
                <button class="canvas-color-pick w-7 h-7 rounded-full shadow border-2 border-white transition active:scale-95" style="background-color: ${col}" data-color="${col}"></button>
              `).join('')}
            </div>

            <div class="flex items-center space-x-3">
              <button id="btn-canvas-demo" class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition">
                ▶ 笔顺示范
              </button>
              <button id="btn-canvas-clear" class="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold px-4 py-2 rounded-xl transition">
                🧹 清除重写
              </button>
              <button id="btn-canvas-praise" class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition">
                👍 写好了，点赞！
              </button>
            </div>
          </div>
        </div>
      `;

      // 初始化 Canvas
      setTimeout(() => {
        this.strokeCanvas = new PinyinStrokeCanvas('lesson-stroke-canvas');
        this.strokeCanvas.setLetter(lesson.targetLetters[0] || 'a');

        // 切换字母
        stage.querySelectorAll('.lesson-write-letter-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const letter = e.currentTarget.dataset.letter;
            this.strokeCanvas.setLetter(letter);
            stage.querySelectorAll('.lesson-write-letter-btn').forEach(b => {
              b.classList.remove('bg-amber-500', 'text-white', 'shadow');
              b.classList.add('bg-neutral-100', 'text-neutral-700');
            });
            e.currentTarget.classList.add('bg-amber-500', 'text-white', 'shadow');
            e.currentTarget.classList.remove('bg-neutral-100', 'text-neutral-700');
          });
        });

        // 换色
        stage.querySelectorAll('.canvas-color-pick').forEach(btn => {
          btn.addEventListener('click', (e) => {
            this.strokeCanvas.setColor(e.currentTarget.dataset.color);
          });
        });

        // 示范与清除
        document.getElementById('btn-canvas-demo')?.addEventListener('click', () => {
          this.strokeCanvas.demonstrate();
        });
        document.getElementById('btn-canvas-clear')?.addEventListener('click', () => {
          this.strokeCanvas.clear();
        });
        document.getElementById('btn-canvas-praise')?.addEventListener('click', () => {
          if (window.audioEngine) {
            window.audioEngine.playSuccess();
            window.audioEngine.speak('写得真规范，笔画工整，太有进步了！');
          }
          this.state.addStars(1);
        });
      }, 50);

    } else if (this.currentLessonTab === 'blend') {
      // 步骤 4：慢速拼读 (重点突破)
      stage.innerHTML = `<div id="lesson-train-stage"></div>`;
      this.trainGame = new TrainBlenderGame('lesson-train-stage');
      this.trainGame.render({
        initial: lesson.targetLetters.find(l => window.PINYIN_DATA.initials.some(i => i.pinyin === l)) || 'b',
        final: lesson.targetLetters.find(l => window.PINYIN_DATA.finals.some(f => f.pinyin === l)) || 'a'
      });

    } else if (this.currentLessonTab === 'quiz') {
      // 步骤 5：通关测试 (3道选择题打卡)
      this.renderQuizStep(stage);
    }
  }

  renderQuizStep(stage) {
    const lesson = this.currentLesson;
    const quiz = lesson.quiz || [];
    const curQ = quiz[this.currentQuizIndex];

    this.quizAnswerLocked = false;
    if (this.quizAudioTimer) clearTimeout(this.quizAudioTimer);

    if (!curQ || this.currentQuizIndex >= quiz.length) {
      // 全通关！盖大章！
      this.state.completeLesson(lesson.id, 3);
      if (window.audioEngine) {
        window.audioEngine.stopAllAudio();
        window.audioEngine.playFanfare();
        setTimeout(() => {
          if (window.audioEngine) {
            window.audioEngine.speak(`恭喜你通关${lesson.title}，获得3颗金星！`);
          }
        }, 350);
      }

      stage.innerHTML = `
        <div class="bg-gradient-to-b from-white to-amber-50 rounded-3xl p-8 shadow-xl border-4 border-amber-400 text-center space-y-6">
          <div class="text-7xl animate-bounce">🏆</div>
          <h3 class="text-3xl font-black text-amber-900">恭喜你！顺利通关打卡！</h3>
          <div class="flex items-center justify-center space-x-2 text-4xl">
            <span>⭐</span><span>⭐</span><span>⭐</span>
          </div>
          <p class="text-base text-neutral-600 font-medium">你已经完全掌握了【${lesson.title}】的拼音认读与拼读规则！</p>

          <div class="flex items-center justify-center space-x-4 pt-4">
            <button id="btn-quiz-retry" class="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold px-6 py-3 rounded-2xl transition">
              再练一次
            </button>
            <button id="btn-quiz-next" class="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-lg transition active:scale-95 text-lg">
              返回闯关地图 ›
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-quiz-retry')?.addEventListener('click', () => {
        this.currentQuizIndex = 0;
        this.renderQuizStep(stage);
      });
      document.getElementById('btn-quiz-next')?.addEventListener('click', () => {
        this.showView('view-map');
      });
      return;
    }

    stage.innerHTML = `
      <div class="bg-white rounded-3xl p-6 shadow-md border-4 border-amber-300 space-y-6">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
            第 ${this.currentQuizIndex + 1} / ${quiz.length} 题
          </span>
          <button id="btn-quiz-audio" class="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-xs px-4 py-1.5 rounded-full shadow transition cursor-pointer">
            <span>🔊 重播读音</span>
          </button>
        </div>

        <div class="text-center py-4">
          <h4 class="text-2xl font-black text-neutral-800 leading-snug">${curQ.question}</h4>
        </div>

        <!-- 选项大按钮 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
          ${curQ.options.map(opt => `
            <button class="quiz-option-btn p-5 rounded-2xl border-4 border-amber-200 bg-amber-50/60 hover:bg-amber-100 hover:border-amber-400 active:scale-95 font-black text-xl text-amber-900 transition flex items-center justify-center shadow-sm" data-option="${opt}">
              ${opt}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('btn-quiz-audio')?.addEventListener('click', () => {
      if (window.audioEngine && curQ.sound) {
        window.audioEngine.stopAllAudio();
        window.audioEngine.speak(curQ.sound);
      }
    });

    // 自动朗读一次题目声音 (真人录音母带)
    this.quizAudioTimer = setTimeout(() => {
      if (window.audioEngine && curQ.sound) {
        window.audioEngine.stopAllAudio();
        window.audioEngine.speak(curQ.sound);
      }
    }, 350);

    // 选项点击判断 (带防重锁与防重音逻辑)
    stage.querySelectorAll('.quiz-option-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.quizAnswerLocked) return;
        this.quizAnswerLocked = true;
        if (this.quizAudioTimer) clearTimeout(this.quizAudioTimer);

        const selected = e.currentTarget.dataset.option;
        if (selected === curQ.answer) {
          // 答对
          if (window.screenTimeLock) {
            window.screenTimeLock.recordAnswer(true);
          }
          if (window.audioEngine) {
            window.audioEngine.stopAllAudio();
            window.audioEngine.playSuccess();
          }
          btn.classList.add('bg-emerald-500', 'text-white', 'border-emerald-600');
          setTimeout(() => {
            this.currentQuizIndex += 1;
            this.renderQuizStep(stage);
          }, 850);
        } else {
          // 答错
          if (window.screenTimeLock) {
            window.screenTimeLock.recordAnswer(false);
          }
          if (window.audioEngine) {
            window.audioEngine.stopAllAudio();
            window.audioEngine.playGentleOops();
          }
          btn.classList.add('bg-rose-100', 'border-rose-400', 'animate-shake');
          setTimeout(() => {
            btn.classList.remove('animate-shake');
            this.quizAnswerLocked = false;
          }, 600);

          // 记录错题
          this.state.recordMistake(curQ.answer, `在${lesson.title}测验中错选为${selected}`);
        }
      });
    });
  }

  // ==========================================
  // 3. 拼读实验室 (自由撞碰拼读机)
  // ==========================================
  renderBlenderLab() {
    const container = document.getElementById('lab-game-container');
    if (!container) return;
    this.trainGame = new TrainBlenderGame('lab-game-container');
    this.trainGame.render();
  }

  // ==========================================
  // 4. 趣味游戏乐园
  // ==========================================
  renderGamesHub() {
    const hub = document.getElementById('games-content-area');
    if (!hub) return;

    hub.innerHTML = `
      <div class="space-y-6">
        <!-- 游戏选择 Tab -->
        <div class="flex items-center justify-center space-x-3 overflow-x-auto pb-2">
          <button class="game-select-tab px-5 py-2.5 rounded-2xl font-extrabold text-sm transition bg-amber-500 text-white shadow-md" data-game="balloon">
            🎈 气球派对 (听音辨字)
          </button>
          <button class="game-select-tab px-5 py-2.5 rounded-2xl font-extrabold text-sm transition bg-white text-neutral-700 hover:bg-amber-100" data-game="tones">
            🎢 声调过山车 (四声挑战)
          </button>
          <button class="game-select-tab px-5 py-2.5 rounded-2xl font-extrabold text-sm transition bg-white text-neutral-700 hover:bg-amber-100" data-game="diff">
            🧐 火眼金睛 (b/d易混对决)
          </button>
        </div>

        <!-- 游戏运行容器 -->
        <div id="active-game-stage" class="w-full"></div>
      </div>
    `;

    // 默认打开气球派对
    this.launchGame('balloon');

    hub.querySelectorAll('.game-select-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        hub.querySelectorAll('.game-select-tab').forEach(t => {
          t.classList.remove('bg-amber-500', 'text-white', 'shadow-md');
          t.classList.add('bg-white', 'text-neutral-700');
        });
        e.currentTarget.classList.add('bg-amber-500', 'text-white', 'shadow-md');
        e.currentTarget.classList.remove('bg-white', 'text-neutral-700');

        this.launchGame(e.currentTarget.dataset.game);
      });
    });
  }

  launchGame(gameName) {
    const stage = document.getElementById('active-game-stage');
    if (!stage) return;
    stage.innerHTML = '';

    if (gameName === 'balloon') {
      this.balloonGame = new BalloonGame('active-game-stage');
      this.balloonGame.start();
    } else if (gameName === 'tones') {
      this.toneGame = new ToneRollercoasterGame('active-game-stage');
      this.toneGame.render();
    } else if (gameName === 'diff') {
      this.diffGame = new ConfusionDiffGame('active-game-stage');
      this.diffGame.render();
    }
  }

  // ==========================================
  // 5. 拼音总表 (大声母/大韵母/整体认读表)
  // ==========================================
  renderPinyinChart() {
    const container = document.getElementById('chart-content-area');
    if (!container || !window.PINYIN_DATA) return;

    const data = window.PINYIN_DATA;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- 23个声母表 -->
        <div class="bg-white rounded-3xl p-5 shadow-md border-4 border-sky-200">
          <div class="flex items-center space-x-2 mb-3">
            <span class="text-2xl">⚡</span>
            <h3 class="text-lg font-black text-sky-950">声母表（共23个）</h3>
            <span class="text-xs text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full font-bold">发音轻而短</span>
          </div>
          <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
            ${data.initials.map(item => `
              <div class="chart-cell flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-50/70 hover:bg-sky-100 border-2 border-sky-200 cursor-pointer active:scale-95 transition" data-py="${item.pinyin}">
                <span class="text-3xl font-black text-sky-950 font-mono">${item.pinyin}</span>
                <span class="text-[10px] text-sky-700 font-bold mt-1">${item.name}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 24个韵母表 -->
        <div class="bg-white rounded-3xl p-5 shadow-md border-4 border-rose-200">
          <div class="flex items-center space-x-2 mb-3">
            <span class="text-2xl">🌸</span>
            <h3 class="text-lg font-black text-rose-950">韵母表（共24个）</h3>
            <span class="text-xs text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full font-bold">发音响亮圆润</span>
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
            ${data.finals.map(item => `
              <div class="chart-cell flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-50/70 hover:bg-rose-100 border-2 border-rose-200 cursor-pointer active:scale-95 transition" data-py="${item.pinyin}">
                <span class="text-2xl font-black text-rose-950 font-mono">${item.pinyin}</span>
                <span class="text-[10px] text-rose-700 font-bold mt-1">${item.name}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 16个整体认读音节 -->
        <div class="bg-white rounded-3xl p-5 shadow-md border-4 border-emerald-200">
          <div class="flex items-center space-x-2 mb-3">
            <span class="text-2xl">👑</span>
            <h3 class="text-lg font-black text-emerald-950">整体认读音节（共16个）</h3>
            <span class="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">不用拼，直接读</span>
          </div>
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
            ${data.wholeSyllables.map(item => `
              <div class="chart-cell flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100 border-2 border-emerald-200 cursor-pointer active:scale-95 transition" data-py="${item.pinyin}">
                <span class="text-2xl font-black text-emerald-950 font-mono">${item.pinyin}</span>
                <span class="text-[10px] text-emerald-700 font-bold mt-1">${item.soundChar}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // 绑定点读
    container.querySelectorAll('.chart-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const py = e.currentTarget.dataset.py;
        if (window.audioEngine) window.audioEngine.speak(py);
      });
    });
  }

  // ==========================================
  // 6. 家长小助手 (学情看板、快捷指令联动、密码设置)
  // ==========================================
  initParentAssistant() {
    const modal = document.getElementById('modal-parent');
    document.getElementById('btn-close-parent')?.addEventListener('click', () => {
      modal?.classList.add('hidden');
    });

    // Tab 标签页切换
    document.querySelectorAll('.parent-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabKey = e.currentTarget.dataset.tab;
        document.querySelectorAll('.parent-tab-btn').forEach(b => {
          b.classList.remove('bg-sky-500', 'text-white', 'shadow-sm');
          b.classList.add('bg-neutral-100', 'text-neutral-600');
        });
        e.currentTarget.classList.add('bg-sky-500', 'text-white', 'shadow-sm');
        e.currentTarget.classList.remove('bg-neutral-100', 'text-neutral-600');

        document.querySelectorAll('.parent-tab-page').forEach(p => p.classList.add('hidden'));
        document.getElementById(`parent-tab-content-${tabKey}`)?.classList.remove('hidden');
      });
    });

    // 保存 4 位家长密码
    document.getElementById('btn-save-parent-pin')?.addEventListener('click', () => {
      const pin = document.getElementById('parent-pin-input')?.value;
      if (window.screenTimeLock && window.screenTimeLock.setParentPin(pin)) {
        alert('家长 4 位解锁密码已更新为：' + pin);
      } else {
        alert('密码必须为 4 位纯数字！');
      }
    });

    // 快捷指令联动测试与名称保存
    document.getElementById('btn-test-shortcut')?.addEventListener('click', () => {
      const name = document.getElementById('parent-shortcut-name')?.value || '拼音奖励15分钟';
      if (window.screenTimeLock) {
        window.screenTimeLock.state.shortcutName = name;
        window.screenTimeLock.saveState();
        window.screenTimeLock.triggerShortcut(name);
        alert(`已向 iPad 触发快捷指令：【${name}】\n如果系统弹出确认窗口，请点击“允许运行”即可完成联动！`);
      }
    });

    // 音量与语速设置联动
    document.getElementById('parent-boost-toggle')?.addEventListener('change', (e) => {
      if (window.audioEngine) {
        window.audioEngine.setVolumeBoost(e.target.checked);
        const textEl = document.getElementById('volume-boost-text');
        const iconEl = document.getElementById('volume-boost-icon');
        if (textEl) textEl.innerText = e.target.checked ? '超大音量: 开' : '超大音量: 关';
        if (iconEl) iconEl.innerText = e.target.checked ? '🔊' : '🔉';
      }
    });

    document.getElementById('parent-speech-speed')?.addEventListener('change', (e) => {
      if (window.audioEngine) {
        window.audioEngine.setSpeechSpeed(e.target.value);
      }
    });

    // 正确率调整控制开关联动 (必须输入家长密码才可调整)
    const handleAccuracyChange = (e) => {
      if (!window.screenTimeLock) return;
      const targetEl = e.target;
      const newVal = parseInt(targetEl.value) || 90;
      const currentVal = window.screenTimeLock.getTargetAccuracy();

      if (newVal === currentVal) return;

      // 阻止未经密码认证的变更，界面恢复原值
      targetEl.value = String(currentVal);

      // 弹出 4 位家长密码触控小键盘进行验证
      window.screenTimeLock.requestParentPin({
        title: '🔑 家长密码验证',
        desc: `正在调整正确率门槛至 ${newVal}%，请输入 4 位家长密码`,
        onSuccess: () => {
          window.screenTimeLock.setTargetAccuracy(newVal);
          targetEl.value = String(newVal);
          if (window.audioEngine) {
            window.audioEngine.playSuccess();
            window.audioEngine.speak(`密码验证成功，正确率门槛已调整为百分之${newVal}！`);
          }
        },
        onCancel: () => {
          window.screenTimeLock.updateStatusWidgets();
        }
      });
    };
    document.getElementById('top-target-accuracy-select')?.addEventListener('change', handleAccuracyChange);
    document.getElementById('parent-stat-accuracy-select')?.addEventListener('change', handleAccuracyChange);
    document.getElementById('parent-target-accuracy')?.addEventListener('change', handleAccuracyChange);

    // 试听真人母带标准发音
    document.getElementById('btn-test-voice')?.addEventListener('click', () => {
      if (window.audioEngine) {
        window.audioEngine.speakInitial('b');
        setTimeout(() => {
          window.audioEngine.speakFinal('a');
          setTimeout(() => {
            window.audioEngine.speakHanzi('天', '蓝天');
          }, 1000);
        }, 1000);
      }
    });

    // 保存家长设置
    document.getElementById('parent-save-settings')?.addEventListener('click', () => {
      const unlockAll = document.getElementById('parent-unlock-toggle')?.checked || false;
      this.state.data.parentSettings.unlockAll = unlockAll;
      this.state.saveData();

      modal?.classList.add('hidden');
      this.renderMap();
    });

    // 重置进度
    document.getElementById('parent-reset-progress')?.addEventListener('click', () => {
      if (confirm('确认要重置孩子的学习进度，从第1课重新开始吗？')) {
        this.state.data.unlockedLessons = [1];
        this.state.data.completedLessons = {};
        this.state.data.stars = 0;
        this.state.data.mistakes = {};
        this.state.saveData();
        this.renderTopBar();
        this.renderMap();
        alert('进度已重置至第1课！');
        modal?.classList.add('hidden');
      }
    });
  }

  openParentModal() {
    const modal = document.getElementById('modal-parent');
    if (!modal) return;

    // 填充学情统计
    const totalMinutes = Math.floor(this.state.data.studySecondsToday / 60);
    const completedCount = Object.keys(this.state.data.completedLessons).length;
    const streak = this.state.data.streakDays || 1;

    document.getElementById('parent-stat-time').innerText = `${totalMinutes} 分钟`;
    document.getElementById('parent-stat-lessons').innerText = `${completedCount} / 13 课`;
    document.getElementById('parent-stat-streak').innerText = `${streak} 天`;

    // 填充密码与快捷指令名称
    if (window.screenTimeLock) {
      const pinInput = document.getElementById('parent-pin-input');
      if (pinInput) pinInput.value = window.screenTimeLock.state.parentPin || '1234';

      const scInput = document.getElementById('parent-shortcut-name');
      if (scInput) scInput.value = window.screenTimeLock.state.shortcutName || '拼音奖励15分钟';

      const curAcc = String(window.screenTimeLock.getTargetAccuracy());
      const statSelect = document.getElementById('parent-stat-accuracy-select');
      if (statSelect) statSelect.value = curAcc;
      const accSelect = document.getElementById('parent-target-accuracy');
      if (accSelect) accSelect.value = curAcc;
      const topSelect = document.getElementById('top-target-accuracy-select');
      if (topSelect) topSelect.value = curAcc;
    }

    // 填充错题本
    const mistakesContainer = document.getElementById('parent-mistakes-list');
    if (mistakesContainer) {
      const mistakes = Object.entries(this.state.data.mistakes || {});
      if (mistakes.length === 0) {
        mistakesContainer.innerHTML = `<div class="text-xs text-neutral-400 py-3 text-center">暂无错题记录，孩子掌握得非常棒！</div>`;
      } else {
        mistakesContainer.innerHTML = mistakes.map(([char, info]) => `
          <div class="flex items-center justify-between p-2.5 bg-rose-50/80 rounded-xl border border-rose-100">
            <div class="flex items-center space-x-2">
              <span class="w-8 h-8 rounded-lg bg-rose-500 text-white font-mono font-extrabold flex items-center justify-center text-lg">${char}</span>
              <div>
                <div class="text-xs font-bold text-neutral-800">${info.reason || '练习混淆'}</div>
                <div class="text-[10px] text-neutral-500">已累计提醒 ${info.count} 次</div>
              </div>
            </div>
            <button class="parent-retry-mistake-btn text-xs bg-rose-500 hover:bg-rose-600 text-white font-bold px-3 py-1 rounded-lg transition" data-char="${char}">
              🔊 练习发音
            </button>
          </div>
        `).join('');

        mistakesContainer.querySelectorAll('.parent-retry-mistake-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const char = e.currentTarget.dataset.char;
            if (window.audioEngine) window.audioEngine.speak(char);
          });
        });
      }
    }

    const unlockToggle = document.getElementById('parent-unlock-toggle');
    if (unlockToggle) unlockToggle.checked = !!this.state.data.parentSettings.unlockAll;

    // 显示当前匹配的发音人
    const voiceEl = document.getElementById('parent-voice-name');
    if (voiceEl && window.audioEngine) {
      if (!window.audioEngine.chineseVoice) window.audioEngine.initVoices();
      const v = window.audioEngine.chineseVoice;
      voiceEl.innerText = v ? `${v.name} (${v.lang})` : '婷婷 (标准普通话女声)';
    }

    modal.classList.remove('hidden');
  }
}

// 页面加载完成后启动
window.addEventListener('DOMContentLoaded', () => {
  window.app = new PinyinApp();
  window.app.init();
});
