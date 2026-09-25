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

    // 认读儿歌与课文标题专用：将拼音字母音精准转换为纯正发音汉字，消除英文机械音
    this.rhymePhoneticMap = {
      // 整体认读音节与多字母韵母
      'ang': '昂', 'eng': '亨', 'ing': '英', 'ong': '轰',
      // 前鼻韵母
      'an': '安', 'en': '恩', 'in': '因', 'un': '温', 'ün': '晕',
      // 复韵母与特殊韵母
      'ai': '哀', 'ei': '欸', 'ui': '威', 'ao': '熬', 'ou': '欧', 'iu': '优',
      'ie': '耶', 'üe': '约', 'er': '耳',
      // 整体认读音节与翘舌音
      'zhi': '知', 'chi': '吃', 'shi': '诗', 'ri': '日',
      'zh': '知', 'ch': '吃', 'sh': '诗',
      'zi': '资', 'ci': '疵', 'si': '思',
      'yi': '衣', 'wu': '乌', 'yu': '迂',
      'yue': '月', 'yuan': '元', 'yin': '音', 'yun': '云', 'ying': '鹰',
      'ju': '居', 'qu': '区', 'xu': '须',
      // 带调特殊韵母及复合音
      'ěr': '耳', 'èr': '二',
      'ā': '啊', 'á': '啊', 'ǎ': '啊', 'à': '啊',
      'ō': '喔', 'ó': '喔', 'ǒ': '喔', 'ò': '喔',
      'ē': '鹅', 'é': '鹅', 'ě': '鹅', 'è': '鹅',
      'ī': '衣', 'í': '衣', 'ǐ': '衣', 'ì': '衣',
      'ū': '乌', 'ú': '乌', 'ǔ': '乌', 'ù': '乌',
      'ǖ': '迂', 'ǘ': '迂', 'ǚ': '迂', 'ǜ': '迂',
      'g-u-ā': '哥、乌、啊', 'g-u-a': '哥、乌、啊',
      // 23个声母呼读音汉字
      'b': '玻', 'p': '坡', 'm': '摸', 'f': '佛',
      'd': '得', 't': '特', 'n': '讷', 'l': '勒',
      'g': '哥', 'k': '科', 'h': '喝',
      'j': '基', 'q': '七', 'x': '西',
      'r': '日', 'z': '资', 'c': '疵', 's': '思',
      'y': '衣', 'w': '乌',
      // 6个单韵母
      'a': '啊', 'o': '喔', 'e': '鹅', 'i': '衣', 'u': '乌', 'ü': '迂',
      // 儿歌及标题辅助汉字
      '9字': '九字', '2字': '二字', '8字': '八字'
    };

    // 13课标准教学课文标题规范发音映射
    this.lessonTitlesSpokenMap = {
      1: '第一课：啊、喔、鹅',
      2: '第二课：衣、乌、迂、衣、乌',
      3: '第三课：玻、坡、摸、佛',
      4: '第四课：得、特、讷、勒',
      5: '第五课：哥、科、喝',
      6: '第六课：基、七、西',
      7: '第七课：资、疵、思',
      8: '第八课：知、吃、诗、日',
      9: '第九课：哀、欸、威',
      10: '第十课：熬、欧、优',
      11: '第十一课：耶、约、耳',
      12: '第十二课：安、恩、因、温、晕',
      13: '第十三课：昂、亨、英、轰'
    };

    // 真人母带精确音频波形起止点与有效发音时长数据库（毫秒级对齐，消除首尾静音延迟）
    this.audioCues = {"a1.mp3":[0.163,0.81],"ai1.mp3":[0.109,0.955],"an1.mp3":[0.062,0.889],"an4.mp3":[0.087,0.926],"ang1.mp3":[0.067,1.07],"ang2.mp3":[0.003,0.846],"ao1.mp3":[0.109,0.937],"ao3.mp3":[0.172,1.093],"ba1.mp3":[0.122,1.314],"ba2.mp3":[0.009,1.038],"ba3.mp3":[0.549,1.124],"bai2.mp3":[0.466,1.008],"ban4.mp3":[0.678,1.077],"bang4.mp3":[0.484,1.373],"biao1.mp3":[0.269,1.179],"bing3.mp3":[0.496,1.289],"bing4.mp3":[0.397,0.948],"bo1.mp3":[0.198,0.953],"bu4.mp3":[0.457,1.215],"cha2.mp3":[0.009,0.742],"chao2.mp3":[0.408,0.986],"chen2.mp3":[0.282,0.785],"chi1.mp3":[0.21,0.861],"chi2.mp3":[0.287,0.939],"chi3.mp3":[0.31,1.109],"chi4.mp3":[0.132,0.769],"chu1.mp3":[0.33,0.868],"chu4.mp3":[0.417,0.839],"chui1.mp3":[0.412,0.747],"ci1.mp3":[0.079,0.716],"cong2.mp3":[0.111,0.834],"da4.mp3":[0.362,0.692],"dao1.mp3":[0.685,0.877],"dao4.mp3":[0.567,0.99],"de2.mp3":[0.671,0.834],"deng1.mp3":[0.343,0.859],"di2.mp3":[0.645,1.019],"di4.mp3":[0.677,0.918],"dian3.mp3":[0.679,1.216],"diao4.mp3":[0.414,1.134],"dong4.mp3":[0.716,0.929],"du2.mp3":[0.444,1.006],"dui4.mp3":[0.625,0.896],"duo1.mp3":[0.368,0.935],"e1.mp3":[0.133,0.822],"e2.mp3":[0.009,0.595],"en1.mp3":[0.065,1.03],"eng1.mp3":[0.063,1.127],"er2.mp3":[0.009,0.66],"er3.mp3":[0.07,0.977],"er4.mp3":[0.238,0.749],"fei1.mp3":[0.55,1.34],"fo2.mp3":[0.559,0.908],"ge1.mp3":[0.26,0.869],"ge4.mp3":[0.219,0.915],"gen1.mp3":[0.188,0.857],"gua1.mp3":[0.371,0.793],"guai3.mp3":[0.318,0.98],"gun4.mp3":[0.362,1.023],"guo3.mp3":[0.387,1.016],"hai3.mp3":[0.177,1.073],"he1.mp3":[0.234,1.277],"he2.mp3":[0.077,0.838],"hong2.mp3":[0.054,0.755],"hou4.mp3":[0.203,0.819],"huo2.mp3":[0.137,0.789],"ji1.mp3":[0.163,0.697],"ji4.mp3":[0.207,0.684],"jia1.mp3":[0.105,0.826],"jian4.mp3":[0.267,0.649],"jiao4.mp3":[0.25,0.724],"jin1.mp3":[0.614,0.865],"jin3.mp3":[0.258,1.006],"jiu3.mp3":[0.188,1.01],"kan4.mp3":[0.279,0.774],"ke1.mp3":[0.152,0.71],"ke4.mp3":[0.199,0.977],"lai2.mp3":[0.324,0.979],"lao2.mp3":[0.295,0.92],"le4.mp3":[0.316,0.987],"li3.mp3":[0.253,1.008],"li4.mp3":[0.336,0.968],"liang3.mp3":[0.172,1.193],"lin2.mp3":[0.151,0.838],"ling2.mp3":[0.213,0.935],"liu4.mp3":[0.334,0.853],"lun2.mp3":[0.19,0.905],"luo2.mp3":[0.176,0.92],"mao2.mp3":[0.392,0.955],"mao4.mp3":[0.415,1.029],"men2.mp3":[0.333,0.983],"mian2.mp3":[0.533,1.076],"mo1.mp3":[0.177,1.126],"mu3.mp3":[0.265,1.248],"nao4.mp3":[0.495,1.034],"ne4.mp3":[0.419,0.868],"nuan3.mp3":[0.268,1.168],"o1.mp3":[0.179,0.747],"ou1.mp3":[0.522,0.849],"peng2.mp3":[0.455,1.084],"pian4.mp3":[0.739,1.108],"piao1.mp3":[0.339,1.216],"ping2.mp3":[0.103,0.923],"po1.mp3":[0.424,1.114],"qi1.mp3":[0.354,0.832],"qi2.mp3":[0.319,0.825],"qi3.mp3":[0.242,1.135],"qian2.mp3":[0.246,0.861],"qiang1.mp3":[0.132,0.872],"qie1.mp3":[0.176,0.846],"qing1.mp3":[0.207,1.343],"qu4.mp3":[0.395,0.609],"quan1.mp3":[0.223,0.821],"re4.mp3":[0.412,0.581],"ri4.mp3":[0.279,0.557],"san1.mp3":[0.066,0.984],"san3.mp3":[0.138,1.134],"shan1.mp3":[0.346,0.833],"shang4.mp3":[0.5,0.83],"she2.mp3":[0.155,0.847],"shen1.mp3":[0.351,0.758],"sheng1.mp3":[0.273,0.859],"shi1.mp3":[0.009,0.792],"shi2.mp3":[0.179,0.806],"shi4.mp3":[0.234,0.996],"shou3.mp3":[0.413,1.089],"shu1.mp3":[0.118,0.812],"shu4.mp3":[0.478,0.728],"shui3.mp3":[0.408,1.224],"si1.mp3":[0.009,0.8],"si4.mp3":[0.052,0.7],"tang2.mp3":[0.3,0.961],"te4.mp3":[0.343,1.015],"ti3.mp3":[0.322,1.228],"tian1.mp3":[0.127,1.015],"ting3.mp3":[0.107,0.961],"tou2.mp3":[0.412,0.965],"tu1.mp3":[0.276,1.008],"tuo1.mp3":[0.225,1.115],"wan1.mp3":[0.079,0.886],"wei1.mp3":[0.009,0.984],"wei2.mp3":[0.629,1.381],"wen1.mp3":[0.074,1.082],"weng1.mp3":[0.235,1.111],"wu1.mp3":[0.009,0.99],"wu3.mp3":[0.22,1.322],"xi1.mp3":[0.022,0.845],"xia4.mp3":[0.319,0.844],"xiang2.mp3":[0.25,0.823],"xiang4.mp3":[0.443,0.81],"xiao3.mp3":[0.379,1.145],"xing2.mp3":[0.343,0.77],"xiong2.mp3":[0.417,0.785],"ya2.mp3":[0.009,0.908],"yang2.mp3":[0.262,1.267],"yao4.mp3":[0.009,1.17],"ye1.mp3":[0.076,0.973],"ye4.mp3":[0.098,1.17],"yi1.mp3":[0.082,0.899],"yi2.mp3":[0.009,0.739],"yi3.mp3":[0.132,1.093],"yi4.mp3":[0.156,2.083],"yin1.mp3":[0.009,1.146],"ying1.mp3":[0.075,1.196],"yong4.mp3":[0.363,1.27],"you1.mp3":[0.074,1.154],"you2.mp3":[0.009,1.202],"you3.mp3":[0.081,1.347],"you4.mp3":[0.061,1.183],"yu1.mp3":[0.427,1.118],"yu2.mp3":[0.576,1.164],"yuan2.mp3":[0.56,1.012],"yue4.mp3":[0.639,1.094],"yun1.mp3":[0.075,1.36],"yun2.mp3":[0.151,1.115],"yun4.mp3":[0.311,1.224],"zai4.mp3":[0.105,1.098],"zhan3.mp3":[0.275,1.179],"zhang1.mp3":[0.157,0.831],"zheng3.mp3":[0.336,0.967],"zhi1.mp3":[0.121,0.892],"zhong1.mp3":[0.232,0.959],"zi1.mp3":[0.08,0.731],"zi3.mp3":[0.274,1.01],"zi4.mp3":[0.325,0.695],"zou3.mp3":[0.051,1.124],"zui3.mp3":[0.155,0.951],"zuo3.mp3":[0.146,1.083],"zuo4.mp3":[0.085,0.668],"ei1.m4a":[0.0,0.72],"bo0.mp3":[0.198,0.953]};

    // 13课标题 100% 统编人教版真人母带 MP3 播放序列（彻底消除机械 TTS 与字母误读，快速明晰连播）
    this.lessonTitleSequences = {
      1: ['di4.mp3', 'yi1.mp3', 'ke4.mp3', 90, 'a1.mp3', 50, 'o1.mp3', 50, 'e1.mp3'],
      2: ['di4.mp3', 'er4.mp3', 'ke4.mp3', 90, 'yi1.mp3', 50, 'wu1.mp3', 50, 'yu1.mp3', 50, 'yi1.mp3', 50, 'wu1.mp3'],
      3: ['di4.mp3', 'san1.mp3', 'ke4.mp3', 90, 'bo1.mp3', 50, 'po1.mp3', 50, 'mo1.mp3', 50, 'fo2.mp3'],
      4: ['di4.mp3', 'si4.mp3', 'ke4.mp3', 90, 'de2.mp3', 50, 'te4.mp3', 50, 'ne4.mp3', 50, 'le4.mp3'],
      5: ['di4.mp3', 'wu3.mp3', 'ke4.mp3', 90, 'ge1.mp3', 50, 'ke1.mp3', 50, 'he1.mp3'],
      6: ['di4.mp3', 'liu4.mp3', 'ke4.mp3', 90, 'ji1.mp3', 50, 'qi1.mp3', 50, 'xi1.mp3'],
      7: ['di4.mp3', 'qi1.mp3', 'ke4.mp3', 90, 'zi1.mp3', 50, 'ci1.mp3', 50, 'si1.mp3'],
      8: ['di4.mp3', 'ba1.mp3', 'ke4.mp3', 90, 'zhi1.mp3', 50, 'chi1.mp3', 50, 'shi1.mp3', 50, 'ri4.mp3'],
      9: ['di4.mp3', 'jiu3.mp3', 'ke4.mp3', 90, 'ai1.mp3', 50, 'ei1.m4a', 50, 'wei1.mp3'],
      10: ['di4.mp3', 'shi2.mp3', 'ke4.mp3', 90, 'ao1.mp3', 50, 'ou1.mp3', 50, 'you1.mp3'],
      11: ['di4.mp3', 'shi2.mp3', 'yi1.mp3', 'ke4.mp3', 90, 'ye1.mp3', 50, 'yue4.mp3', 50, 'er2.mp3'],
      12: ['di4.mp3', 'shi2.mp3', 'er4.mp3', 'ke4.mp3', 90, 'an1.mp3', 50, 'en1.mp3', 50, 'yin1.mp3', 50, 'wen1.mp3', 50, 'yun1.mp3'],
      13: ['di4.mp3', 'shi2.mp3', 'san1.mp3', 'ke4.mp3', 90, 'ang1.mp3', 50, 'eng1.mp3', 50, 'ying1.mp3', 50, 'weng1.mp3']
    };

    // 13课认读儿歌 100% 纯真人母带生动连播序列（字正腔圆，欢快节奏，加速畅快朗读）
    this.lessonRhymesSequences = {
      1: [
        'zhang1.mp3', 'da4.mp3', 'zui3.mp3', 'ba1.mp3', 16, 'a1.mp3', 45, 'a1.mp3', 45, 'a1.mp3', 140,
        'yuan2.mp3', 'yuan2.mp3', 'zui3.mp3', 'ba1.mp3', 16, 'o1.mp3', 45, 'o1.mp3', 45, 'o1.mp3', 140,
        'qing1.mp3', 'qing1.mp3', 'chi2.mp3', 'tang2.mp3', 'bai2.mp3', 'e2.mp3', 'jiao4.mp3', 16, 'e1.mp3', 45, 'e1.mp3', 45, 'e1.mp3'
      ],
      2: [
        'ya2.mp3', 'chi3.mp3', 'dui4.mp3', 'qi2.mp3', 16, 'yi1.mp3', 45, 'yi1.mp3', 45, 'yi1.mp3', 140,
        'zui3.mp3', 'ba1.mp3', 'tu1.mp3', 'chu1.mp3', 16, 'wu1.mp3', 45, 'wu1.mp3', 45, 'wu1.mp3', 140,
        'chui1.mp3', 'qi3.mp3', 'di2.mp3', 'zi3.mp3', 16, 'yu1.mp3', 45, 'yu1.mp3', 45, 'yu1.mp3', 140,
        'da4.mp3', 'yi1.mp3', 'da4.mp3', 'wu1.mp3', 'lai2.mp3', 'ba3.mp3', 'men2.mp3', 140,
        'yi1.mp3', 'wu1.mp3', 'yu1.mp3', 'zheng3.mp3', 'ti3.mp3', 'du2.mp3'
      ],
      3: [
        'you4.mp3', 'xia4.mp3', 'ban4.mp3', 'yuan2.mp3', 16, 'bo1.mp3', 45, 'bo1.mp3', 45, 'bo1.mp3', 140,
        'you4.mp3', 'shang4.mp3', 'ban4.mp3', 'yuan2.mp3', 16, 'po1.mp3', 45, 'po1.mp3', 45, 'po1.mp3', 140,
        'liang3.mp3', 'ge4.mp3', 'men2.mp3', 'dong4.mp3', 16, 'mo1.mp3', 45, 'mo1.mp3', 45, 'mo1.mp3', 140,
        'yi4.mp3', 'gen1.mp3', 'guai3.mp3', 'gun4.mp3', 16, 'fo2.mp3', 45, 'fo2.mp3', 45, 'fo2.mp3'
      ],
      4: [
        'zuo3.mp3', 'xia4.mp3', 'ban4.mp3', 'yuan2.mp3', 16, 'de2.mp3', 45, 'de2.mp3', 45, 'de2.mp3', 140,
        'san3.mp3', 'bing3.mp3', 'chao2.mp3', 'xia4.mp3', 16, 'te4.mp3', 45, 'te4.mp3', 45, 'te4.mp3', 140,
        'yi2.mp3', 'ge4.mp3', 'men2.mp3', 'dong4.mp3', 16, 'ne4.mp3', 45, 'ne4.mp3', 45, 'ne4.mp3', 140,
        'yi4.mp3', 'gen1.mp3', 'xiao3.mp3', 'bang4.mp3', 16, 'le4.mp3', 45, 'le4.mp3', 45, 'le4.mp3'
      ],
      5: [
        'jiu3.mp3', 'zi4.mp3', 'jia1.mp3', 'wan1.mp3', 16, 'ge1.mp3', 45, 'ge1.mp3', 45, 'ge1.mp3', 140,
        'yi4.mp3', 'ting3.mp3', 'ji1.mp3', 'qiang1.mp3', 16, 'ke1.mp3', 45, 'ke1.mp3', 45, 'ke1.mp3', 140,
        'yi4.mp3', 'ba3.mp3', 'yi3.mp3', 'zi3.mp3', 16, 'he1.mp3', 45, 'he1.mp3', 45, 'he1.mp3'
      ],
      6: [
        'mu3.mp3', 'ji1.mp3', 'mu3.mp3', 'ji1.mp3', 16, 'ji1.mp3', 45, 'ji1.mp3', 45, 'ji1.mp3', 140,
        'zuo3.mp3', 'shang4.mp3', 'ban4.mp3', 'yuan2.mp3', 16, 'qi1.mp3', 45, 'qi1.mp3', 45, 'qi1.mp3', 140,
        'dao1.mp3', 'qie1.mp3', 'xi1.mp3', 'gua1.mp3', 16, 'xi1.mp3', 45, 'xi1.mp3', 45, 'xi1.mp3', 140,
        'xiao3.mp3', 'yu1.mp3', 'jian4.mp3', 'dao4.mp3', 'ji1.mp3', 'qi1.mp3', 'xi1.mp3', 140,
        'tuo1.mp3', 'mao4.mp3', 'xing2.mp3', 'li3.mp3', 'qu4.mp3', 'liang3.mp3', 'dian3.mp3'
      ],
      7: [
        'xiang4.mp3', 'ge4.mp3', 'er4.mp3', 'zi4.mp3', 16, 'zi1.mp3', 45, 'zi1.mp3', 45, 'zi1.mp3', 140,
        'ban4.mp3', 'ge4.mp3', 'yuan2.mp3', 'quan1.mp3', 16, 'ci1.mp3', 45, 'ci1.mp3', 45, 'ci1.mp3', 140,
        'ban4.mp3', 'ge4.mp3', 'ba1.mp3', 'zi4.mp3', 16, 'si1.mp3', 45, 'si1.mp3', 45, 'si1.mp3', 140,
        'zi1.mp3', 'ci1.mp3', 'si1.mp3', 'zheng3.mp3', 'ti3.mp3', 'du2.mp3', 140,
        'ping2.mp3', 'she2.mp3', 'sheng1.mp3', 'yin1.mp3', 'yao4.mp3', 'ji4.mp3', 'lao2.mp3'
      ],
      8: [
        'zhi1.mp3', 'mao2.mp3', 'yi1.mp3', 16, 'zhi1.mp3', 45, 'zhi1.mp3', 45, 'zhi1.mp3', 140,
        'chi1.mp3', 'ping2.mp3', 'guo3.mp3', 16, 'chi1.mp3', 45, 'chi1.mp3', 45, 'chi1.mp3', 140,
        'xiao3.mp3', 'shi1.mp3', 'zi3.mp3', 16, 'shi1.mp3', 45, 'shi1.mp3', 45, 'shi1.mp3', 140,
        'yi4.mp3', 'lun2.mp3', 'hong2.mp3', 'ri4.mp3', 16, 'ri4.mp3', 45, 'ri4.mp3', 45, 'ri4.mp3'
      ],
      9: [
        'jin3.mp3', 'ai1.mp3', 'zai4.mp3', 'yi4.mp3', 'qi3.mp3', 16, 'ai1.mp3', 45, 'ai1.mp3', 45, 'ai1.mp3', 140,
        'yong4.mp3', 'li4.mp3', 'ba2.mp3', 'luo2.mp3', 'bo0.mp3', 16, 'ei1.m4a', 45, 'ei1.m4a', 45, 'ei1.m4a', 140,
        'wei2.mp3', 'shang4.mp3', 'hong2.mp3', 'wei2.mp3', 'jin1.mp3', 16, 'wei1.mp3', 45, 'wei1.mp3', 45, 'wei1.mp3'
      ],
      10: [
        'mian2.mp3', 'ao3.mp3', 'nuan3.mp3', 'huo2.mp3', 16, 'ao1.mp3', 45, 'ao1.mp3', 45, 'ao1.mp3', 140,
        'hai3.mp3', 'ou1.mp3', 'fei1.mp3', 'xiang2.mp3', 16, 'ou1.mp3', 45, 'ou1.mp3', 45, 'ou1.mp3', 140,
        'xiao3.mp3', 'yu2.mp3', 'you2.mp3', 'shui3.mp3', 16, 'you1.mp3', 45, 'you1.mp3', 45, 'you1.mp3', 140,
        'yi1.mp3', 'he2.mp3', 'wu1.mp3', 'bing4.mp3', 'zai4.mp3', 'hou4.mp3', 140,
        'biao1.mp3', 'diao4.mp3', 'biao1.mp3', 'zai4.mp3', 'wu1.mp3', 'shang4.mp3', 'tou2.mp3'
      ],
      11: [
        'yi2.mp3', 'pian4.mp3', 'shu4.mp3', 'ye4.mp3', 16, 'ye1.mp3', 45, 'ye1.mp3', 45, 'ye1.mp3', 140,
        'yue4.mp3', 'ya2.mp3', 'wan1.mp3', 'wan1.mp3', 16, 'yue4.mp3', 45, 'yue4.mp3', 45, 'yue4.mp3', 140,
        'xiao3.mp3', 'xiao3.mp3', 'er3.mp3', 'duo1.mp3', 16, 'er2.mp3', 45, 'er2.mp3', 45, 'er2.mp3', 140,
        'er2.mp3', 'shi4.mp3', 'te4.mp3', 'shu1.mp3', 'xiao3.mp3', 'yun4.mp3', 'mu3.mp3', 140,
        'cong2.mp3', 'bu4.mp3', 'he2.mp3', 'sheng1.mp3', 'mu3.mp3', 'zuo4.mp3', 'peng2.mp3', 'you3.mp3'
      ],
      12: [
        'tian1.mp3', 'an1.mp3', 'men2.mp3', 'qian2.mp3', 16, 'an1.mp3', 45, 'an1.mp3', 45, 'an1.mp3', 140,
        'an4.mp3', 'xia4.mp3', 'men2.mp3', 'ling2.mp3', 16, 'en1.mp3', 45, 'en1.mp3', 45, 'en1.mp3', 140,
        'shu4.mp3', 'lin2.mp3', 'shen1.mp3', 'chu4.mp3', 16, 'yin1.mp3', 45, 'yin1.mp3', 45, 'yin1.mp3', 140,
        'wen1.mp3', 'shui3.mp3', 're4.mp3', 'cha2.mp3', 16, 'wen1.mp3', 45, 'wen1.mp3', 45, 'wen1.mp3', 140,
        'bai2.mp3', 'yun2.mp3', 'piao1.mp3', 'piao1.mp3', 16, 'yun1.mp3', 45, 'yun1.mp3', 45, 'yun1.mp3'
      ],
      13: [
        'shan1.mp3', 'yang2.mp3', 'ang2.mp3', 'shou3.mp3', 16, 'ang1.mp3', 45, 'ang1.mp3', 45, 'ang1.mp3', 140,
        'qing1.mp3', 'chen2.mp3', 'kan4.mp3', 'deng1.mp3', 16, 'eng1.mp3', 45, 'eng1.mp3', 45, 'eng1.mp3', 140,
        'xiong2.mp3', 'ying1.mp3', 'zhan3.mp3', 'chi4.mp3', 16, 'ying1.mp3', 45, 'ying1.mp3', 45, 'ying1.mp3', 140,
        'nao4.mp3', 'zhong1.mp3', 'zou3.mp3', 'dong4.mp3', 16, 'weng1.mp3', 45, 'weng1.mp3', 45, 'weng1.mp3'
      ]
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
      // 规范化：j, q, x 与 ü 相拼在音频库中统一为 ju, qu, xu (小ü脱帽)
      if (['j', 'q', 'x'].some(init => base.startsWith(init))) {
        base = base.replace(/ü/g, 'u');
      }
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

    if (filename === 'ei1.mp3') {
      filename = 'ei1.m4a';
    }
    const realPath = 'audio/' + filename;

    let audio = this.audioCache.get(filename);
    if (!audio) {
      audio = new Audio(realPath);
      this.audioCache.set(filename, audio);
    }

    const cue = this.audioCues ? this.audioCues[filename] : null;
    try {
      audio.currentTime = cue ? cue[0] : 0;
    } catch (e) {}

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

    // 2. 检查形如 "【天】" 或 "【b】" 结构 (提取核心音播放纯正真人母带)
    const bracketMatch = clean.match(/【(.*?)】/);
    if (bracketMatch && bracketMatch[1]) {
      const innerAudio = this.pinyinToAudioFile(bracketMatch[1].trim());
      if (innerAudio) {
        this.playAudioFile(innerAudio, onEnded);
        return;
      }
    }

    // 3. 检查形如 "天，蓝天" 的复合字词结构 (纯净播放真人母带，绝不追加机械TTS尾巴)
    if (clean.includes('，') && clean.length <= 15) {
      const parts = clean.split('，');
      const firstPart = parts[0].trim();
      const firstAudio = this.pinyinToAudioFile(firstPart);
      if (firstAudio) {
        this.playAudioFile(firstAudio, onEnded);
        return;
      }
    }

    // 4. 系统兜底朗读
    this.speakTTS(clean, onEnded, rate);
  }

  /**
   * 纯文本系统朗读（已配置好温暖自然小学教师音色）
   */
  speakTTS(text, onEnded = null, rate = null) {
    let clean = (text || '').trim();
    if (!clean) {
      if (onEnded) setTimeout(onEnded, 10);
      return;
    }

    // 智能防呆：如果文本包含英文字母/拼音，自动转为地道中文呼读音，杜绝英文机械发音
    if (/[a-zA-ZüÜ]/.test(clean)) {
      clean = this.convertPinyinForRhyme(clean);
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
   * 将儿歌口诀或标题中的拼音字母精准替换为标准中文呼读音汉字
   * @param {string} text - 原始儿歌口诀文本
   * @returns {string} - 转换后的纯中文发音文本
   */
  convertPinyinForRhyme(text) {
    if (!text) return '';
    if (!this._rhymeRegex && this.rhymePhoneticMap) {
      const keys = Object.keys(this.rhymePhoneticMap).sort((a, b) => b.length - a.length);
      const pattern = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      this._rhymeRegex = new RegExp(pattern, 'g');
    }
    if (!this._rhymeRegex) return text;
    return text.replace(this._rhymeRegex, (match) => {
      return this.rhymePhoneticMap[match] || match;
    });
  }

  /**
   * 获取课文标题的标准规范普通话朗读文本
   * @param {object|number|string} lesson - 课文对象、ID或标题文本
   * @returns {string}
   */
  getLessonTitleSpokenText(lesson) {
    if (!lesson) return '';
    if (typeof lesson === 'number' && this.lessonTitlesSpokenMap[lesson]) {
      return this.lessonTitlesSpokenMap[lesson];
    }
    if (typeof lesson === 'object') {
      if (lesson.id && this.lessonTitlesSpokenMap[lesson.id]) {
        return this.lessonTitlesSpokenMap[lesson.id];
      }
      if (lesson.title) {
        return this.convertTitleStringToSpoken(lesson.title);
      }
    }
    return this.convertTitleStringToSpoken(String(lesson));
  }

  /**
   * 将非标准课文标题转换为规范朗读文本
   */
  convertTitleStringToSpoken(titleStr) {
    const numMap = {
      '1': '一', '2': '二', '3': '三', '4': '四', '5': '五',
      '6': '六', '7': '七', '8': '八', '9': '九', '10': '十',
      '11': '十一', '12': '十二', '13': '十三'
    };
    let spoken = (titleStr || '').replace(/第\s*(\d+)\s*课\s*/, (m, n) => `第${numMap[n] || n}课：`);
    return this.convertPinyinForRhyme(spoken);
  }

  /**
   * 多段高保真母带级联连播引擎 (消除机械TTS，以标准人声与欢快节奏无缝播放)
   * 支持指定各单字音频文件、音节有效时长裁剪与段落间延时停顿
   * @param {Array} items - 音频文件名列表或延时毫秒数值，如 ['di4.mp3', 'yi1.mp3', 'ke4.mp3', 180, 'a1.mp3']
   * @param {function} onEnded - 连播结束回调
   * @param {object} options - { playbackRate: 1.06, gapMs: 30 }
   */
  playAudioSequence(items, onEnded = null, options = {}) {
    this.stopAllAudio();
    if (!items || items.length === 0) {
      if (onEnded) setTimeout(onEnded, 10);
      return;
    }

    const rate = options.playbackRate || 1.06;
    const baseGap = options.gapMs !== undefined ? options.gapMs : 30;
    let idx = 0;

    const playNext = () => {
      if (idx >= items.length) {
        if (onEnded) onEnded();
        return;
      }

      const item = items[idx++];

      // 1. 如果是延时数值（毫秒），如段落呼吸停顿 320ms
      if (typeof item === 'number') {
        const timer = setTimeout(playNext, item);
        this.ladderTimers.push(timer);
        return;
      }

      // 2. 如果是延时对象 { pause: 200 }
      if (typeof item === 'object' && item && item.pause) {
        const timer = setTimeout(playNext, item.pause);
        this.ladderTimers.push(timer);
        return;
      }

      // 3. 正常音频文件名
      let filename = String(item).trim();
      if (!filename) {
        playNext();
        return;
      }

      if (filename === 'ei1.mp3') {
        filename = 'ei1.m4a';
      }

      const cue = this.audioCues ? this.audioCues[filename] : null;
      const startOffset = cue ? cue[0] : 0;
      const activeDur = cue ? cue[1] : 0.85;

      const path = 'audio/' + filename;
      let audio = this.audioCache.get(filename);
      if (!audio) {
        audio = new Audio(path);
        this.audioCache.set(filename, audio);
      }

      this.currentPlayingAudio = audio;
      audio.volume = this.isBoosted ? 1.0 : 0.95;
      audio.playbackRate = rate;

      try {
        audio.currentTime = startOffset;
      } catch (e) {}

      let timer = null;
      let advanced = false;
      const advance = () => {
        if (advanced) return;
        advanced = true;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        playNext();
      };

      // 结合波形有效发音时长与语速，提前调度下一个音，消除长达 1~2 秒的尾部静音，实现自然流畅说唱
      const durationMs = Math.round((activeDur / rate) * 1000) + baseGap;
      timer = setTimeout(advance, durationMs);
      this.ladderTimers.push(timer);

      audio.onended = () => {
        advance();
      };

      const p = audio.play();
      if (p !== undefined) {
        p.catch(err => {
          console.warn('Audio sequence step failed:', filename, err);
          advance();
        });
      }
    };

    playNext();
  }

  /**
   * 朗读课文标题
   * 100% 优先采用真人教学母带录音连播（第X课 + 拼音标准呼读音），彻底解决机械音与字母误读
   * @param {object|number|string} lesson
   * @param {function} onEnded
   */
  speakLessonTitle(lesson, onEnded = null) {
    let lessonId = null;
    if (typeof lesson === 'number') {
      lessonId = lesson;
    } else if (lesson && lesson.id) {
      lessonId = lesson.id;
    } else if (typeof lesson === 'string') {
      const m = lesson.match(/第\s*(\d+)\s*课/);
      if (m) lessonId = parseInt(m[1], 10);
    }

    if (lessonId && this.lessonTitleSequences && this.lessonTitleSequences[lessonId]) {
      this.playAudioSequence(this.lessonTitleSequences[lessonId], onEnded, {
        playbackRate: 1.18,
        gapMs: 15
      });
      return;
    }

    // 兜底降级处理
    const spoken = this.getLessonTitleSpokenText(lesson);
    if (!spoken) {
      if (onEnded) setTimeout(onEnded, 10);
      return;
    }
    this.speakTTS(spoken, onEnded, 1.15);
  }

  /**
   * 朗读记忆口诀与儿歌
   * 100% 优先采用真人教学母带录音连播，字正腔圆，自然清晰，语速活泼欢快，彻底消除机械TTS
   * @param {object|string} lessonOrText - 课时对象、儿歌文本或课时ID
   * @param {function} onEnded
   */
  speakRhyme(lessonOrText, onEnded = null) {
    let lessonId = null;
    if (typeof lessonOrText === 'number') {
      lessonId = lessonOrText;
    } else if (lessonOrText && lessonOrText.id) {
      lessonId = lessonOrText.id;
    } else if (typeof lessonOrText === 'string') {
      // 通过特色首句智能匹配课时
      const text = lessonOrText.trim();
      const matchMap = {
        '张大嘴巴': 1, '牙齿对齐': 2, '右下半圆': 3, '左下半圆': 4,
        '9字加弯': 5, '母鸡母鸡': 6, '像个2字': 7, '织毛衣': 8,
        '紧挨在一起': 9, '棉袄暖和': 10, '一片树叶': 11, '天安门前': 12, '山羊昂首': 13
      };
      for (const [key, id] of Object.entries(matchMap)) {
        if (text.includes(key)) {
          lessonId = id;
          break;
        }
      }
    }

    if (lessonId && this.lessonRhymesSequences && this.lessonRhymesSequences[lessonId]) {
      // 语速 1.25，间隔 10ms：充分满足儿歌口诀欢快、敏捷、富有说唱律动的高速朗读需求
      this.playAudioSequence(this.lessonRhymesSequences[lessonId], onEnded, {
        playbackRate: 1.25,
        gapMs: 10
      });
      return;
    }

    // 兜底降级处理
    const rhymeText = typeof lessonOrText === 'string' ? lessonOrText : (lessonOrText && lessonOrText.rhyme ? lessonOrText.rhyme : '');
    if (!rhymeText) {
      if (onEnded) setTimeout(onEnded, 10);
      return;
    }
    const spoken = this.convertPinyinForRhyme(rhymeText);
    this.speakTTS(spoken, onEnded, 1.22);
  }

  /**
   * 朗读“老师辅导小妙招”
   * 特点：准确转换中文与拼音呼读音，消除英文机械音，语速适度加快（1.15）生动明快
   * @param {object|string} lessonOrText - 课时对象或辅导文字
   * @param {function} onEnded
   */
  speakTeacherGuide(lessonOrText, onEnded = null) {
    let rawText = '';
    if (typeof lessonOrText === 'string') {
      rawText = lessonOrText;
    } else if (lessonOrText && lessonOrText.guideText) {
      rawText = lessonOrText.guideText;
    }
    if (!rawText) {
      if (onEnded) setTimeout(onEnded, 10);
      return;
    }

    // 清理特殊符号与复合拼写
    let cleaned = rawText.replace(/★/g, '');
    cleaned = cleaned.replace(/g-u-ā/g, '哥、乌、啊');
    cleaned = cleaned.replace(/g-u-a/g, '哥、乌、啊');
    cleaned = cleaned.replace(/\bju\b/g, '居');
    cleaned = cleaned.replace(/\bqu\b/g, '区');
    cleaned = cleaned.replace(/\bxu\b/g, '须');

    const spoken = this.convertPinyinForRhyme(cleaned);
    // 语速 1.15：满足老师生动讲解、明快易懂的需要
    this.speakTTS(spoken, onEnded, 1.15);
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
   * 读汉字（100% 优先真人母带，绝不添加机械合成）
   */
  speakHanzi(char, word = '') {
    const file = this.charAudioMap[char];
    if (file) {
      this.playAudioFile(file);
      return;
    }
    const pyFile = this.pinyinToAudioFile(char);
    if (pyFile) {
      this.playAudioFile(pyFile);
      return;
    }
    this.speakTTS(char);
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

    const { initial, tone, syllable, word, isInvalid, reason } = stepData;
    const initialFile = this.pinyinToAudioFile(initial);
    const toneFile = this.pinyinToAudioFile(tone);
    const syllableFile = isInvalid ? null : this.pinyinToAudioFile(syllable);

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
              if (isInvalid) {
                // 不存在的拼音组合：碰撞不成功，弹回提示并播放音效
                this.playGentleOops();
                if (onStepChange) onStepChange(4, { isInvalid: true, reason });
                const t4 = setTimeout(() => {
                  if (onStepChange) onStepChange(5, 'done');
                }, 2200);
                this.ladderTimers.push(t4);
                return;
              }

              // 第四步：两车相撞·纯正真人母带音节合读！(去除机械TTS朗读与电子重音)
              if (onStepChange) onStepChange(4, { isInvalid: false, syllable, word });

              this.playAudioFile(syllableFile, () => {
                const t4 = setTimeout(() => {
                  if (onStepChange) onStepChange(5, 'done');
                }, 1200);
                this.ladderTimers.push(t4);
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

  playStar() {
    this.playSuccess();
  }

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
