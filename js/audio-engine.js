/**
 * 拼音音频引擎 (PinyinAudioEngine)
 * 1. 【首要通道】人教版统编教材真人教学母带 (纯正女声 MP3 原音，字正腔圆，自然清晰，零失真)
 * 2. 【智能拼读】慢速渐进拼读阶梯 (真人声母 + 真人韵母 + 火车鸣笛 + 真人音节)
 * 3. 【系统兜底】Web Speech API 经过严格声学优化的标准普通话 (Apple Tingting 婷婷女声)
 * 4. 【高保真音效】Web Audio API 纯原生无网络依赖音效系统 (气球破裂、小车启动、汽笛、星星、彩花通关)
 */

class PinyinAudioEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.audioCtx = null;
    this.chineseVoice = null;
    this.speechRate = 0.88; // 温暖自然小学老师语速 (不急躁、咬字圆润)
    this.speechPitch = 1.03; // 温和亲切的略高师者音调 (消除机械平板感)
    this.isBoosted = false; // 是否开启超大音量增强模式
    this.audioCache = new Map(); // 音频实例高速缓存池
    this.currentPlayingAudio = null;
    this.ladderTimers = []; // 阶梯拼读及连环朗读计时器句柄列表

    // 23个声母（统编人教版小学标准呼读音音频映射）
    this.initialsAudioMap = {
      "b": "bo1.mp3", "p": "po1.mp3", "m": "mo1.mp3", "f": "fo2.mp3",
      "d": "de2.mp3", "t": "te4.mp3", "n": "ne4.mp3", "l": "le4.mp3",
      "g": "ge1.mp3", "k": "ke1.mp3", "h": "he1.mp3",
      "j": "ji1.mp3", "q": "qi1.mp3", "x": "xi1.mp3",
      "zh": "zhi1.mp3", "ch": "chi1.mp3", "sh": "shi1.mp3", "r": "ri4.mp3",
      "z": "zi1.mp3", "c": "ci1.mp3", "s": "si1.mp3",
      "y": "yi1.mp3", "w": "wu1.mp3"
    };

    // 单韵母、复韵母与鼻韵母四声映射
    this.finalsAudioMap = {
      "a": "a1.mp3", "ā": "a1.mp3", "á": "a2.mp3", "ǎ": "a3.mp3", "à": "a4.mp3",
      "o": "o1.mp3", "ō": "o1.mp3", "ó": "o2.mp3", "ǒ": "o3.mp3", "ò": "o4.mp3",
      "e": "e1.mp3", "ē": "e1.mp3", "é": "e2.mp3", "ě": "e3.mp3", "è": "e4.mp3",
      "i": "yi1.mp3", "ī": "yi1.mp3", "í": "yi2.mp3", "ǐ": "yi3.mp3", "ì": "yi4.mp3",
      "u": "wu1.mp3", "ū": "wu1.mp3", "ú": "wu2.mp3", "ǔ": "wu3.mp3", "ù": "wu4.mp3",
      "ü": "yu1.mp3", "ǖ": "yu1.mp3", "ǘ": "yu2.mp3", "ǚ": "yu3.mp3", "ǜ": "yu4.mp3",
      "ai": "ai1.mp3", "āi": "ai1.mp3", "ái": "ai2.mp3", "ǎi": "ai3.mp3", "ài": "ai4.mp3",
      "ei": "ei1.mp3", "ēi": "ei1.mp3", "éi": "ei2.mp3", "ěi": "ei3.mp3", "èi": "ei4.mp3",
      "ui": "wei1.mp3", "uī": "wei1.mp3", "uí": "wei2.mp3", "uǐ": "wei3.mp3", "uì": "wei4.mp3",
      "ao": "ao1.mp3", "āo": "ao1.mp3", "áo": "ao2.mp3", "ǎo": "ao3.mp3", "ào": "ao4.mp3",
      "ou": "ou1.mp3", "ōu": "ou1.mp3", "óu": "ou2.mp3", "ǒu": "ou3.mp3", "òu": "ou4.mp3",
      "iu": "you1.mp3", "iū": "you1.mp3", "iú": "you2.mp3", "iǔ": "you3.mp3", "iù": "you4.mp3",
      "ie": "ye1.mp3", "iē": "ye1.mp3", "ié": "ye2.mp3", "iě": "ye3.mp3", "iè": "ye4.mp3",
      "üe": "yue1.mp3", "üē": "yue1.mp3", "üé": "yue2.mp3", "üě": "yue3.mp3", "üè": "yue4.mp3",
      "er": "er2.mp3", "ēr": "er1.mp3", "ér": "er2.mp3", "ěr": "er3.mp3", "èr": "er4.mp3",
      "an": "an1.mp3", "ān": "an1.mp3", "án": "an2.mp3", "ǎn": "an3.mp3", "àn": "an4.mp3",
      "en": "en1.mp3", "ēn": "en1.mp3", "én": "en2.mp3", "ěn": "en3.mp3", "èn": "en4.mp3",
      "in": "yin1.mp3", "īn": "yin1.mp3", "ín": "yin2.mp3", "ǐn": "yin3.mp3", "ìn": "yin4.mp3",
      "un": "wen1.mp3", "ūn": "wen1.mp3", "ún": "wen2.mp3", "ǔn": "wen3.mp3", "ùn": "wen4.mp3",
      "ün": "yun1.mp3", "ǖn": "yun1.mp3", "ǘn": "yun2.mp3", "ǚn": "yun3.mp3", "ǜn": "yun4.mp3",
      "ang": "ang1.mp3", "āng": "ang1.mp3", "áng": "ang2.mp3", "ǎng": "ang3.mp3", "àng": "ang4.mp3",
      "eng": "eng1.mp3", "ēng": "eng1.mp3", "éng": "eng2.mp3", "ěng": "eng3.mp3", "èng": "eng4.mp3",
      "ing": "ying1.mp3", "īng": "ying1.mp3", "íng": "ying2.mp3", "ǐng": "ying3.mp3", "ìng": "ying4.mp3",
      "ong": "weng1.mp3", "ōng": "weng1.mp3", "óng": "weng2.mp3", "ǒng": "weng3.mp3", "òng": "weng4.mp3"
    };

    // 16个整体认读音节四声映射
    this.wholeSyllablesAudioMap = {
      "zhi": "zhi1.mp3", "zhī": "zhi1.mp3", "zhí": "zhi2.mp3", "zhǐ": "zhi3.mp3", "zhì": "zhi4.mp3",
      "chi": "chi1.mp3", "chī": "chi1.mp3", "chí": "chi2.mp3", "chǐ": "chi3.mp3", "chì": "chi4.mp3",
      "shi": "shi1.mp3", "shī": "shi1.mp3", "shí": "shi2.mp3", "shǐ": "shi3.mp3", "shì": "shi4.mp3",
      "ri": "ri4.mp3", "rī": "ri1.mp3", "rí": "ri2.mp3", "rǐ": "ri3.mp3", "rì": "ri4.mp3",
      "zi": "zi1.mp3", "zī": "zi1.mp3", "zí": "zi2.mp3", "zǐ": "zi3.mp3", "zì": "zi4.mp3",
      "ci": "ci1.mp3", "cī": "ci1.mp3", "cí": "ci2.mp3", "cǐ": "ci3.mp3", "cì": "ci4.mp3",
      "si": "si1.mp3", "sī": "si1.mp3", "sí": "si2.mp3", "sǐ": "si3.mp3", "sì": "si4.mp3",
      "yi": "yi1.mp3", "yī": "yi1.mp3", "yí": "yi2.mp3", "yǐ": "yi3.mp3", "yì": "yi4.mp3",
      "wu": "wu1.mp3", "wū": "wu1.mp3", "wú": "wu2.mp3", "wǔ": "wu3.mp3", "wù": "wu4.mp3",
      "yu": "yu1.mp3", "yū": "yu1.mp3", "yú": "yu2.mp3", "yǔ": "yu3.mp3", "yù": "yu4.mp3",
      "ye": "ye1.mp3", "yē": "ye1.mp3", "yé": "ye2.mp3", "yě": "ye3.mp3", "yè": "ye4.mp3",
      "yue": "yue4.mp3", "yuē": "yue1.mp3", "yué": "yue2.mp3", "yuě": "yue3.mp3", "yuè": "yue4.mp3",
      "yuan": "yuan2.mp3", "yuān": "yuan1.mp3", "yuán": "yuan2.mp3", "yuǎn": "yuan3.mp3", "yuàn": "yuan4.mp3",
      "yin": "yin1.mp3", "yīn": "yin1.mp3", "yín": "yin2.mp3", "yǐn": "yin3.mp3", "yìn": "yin4.mp3",
      "yun": "yun2.mp3", "yūn": "yun1.mp3", "yún": "yun2.mp3", "yǔn": "yun3.mp3", "yùn": "yun4.mp3",
      "ying": "ying1.mp3", "yīng": "ying1.mp3", "yíng": "ying2.mp3", "yǐng": "ying3.mp3", "yìng": "ying4.mp3"
    };

    // 统编人教版小学一年级生字真人母带录音对照表
    this.charAudioMap = {
      "一": "yi1.mp3",
      "三": "san1.mp3",
      "上": "shang4.mp3",
      "下": "xia4.mp3",
      "不": "bu4.mp3",
      "业": "ye4.mp3",
      "东": "dong1.mp3",
      "两": "liang3.mp3",
      "个": "ge4.mp3",
      "中": "zhong1.mp3",
      "串": "chuan4.mp3",
      "为": "wei4.mp3",
      "丽": "li4.mp3",
      "么": "me1.mp3",
      "乌": "wu1.mp3",
      "乐": "yue4.mp3",
      "也": "ye3.mp3",
      "书": "shu1.mp3",
      "了": "le1.mp3",
      "二": "er4.mp3",
      "云": "yun2.mp3",
      "五": "wu3.mp3",
      "亮": "liang4.mp3",
      "人": "ren2.mp3",
      "什": "shen2.mp3",
      "从": "cong2.mp3",
      "他": "ta1.mp3",
      "以": "yi3.mp3",
      "们": "men1.mp3",
      "众": "zhong4.mp3",
      "会": "hui4.mp3",
      "伞": "san3.mp3",
      "住": "zhu4.mp3",
      "作": "zuo4.mp3",
      "你": "ni3.mp3",
      "儿": "er2.mp3",
      "兔": "tu4.mp3",
      "公": "gong1.mp3",
      "关": "guan1.mp3",
      "写": "xie3.mp3",
      "冬": "dong1.mp3",
      "几": "ji3.mp3",
      "刀": "dao1.mp3",
      "到": "dao4.mp3",
      "前": "qian2.mp3",
      "力": "li4.mp3",
      "办": "ban4.mp3",
      "加": "jia1.mp3",
      "包": "bao1.mp3",
      "北": "bei3.mp3",
      "医": "yi1.mp3",
      "升": "sheng1.mp3",
      "午": "wu3.mp3",
      "半": "ban4.mp3",
      "南": "nan2.mp3",
      "厂": "chang3.mp3",
      "去": "qu4.mp3",
      "参": "can1.mp3",
      "又": "you4.mp3",
      "友": "you3.mp3",
      "双": "shuang1.mp3",
      "反": "fan3.mp3",
      "发": "fa1.mp3",
      "变": "bian4.mp3",
      "口": "kou3.mp3",
      "句": "ju4.mp3",
      "只": "zhi1.mp3",
      "可": "ke3.mp3",
      "台": "tai2.mp3",
      "叶": "ye4.mp3",
      "同": "tong2.mp3",
      "后": "hou4.mp3",
      "向": "xiang4.mp3",
      "吗": "ma1.mp3",
      "吧": "ba1.mp3",
      "听": "ting1.mp3",
      "和": "he2.mp3",
      "四": "si4.mp3",
      "回": "hui2.mp3",
      "国": "guo2.mp3",
      "土": "tu3.mp3",
      "在": "zai4.mp3",
      "地": "di4.mp3",
      "声": "sheng1.mp3",
      "壳": "ke2.mp3",
      "处": "chu4.mp3",
      "夏": "xia4.mp3",
      "多": "duo1.mp3",
      "大": "da4.mp3",
      "天": "tian1.mp3",
      "头": "tou2.mp3",
      "女": "nü3.mp3",
      "奶": "nai3.mp3",
      "妈": "ma1.mp3",
      "妹": "mei4.mp3",
      "娃": "wa2.mp3",
      "子": "zi1.mp3",
      "字": "zi4.mp3",
      "学": "xue2.mp3",
      "孩": "hai2.mp3",
      "它": "ta1.mp3",
      "家": "jia1.mp3",
      "对": "dui4.mp3",
      "小": "xiao3.mp3",
      "少": "shao3.mp3",
      "尖": "jian1.mp3",
      "尘": "chen2.mp3",
      "就": "jiu4.mp3",
      "尺": "chi3.mp3",
      "尾": "wei3.mp3",
      "山": "shan1.mp3",
      "工": "gong1.mp3",
      "己": "ji3.mp3",
      "巴": "ba1.mp3",
      "师": "shi1.mp3",
      "常": "chang2.mp3",
      "年": "nian2.mp3",
      "开": "kai1.mp3",
      "弯": "wan1.mp3",
      "当": "dang1.mp3",
      "彩": "cai3.mp3",
      "影": "ying3.mp3",
      "很": "hen3.mp3",
      "心": "xin1.mp3",
      "快": "kuai4.mp3",
      "慢": "man4.mp3",
      "戏": "xi4.mp3",
      "成": "cheng2.mp3",
      "我": "wo3.mp3",
      "扁": "bian3.mp3",
      "才": "cai2.mp3",
      "打": "da3.mp3",
      "找": "zhao3.mp3",
      "把": "ba3.mp3",
      "挂": "gua4.mp3",
      "放": "fang4.mp3",
      "数": "shu4.mp3",
      "文": "wen2.mp3",
      "方": "fang1.mp3",
      "旁": "pang2.mp3",
      "旗": "qi2.mp3",
      "无": "wu2.mp3",
      "日": "ri4.mp3",
      "早": "zao3.mp3",
      "明": "ming2.mp3",
      "星": "xing1.mp3",
      "春": "chun1.mp3",
      "是": "shi4.mp3",
      "更": "geng4.mp3",
      "最": "zui4.mp3",
      "月": "yue4.mp3",
      "有": "you3.mp3",
      "朋": "peng2.mp3",
      "服": "fu1.mp3",
      "木": "mu4.mp3",
      "本": "ben3.mp3",
      "杏": "xing4.mp3",
      "条": "tiao2.mp3",
      "来": "lai2.mp3",
      "林": "lin2.mp3",
      "果": "guo3.mp3",
      "树": "shu4.mp3",
      "校": "xiao4.mp3",
      "桃": "tao2.mp3",
      "桌": "zhuo1.mp3",
      "桥": "qiao2.mp3",
      "棋": "qi2.mp3",
      "森": "sen1.mp3",
      "歌": "ge1.mp3",
      "正": "zheng4.mp3",
      "步": "bu4.mp3",
      "比": "bi3.mp3",
      "气": "qi4.mp3",
      "水": "shui3.mp3",
      "江": "jiang1.mp3",
      "没": "mei2.mp3",
      "法": "fa3.mp3",
      "洞": "dong4.mp3",
      "活": "huo2.mp3",
      "海": "hai3.mp3",
      "火": "huo3.mp3",
      "点": "dian3.mp3",
      "爬": "pa2.mp3",
      "爸": "ba4.mp3",
      "片": "pian4.mp3",
      "牙": "ya2.mp3",
      "牛": "niu2.mp3",
      "狗": "gou3.mp3",
      "猫": "mao1.mp3",
      "玩": "wan2.mp3",
      "生": "sheng1.mp3",
      "用": "yong4.mp3",
      "田": "tian2.mp3",
      "男": "nan2.mp3",
      "画": "hua4.mp3",
      "白": "bai2.mp3",
      "的": "de1.mp3",
      "皮": "pi2.mp3",
      "目": "mu4.mp3",
      "看": "kan4.mp3",
      "真": "zhen1.mp3",
      "着": "zhe1.mp3",
      "睡": "shui4.mp3",
      "短": "duan3.mp3",
      "石": "shi2.mp3",
      "禾": "he2.mp3",
      "秋": "qiu1.mp3",
      "空": "kong1.mp3",
      "穿": "chuan1.mp3",
      "立": "li4.mp3",
      "竹": "zhu2.mp3",
      "笑": "xiao4.mp3",
      "笔": "bi3.mp3",
      "红": "hong2.mp3",
      "纸": "zhi3.mp3",
      "给": "gei3.mp3",
      "绿": "lü4.mp3",
      "羊": "yang2.mp3",
      "美": "mei3.mp3",
      "群": "qun2.mp3",
      "老": "lao3.mp3",
      "耳": "er3.mp3",
      "自": "zi4.mp3",
      "船": "chuan2.mp3",
      "色": "se4.mp3",
      "节": "jie2.mp3",
      "花": "hua1.mp3",
      "芽": "ya2.mp3",
      "苹": "ping2.mp3",
      "草": "cao3.mp3",
      "莲": "lian2.mp3",
      "蓝": "lan2.mp3",
      "虫": "chong2.mp3",
      "蛙": "wa1.mp3",
      "衣": "yi1.mp3",
      "西": "xi1.mp3",
      "要": "yao4.mp3",
      "见": "jian4.mp3",
      "许": "xu3.mp3",
      "词": "ci2.mp3",
      "诗": "shi1.mp3",
      "语": "yu3.mp3",
      "说": "shuo1.mp3",
      "课": "ke4.mp3",
      "谁": "shui2.mp3",
      "贝": "bei4.mp3",
      "走": "zou3.mp3",
      "起": "qi3.mp3",
      "跟": "gen1.mp3",
      "车": "che1.mp3",
      "边": "bian1.mp3",
      "过": "guo4.mp3",
      "近": "jin4.mp3",
      "还": "hai2.mp3",
      "进": "jin4.mp3",
      "远": "yuan3.mp3",
      "那": "na4.mp3",
      "采": "cai3.mp3",
      "里": "li3.mp3",
      "金": "jin1.mp3",
      "长": "chang2.mp3",
      "闪": "shan3.mp3",
      "问": "wen4.mp3",
      "院": "yuan4.mp3",
      "雨": "yu3.mp3",
      "雪": "xue3.mp3",
      "青": "qing1.mp3",
      "音": "yin1.mp3",
      "风": "feng1.mp3",
      "飞": "fei1.mp3",
      "马": "ma3.mp3",
      "高": "gao1.mp3",
      "鱼": "yu2.mp3",
      "鸟": "niao3.mp3",
      "鸡": "ji1.mp3",
      "鸦": "ya1.mp3",
      "鸭": "ya1.mp3",
      "黄": "huang2.mp3",
      "黑": "hei1.mp3"
};

    // 基础声调字符与数值对照
    this.toneCharsMap = {
      'ā': ['a', '1'], 'á': ['a', '2'], 'ǎ': ['a', '3'], 'à': ['a', '4'],
      'ō': ['o', '1'], 'ó': ['o', '2'], 'ǒ': ['o', '3'], 'ò': ['o', '4'],
      'ē': ['e', '1'], 'é': ['e', '2'], 'ě': ['e', '3'], 'è': ['e', '4'],
      'ī': ['i', '1'], 'í': ['i', '2'], 'ǐ': ['i', '3'], 'ì': ['i', '4'],
      'ū': ['u', '1'], 'ú': ['u', '2'], 'ǔ': ['u', '3'], 'ù': ['u', '4'],
      'ǖ': ['ü', '1'], 'ǘ': ['ü', '2'], 'ǚ': ['ü', '3'], 'ǜ': ['ü', '4']
    };

    this.phoneticMap = {
      'b': '玻', 'p': '坡', 'm': '摸', 'f': '佛',
      'd': '得', 't': '特', 'n': '讷', 'l': '勒',
      'g': '哥', 'k': '科', 'h': '喝',
      'j': '基', 'q': '七', 'x': '西',
      'zh': '知', 'ch': '吃', 'sh': '诗', 'r': '日',
      'z': '资', 'c': '疵', 's': '思',
      'y': '衣', 'w': '乌'
    };

    this.initAudioContext();
    this.initVoices();
    this.bindTouchWarmup();
  }

  bindTouchWarmup() {
    const warmup = () => {
      this.ensureAudioContext();
      if (this.synth && this.synth.paused) {
        this.synth.resume();
      }
      document.removeEventListener('touchstart', warmup);
      document.removeEventListener('click', warmup);
    };
    document.addEventListener('touchstart', warmup, { once: true, passive: true });
    document.addEventListener('click', warmup, { once: true });
  }

  initAudioContext() {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    } catch (e) {
      console.warn('Web Audio not supported');
    }
  }

  ensureAudioContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setVolumeBoost(enabled) {
    this.isBoosted = !!enabled;
  }

  setSpeechSpeed(speed) {
    if (speed === 'slow') {
      this.speechRate = 0.80; // 慢速拼读
    } else {
      this.speechRate = 0.88; // 标准亲切语速
    }
  }

  /**
   * 彻底停止所有正在播放的音频与语音合成，清除排队定时器，杜绝任何重音叠音
   */
  stopAllAudio() {
    // 1. 停止当前正在播放的 HTML5 Audio 实例
    if (this.currentPlayingAudio) {
      try {
        this.currentPlayingAudio.pause();
        this.currentPlayingAudio.currentTime = 0;
        this.currentPlayingAudio.onended = null;
      } catch (e) {}
      this.currentPlayingAudio = null;
    }

    // 2. 遍历缓存池所有音频，确保全部静音并重置
    if (this.audioCache) {
      this.audioCache.forEach(audio => {
        try {
          audio.pause();
          audio.currentTime = 0;
          audio.onended = null;
        } catch (e) {}
      });
    }

    // 3. 彻底取消系统 Web Speech API 朗读队列
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }

    // 4. 清理排队中的阶梯拼读或级联朗读定时器
    if (this.ladderTimers && this.ladderTimers.length > 0) {
      this.ladderTimers.forEach(t => clearTimeout(t));
      this.ladderTimers = [];
    }
  }

  initVoices() {
    if (!this.synth) return;
    const findVoice = () => {
      const voices = this.synth.getVoices();
      if (!voices || voices.length === 0) return;

      const bannedKeywords = [
        'flo', 'eddy', 'reed', 'rocko', 'sandy', 'shelley', 'grandma', 'grandpa', 
        'sinji', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'whisper', 'zarvox',
        'alva', 'fred', 'organ', 'trinoids', 'deranged'
      ];

      const zhCnVoices = voices.filter(v => {
        const l = (v.lang || '').replace('_', '-').toLowerCase();
        const n = (v.name || '').toLowerCase();
        return (l === 'zh-cn' || l === 'zh' || l.startsWith('zh-')) && !bannedKeywords.some(b => n.includes(b));
      });

      // 优先级 1: 现代神经网络或高级自然音色 (Xiaoxiao 晓晓、Yunxi 云希、Xiaoyi 晓伊、自然婷婷 Enhanced)
      let matched = zhCnVoices.find(v => {
        const n = (v.name || '').toLowerCase();
        return n.includes('natural') || n.includes('neural') || n.includes('enhanced') || 
               n.includes('xiaoxiao') || n.includes('晓晓') || n.includes('yunxi') || n.includes('云希');
      });

      // 优先级 2: 经典甜美女性自然音色 (婷婷 Tingting、Sin-ji)
      if (!matched) {
        matched = zhCnVoices.find(v => {
          const n = (v.name || '').toLowerCase();
          return n.includes('ting') || v.name.includes('婷') || n.includes('sinji') || n.includes('yaoyao') || n.includes('瑶瑶');
        });
      }

      // 优先级 3: 任意标准普通话女声/普通话发音人
      if (!matched && zhCnVoices.length > 0) {
        matched = zhCnVoices.find(v => !v.name.toLowerCase().includes('cantonese')) || zhCnVoices[0];
      }

      this.chineseVoice = matched || null;
    };

    findVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = findVoice;
    }
  }

  /**
   * 将拼音或汉字解析为对应的高保真母带 MP3 文件名
   * @param {string} text - 拼音或单个生字
   * @returns {string|null} - 如 "tian1.mp3", "bo1.mp3", "a1.mp3"
   */
  pinyinToAudioFile(text) {
    if (!text) return null;
    const clean = text.trim().toLowerCase();

    // 1. 声母呼读音 (b -> bo1.mp3, p -> po1.mp3...)
    if (this.initialsAudioMap[clean]) {
      return this.initialsAudioMap[clean];
    }

    // 2. 韵母四声 (ā -> a1.mp3, o -> o1.mp3...)
    if (this.finalsAudioMap[clean]) {
      return this.finalsAudioMap[clean];
    }

    // 3. 整体认读音节 (zhi -> zhi1.mp3, yue -> yue4.mp3...)
    if (this.wholeSyllablesAudioMap[clean]) {
      return this.wholeSyllablesAudioMap[clean];
    }

    // 4. 生字直查 (天 -> tian1.mp3, 地 -> di4.mp3...)
    if (this.charAudioMap[text.trim()]) {
      return this.charAudioMap[text.trim()];
    }

    // 5. 将带声调的拼音转换为数字调 MP3 (如 tiān -> tian1.mp3, bà -> ba4.mp3)
    let tone = '1';
    let base = '';
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (this.toneCharsMap[ch]) {
        base += this.toneCharsMap[ch][0];
        tone = this.toneCharsMap[ch][1];
      } else {
        base += ch;
      }
    }

    if (base) {
      return `${base}${tone}.mp3`;
    }

    return null;
  }

  /**
   * 播放真人录音 MP3 音频文件 (HTML5 Native Audio，零CORS拦截，100%保证发音)
   * @param {string} filename - 音频文件名 (如 "bo1.mp3", "tian1.mp3")
   * @param {function} onEnded - 播放完成回调
   * @param {boolean} clearLadder - 是否清除外部排队定时器 (默认 true)
   */
  playAudioFile(filename, onEnded = null, clearLadder = true) {
    if (!filename) {
      if (onEnded) setTimeout(onEnded, 10);
      return false;
    }
    const path = 'audio/' + filename;

    // 停止当前正在播放的声音
    if (clearLadder) {
      this.stopAllAudio();
    } else {
      if (this.currentPlayingAudio) {
        try {
          this.currentPlayingAudio.pause();
          this.currentPlayingAudio.currentTime = 0;
          this.currentPlayingAudio.onended = null;
        } catch (e) {}
        this.currentPlayingAudio = null;
      }
      if (this.synth) {
        try { this.synth.cancel(); } catch (e) {}
      }
    }

    let audio = this.audioCache.get(filename);
    if (!audio) {
      audio = new Audio(path);
      this.audioCache.set(filename, audio);
    } else {
      try { audio.currentTime = 0; } catch (e) {}
    }

    audio.volume = this.isBoosted ? 1.0 : 0.95;
    this.currentPlayingAudio = audio;

    let hasEnded = false;
    const triggerEnded = () => {
      if (hasEnded) return;
      hasEnded = true;
      if (this.currentPlayingAudio === audio) {
        this.currentPlayingAudio = null;
      }
      if (onEnded) onEnded();
    };

    audio.onended = triggerEnded;
    audio.onerror = (err) => {
      console.warn('Audio element error, fallback to TTS:', filename, err);
      this.speakTTS(filename.replace(/[0-9]\.mp3$/, ''), triggerEnded);
    };

    const p = audio.play();
    if (p !== undefined) {
      p.catch(err => {
        console.warn('Audio play failed, fallback to TTS:', filename, err);
        this.speakTTS(filename.replace(/[0-9]\.mp3$/, ''), triggerEnded);
      });
    }
    return true;
  }

  /**
   * 核心统一朗读方法：优先使用人教版真人母带 MP3，整句提示语平滑回退至自然普通话
   * @param {string} text - 拼音、汉字或长句文本
   * @param {function|number} onEndedOrRate - 结束回调或自定义语速
   */
  speak(text, onEndedOrRate = null) {
    const onEnded = typeof onEndedOrRate === 'function' ? onEndedOrRate : null;
    const rate = typeof onEndedOrRate === 'number' ? onEndedOrRate : null;

    const clean = (text || '').trim();
    if (!clean) return;

    // 1. 尝试直接匹配真人录音母带
    const audioFile = this.pinyinToAudioFile(clean);
    if (audioFile) {
      this.playAudioFile(audioFile, onEnded);
      return;
    }

    // 2. 检查形如 "天，蓝天" 的复合字词结构
    if (clean.includes('，') && clean.length <= 10) {
      const parts = clean.split('，');
      const firstPart = parts[0].trim();
      const firstAudio = this.pinyinToAudioFile(firstPart);
      if (firstAudio) {
        // 先播放第一个字/音的纯正真人母带，结束后朗读扩展词
        this.playAudioFile(firstAudio, () => {
          const tId = setTimeout(() => {
            this.speakTTS(parts[1].trim(), onEnded);
          }, 250);
          this.ladderTimers.push(tId);
        });
        return;
      }
    }

    // 3. 长句或系统提示语（如“答对啦！”、“请摘下苹果”），采用自然普通话播报
    this.speakTTS(clean, onEnded, rate);
  }

  /**
   * 纯文本系统朗读（已配置好温暖自然小学教师音色）
   */
  speakTTS(text, onEnded = null, rate = null) {
    const clean = (text || '').trim();
    if (!clean) {
      if (onEnded) setTimeout(onEnded, 10);
      return;
    }

    if (this.currentPlayingAudio) {
      try {
        this.currentPlayingAudio.pause();
        this.currentPlayingAudio.currentTime = 0;
        this.currentPlayingAudio.onended = null;
      } catch (e) {}
      this.currentPlayingAudio = null;
    }

    if (!this.synth) {
      if (onEnded) setTimeout(onEnded, 10);
      return;
    }

    if (!this.chineseVoice) {
      this.initVoices();
    }

    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'zh-CN';
    utter.volume = this.isBoosted ? 1.0 : 0.95;
    utter.rate = rate || this.speechRate;
    utter.pitch = this.speechPitch || 1.03; // 亲切自然的师者音调
    if (this.chineseVoice) {
      utter.voice = this.chineseVoice;
    }

    if (onEnded) {
      let ended = false;
      const finish = () => {
        if (!ended) {
          ended = true;
          onEnded();
        }
      };
      utter.onend = finish;
      utter.onerror = finish;
      const timeoutMs = Math.max(1200, Math.ceil(clean.length * 500));
      setTimeout(finish, timeoutMs + 300);
    }

    if (this.synth.paused) {
      this.synth.resume();
    }
    this.synth.speak(utter);
  }

  /**
   * 朗读声母（优先使用真人母带呼读音）
   */
  speakInitial(initial, withLabel = false) {
    const file = this.initialsAudioMap[initial];
    if (file) {
      this.playAudioFile(file);
    } else {
      this.speak(initial);
    }
  }

  /**
   * 朗读韵母（优先使用真人母带）
   */
  speakFinal(final, withLabel = false) {
    const file = this.finalsAudioMap[final];
    if (file) {
      this.playAudioFile(file);
    } else {
      this.speak(final);
    }
  }

  /**
   * 朗读声调（优先使用真人母带四声）
   */
  speakTone(letter, toneIdx) {
    const tonesMap = {
      'a': ['ā', 'á', 'ǎ', 'à'],
      'o': ['ō', 'ó', 'ǒ', 'ò'],
      'e': ['ē', 'é', 'ě', 'è'],
      'i': ['ī', 'í', 'ǐ', 'ì'],
      'u': ['ū', 'ú', 'ǔ', 'ù'],
      'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ']
    };
    const toneSymbols = tonesMap[letter] || ['ā', 'á', 'ǎ', 'à'];
    const symbol = toneSymbols[toneIdx] || toneSymbols[0];
    const file = this.finalsAudioMap[symbol] || `${letter}${toneIdx + 1}.mp3`;
    this.playAudioFile(file);
  }

  /**
   * 慢速朗读
   */
  speakSlow(text) {
    this.speak(text, 0.72);
  }

  /**
   * 读汉字并带常用词汇（汉字优先真人母带）
   */
  speakHanzi(char, word = '') {
    const file = this.charAudioMap[char];
    if (file) {
      if (word) {
        this.playAudioFile(file, () => {
          setTimeout(() => {
            this.speakTTS(word);
          }, 300);
        });
      } else {
        this.playAudioFile(file);
      }
    } else {
      this.speakTTS(word ? `${char}，${word}` : char);
    }
  }

  /**
   * 专为“拼读连不起来”设计的【慢速渐进连读拼读阶梯】
   * 声母、韵母、合成音节全流程接入 100% 真人母带！
   * 阶段：
   * 1. 读声母（真人录音 玻/摸/坡）
   * 2. 读带调韵母（真人录音 à/ā/í）
   * 3. 呼啸滑动靠近（火车喷气音）
   * 4. 碰撞合成音节（真人录音 bà/mā）+ 词语
   * @param {object} stepData - { initial, final, tone, syllable, word }
   * @param {function} onStepChange - 每步回调驱动动画
   */
  playBlendLadder(stepData, onStepChange) {
    this.stopAllAudio();
    this.ensureAudioContext();

    const { initial, tone, syllable, word } = stepData;
    const initialFile = this.pinyinToAudioFile(initial);
    const toneFile = this.pinyinToAudioFile(tone);
    const syllableFile = this.pinyinToAudioFile(syllable);

    // 第一步：真人声母呼读音
    if (onStepChange) onStepChange(1, initial);
    this.playAudioFile(initialFile, () => {
      // 延时 300ms 后进入第二步：真人韵母
      const t1 = setTimeout(() => {
        if (onStepChange) onStepChange(2, tone);
        this.playAudioFile(toneFile, () => {
          // 延时 350ms 后进入第三步：小火车加速靠拢碰撞
          const t2 = setTimeout(() => {
            if (onStepChange) onStepChange(3, `${initial}——>${tone}`);
            this.playTrainChug();

            const t3 = setTimeout(() => {
              // 第四步：两车相撞·纯正真人母带音节合读！(去除机械TTS朗读与电子重音)
              if (onStepChange) onStepChange(4, syllable);

              this.playAudioFile(syllableFile, () => {
                if (onStepChange) onStepChange(5, 'done');
              }, false);
            }, 600);
            this.ladderTimers.push(t3);
          }, 350);
          this.ladderTimers.push(t2);
        }, false);
      }, 300);
      this.ladderTimers.push(t1);
    }, false);
  }

  // ==========================================
  // Web Audio API 纯原生高保真音效生成器
  // ==========================================

  playSuccess() {
    if (!this.audioCtx) return;
    this.ensureAudioContext();
    const now = this.audioCtx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.28);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });
  }

  playGentleOops() {
    if (!this.audioCtx) return;
    this.ensureAudioContext();
    const now = this.audioCtx.currentTime;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(329.63, now); // E4
    osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.25); // C4

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  playTrainChug() {
    if (!this.audioCtx) return;
    this.ensureAudioContext();
    const now = this.audioCtx.currentTime;

    const bufferSize = this.audioCtx.sampleRate * 0.12;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(2.5, now);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);
    noise.start(now);

    const whistle = this.audioCtx.createOscillator();
    const whistleGain = this.audioCtx.createGain();
    whistle.type = 'sawtooth';
    whistle.frequency.setValueAtTime(440, now + 0.05);
    whistle.frequency.exponentialRampToValueAtTime(587.33, now + 0.18);
    whistleGain.gain.setValueAtTime(0.08, now + 0.05);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    whistle.connect(whistleGain);
    whistleGain.connect(this.audioCtx.destination);
    whistle.start(now + 0.05);
    whistle.stop(now + 0.26);
  }

  playBalloonPop() {
    if (!this.audioCtx) return;
    this.ensureAudioContext();
    const now = this.audioCtx.currentTime;

    const bufferSize = this.audioCtx.sampleRate * 0.08;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(gain);
    gain.connect(this.audioCtx.destination);
    noise.start(now);
  }

  playFanfare() {
    if (!this.audioCtx) return;
    this.ensureAudioContext();
    const now = this.audioCtx.currentTime;

    const melody = [
      { f: 523.25, d: 0.12 }, // C5
      { f: 659.25, d: 0.12 }, // E5
      { f: 783.99, d: 0.12 }, // G5
      { f: 1046.50, d: 0.35 } // C6
    ];

    let offset = 0;
    melody.forEach(item => {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.f, now + offset);

      gain.gain.setValueAtTime(0.2, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + item.d);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + item.d + 0.05);
      offset += item.d * 0.85;
    });
  }
}

// 挂载全局唯一单例
window.audioEngine = new PinyinAudioEngine();
