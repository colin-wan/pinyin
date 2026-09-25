/**
 * 统编人教版小学语文一年级上册 汉字拼音综合游戏乐园 (HanziPinyinGameHub)
 * 专为一年级小学生打造：使用拼音深入巩固教材全部汉字
 * 模式1：汉字拼音消消乐 (连连看对对碰)
 * 模式2：看汉字选拼音 (拼音大挑战)
 * 模式3：听拼音找汉字 (听音辨字摘苹果)
 */

class HanziPinyinGameHub {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.mode = 'match'; // match, quiz, listen
    this.currentUnit = 'all'; // all or unit name
    this.score = 0;
    this.streak = 0;
    this.correctCount = 0;
    this.targetCorrect = 5;
    this.currentQuestion = null;
    this.cards = [];
    this.selectedCard = null;
    this.canClick = true;
    this.allHanzi = window.TEXTBOOK_HANZI_DATA || [];
  }

  getFilteredHanzi() {
    if (this.currentUnit === 'all' || !this.currentUnit) {
      return this.allHanzi;
    }
    return this.allHanzi.filter(item => item.unit.includes(this.currentUnit));
  }

  getRandomItems(count = 6) {
    const pool = [...this.getFilteredHanzi()];
    // Fisher-Yates 洗牌
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="w-full bg-gradient-to-b from-amber-50/90 via-orange-50/70 to-yellow-50/90 rounded-3xl p-4 sm:p-6 shadow-xl border-4 border-amber-300 select-none">
        
        <!-- 顶栏状态与模式切换 -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-amber-200 mb-5">
          <!-- 标题徽章 -->
          <div class="flex items-center space-x-2.5">
            <span class="text-3xl">🀄</span>
            <div>
              <h3 class="font-black text-amber-950 text-lg sm:text-xl">统编人教版·一年级汉字拼音乐园</h3>
              <p class="text-xs text-amber-700 font-bold">全册 300+ 生字拼音认读与趣味闯关</p>
            </div>
          </div>

          <!-- 得分与连对奖励 -->
          <div class="flex items-center space-x-2 sm:space-x-3">
            <div class="bg-emerald-100/90 px-3.5 py-1.5 rounded-full border border-emerald-300 text-emerald-950 font-black text-xs sm:text-sm flex items-center space-x-1">
              <span>🎯 已答对:</span>
              <span id="hanzi-game-correct" class="text-emerald-700 text-base font-black">${this.correctCount}/${this.targetCorrect}</span>
            </div>
            <div class="bg-amber-100/90 px-3.5 py-1.5 rounded-full border border-amber-300 text-amber-950 font-black text-xs sm:text-sm flex items-center space-x-1">
              <span>⭐ 得分:</span>
              <span id="hanzi-game-score" class="text-amber-600 text-base font-black">${this.score}</span>
            </div>
            <div class="bg-orange-100/90 px-3.5 py-1.5 rounded-full border border-orange-300 text-orange-950 font-black text-xs flex items-center space-x-1">
              <span>🔥 连对:</span>
              <span id="hanzi-game-streak" class="text-orange-600 text-sm font-black">${this.streak}</span>
            </div>
          </div>
        </div>

        <!-- 游戏单元过滤与模式 Tab 切换 -->
        <div class="flex flex-wrap items-center justify-between gap-2.5 mb-5 pb-2 border-b border-amber-200/80">
          <!-- 3大趣味模式切换 -->
          <div class="flex items-center space-x-1.5">
            <button class="hanzi-mode-btn px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition ${this.mode === 'match' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-neutral-700 hover:bg-amber-100'}" data-mode="match">
              ✨ 拼音消消乐
            </button>
            <button class="hanzi-mode-btn px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition ${this.mode === 'quiz' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-neutral-700 hover:bg-amber-100'}" data-mode="quiz">
              🎯 看汉字选拼音
            </button>
            <button class="hanzi-mode-btn px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition ${this.mode === 'listen' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-neutral-700 hover:bg-amber-100'}" data-mode="listen">
              🍎 听音摘苹果
            </button>
          </div>

          <!-- 教材单元选择器 -->
          <div class="flex items-center space-x-1.5">
            <span class="text-xs font-bold text-neutral-600">教材范围:</span>
            <select id="hanzi-unit-select" class="text-xs bg-white border border-amber-300 text-neutral-800 rounded-xl px-2.5 py-1.5 font-bold shadow-sm focus:outline-none">
              <option value="all">🌟 人教版全册生字 (全集)</option>
              <option value="识字一">第一单元：识字一 (天地人/金木水火土)</option>
              <option value="拼音课生字">第二/三/四单元：拼音课后生字</option>
              <option value="课文·">第四/六/七/八单元：课文生字</option>
              <option value="识字二">第五单元：识字二 (小书包/日月明/大小多少)</option>
            </select>
          </div>
        </div>

        <!-- 游戏动态舞台区域 -->
        <div id="hanzi-game-stage" class="min-h-[420px] flex items-center justify-center"></div>

      </div>
    `;

    // 绑定模式按钮
    this.container.querySelectorAll('.hanzi-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.mode = e.currentTarget.dataset.mode;
        this.correctCount = 0;
        this.render();
      });
    });

    // 绑定单元筛选
    const unitSelect = document.getElementById('hanzi-unit-select');
    if (unitSelect) {
      unitSelect.value = this.currentUnit;
      unitSelect.addEventListener('change', (e) => {
        this.currentUnit = e.target.value;
        this.renderStage();
      });
    }

    this.renderStage();
  }

  renderStage() {
    const stage = document.getElementById('hanzi-game-stage');
    if (!stage) return;
    stage.innerHTML = '';

    if (this.mode === 'match') {
      this.initMatchGame(stage);
    } else if (this.mode === 'quiz') {
      this.initQuizGame(stage);
    } else if (this.mode === 'listen') {
      this.initListenGame(stage);
    }
  }

  // ==========================================
  // 模式 1：汉字拼音消消乐 (Card Match)
  // ==========================================
  initMatchGame(stage) {
    const items = this.getRandomItems(6); // 6个汉字 + 6个拼音，共12张卡片
    if (items.length < 2) return;

    this.cards = [];
    items.forEach(item => {
      // 汉字卡
      this.cards.push({
        id: `hanzi-${item.char}`,
        matchKey: item.char,
        type: 'hanzi',
        text: item.char,
        sub: '汉字',
        pinyin: item.pinyin,
        word: (item.words && item.words[0]) || '',
        matched: false
      });
      // 拼音卡
      this.cards.push({
        id: `pinyin-${item.char}`,
        matchKey: item.char,
        type: 'pinyin',
        text: item.pinyin,
        sub: '拼音',
        pinyin: item.pinyin,
        word: (item.words && item.words[0]) || '',
        matched: false
      });
    });

    // 随机打乱卡片顺序
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }

    this.selectedCard = null;
    this.canClick = true;

    stage.innerHTML = `
      <div class="w-full max-w-2xl mx-auto space-y-4">
        <!-- 玩法提示 -->
        <div class="bg-amber-100/90 text-amber-950 px-4 py-2 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm">
          <span>💡 玩法：点击一个汉字和一个拼音，配对成功就会消灭它们哦！</span>
          <button id="btn-match-refresh" class="bg-white hover:bg-amber-50 text-amber-900 px-3 py-1 rounded-xl text-xs font-extrabold shadow-sm transition">
            🔄 换一组
          </button>
        </div>

        <!-- 12张卡片网格 -->
        <div class="grid grid-cols-3 sm:grid-cols-4 gap-3.5 p-2">
          ${this.cards.map((card, idx) => `
            <div class="hanzi-match-card cursor-pointer select-none bg-white hover:bg-amber-50 active:scale-95 border-4 border-amber-300 rounded-3xl p-4 shadow-md flex flex-col items-center justify-center h-28 transition-all transform hover:-translate-y-1" data-index="${idx}" id="card-elem-${idx}">
              <span class="${card.type === 'hanzi' ? 'text-4xl font-black text-neutral-800' : 'text-2xl font-black text-amber-700 font-mono tracking-wider'}">${card.text}</span>
              <span class="text-[10px] text-neutral-400 font-bold mt-1 bg-amber-50 px-2 py-0.5 rounded-full">${card.sub}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('btn-match-refresh')?.addEventListener('click', () => {
      this.initMatchGame(stage);
    });

    // 绑定卡片点击
    stage.querySelectorAll('.hanzi-match-card').forEach(elem => {
      elem.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        this.handleMatchCardClick(idx, stage);
      });
    });
  }

  handleMatchCardClick(index, stage) {
    if (!this.canClick) return;
    const card = this.cards[index];
    if (card.matched) return;

    const cardElem = document.getElementById(`card-elem-${index}`);
    if (window.antiCheat && !window.antiCheat.canAnswer(cardElem)) return;

    // 发音：朗读该汉字或拼音 (真人母带优先，杜绝多余机械朗读)
    if (window.audioEngine) {
      window.audioEngine.stopAllAudio();
      if (card.type === 'hanzi') {
        window.audioEngine.speak(card.text);
      } else {
        window.audioEngine.speak(card.matchKey);
      }
    }

    // 第一张选中
    if (!this.selectedCard) {
      this.selectedCard = { card, index, elem: cardElem };
      cardElem.classList.add('ring-4', 'ring-amber-500', 'bg-amber-100', 'scale-105');
      return;
    }

    // 点击了同一张卡
    if (this.selectedCard.index === index) {
      this.selectedCard = null;
      cardElem.classList.remove('ring-4', 'ring-amber-500', 'bg-amber-100', 'scale-105');
      return;
    }

    // 选中第二张卡，进行配对核查
    const first = this.selectedCard;
    const second = { card, index, elem: cardElem };
    second.elem.classList.add('ring-4', 'ring-amber-500', 'bg-amber-100', 'scale-105');
    this.canClick = false;

    // 必须是一张汉字 + 一张拼音，且 matchKey 相同
    const isPair = first.card.matchKey === second.card.matchKey && first.card.type !== second.card.type;

    if (isPair) {
      // 配对成功！
      first.card.matched = true;
      second.card.matched = true;
      this.score += 10;
      this.streak += 1;
      this.correctCount += 1;
      this.updateScoreBar();

      // 通知屏幕时间与正确率引擎
      if (window.screenTimeLock) {
        window.screenTimeLock.recordAnswer(true);
      }

      if (window.celebrationFX) {
        window.celebrationFX.registerCorrect(second.elem);
      }

      if (window.audioEngine) {
        window.audioEngine.playBalloonPop();
        window.audioEngine.playSuccess();
      }

      first.elem.classList.add('bg-emerald-100', 'border-emerald-400', 'opacity-0', 'scale-75', 'pointer-events-none');
      second.elem.classList.add('bg-emerald-100', 'border-emerald-400', 'opacity-0', 'scale-75', 'pointer-events-none');

      this.selectedCard = null;
      this.canClick = true;

      // 检查是否答对5次或全部通关消除
      const allDone = this.cards.every(c => c.matched);
      if (allDone || this.correctCount >= this.targetCorrect) {
        if (window.app && window.app.state) {
          window.app.state.addStars(5);
        }
        if (window.celebrationFX) {
          window.celebrationFX.launchConfetti(3500);
        }
        if (window.mascotPipi) {
          window.mascotPipi.speak('🎉 太棒啦！拼音消消乐答对 5 次挑战成功！获得 5 颗星币！', true);
        }
        setTimeout(() => {
          this.showCelebrationModal(stage, '太棒啦！拼音消消乐答对 5 次挑战成功！', () => {
            this.correctCount = 0;
            this.initMatchGame(stage);
          });
        }, 500);
      } else {
        if (window.app && window.app.state) {
          window.app.state.addStars(1);
        }
      }
    } else {
      // 配对失败
      if (window.antiCheat) {
        window.antiCheat.recordMistake();
      }
      this.streak = 0;
      this.updateScoreBar();

      if (window.screenTimeLock) {
        window.screenTimeLock.recordAnswer(false);
      }

      if (window.audioEngine) {
        window.audioEngine.playGentleOops();
      }

      first.elem.classList.add('animate-shake', 'bg-rose-100', 'border-rose-400');
      second.elem.classList.add('animate-shake', 'bg-rose-100', 'border-rose-400');

      setTimeout(() => {
        first.elem.classList.remove('ring-4', 'ring-amber-500', 'bg-amber-100', 'scale-105', 'animate-shake', 'bg-rose-100', 'border-rose-400');
        second.elem.classList.remove('ring-4', 'ring-amber-500', 'bg-amber-100', 'scale-105', 'animate-shake', 'bg-rose-100', 'border-rose-400');
        this.selectedCard = null;
        this.canClick = true;
      }, 700);
    }
  }

  // ==========================================
  // 模式 2：看汉字选拼音 (Quiz Challenge)
  // ==========================================
  initQuizGame(stage) {
    const pool = this.getFilteredHanzi();
    if (pool.length < 4) return;

    // 优先避免连续两道题重复抽中同一个汉字
    const availablePool = this.lastQuizChar ? pool.filter(item => item.char !== this.lastQuizChar) : pool;
    const targetPool = availablePool.length >= 4 ? availablePool : pool;
    const target = targetPool[Math.floor(Math.random() * targetPool.length)];
    this.lastQuizChar = target.char;

    // 生成 3 个混淆项拼音
    const distractors = pool.filter(item => item.char !== target.char && item.pinyin !== target.pinyin);
    distractors.sort(() => Math.random() - 0.5);

    const options = [target.pinyin, distractors[0].pinyin, distractors[1].pinyin, distractors[2].pinyin];
    options.sort(() => Math.random() - 0.5);

    this.currentQuestion = { target, options };
    if (window.antiCheat) {
      window.antiCheat.markQuestionStart(400);
    }

    stage.innerHTML = `
      <div class="w-full max-w-xl mx-auto space-y-6 text-center">
        <!-- 题目提示 -->
        <div class="inline-flex items-center space-x-2 bg-amber-100 text-amber-900 font-extrabold px-5 py-1.5 rounded-full text-xs shadow-inner">
          <span>📖 请看汉字，选出它正确的拼音：</span>
        </div>

        <!-- 汉字展示大卡片 -->
        <div class="bg-white rounded-3xl p-8 shadow-xl border-4 border-amber-300 max-w-sm mx-auto flex flex-col items-center justify-center transform hover:scale-105 transition">
          <span class="text-8xl font-black text-amber-950 font-serif mb-2 select-none">${target.char}</span>
          <div class="text-xs text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded-full flex items-center space-x-1">
            <span>📚 组词：${(target.words && target.words.join('、')) || ''}</span>
          </div>
          <button id="btn-quiz-speak" class="mt-4 bg-amber-400 hover:bg-amber-500 active:scale-95 text-amber-950 font-extrabold text-xs px-4 py-2 rounded-full shadow flex items-center space-x-1.5 transition cursor-pointer" title="点击重播发音">
            <span>🔊 听发音 (已自动播放，点击可重播)</span>
          </button>
        </div>

        <!-- 4个拼音选项 -->
        <div class="grid grid-cols-2 gap-4 max-w-md mx-auto">
          ${options.map(opt => `
            <button class="hanzi-quiz-opt-btn bg-white hover:bg-amber-100 active:scale-95 border-4 border-amber-200 hover:border-amber-400 p-5 rounded-2xl font-black text-2xl text-amber-900 font-mono shadow-md transition flex items-center justify-center" data-opt="${opt}">
              ${opt}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // 播放汉字/拼音发音
    const playTargetSound = () => {
      const btn = document.getElementById('btn-quiz-speak');
      if (btn) btn.classList.add('ring-4', 'ring-amber-300', 'scale-105');
      if (window.audioEngine) {
        window.audioEngine.speak(target.pinyin, () => {
          if (btn) btn.classList.remove('ring-4', 'ring-amber-300', 'scale-105');
        });
      }
    };

    document.getElementById('btn-quiz-speak')?.addEventListener('click', playTargetSound);

    // 【新增需求】看汉字选拼音：出题后自动播放发音
    if (this.quizAutoPlayTimer) {
      clearTimeout(this.quizAutoPlayTimer);
    }
    this.quizAutoPlayTimer = setTimeout(() => {
      playTargetSound();
    }, 280);

    let isAnswering = false;
    stage.querySelectorAll('.hanzi-quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.quizAutoPlayTimer) {
          clearTimeout(this.quizAutoPlayTimer);
        }
        if (isAnswering) return;

        if (window.antiCheat && !window.antiCheat.canAnswer(e.currentTarget)) {
          return;
        }

        if (window.antiCheat) {
          window.antiCheat.recordAnswerTime();
        }

        const chosen = e.currentTarget.dataset.opt;
        const isCorrect = chosen === target.pinyin;

        if (isCorrect) {
          isAnswering = true;
          e.currentTarget.classList.add('bg-emerald-500', 'text-white', 'border-emerald-600');
          this.score += 10;
          this.streak += 1;
          this.correctCount += 1;
          this.updateScoreBar();

          if (window.screenTimeLock) {
            window.screenTimeLock.recordAnswer(true);
          }

          if (window.celebrationFX) {
            window.celebrationFX.registerCorrect(e.currentTarget);
          }

          if (this.correctCount >= this.targetCorrect) {
            if (window.app && window.app.state) {
              window.app.state.addStars(5);
            }
            if (window.celebrationFX) {
              window.celebrationFX.launchConfetti(3500);
            }
            if (window.audioEngine) {
              window.audioEngine.playFanfare();
            }
            if (window.mascotPipi) {
              window.mascotPipi.speak('🎉 太棒啦！看汉字选拼音答对 5 次挑战成功！获得 5 颗星币！', true);
            }
            setTimeout(() => {
              this.showCelebrationModal(stage, '太棒啦！看汉字选拼音答对 5 次挑战成功！', () => {
                this.correctCount = 0;
                this.initQuizGame(stage);
              });
            }, 600);
          } else {
            if (window.app && window.app.state) {
              window.app.state.addStars(1);
            }
            if (window.audioEngine) {
              // 纯粹播放轻快悦耳的答对音效，不进行机械冗余朗读
              window.audioEngine.playSuccess();
            }
            setTimeout(() => {
              this.initQuizGame(stage);
            }, 850);
          }
        } else {
          if (window.antiCheat) {
            window.antiCheat.recordMistake();
          }
          e.currentTarget.classList.add('bg-rose-100', 'border-rose-400', 'animate-shake');
          this.streak = 0;
          this.updateScoreBar();

          if (window.screenTimeLock) {
            window.screenTimeLock.recordAnswer(false);
          }

          if (window.celebrationFX) {
            window.celebrationFX.registerMistake();
          }

          if (window.audioEngine) {
            window.audioEngine.playGentleOops();
          }

          setTimeout(() => {
            e.currentTarget.classList.remove('animate-shake');
          }, 600);
        }
      });
    });
  }

  // ==========================================
  // 模式 3：听拼音摘苹果 (Listen & Pick the Hanzi)
  // ==========================================
  initListenGame(stage) {
    const pool = this.getFilteredHanzi();
    if (pool.length < 4) return;

    // 优先避免连续两道题重复抽中同一个汉字
    const availablePool = this.lastListenChar ? pool.filter(item => item.char !== this.lastListenChar) : pool;
    const targetPool = availablePool.length >= 4 ? availablePool : pool;
    const target = targetPool[Math.floor(Math.random() * targetPool.length)];
    this.lastListenChar = target.char;

    const distractors = pool.filter(item => item.char !== target.char).sort(() => Math.random() - 0.5);

    const apples = [target, distractors[0], distractors[1], distractors[2]];
    apples.sort(() => Math.random() - 0.5);

    if (window.antiCheat) {
      window.antiCheat.markQuestionStart(400);
    }

    stage.innerHTML = `
      <div class="w-full max-w-2xl mx-auto space-y-5 text-center">
        <!-- 顶栏提示与播放按键 -->
        <div class="flex items-center justify-between bg-white/90 p-3.5 rounded-2xl shadow-sm border border-amber-200">
          <div class="text-xs font-extrabold text-amber-900 flex items-center space-x-1.5">
            <span class="text-lg">🎧</span>
            <span>请听拼音发音，点击苹果树上对应的汉字：</span>
          </div>
          <button id="btn-listen-replay" class="bg-amber-400 hover:bg-amber-500 active:scale-95 text-amber-950 font-black text-xs px-4 py-2 rounded-full shadow flex items-center space-x-1.5 transition cursor-pointer">
            <span>🔊 重播读音 (听题目拼音)</span>
          </button>
        </div>

        <!-- 目标拼音大声调展示卡 -->
        <div class="py-2">
          <span class="inline-block bg-gradient-to-r from-amber-400 to-orange-400 text-white font-mono font-black text-4xl px-8 py-3 rounded-full shadow-lg border-2 border-white animate-pulse">
            ${target.pinyin}
          </span>
        </div>

        <!-- 苹果树果园采摘区 -->
        <div class="relative w-full h-72 bg-gradient-to-b from-sky-100 via-emerald-50 to-emerald-200 rounded-3xl border-4 border-emerald-300 p-6 flex items-center justify-around overflow-hidden shadow-inner">
          ${apples.map((item, idx) => `
            <div class="apple-fruit-btn cursor-pointer select-none flex flex-col items-center transition-all transform hover:scale-110 active:scale-90" data-char="${item.char}" data-idx="${idx}">
              <div class="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-rose-500 to-red-600 rounded-full flex items-center justify-center text-white shadow-xl border-4 border-amber-100 relative group">
                <!-- 苹果小绿叶 -->
                <div class="absolute -top-2 right-4 w-5 h-3 bg-emerald-500 rounded-full rotate-45 border border-white"></div>
                <span class="text-4xl sm:text-5xl font-black font-serif">${item.char}</span>
              </div>
              <span class="text-xs font-black text-emerald-900 mt-2 bg-white/80 px-2.5 py-0.5 rounded-full shadow-sm">摘这个</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // 自动播放真人母带纯正发音 (杜绝机械长句)
    const playTargetAudio = () => {
      if (window.audioEngine) {
        window.audioEngine.speak(target.pinyin);
      }
    };
    setTimeout(playTargetAudio, 400);

    document.getElementById('btn-listen-replay')?.addEventListener('click', playTargetAudio);

    let isAnswering = false;
    stage.querySelectorAll('.apple-fruit-btn').forEach(elem => {
      elem.addEventListener('click', (e) => {
        if (isAnswering) return;

        if (window.antiCheat && !window.antiCheat.canAnswer(e.currentTarget)) {
          return;
        }

        if (window.antiCheat) {
          window.antiCheat.recordAnswerTime();
        }

        const chosenChar = e.currentTarget.dataset.char;
        const isCorrect = chosenChar === target.char;

        if (isCorrect) {
          isAnswering = true;
          this.score += 10;
          this.streak += 1;
          this.correctCount += 1;
          this.updateScoreBar();

          if (window.screenTimeLock) {
            window.screenTimeLock.recordAnswer(true);
          }

          if (window.celebrationFX) {
            window.celebrationFX.registerCorrect(e.currentTarget);
          }

          if (this.correctCount >= this.targetCorrect) {
            if (window.app && window.app.state) {
              window.app.state.addStars(5);
            }
            if (window.celebrationFX) {
              window.celebrationFX.launchConfetti(3500);
            }
            if (window.audioEngine) {
              window.audioEngine.playFanfare();
            }
            if (window.mascotPipi) {
              window.mascotPipi.speak('🎉 太棒啦！听音摘苹果答对 5 次挑战成功！获得 5 颗星币！', true);
            }
            setTimeout(() => {
              this.showCelebrationModal(stage, '太棒啦！听拼音摘苹果答对 5 次挑战成功！', () => {
                this.correctCount = 0;
                this.initListenGame(stage);
              });
            }, 600);
          } else {
            if (window.app && window.app.state) {
              window.app.state.addStars(1);
            }
            if (window.audioEngine) {
              // 纯粹清脆悦耳的通关音效，不进行机械念诵
              window.audioEngine.playSuccess();
            }
            e.currentTarget.classList.add('scale-125', 'opacity-0', 'transition-all', 'duration-500');
            setTimeout(() => {
              this.initListenGame(stage);
            }, 850);
          }
        } else {
          if (window.antiCheat) {
            window.antiCheat.recordMistake();
          }
          this.streak = 0;
          this.updateScoreBar();

          if (window.screenTimeLock) {
            window.screenTimeLock.recordAnswer(false);
          }

          if (window.celebrationFX) {
            window.celebrationFX.registerMistake();
          }

          if (window.audioEngine) {
            window.audioEngine.playGentleOops();
          }

          e.currentTarget.classList.add('animate-shake');
          setTimeout(() => e.currentTarget.classList.remove('animate-shake'), 600);
        }
      });
    });
  }

  showCelebrationModal(stage, title, onNext) {
    if (window.audioEngine) {
      window.audioEngine.stopAllAudio();
      window.audioEngine.playFanfare();
    }
    stage.innerHTML = `
      <div class="bg-gradient-to-b from-white to-amber-50 rounded-3xl p-8 shadow-2xl border-4 border-amber-400 text-center space-y-5 max-w-lg mx-auto animate-fadeIn my-4">
        <div class="text-7xl animate-bounce">🎉 🍎 🀄</div>
        <h3 class="text-2xl sm:text-3xl font-black text-amber-950">${title}</h3>
        <p class="text-sm font-extrabold text-emerald-600">已获得 5 颗闪亮星币 ⭐ · 掌握更多人教版一年级生字！</p>
        <div class="pt-2 flex justify-center">
          <button id="btn-celebration-next" class="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-white font-black text-base sm:text-lg px-8 py-3.5 rounded-2xl shadow-lg transition active:scale-95 cursor-pointer">
            🔄 再玩一次 / 下一轮闯关 ›
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-celebration-next')?.addEventListener('click', () => {
      onNext();
    });
  }

  updateScoreBar() {
    const scoreEl = document.getElementById('hanzi-game-score');
    if (scoreEl) scoreEl.innerText = this.score;

    const streakEl = document.getElementById('hanzi-game-streak');
    if (streakEl) streakEl.innerText = this.streak;

    const correctEl = document.getElementById('hanzi-game-correct');
    if (correctEl) correctEl.innerText = `${this.correctCount}/${this.targetCorrect}`;
  }
}

// 挂载至全局
if (typeof window !== 'undefined') {
  window.HanziPinyinGameHub = HanziPinyinGameHub;
}
