/**
 * 拼音盲盒扭蛋机 (Pinyin Gacha Machine) & 萌兽图鉴馆
 * 1. 消耗孩子平时学习奖励获得的星星（每 3 颗星免费摇一次）
 * 2. 真实机械摇杆转动、彩蛋滚落、爆裂金色光芒卡牌出世
 * 3. 收集 23 个声母趣味萌兽卡与小精灵皮皮的个性帽子
 * 4. 永久持久化在 localStorage，激发儿童持续学习与收集欲望
 */

class PinyinGachaMachine {
  constructor() {
    this.storageKey = 'pinyin_gacha_collection_v1';
    this.collection = this.loadCollection();
    this.isSpinning = false;
    this.audioCtx = null;

    // 23个声母萌兽卡牌库
    this.cardPool = [
      { id: 'b', name: '超人波波', icon: '🦸‍♂️', desc: '右下半圆 b b b，勇敢正义的小超人！', rarity: 'SR' },
      { id: 'p', name: '滑板皮皮', icon: '🛹', desc: '右上半圆 p p p，带风狂奔的滑板手！', rarity: 'R' },
      { id: 'm', name: '双门小喵', icon: '🐱', desc: '两个门洞 m m m，喜欢捉迷藏的白猫！', rarity: 'R' },
      { id: 'f', name: '仙风老仙', icon: '🧙‍♂️', desc: '一根拐棍 f f f，能变出彩虹的魔法爷爷！', rarity: 'SR' },
      { id: 'd', name: '小马得得', icon: '🐴', desc: '左下半圆 d d d，哒哒马蹄跑得飞快！', rarity: 'R' },
      { id: 't', name: '小伞跳跳', icon: '☂️', desc: '伞柄朝下 t t t，下雨天最爱跳水坑！', rarity: 'R' },
      { id: 'n', name: '拱门小猪', icon: '🐷', desc: '一个门洞 n n n，聪明可爱的小飞猪！', rarity: 'R' },
      { id: 'l', name: '快乐小鹿', icon: '🦌', desc: '一根小棒 l l l，奔跑在森林间的小鹿！', rarity: 'R' },
      { id: 'g', name: '飞天白鸽', icon: '🕊️', desc: '9字加弯 g g g，扑棱翅膀飞上蓝天！', rarity: 'SR' },
      { id: 'k', name: '机甲小蝌', icon: '🐸', desc: '一挺机枪 k k k，池塘里游水的小能手！', rarity: 'R' },
      { id: 'h', name: '悠闲椅子', icon: '🪑', desc: '一把椅子 h h h，喝着甜水看太阳！', rarity: 'R' },
      { id: 'j', name: '彩羽大鸡', icon: '🐓', desc: '母鸡母鸡 j j j，草丛里面捉小虫！', rarity: 'R' },
      { id: 'q', name: '气球飞飞', icon: '🎈', desc: '左上半圆 q q q，飘向云彩的大红球！', rarity: 'SR' },
      { id: 'x', name: '西瓜果冻', icon: '🍉', desc: '一个大叉 x x x，又甜又冰的大西瓜！', rarity: 'R' },
      { id: 'zh', name: '织毛衣雀', icon: '🧣', desc: '织起厚厚软毛衣，暖呼呼过冬天！', rarity: 'SSR' },
      { id: 'ch', name: '红苹果虫', icon: '🍎', desc: '大口大口吃苹果，健康有活力！', rarity: 'SSR' },
      { id: 'sh', name: '小狮子王', icon: '🦁', desc: '金光闪闪大鬃毛，威风凛凛念古诗！', rarity: 'SSR' },
      { id: 'r', name: '向阳小苗', icon: '🌱', desc: '红日东升照新苗，一天一天长高高！', rarity: 'SR' },
      { id: 'z', name: '小鸭数字', icon: '🦆', desc: '像个2字写写字，水上游动真快活！', rarity: 'R' },
      { id: 'c', name: '刺猬刺刺', icon: '🦔', desc: '背上长满小刺刺，滚成圆球好可爱！', rarity: 'R' },
      { id: 's', name: '吐丝春蚕', icon: '🐛', desc: '吃着桑叶吐白丝，结成白白小蚕茧！', rarity: 'R' },
      { id: 'y', name: '嫩绿树杈', icon: '🌳', desc: '大树发芽小树杈，小鸟都来做个家！', rarity: 'SR' },
      { id: 'w', name: '水波小屋', icon: '🏠', desc: '屋顶倒映水中央，金鱼游过吹泡泡！', rarity: 'SR' }
    ];
  }

  ensureAudioContext() {
    if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
  }

  loadCollection() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['b', 'a']; // 默认送两张初生卡牌
  }

  saveCollection() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.collection));
    } catch (e) {}
  }

  openGachaModal() {
    let modal = document.getElementById('modal-gacha-machine');
    if (!modal) {
      this.createGachaModalDOM();
      modal = document.getElementById('modal-gacha-machine');
    }
    this.updateModalState();
    modal.classList.remove('hidden');
  }

  closeGachaModal() {
    const modal = document.getElementById('modal-gacha-machine');
    if (modal) modal.classList.add('hidden');
  }

  createGachaModalDOM() {
    const modal = document.createElement('div');
    modal.id = 'modal-gacha-machine';
    modal.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 hidden animate-fadeIn select-none';

    modal.innerHTML = `
      <div class="bg-gradient-to-b from-amber-50 via-rose-50 to-orange-100 rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-amber-300 relative space-y-4 max-h-[90vh] overflow-y-auto">
        <!-- 关闭按钮 -->
        <button id="btn-close-gacha" class="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 text-xl font-bold w-9 h-9 bg-white/80 rounded-full shadow flex items-center justify-center">
          ✕
        </button>

        <!-- 标题 -->
        <div class="text-center">
          <div class="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white px-5 py-1.5 rounded-full shadow-md">
            <span class="text-2xl animate-spin">🎰</span>
            <span class="text-lg font-black tracking-wide">拼音王国·魔法扭蛋机</span>
          </div>
          <p class="text-xs text-amber-800 font-bold mt-1.5">消耗学习获得的星星，抽取 23 个声母萌兽卡牌！</p>
        </div>

        <!-- 扭蛋机大视窗 -->
        <div class="relative w-full h-56 bg-gradient-to-b from-sky-200 via-sky-100 to-amber-100 rounded-3xl border-4 border-white shadow-inner flex flex-col items-center justify-center overflow-hidden">
          <!-- 玻璃球容器与内部彩球 -->
          <div id="gacha-globe" class="relative w-36 h-36 bg-white/40 rounded-full border-4 border-sky-300 shadow-md flex items-center justify-center overflow-hidden">
            <div class="text-3xl absolute top-3 left-4 animate-bounce">🔴</div>
            <div class="text-3xl absolute top-5 right-5 animate-pulse">🟡</div>
            <div class="text-3xl absolute bottom-3 left-6 animate-bounce">🟢</div>
            <div class="text-3xl absolute bottom-4 right-5 animate-pulse">🟣</div>
            <div class="text-4xl absolute animate-spin">⭐</div>
          </div>

          <!-- 扭蛋机出蛋口 -->
          <div class="absolute bottom-1 w-20 h-7 bg-amber-900/40 rounded-t-2xl border-t-2 border-amber-800 flex items-center justify-center">
            <span class="text-xs text-white font-bold opacity-80">出蛋口</span>
          </div>
        </div>

        <!-- 扭蛋转动控制按钮 -->
        <div class="flex flex-col items-center space-y-2">
          <button id="btn-spin-gacha" class="w-full max-w-xs bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 active:scale-95 text-white font-black text-lg py-3 px-6 rounded-2xl shadow-xl border-2 border-amber-200 flex items-center justify-center space-x-2 transition cursor-pointer">
            <span class="text-2xl animate-spin">🌟</span>
            <span id="btn-spin-text">消耗 3 颗星·转一次！</span>
          </button>
          <div id="gacha-star-tip" class="text-xs text-amber-900 font-bold">
            当前拥有星星：<span id="gacha-current-stars" class="text-amber-600 text-sm font-black">0</span> 颗
          </div>
        </div>

        <!-- 我的收集图鉴展示墙 -->
        <div class="pt-3 border-t-2 border-amber-200">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-black text-amber-950 flex items-center space-x-1">
              <span>📖</span>
              <span>萌兽收藏册 (<span id="gacha-collected-count">0</span>/23)</span>
            </span>
            <span class="text-[11px] text-amber-700 font-bold">集齐可获探险家大奖杯</span>
          </div>

          <div id="gacha-cards-grid" class="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1">
            <!-- 动态填充 -->
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btn-close-gacha')?.addEventListener('click', () => {
      this.closeGachaModal();
    });

    document.getElementById('btn-spin-gacha')?.addEventListener('click', () => {
      this.spin();
    });
  }

  updateModalState() {
    const starCount = window.app && window.app.state ? window.app.state.data.stars : 10;
    const starEl = document.getElementById('gacha-current-stars');
    if (starEl) starEl.innerText = starCount;

    const countEl = document.getElementById('gacha-collected-count');
    if (countEl) countEl.innerText = this.collection.length;

    // 渲染卡牌墙
    const grid = document.getElementById('gacha-cards-grid');
    if (!grid) return;

    grid.innerHTML = this.cardPool.map(card => {
      const isUnlocked = this.collection.includes(card.id);
      return `
        <div class="p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition ${isUnlocked ? 'bg-white border-amber-300 shadow-sm scale-100' : 'bg-neutral-200/60 border-neutral-300 opacity-40 grayscale'}">
          <div class="text-2xl">${isUnlocked ? card.icon : '❓'}</div>
          <div class="text-xs font-black mt-1 ${isUnlocked ? 'text-amber-900' : 'text-neutral-500'}">${card.id}</div>
          <div class="text-[9px] font-bold ${card.rarity === 'SSR' ? 'text-rose-500' : (card.rarity === 'SR' ? 'text-amber-600' : 'text-sky-600')}">${card.rarity}</div>
        </div>
      `;
    }).join('');
  }

  spin() {
    if (this.isSpinning) return;

    const starCount = window.app && window.app.state ? window.app.state.data.stars : 10;
    if (starCount < 3) {
      alert('星星不够啦！快去学习拼音或通关测试赚取星星吧～做对题目就会奖励星星哦！⭐');
      return;
    }

    this.isSpinning = true;

    // 扣除 3 颗星
    if (window.app && window.app.state) {
      window.app.state.data.stars = Math.max(0, starCount - 3);
      window.app.state.saveData();
      window.app.renderTopBar();
    }

    this.updateModalState();

    // 机械音效与球体翻滚
    this.playCrankSound();
    const globe = document.getElementById('gacha-globe');
    if (globe) {
      globe.classList.add('animate-spin');
    }

    const btnText = document.getElementById('btn-spin-text');
    if (btnText) btnText.innerText = '摇动中... 哗啦啦！';

    setTimeout(() => {
      if (globe) globe.classList.remove('animate-spin');
      this.isSpinning = false;
      if (btnText) btnText.innerText = '消耗 3 颗星·转一次！';

      // 抽取卡牌
      this.drawPrize();
    }, 1200);
  }

  drawPrize() {
    // 优先从未解锁中抽取以保持高愉悦感
    const lockedCards = this.cardPool.filter(c => !this.collection.includes(c.id));
    const pool = (lockedCards.length > 0 && Math.random() < 0.8) ? lockedCards : this.cardPool;
    const prize = pool[Math.floor(Math.random() * pool.length)];

    if (!this.collection.includes(prize.id)) {
      this.collection.push(prize.id);
      this.saveCollection();
    }

    this.updateModalState();

    // 弹出金色爆裂奖赏窗
    this.showPrizePopup(prize);
  }

  showPrizePopup(prize) {
    if (window.celebrationFX) {
      window.celebrationFX.launchConfetti(2800);
    }
    if (window.mascotPipi) {
      window.mascotPipi.speak(`哇！孵化出【${prize.name}】啦！太好看了！✨`, true);
    }

    const popup = document.createElement('div');
    popup.className = 'fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-fadeIn select-none';
    popup.innerHTML = `
      <div class="bg-gradient-to-b from-yellow-100 via-white to-amber-100 p-6 rounded-3xl max-w-xs w-full text-center border-4 border-yellow-400 shadow-2xl space-y-3 animate-bounce">
        <div class="text-xs font-black text-rose-600 bg-rose-100 py-1 px-3 rounded-full inline-block">✨ 稀有度: ${prize.rarity} ✨</div>
        <div class="text-7xl my-2">${prize.icon}</div>
        <h3 class="text-2xl font-black text-amber-950 font-mono tracking-wider">${prize.name} (${prize.id})</h3>
        <p class="text-xs text-amber-800 font-bold px-2">${prize.desc}</p>
        <button id="btn-claim-prize-card" class="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 text-white font-extrabold text-base py-2.5 rounded-xl shadow-lg border border-emerald-300 cursor-pointer mt-2">
          收进图鉴册 🎁
        </button>
      </div>
    `;

    document.body.appendChild(popup);

    popup.querySelector('#btn-claim-prize-card')?.addEventListener('click', () => {
      popup.remove();
    });
  }

  playCrankSound() {
    try {
      this.ensureAudioContext();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      for (let i = 0; i < 4; i++) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300 + i * 80, now + i * 0.15);

        gain.gain.setValueAtTime(0.2, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.08);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.09);
      }
    } catch (e) {}
  }
}

window.pinyinGachaMachine = new PinyinGachaMachine();
