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
      window.audioEngine.playGentleOops();
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

    // 盲盒扭蛋机按钮
    document.getElementById('btn-open-gacha')?.addEventListener('click', () => {
      if (window.pinyinGachaMachine) {
        window.pinyinGachaMachine.openGachaModal();
      }
    });

    // 护眼弹窗关闭按钮
    document.getElementById('btn-close-eye-protect')?.addEventListener('click', () => {
      document.getElementById('modal-eye-protect')?.classList.add('hidden');
    });

    // 屏幕时间奖励领取按钮（顶部）
    document.getElementById('btn-claim-reward')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.screenTimeLock) {
        window.screenTimeLock.showRewardStatusModal();
      }
    });

    // 弹窗中的立即领取按钮
    document.getElementById('btn-modal-claim-now')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.screenTimeLock) {
        window.screenTimeLock.claimReward(true);
      }
    });

    // 弹窗中的稍后领取按钮
    document.getElementById('btn-close-reward-ready-modal')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.screenTimeLock) {
        window.screenTimeLock.hideRewardReadyModal();
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

    // 屏幕锁：手动再次触发快捷指令恢复锁定
    document.getElementById('btn-lock-retrigger-shortcut')?.addEventListener('click', () => {
      if (window.screenTimeLock) {
        window.screenTimeLock.triggerShortcut(null, 'lock');
        const txtEl = document.getElementById('btn-lock-retrigger-text');
        if (txtEl) {
          const orig = txtEl.innerText;
          txtEl.innerText = '✅ 指令已发送！若弹出提示请点“打开”';
          setTimeout(() => { txtEl.innerText = orig; }, 3500);
        }
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
      window.audioEngine.playSuccess();
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
              <div class="flex items-center space-x-2 mt-0.5">
                <h2 id="lesson-header-title-text" class="text-2xl font-black text-neutral-800 cursor-pointer hover:text-amber-700 transition flex items-center gap-1.5" title="点击朗读课文标题">
                  <span>${lesson.title}</span>
                </h2>
                <button id="btn-speak-header-title" class="w-8 h-8 rounded-full bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-800 flex items-center justify-center text-sm shadow-xs transition" title="朗读课文标题">
                  🔊
                </button>
              </div>
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

    // 绑定顶部课文标题朗读 (语速适度加快 1.08，发音纯正字正腔圆)
    const handleSpeakHeaderTitle = () => {
      const btn = document.getElementById('btn-speak-header-title');
      if (btn) btn.classList.add('ring-2', 'ring-amber-400', 'scale-110');
      if (window.audioEngine) {
        window.audioEngine.speakLessonTitle(lesson, () => {
          if (btn) btn.classList.remove('ring-2', 'ring-amber-400', 'scale-110');
        });
      }
    };
    document.getElementById('btn-speak-header-title')?.addEventListener('click', handleSpeakHeaderTitle);
    document.getElementById('lesson-header-title-text')?.addEventListener('click', handleSpeakHeaderTitle);

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
          <!-- 课文标题朗读横幅卡片 -->
          <div class="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-200 px-5 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div class="flex items-center space-x-2.5">
              <span class="text-2xl">📖</span>
              <div>
                <span class="text-xs font-bold text-amber-700 block">${lesson.unit}</span>
                <span class="text-lg font-black text-amber-950">${lesson.title}</span>
              </div>
            </div>
            <button id="btn-speak-step-title" class="flex items-center space-x-1.5 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-amber-950 font-black px-4 py-2 rounded-full shadow-sm text-xs transition">
              <span>🔊</span>
              <span id="btn-speak-step-title-text">朗读课文标题</span>
            </button>
          </div>

          <!-- 核心字母大卡片 -->
          <div class="flex flex-wrap items-center justify-center gap-6 py-2">
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
            <button id="btn-speak-rhyme" class="mt-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-extrabold px-6 py-2.5 rounded-full shadow-md text-sm transition flex items-center justify-center mx-auto space-x-2">
              <span>🔊</span>
              <span id="btn-speak-rhyme-text">欢快朗读儿歌口诀</span>
            </button>
          </div>

          <!-- 老师辅导小妙招卡片 -->
          <div class="bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-200 p-4 sm:p-5 rounded-2xl shadow-xs">
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="flex items-center space-x-2 text-sky-950 font-extrabold text-sm">
                <span class="text-xl">💡</span>
                <span>老师辅导小妙招</span>
              </div>
              <button id="btn-speak-guide" class="flex items-center space-x-1.5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-full shadow transition cursor-pointer">
                <span>🔊</span>
                <span id="btn-speak-guide-text">朗读小妙招</span>
              </button>
            </div>
            <p class="text-xs sm:text-sm text-sky-900 leading-relaxed font-medium pl-1">${lesson.guideText}</p>
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

      // 绑定步骤内课文标题朗读按钮 (语速适度加快 1.08，发音纯正字正腔圆)
      document.getElementById('btn-speak-step-title')?.addEventListener('click', () => {
        const btn = document.getElementById('btn-speak-step-title');
        const txt = document.getElementById('btn-speak-step-title-text');
        if (btn) {
          btn.disabled = true;
          btn.classList.add('ring-2', 'ring-amber-400', 'scale-105');
        }
        if (txt) txt.textContent = '正在朗读标题...';

        const resetBtn = () => {
          if (btn) {
            btn.disabled = false;
            btn.classList.remove('ring-2', 'ring-amber-400', 'scale-105');
          }
          if (txt) txt.textContent = '朗读课文标题';
        };

        if (window.audioEngine) {
          window.audioEngine.speakLessonTitle(lesson, resetBtn);
        } else {
          resetBtn();
        }
      });

      // 绑定儿歌口诀朗读按钮 (纯正中文呼读音、语速 1.08 欢快儿歌节拍)
      document.getElementById('btn-speak-rhyme')?.addEventListener('click', () => {
        const btn = document.getElementById('btn-speak-rhyme');
        const txt = document.getElementById('btn-speak-rhyme-text');
        if (btn) {
          btn.disabled = true;
          btn.classList.add('ring-4', 'ring-amber-300', 'scale-105');
        }
        if (txt) txt.textContent = '正在欢快朗读儿歌...';

        const resetBtn = () => {
          if (btn) {
            btn.disabled = false;
            btn.classList.remove('ring-4', 'ring-amber-300', 'scale-105');
          }
          if (txt) txt.textContent = '欢快朗读儿歌口诀';
        };

        if (window.audioEngine) {
          window.audioEngine.speakRhyme(lesson, resetBtn);
        } else {
          resetBtn();
        }
      });

      // 绑定老师辅导小妙招朗读按钮 (中文与拼音发音完全正确、语速 1.08 生动明快)
      document.getElementById('btn-speak-guide')?.addEventListener('click', () => {
        const btn = document.getElementById('btn-speak-guide');
        const txt = document.getElementById('btn-speak-guide-text');
        if (btn) {
          btn.disabled = true;
          btn.classList.add('ring-4', 'ring-sky-300', 'scale-105');
        }
        if (txt) txt.textContent = '正在讲解妙招...';

        const resetBtn = () => {
          if (btn) {
            btn.disabled = false;
            btn.classList.remove('ring-4', 'ring-sky-300', 'scale-105');
          }
          if (txt) txt.textContent = '朗读小妙招';
        };

        if (window.audioEngine) {
          window.audioEngine.speakTeacherGuide(lesson, resetBtn);
        } else {
          resetBtn();
        }
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
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-lg font-black text-neutral-800">四线三格规范书写与描红</h3>
              <p class="text-xs text-neutral-500">严格遵循人教版拼音规范：基准线对齐、标准笔画笔顺临摹！</p>
            </div>
            <!-- 切换正在描红的字母 -->
            <div class="flex flex-wrap gap-1.5">
              ${lesson.targetLetters.map((l, i) => `
                <button class="lesson-write-letter-btn px-3.5 py-1.5 rounded-xl font-mono text-base font-black transition ${i === 0 ? 'bg-amber-500 text-white shadow-md scale-105' : 'bg-neutral-100 text-neutral-700 hover:bg-amber-100'}" data-letter="${l}">
                  ${l === 'a' ? 'ɑ' : (l === 'g' ? 'ɡ' : l)}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- 规范书写要领与占格展示卡片 -->
          <div id="lesson-stroke-guide-card" class="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 p-4 rounded-2xl shadow-xs">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center space-x-3.5">
                <div class="w-13 h-13 bg-white rounded-2xl border-2 border-amber-400 flex items-center justify-center font-black text-2xl text-amber-950 font-mono shadow-xs">
                  <span id="stroke-guide-char">ɑ</span>
                </div>
                <div>
                  <div class="flex items-center space-x-2">
                    <span id="stroke-guide-grid" class="bg-amber-200 text-amber-900 font-extrabold text-xs px-2.5 py-0.5 rounded-full">占中格</span>
                    <span id="stroke-guide-count" class="bg-orange-200 text-orange-950 font-extrabold text-xs px-2.5 py-0.5 rounded-full">共 2 笔</span>
                  </div>
                  <p id="stroke-guide-order" class="text-xs sm:text-sm font-black text-amber-950 mt-1">笔顺：第一笔左半圆，第二笔竖右弯</p>
                </div>
              </div>
              <button id="btn-speak-stroke-guide" class="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-xs px-4 py-2 rounded-full shadow transition cursor-pointer">
                <span>🔊</span>
                <span>听书写要领</span>
              </button>
            </div>
            <p id="stroke-guide-tips" class="text-xs text-amber-800 font-medium mt-2.5 border-t border-amber-200/80 pt-2 leading-relaxed">
              💡 <strong>书写口诀：</strong>左半圆要圆润饱满占满中格，竖右弯紧贴第二、三线，不越界。
            </p>
          </div>

          <!-- 画布容器 (iPad 高清优化) -->
          <div class="relative w-full flex justify-center bg-amber-50/50 p-2 rounded-2xl border-2 border-dashed border-amber-300">
            <canvas id="lesson-stroke-canvas" class="w-full max-w-lg h-64 bg-white rounded-xl shadow-inner touch-none cursor-crosshair"></canvas>
          </div>

          <!-- 画笔工具条 -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-bold text-neutral-600">彩色画笔:</span>
              ${['#2563EB', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'].map(col => `
                <button class="canvas-color-pick w-7 h-7 rounded-full shadow border-2 border-white transition active:scale-95" style="background-color: ${col}" data-color="${col}"></button>
              `).join('')}
            </div>

            <div class="flex items-center space-x-3">
              <button id="btn-canvas-demo" class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition active:scale-95">
                ▶ 笔顺示范
              </button>
              <button id="btn-canvas-clear" class="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold px-4 py-2 rounded-xl transition active:scale-95">
                🧹 清除重写
              </button>
              <button id="btn-canvas-praise" class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition active:scale-95">
                👍 写好了，点赞！
              </button>
            </div>
          </div>
        </div>
      `;

      // 初始化 Canvas 与书写规范卡片
      setTimeout(() => {
        this.strokeCanvas = new PinyinStrokeCanvas('lesson-stroke-canvas');
        const initialLetter = lesson.targetLetters[0] || 'a';
        this.strokeCanvas.setLetter(initialLetter);

        const updateGuideCard = (letter) => {
          const info = this.strokeCanvas ? this.strokeCanvas.getStrokeInfo(letter) : null;
          if (!info) return;
          const charEl = document.getElementById('stroke-guide-char');
          const gridEl = document.getElementById('stroke-guide-grid');
          const countEl = document.getElementById('stroke-guide-count');
          const orderEl = document.getElementById('stroke-guide-order');
          const tipsEl = document.getElementById('stroke-guide-tips');

          if (charEl) charEl.textContent = info.displayChar || letter;
          if (gridEl) gridEl.textContent = info.grid || '占中格';
          if (countEl) countEl.textContent = `共 ${info.count || (info.strokes && info.strokes.length) || 1} 笔`;
          if (orderEl) orderEl.textContent = `笔顺：${info.strokeOrder}`;
          if (tipsEl) tipsEl.innerHTML = `💡 <strong>书写口诀：</strong>${info.tips}`;
        };

        updateGuideCard(initialLetter);

        // 切换字母
        stage.querySelectorAll('.lesson-write-letter-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const letter = e.currentTarget.dataset.letter;
            this.strokeCanvas.setLetter(letter);
            updateGuideCard(letter);

            stage.querySelectorAll('.lesson-write-letter-btn').forEach(b => {
              b.classList.remove('bg-amber-500', 'text-white', 'shadow-md', 'scale-105');
              b.classList.add('bg-neutral-100', 'text-neutral-700');
            });
            e.currentTarget.classList.add('bg-amber-500', 'text-white', 'shadow-md', 'scale-105');
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
        const demoBtn = document.getElementById('btn-canvas-demo');
        demoBtn?.addEventListener('click', () => {
          if (demoBtn) {
            demoBtn.disabled = true;
            demoBtn.classList.add('ring-4', 'ring-emerald-300');
          }
          this.strokeCanvas.demonstrate((step, name) => {
            if (demoBtn) demoBtn.textContent = `正在写第 ${step} 笔：${name}...`;
          }, () => {
            if (demoBtn) {
              demoBtn.disabled = false;
              demoBtn.textContent = '▶ 笔顺示范';
              demoBtn.classList.remove('ring-4', 'ring-emerald-300');
            }
          });
        });

        document.getElementById('btn-canvas-clear')?.addEventListener('click', () => {
          this.strokeCanvas.clear();
        });

        document.getElementById('btn-canvas-praise')?.addEventListener('click', () => {
          if (window.audioEngine) {
            window.audioEngine.playSuccess();
          }
          this.state.addStars(1);
        });

        // 听书写要领朗读
        document.getElementById('btn-speak-stroke-guide')?.addEventListener('click', () => {
          const letter = this.strokeCanvas ? this.strokeCanvas.currentLetter : initialLetter;
          const info = this.strokeCanvas ? this.strokeCanvas.getStrokeInfo(letter) : null;
          if (!info) return;
          const charSpoken = (window.audioEngine && window.audioEngine.rhymePhoneticMap && window.audioEngine.rhymePhoneticMap[letter]) ? window.audioEngine.rhymePhoneticMap[letter] : (info.displayChar || letter);
          const textToSpeak = `拼音字母 ${charSpoken}：${info.grid}。${info.strokeOrder}。${info.tips}`;
          if (window.audioEngine) {
            const spoken = window.audioEngine.convertPinyinForRhyme(textToSpeak);
            window.audioEngine.speakTTS(spoken, null, 1.05);
          }
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
          if (window.celebrationFX) {
            window.celebrationFX.registerCorrect(btn);
          }
          this.state.addStars(1);
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
          if (window.celebrationFX) {
            window.celebrationFX.registerMistake();
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
          <button class="game-select-tab px-5 py-2.5 rounded-2xl font-extrabold text-sm transition bg-white text-neutral-700 hover:bg-amber-100" data-game="whack">
            🐹 拼音打地鼠 (手速眼力)
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
    } else if (gameName === 'whack' && typeof WhackPinyinGame !== 'undefined') {
      this.whackGame = new WhackPinyinGame('active-game-stage');
      this.whackGame.render();
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

    // 直接打开 iPad 快捷指令 App
    document.getElementById('btn-open-shortcuts-app')?.addEventListener('click', () => {
      if (window.screenTimeLock) {
        window.screenTimeLock.openShortcutsApp();
      }
    });

    // 复制快捷指令名称辅助按钮
    document.getElementById('btn-copy-shortcut-unlock-name')?.addEventListener('click', () => {
      const val = document.getElementById('parent-shortcut-name')?.value || '拼音奖励15分钟';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(val);
      }
      const feedbackEl = document.getElementById('shortcut-test-feedback');
      if (feedbackEl) {
        feedbackEl.className = 'p-3 rounded-xl border text-xs font-medium space-y-1.5 transition bg-emerald-50 border-emerald-200 text-emerald-900';
        feedbackEl.innerHTML = `<div>📋 已复制解锁指令名称：<strong>${val}</strong>（请在 iPad 快捷指令 App 中以此命名）</div>`;
      }
    });

    document.getElementById('btn-copy-shortcut-lock-name')?.addEventListener('click', () => {
      const val = document.getElementById('parent-shortcut-lock-name')?.value || '拼音奖励15分钟恢复锁定';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(val);
      }
      const feedbackEl = document.getElementById('shortcut-test-feedback');
      if (feedbackEl) {
        feedbackEl.className = 'p-3 rounded-xl border text-xs font-medium space-y-1.5 transition bg-emerald-50 border-emerald-200 text-emerald-900';
        feedbackEl.innerHTML = `<div>📋 已复制恢复锁定指令名称：<strong>${val}</strong>（请在 iPad 快捷指令 App 中以此命名）</div>`;
      }
    });

    // 快捷指令自动唤起联动开关
    document.getElementById('parent-enable-shortcut-toggle')?.addEventListener('change', (e) => {
      if (window.screenTimeLock) {
        window.screenTimeLock.state.enableShortcutTrigger = e.target.checked;
        window.screenTimeLock.saveState();
      }
    });

    // 快捷指令联动测试（非阻塞系统级唤起）
    const handleShortcutTest = (action) => {
      if (!window.screenTimeLock) return;
      const unlockInput = document.getElementById('parent-shortcut-name');
      const lockInput = document.getElementById('parent-shortcut-lock-name');
      const unlockName = unlockInput?.value?.trim() || '拼音奖励15分钟';
      const lockName = lockInput?.value?.trim() || '拼音奖励15分钟恢复锁定';

      window.screenTimeLock.state.shortcutName = unlockName;
      window.screenTimeLock.state.shortcutLockName = lockName;
      window.screenTimeLock.saveState();

      const targetName = action === 'unlock' ? unlockName : lockName;
      const result = window.screenTimeLock.triggerShortcut(targetName, action);

      const feedbackEl = document.getElementById('shortcut-test-feedback');
      if (feedbackEl && result) {
        const isUnlock = action === 'unlock';
        feedbackEl.className = `p-3 rounded-xl border text-xs font-medium space-y-1.5 transition ${isUnlock ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`;
        feedbackEl.innerHTML = `
          <div class="font-extrabold flex items-center space-x-1.5">
            <span>${isUnlock ? '🔓' : '🔒'}</span>
            <span>已向 iPad 唤起【${result.targetName}】(${isUnlock ? '解除专注模式限制' : '恢复专注模式锁定'})</span>
          </div>
          <div class="text-[11px] leading-relaxed">
            若系统弹出 <em>“在「快捷指令」中打开此页？”</em>，请点击 <strong>“打开”</strong> 即可自动执行！<br>
            若未自动跳转，可直接点击这里手动唤起：<a href="${result.url}" class="underline font-black ${isUnlock ? 'text-emerald-700' : 'text-rose-700'}">运行指令【${result.targetName}】</a>
          </div>
        `;
      }
    };

    document.getElementById('btn-test-shortcut-unlock')?.addEventListener('click', () => handleShortcutTest('unlock'));
    document.getElementById('btn-test-shortcut-lock')?.addEventListener('click', () => handleShortcutTest('lock'));
    document.getElementById('btn-test-shortcut')?.addEventListener('click', () => handleShortcutTest('unlock'));

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

      const scLockInput = document.getElementById('parent-shortcut-lock-name');
      if (scLockInput) scLockInput.value = window.screenTimeLock.state.shortcutLockName || '拼音奖励15分钟恢复锁定';

      const scToggle = document.getElementById('parent-enable-shortcut-toggle');
      if (scToggle) scToggle.checked = window.screenTimeLock.state.enableShortcutTrigger !== false;

      const feedbackEl = document.getElementById('shortcut-test-feedback');
      if (feedbackEl) {
        feedbackEl.className = 'hidden p-3 rounded-xl border text-xs font-medium space-y-1.5 transition';
        feedbackEl.innerHTML = '';
      }

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
