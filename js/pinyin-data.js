/**
 * 统编人教版小学一年级语文上册 汉语拼音完整知识库
 * 包含：教材课时、声母、韵母、整体认读、儿歌口诀、四声、拼读书库、易混对决
 */

const PINYIN_DATA = {
  // 基础音素全集
  initials: [
    { pinyin: 'b', name: '玻', mnemonic: '右下半圆 b b b，收音机 b b b', soundChar: '玻', strokeOrder: '第一笔竖，第二笔右半圆', grid: '占上格和中格', strokes: ['line', 'arc-right'] },
    { pinyin: 'p', name: '坡', mnemonic: '右上半圆 p p p，端水上坡 p p p', soundChar: '坡', strokeOrder: '第一笔竖，第二笔右上半圆', grid: '占中格和下格', strokes: ['line', 'arc-right'] },
    { pinyin: 'm', name: '摸', mnemonic: '两个门洞 m m m，蒙眼摸人 m m m', soundChar: '摸', strokeOrder: '第一笔竖，第二笔左弯竖，第三笔左弯竖', grid: '占中格', strokes: ['line', 'bump', 'bump'] },
    { pinyin: 'f', name: '佛', mnemonic: '一根拐棍 f f f，一尊大佛 f f f', soundChar: '佛', strokeOrder: '第一笔右弯竖，第二笔短横', grid: '占上格和中格', strokes: ['arc-line', 'line-h'] },
    { pinyin: 'd', name: '得', mnemonic: '左下半圆 d d d，马蹄声响 d d d', soundChar: '得', strokeOrder: '第一笔左半圆，第二笔竖', grid: '占上格和中格', strokes: ['arc-left', 'line'] },
    { pinyin: 't', name: '特', mnemonic: '伞柄朝下 t t t，小鱼跳跃 t t t', soundChar: '特', strokeOrder: '第一笔竖右弯，第二笔短横', grid: '占上格和中格', strokes: ['line-hook', 'line-h'] },
    { pinyin: 'n', name: '讷', mnemonic: '一个门洞 n n n，小猪拱地 n n n', soundChar: '讷', strokeOrder: '第一笔竖，第二笔左弯竖', grid: '占中格', strokes: ['line', 'bump'] },
    { pinyin: 'l', name: '勒', mnemonic: '一根小棒 l l l，快乐小鹿 l l l', soundChar: '勒', strokeOrder: '第一笔竖到底', grid: '占上格和中格', strokes: ['line'] },
    { pinyin: 'g', name: '哥', mnemonic: '9字加弯 g g g，一群白鸽 g g g', soundChar: '哥', strokeOrder: '第一笔左半圆，第二笔竖左弯', grid: '占中格和下格', strokes: ['arc-left', 'line-curve'] },
    { pinyin: 'k', name: '科', mnemonic: '一挺机枪 k k k，蝌蚪戏水 k k k', soundChar: '科', strokeOrder: '第一笔竖，第二笔左斜右斜', grid: '占上格和中格', strokes: ['line', 'angle'] },
    { pinyin: 'h', name: '喝', mnemonic: '一把椅子 h h h，口渴喝水 h h h', soundChar: '喝', strokeOrder: '第一笔竖，第二笔左弯竖', grid: '占上格和中格', strokes: ['line', 'bump'] },
    { pinyin: 'j', name: '基', mnemonic: '母鸡母鸡 j j j，竖弯加点 j j j', soundChar: '基', strokeOrder: '第一笔竖左弯，第二笔一点', grid: '占上中下三格', strokes: ['hook-down', 'dot'] },
    { pinyin: 'q', name: '七', mnemonic: '左上半圆 q q q，气球高飞 q q q', soundChar: '七', strokeOrder: '第一笔左半圆，第二笔竖', grid: '占中格和下格', strokes: ['arc-left', 'line'] },
    { pinyin: 'x', name: '西', mnemonic: '一个大叉 x x x，切开西瓜 x x x', soundChar: '西', strokeOrder: '第一笔右斜，第二笔左斜', grid: '占中格', strokes: ['slash-r', 'slash-l'] },
    { pinyin: 'zh', name: '知', mnemonic: '织毛衣 zh zh zh，翘起舌头念织衣', soundChar: '知', strokeOrder: '先写 z，再写 h，靠拢写紧凑', grid: '占上中格', isBlend: true },
    { pinyin: 'ch', name: '吃', mnemonic: '吃苹果 ch ch ch，翘起舌头吃红苹果', soundChar: '吃', strokeOrder: '先写 c，再写 h', grid: '占上中格', isBlend: true },
    { pinyin: 'sh', name: '诗', mnemonic: '小狮子 sh sh sh，翘起舌头读古诗', soundChar: '诗', strokeOrder: '先写 s，再写 h', grid: '占上中格', isBlend: true },
    { pinyin: 'r', name: '日', mnemonic: '一株小苗 r r r，红日东升 r r r', soundChar: '日', strokeOrder: '第一笔竖，第二笔右上弯', grid: '占中格', strokes: ['line', 'curve-r'] },
    { pinyin: 'z', name: '资', mnemonic: '像个2字 z z z，平平舌头 z z z', soundChar: '资', strokeOrder: '一笔横折横写成', grid: '占中格', strokes: ['z-shape'] },
    { pinyin: 'c', name: '疵', mnemonic: '半个圆圈 c c c，刺猬尖刺 c c c', soundChar: '疵', strokeOrder: '一笔左半圆写成', grid: '占中格', strokes: ['arc-left'] },
    { pinyin: 's', name: '思', mnemonic: '半个8字 s s s，蚕儿吐丝 s s s', soundChar: '思', strokeOrder: '一笔写成，左绕右绕', grid: '占中格', strokes: ['s-curve'] },
    { pinyin: 'y', name: '衣', mnemonic: '小树杈 y y y，大树发芽 y y y', soundChar: '衣', strokeOrder: '第一笔右斜短，第二笔左斜长', grid: '占中格和下格', strokes: ['slash-short', 'slash-long'] },
    { pinyin: 'w', name: '乌', mnemonic: '小屋倒影 w w w，金鱼游水 w w w', soundChar: '乌', strokeOrder: '第一笔斜下斜上，第二笔斜下斜上', grid: '占中格', strokes: ['w-shape'] }
  ],

  // 单韵母与复韵母
  finals: [
    // 6个单韵母
    { pinyin: 'a', type: 'single', name: '啊', mnemonic: '张大嘴巴 a a a，圆圆脸蛋梳小辫', tones: ['ā', 'á', 'ǎ', 'à'], toneWords: ['阿姨 ā yí', '白鹅 á', '马ǎ mǎ', '大爸 à'], soundChar: '啊', grid: '占中格' },
    { pinyin: 'o', type: 'single', name: '喔', mnemonic: '圆圆嘴巴 o o o，大公鸡叫 o o o', tones: ['ō', 'ó', 'ǒ', 'ò'], toneWords: ['喔ō 喔叫', '哦ó 是吗', '我wǒ 们', '大雁ò'], soundChar: '喔', grid: '占中格' },
    { pinyin: 'e', type: 'single', name: '鹅', mnemonic: '清清池塘 e e e，白鹅倒影 e e e', tones: ['ē', 'é', 'ě', 'è'], toneWords: ['阿婀 ē', '天鹅 é', '恶ě 心', '肚子饿 è'], soundChar: '鹅', grid: '占中格' },
    { pinyin: 'i', type: 'single', name: '衣', mnemonic: '牙齿对齐 i i i，一件衣服 i i i', tones: ['ī', 'í', 'ǐ', 'ì'], toneWords: ['衣服 yī', '阿姨 yí', '椅子 yǐ', '主意 yì'], soundChar: '衣', grid: '占上中格' },
    { pinyin: 'u', type: 'single', name: '乌', mnemonic: '嘴巴突出 u u u，一只乌鸦 u u u', tones: ['ū', 'ú', 'ǔ', 'ù'], toneWords: ['乌鸦 wū', '无wú 聊', '跳舞 wǔ', '大雾 wù'], soundChar: '乌', grid: '占中格' },
    { pinyin: 'ü', type: 'single', name: '迂', mnemonic: '嘴巴吹笛 ü ü ü，小鱼吐泡 ü ü ü', tones: ['ǖ', 'ǘ', 'ǚ', 'ǜ'], toneWords: ['迂yū 回', '金鱼 yú', '下雨 yǔ', '玉yù 米'], soundChar: '迂', grid: '占上中格' },

    // 8个复韵母 + 1个特殊韵母 er
    { pinyin: 'ai', type: 'compound', name: '哀', mnemonic: '挨在一起 ai ai ai，小鹿挨着小白兔', tones: ['āi', 'ái', 'ǎi', 'ài'], toneWords: ['矮ǎ 小', '热爱 ài', '白bái 兔', '拍pāi 手'], soundChar: '哀', grid: '占中格' },
    { pinyin: 'ei', type: 'compound', name: '欸', mnemonic: '用力砍柴 ei ei ei，拔萝卜呀 ei ei ei', tones: ['ēi', 'éi', 'ěi', 'èi'], toneWords: ['妹妹 mèi', '飞fēi 机', '给gěi 你', '背bèi 包'], soundChar: '欸', grid: '占上中格' },
    { pinyin: 'ui', type: 'compound', name: '威', mnemonic: '围上围巾 ui ui ui，水杯热水 ui ui ui', tones: ['uī', 'uí', 'uǐ', 'uì'], toneWords: ['水shuǐ 果', '退tuì 步', '归guī 来', '会huì 飞'], soundChar: '威', grid: '占中格' },
    { pinyin: 'ao', type: 'compound', name: '熬', mnemonic: '一件棉袄 ao ao ao，小猫叫叫 ao ao ao', tones: ['āo', 'áo', 'ǎo', 'ào'], toneWords: ['棉袄 ǎo', '小xiǎo 鸟', '跑pǎo 步', '大桃 táo'], soundChar: '熬', grid: '占中格' },
    { pinyin: 'ou', type: 'compound', name: '欧', mnemonic: '一只白鸥 ou ou ou，莲藕圆圆 ou ou ou', tones: ['ōu', 'óu', 'ǒu', 'òu'], toneWords: ['海鸥 ōu', '莲藕 ǒu', '小狗 gǒu', '走zǒu 路'], soundChar: '欧', grid: '占中格' },
    { pinyin: 'iu', type: 'compound', name: '优', mnemonic: '小鱼游泳 iu iu iu，游来游去真欢喜', tones: ['iū', 'iú', 'iǔ', 'iù'], toneWords: ['优秀 yōu', '牛niú 奶', '九jiǔ 个', '球qiú 拍'], soundChar: '优', grid: '占上中格' },
    { pinyin: 'ie', type: 'compound', name: '耶', mnemonic: '一片树叶 ie ie ie，椰子甜甜 ie ie ie', tones: ['iē', 'ié', 'iě', 'iè'], toneWords: ['爷爷 yé', '叶yè 子', '铁tiě 路', '写xiě 字'], soundChar: '耶', grid: '占上中格' },
    { pinyin: 'üe', type: 'compound', name: '约', mnemonic: '月儿弯弯 üe üe üe，月亮月儿 üe üe üe', tones: ['üē', 'üé', 'üě', 'üè'], toneWords: ['月yuè 亮', '学xué 校', '雀què 跃', '喜鹊 què'], soundChar: '约', grid: '占上中格' },
    { pinyin: 'er', type: 'special', name: '儿', mnemonic: '一只耳朵 er er er，特殊韵母单独站', tones: ['ēr', 'ér', 'ěr', 'èr'], toneWords: ['儿童 ér', '耳朵 ěr', '一二 èr'], soundChar: '耳', grid: '占中格' },

    // 5个前鼻韵母
    { pinyin: 'an', type: 'nasal-front', name: '安', mnemonic: '天安门前 an an an，安全过马路 an an', tones: ['ān', 'án', 'ǎn', 'àn'], toneWords: ['安全 ān', '天安 ān', '山shān 上', '看kàn 书'], soundChar: '安', grid: '占中格' },
    { pinyin: 'en', type: 'nasal-front', name: '恩', mnemonic: '按下门铃 en en en，感恩有你 en en en', tones: ['ēn', 'én', 'ěn', 'èn'], toneWords: ['感恩 ēn', '奔bēn 跑', '人rén 们', '门mén 口'], soundChar: '恩', grid: '占中格' },
    { pinyin: 'in', type: 'nasal-front', name: '因', mnemonic: '面条细细 in in in，森林绿绿 in in in', tones: ['īn', 'ín', 'ǐn', 'ìn'], toneWords: ['拼pīn 音', '您nín 好', '近jìn 处', '树林 lín'], soundChar: '因', grid: '占上中格' },
    { pinyin: 'un', type: 'nasal-front', name: '温', mnemonic: '温水温茶 un un un，滚铁环呀 un un un', tones: ['ūn', 'ún', 'ǔn', 'ùn'], toneWords: ['春chūn 天', '滚gǔn 动', '白云 yún', '困kùn 倦'], soundChar: '温', grid: '占中格' },
    { pinyin: 'ün', type: 'nasal-front', name: '晕', mnemonic: '天鹅飞舞 ün ün ün，白云飘飘 ün ün ün', tones: ['ǖn', 'ǘn', 'ǚn', 'ǜn'], toneWords: ['晕yūn 车', '军jūn 队', '群qún 众', '手帕 pù'], soundChar: '晕', grid: '占上中格' },

    // 4个后鼻韵母
    { pinyin: 'ang', type: 'nasal-back', name: '昂', mnemonic: '昂首挺胸 ang ang ang，山羊吃草 ang ang', tones: ['āng', 'áng', 'ǎng', 'àng'], toneWords: ['山羊 yáng', '太tài 阳', '房fáng 子', '放fàng 学'], soundChar: '昂', grid: '占中下格' },
    { pinyin: 'eng', type: 'nasal-back', name: '亨', mnemonic: '清晨看灯 eng eng eng，蜜蜂采蜜 eng eng', tones: ['ēng', 'éng', 'ěng', 'èng'], toneWords: ['台灯 dēng', '小风 fēng', '朋péng 友', '更gèng 好'], soundChar: '亨', grid: '占中下格' },
    { pinyin: 'ing', type: 'nasal-back', name: '英', mnemonic: '天上老鹰 ing ing ing，金牌闪闪 ing ing', tones: ['īng', 'íng', 'ǐng', 'ìng'], toneWords: ['老鹰 yīng', '平píng 安', '听tīng 话', '星xīng 星'], soundChar: '英', grid: '占上中下格' },
    { pinyin: 'ong', type: 'nasal-back', name: '轰', mnemonic: '闹钟走动 ong ong ong，红旗飘飘 ong ong', tones: ['ōng', 'óng', 'ǒng', 'òng'], toneWords: ['红hóng 旗', '松sōng 鼠', '共gòng 同', '闹钟 zhōng'], soundChar: '轰', grid: '占中下格' }
  ],

  // 16个整体认读音节
  wholeSyllables: [
    { pinyin: 'zhi', soundChar: '知', mnemonic: '小蜘蛛结网 zhi zhi zhi，整体认读不用拼' },
    { pinyin: 'chi', soundChar: '吃', mnemonic: '大皮尺量长短 chi chi chi，不用拼直接读' },
    { pinyin: 'shi', soundChar: '狮', mnemonic: '小狮子威风 shi shi shi，整体认读真神气' },
    { pinyin: 'ri', soundChar: '日', mnemonic: '一轮红日 ri ri ri，不用拼直接读出' },
    { pinyin: 'zi', soundChar: '字', mnemonic: '小孩子写字 zi zi zi，整体认读直呼音' },
    { pinyin: 'ci', soundChar: '刺', mnemonic: '仙人掌长刺 ci ci ci，整体认读不用拼' },
    { pinyin: 'si', soundChar: '丝', mnemonic: '春蚕吐细丝 si si si，不用拼读直接念' },
    { pinyin: 'yi', soundChar: '衣', mnemonic: '大y带小i yi yi yi，一家团圆不用拼' },
    { pinyin: 'wu', soundChar: '乌', mnemonic: '大w带小u wu wu wu，并肩齐声 wu wu wu' },
    { pinyin: 'yu', soundChar: '迂', mnemonic: '小ü见大y擦眼泪，摘掉墨镜变成 yu' },
    { pinyin: 'ye', soundChar: '椰', mnemonic: '椰子树下真凉快，整体认读 ye ye ye' },
    { pinyin: 'yue', soundChar: '月', mnemonic: '弯弯月亮挂夜空，整体认读 yue yue yue' },
    { pinyin: 'yuan', soundChar: '元', mnemonic: '一元两元人民币，整体认读 yuan yuan yuan' },
    { pinyin: 'yin', soundChar: '音', mnemonic: '优美琴声传出来，整体认读 yin yin yin' },
    { pinyin: 'yun', soundChar: '云', mnemonic: '一朵白云天上飘，整体认读 yun yun yun' },
    { pinyin: 'ying', soundChar: '鹰', mnemonic: '雄鹰展翅飞蓝天，整体认读 ying ying ying' }
  ],

  // 针对“拼读连不起来”专设：两拼音节慢速渐进拼读教学法
  // 步骤：1. 声母轻短 2. 韵母响亮 3. 慢拼逼近 4. 猛一碰读出词语
  blendLadderLessons: [
    {
      initial: 'b',
      final: 'a',
      tone: 'à',
      syllable: 'bà',
      word: '爸爸 bàba',
      soundText: 'b...à...bà 爸爸',
      breakdown: ['b (玻-轻短)', 'à (啊-响亮)', 'b...à (声韵滑动)', 'bà (猛碰合读！)']
    },
    {
      initial: 'm',
      final: 'a',
      tone: 'ā',
      syllable: 'mā',
      word: '妈妈 māma',
      soundText: 'm...ā...mā 妈妈',
      breakdown: ['m (摸-轻短)', 'ā (啊-响亮)', 'm...ā (声韵滑动)', 'mā (猛碰合读！)']
    },
    {
      initial: 'd',
      final: 'a',
      tone: 'ǎ',
      syllable: 'dǎ',
      word: '打靶 dǎ bǎ',
      soundText: 'd...ǎ...dǎ 打靶',
      breakdown: ['d (得-轻短)', 'ǎ (啊-响亮)', 'd...ǎ (声韵滑动)', 'dǎ (猛碰合读！)']
    },
    {
      initial: 't',
      final: 'u',
      tone: 'ǔ',
      syllable: 'tǔ',
      word: '土地 tǔ dì',
      soundText: 't...ǔ...tǔ 土地',
      breakdown: ['t (特-轻短)', 'ǔ (乌-响亮)', 't...ǔ (声韵滑动)', 'tǔ (猛碰合读！)']
    },
    {
      initial: 'p',
      final: 'o',
      tone: 'ō',
      syllable: 'pō',
      word: '山坡 shānpō',
      soundText: 'p...ō...pō 山坡',
      breakdown: ['p (坡-轻短)', 'ō (喔-响亮)', 'p...ō (声韵滑动)', 'pō (猛碰合读！)']
    },
    {
      initial: 'g',
      final: 'e',
      tone: 'ē',
      syllable: 'gē',
      word: '哥哥 gēge',
      soundText: 'g...ē...gē 哥哥',
      breakdown: ['g (哥-轻短)', 'ē (鹅-响亮)', 'g...ē (声韵滑动)', 'gē (猛碰合读！)']
    },
    {
      initial: 'k',
      final: 'e',
      tone: 'ě',
      syllable: 'kě',
      word: '口渴 kǒukě',
      soundText: 'k...ě...kě 口渴',
      breakdown: ['k (科-轻短)', 'ě (鹅-响亮)', 'k...ě (声韵滑动)', 'kě (猛碰合读！)']
    },
    {
      initial: 'h',
      final: 'u',
      tone: 'ā',
      syllable: 'huā',
      isThree: true,
      medium: 'u',
      word: '荷花 héhuā',
      soundText: 'h...u...ā...huā 荷花',
      breakdown: ['h (声轻)', 'u (介快)', 'ā (韵响)', 'huā (三音连读！)']
    },
    {
      initial: 'j',
      final: 'u',
      tone: 'ū',
      syllable: 'jū',
      ruleTip: '小ü见到j q x，脱帽敬个礼！虽然写成u，依然念ü！',
      word: '菊花 júhuā',
      soundText: 'j...ü...jū 菊花',
      breakdown: ['j (基-轻短)', 'ü (小ü脱帽写成u)', 'j...ū (滑动)', 'jū (菊花的居！)']
    }
  ],

  // 易混淆对比库（解决孩子 b/d、p/q、平翘舌混淆问题）
  confusionPairs: [
    {
      pair: ['b', 'd'],
      title: '右下半圆 b 与 左下半圆 d',
      ruleSong: '右下半圆 b b b，收音机朝右；左下半圆 d d d，小马奔跑踏踏踏',
      items: [
        { text: 'b', label: '右下圆 b (播)' },
        { text: 'd', label: '左下圆 d (得)' }
      ]
    },
    {
      pair: ['p', 'q'],
      title: '右上圆 p 与 左上圆 q',
      ruleSong: '右上圆圈 p p p，山坡上滑滑梯；左上圆圈 q q q，七只气球飞满天',
      items: [
        { text: 'p', label: '右上圆 p (坡)' },
        { text: 'q', label: '左上圆 q (七)' }
      ]
    },
    {
      pair: ['f', 't'],
      title: '一根拐棍 f 与 伞柄朝下 t',
      ruleSong: '一根拐棍手扶好 f f f，伞柄朝下挂门边 t t t',
      items: [
        { text: 'f', label: '拐棍朝上 f (佛)' },
        { text: 't', label: '伞柄朝下 t (特)' }
      ]
    },
    {
      pair: ['z', 'zh'],
      title: '平舌音 z 与 翘舌音 zh',
      ruleSong: '舌头放平读 z z z，舌头一翘读 zh zh zh',
      items: [
        { text: 'z', label: '平舌 z (做)' },
        { text: 'zh', label: '翘舌 zh (知)' }
      ]
    },
    {
      pair: ['c', 'ch'],
      title: '平舌音 c 与 翘舌音 ch',
      ruleSong: '平平舌尖读 c c c，卷卷舌尖读 ch ch ch',
      items: [
        { text: 'c', label: '平舌 c (刺)' },
        { text: 'ch', label: '翘舌 ch (吃)' }
      ]
    },
    {
      pair: ['s', 'sh'],
      title: '平舌音 s 与 翘舌音 sh',
      ruleSong: '平平吐丝 s s s，翘舌站立 sh sh sh',
      items: [
        { text: 's', label: '平舌 s (丝)' },
        { text: 'sh', label: '翘舌 sh (狮)' }
      ]
    },
    {
      pair: ['ui', 'iu'],
      title: '排在前头 ui 与 iu',
      ruleSong: 'u 在前头戴围巾 ui ui ui，i 在前头去游泳 iu iu iu',
      items: [
        { text: 'ui', label: 'u在前的 ui (水)' },
        { text: 'iu', label: 'i在前的 iu (牛)' }
      ]
    },
    {
      pair: ['ei', 'ie'],
      title: '排在前面的 ei 与 ie',
      ruleSong: 'e 在前用力砍柴 ei ei ei，i 在前一片树叶 ie ie ie',
      items: [
        { text: 'ei', label: 'e在前的 ei (杯)' },
        { text: 'ie', label: 'i在前的 ie (叶)' }
      ]
    }
  ],

  // 统编人教版一年级上册 13 课课文完整同步大关卡
  lessons: [
    {
      id: 1,
      unit: '第二单元·拼音第一关',
      title: '第 1 课 a o e',
      desc: '单韵母小三样，张大嘴巴来认读！',
      targetLetters: ['a', 'o', 'e'],
      rhyme: '张大嘴巴 a a a，圆圆嘴巴 o o o，清清池塘白鹅叫 e e e。',
      guideText: '这是拼音王国的最基础的3个单韵母伙伴，发音时嘴巴大小不同，注意嘴型保持稳定不改变哦！',
      // 四声跑道
      tonesData: [
        { char: 'a', tones: ['ā', 'á', 'ǎ', 'à'], tip: 'ā阿姨，á啊怎么了，ǎ小马，à大家' },
        { char: 'o', tones: ['ō', 'ó', 'ǒ', 'ò'], tip: 'ō公鸡叫，ó哦是吗，ǒ我们，ò大雁' },
        { char: 'e', tones: ['ē', 'é', 'ě', 'è'], tip: 'ē阿婀，é白鹅，ě恶心，è肚子饿' }
      ],
      // 课本同步识字拼读
      words: [
        { py: 'ā yí', hanzi: '阿姨', note: '一声平' },
        { py: 'bái é', hanzi: '白鹅', note: '二声扬' },
        { py: 'è le', hanzi: '饿了', note: '四声降' }
      ],
      // 关卡小测（3道题通关打卡）
      quiz: [
        {
          question: '请听发音，点击正确的字母：【发音：ā】',
          sound: 'ā',
          options: ['ā', 'ō', 'ē'],
          answer: 'ā'
        },
        {
          question: '大白鹅在水里的倒影，代表哪一个韵母？',
          sound: 'é',
          options: ['a', 'o', 'e'],
          answer: 'e'
        },
        {
          question: '小汽车向上冲坡，代表哪一个声调？',
          sound: 'á',
          options: ['一声(—)', '二声(/)', '三声(∨)', '四声(\\)'],
          answer: '二声(/)'
        }
      ]
    },
    {
      id: 2,
      unit: '第二单元·拼音第二关',
      title: '第 2 课 i u ü y w',
      desc: '单韵母与大y大w，还有整体认读一家人！',
      targetLetters: ['i', 'u', 'ü', 'y', 'w'],
      rhyme: '牙齿对齐 i i i，嘴巴突出 u u u，吹起笛子 ü ü ü，大 y 大 w 来把门，yi wu yu 整体读。',
      guideText: '注意：ü 读音就像小鱼吐泡泡；大y遇到小i是整体认读音节 yi；小ü遇到大y，擦掉两点变成 yu！',
      tonesData: [
        { char: 'i', tones: ['ī', 'í', 'ǐ', 'ì'], tip: '衣服、阿姨、椅子、主意' },
        { char: 'u', tones: ['ū', 'ú', 'ǔ', 'ù'], tip: '乌鸦、无聊、五星、大雾' },
        { char: 'ü', tones: ['ǖ', 'ǘ', 'ǚ', 'ǜ'], tip: '金鱼、下雨、玉米' }
      ],
      words: [
        { py: 'yī fu', hanzi: '衣服', note: '整体认读 yi' },
        { py: 'wū yā', hanzi: '乌鸦', note: '整体认读 wu' },
        { py: 'yǔ yī', hanzi: '雨衣', note: '整体认读 yu + yi' }
      ],
      quiz: [
        {
          question: '整体认读音节【yi】怎么读？',
          sound: 'yī',
          options: ['y-i-yi', '不用拼，直接读 yī', 'y-a-ya'],
          answer: '不用拼，直接读 yī'
        },
        {
          question: '小鱼吐泡 ü 见到大 y 之后会发生什么？',
          sound: 'yú',
          options: ['两点留着', '脱掉帽子两点去掉，变成 yu', '多长出两只眼睛'],
          answer: '脱掉帽子两点去掉，变成 yu'
        },
        {
          question: '请听发音，选出正确的声调音节：【发音：yǔ】',
          sound: 'yǔ',
          options: ['yī', 'wǔ', 'yǔ'],
          answer: 'yǔ'
        }
      ]
    },
    {
      id: 3,
      unit: '第二单元·拼音第三关',
      title: '第 3 课 b p m f',
      desc: '声母四兄弟登场，开始学两拼啦！',
      targetLetters: ['b', 'p', 'm', 'f'],
      rhyme: '右下半圆 b b b，右上半圆 p p p，两个门洞 m m m，一根拐棍 f f f。',
      guideText: '★特别重点：很多小朋友会把 b 和 p、或者 b 和 d 弄混。记住“广播天线朝右下 b b b，爬坡举旗右上 p p p”！',
      tonesData: [
        { char: 'b', tones: ['bō', 'bó', 'bǒ', 'bò'], tip: '广播、博大、跛脚、菠菜' },
        { char: 'p', tones: ['pō', 'pó', 'pǒ', 'pò'], tip: '山坡、婆婆、泼水、破开' },
        { char: 'm', tones: ['mō', 'mó', 'mǒ', 'mò'], tip: '摸人、磨刀、抹布、墨水' },
        { char: 'f', tones: ['fō', 'fó', 'fǒ', 'fò'], tip: '大佛、非常' }
      ],
      words: [
        { py: 'bà ba', hanzi: '爸爸', note: '两拼：b-à -> bà' },
        { py: 'mā ma', hanzi: '妈妈', note: '两拼：m-ā -> mā' },
        { py: 'bó bo', hanzi: '伯伯', note: '两拼：b-ó -> bó' }
      ],
      quiz: [
        {
          question: '“爸爸”的“爸”是由哪个声母和韵母拼成的？',
          sound: 'bà',
          options: ['p + à', 'b + à', 'm + à'],
          answer: 'b + à'
        },
        {
          question: '哪个是右下半圆的字母？',
          sound: 'bō',
          options: ['b', 'p', 'd'],
          answer: 'b'
        },
        {
          question: '请听发音，选出对应的词语拼音：【发音：mā ma】',
          sound: 'mā ma',
          options: ['bà ba', 'mā ma', 'pó po'],
          answer: 'mā ma'
        }
      ]
    },
    {
      id: 4,
      unit: '第二单元·拼音第四关',
      title: '第 4 课 d t n l',
      desc: '马蹄嗒嗒，伞柄朝下，门洞泥鳅！',
      targetLetters: ['d', 't', 'n', 'l'],
      rhyme: '左下半圆 d d d，伞柄朝下 t t t，一个门洞 n n n，一根小棒 l l l。',
      guideText: '★特别重点：注意左下半圆是 d，别和右下半圆 b 弄反了！舌尖顶住上牙膛就是 l 和 n。',
      tonesData: [
        { char: 'd', tones: ['dē', 'dé', 'dě', 'dè'], tip: '得到、马蹄声' },
        { char: 't', tones: ['tē', 'té', 'tě', 'tè'], tip: '特别、跳跃' },
        { char: 'n', tones: ['nē', 'né', 'ně', 'nè'], tip: '哪里、小猪' },
        { char: 'l', tones: ['lē', 'lé', 'lě', 'lè'], tip: '快乐、小鹿' }
      ],
      words: [
        { py: 'mǎ lù', hanzi: '马路', note: '两拼：l-ù -> lù' },
        { py: 'ní tǔ', hanzi: '泥土', note: '两拼：n-í -> ní, t-ǔ -> tǔ' },
        { py: 'dǎ bǎ', hanzi: '打靶', note: '两拼：d-ǎ -> dǎ' }
      ],
      quiz: [
        {
          question: '左下半圆是什么字母？（马蹄嗒嗒）',
          sound: 'd',
          options: ['b', 'p', 'd'],
          answer: 'd'
        },
        {
          question: '一个门洞是哪个声母？',
          sound: 'nè',
          options: ['m', 'n', 'u'],
          answer: 'n'
        },
        {
          question: '拼读：d-ǎ 合在一起怎么读？',
          sound: 'dǎ',
          options: ['bǎ', 'tǎ', 'dǎ'],
          answer: 'dǎ'
        }
      ]
    },
    {
      id: 5,
      unit: '第三单元·声母进阶关',
      title: '第 5 课 g k h',
      desc: '白鸽飞翔，蝌蚪戏水，荷花飘香！',
      targetLetters: ['g', 'k', 'h'],
      rhyme: '9字加弯 g g g，一挺机枪 k k k，一把椅子 h h h。',
      guideText: '学会 g k h 后，我们不仅能两拼，还能学会神奇的“三拼音节”啦！如 g-u-ā 组成西瓜的“瓜”！',
      tonesData: [
        { char: 'g', tones: ['gē', 'gé', 'gě', 'gè'], tip: '哥哥、合格、几个、各个' },
        { char: 'k', tones: ['kē', 'ké', 'kě', 'kè'], tip: '颗粒、咳嗽、可以、上课' },
        { char: 'h', tones: ['hē', 'hé', 'hě', 'hè'], tip: '喝水、荷花、很远、祝贺' }
      ],
      words: [
        { py: 'gē ge', hanzi: '哥哥', note: '两拼 g-ē' },
        { py: 'hé huā', hanzi: '荷花', note: '三拼 h-u-ā -> huā' },
        { py: 'xī guā', hanzi: '西瓜', note: '三拼 g-u-ā -> guā' }
      ],
      quiz: [
        {
          question: '三拼音节 g-u-ā（西瓜）里的介母是哪一个？',
          sound: 'guā',
          options: ['g', 'u', 'a'],
          answer: 'u'
        },
        {
          question: '“哥哥”的拼音首字母是？',
          sound: 'gē',
          options: ['g', 'k', 'h'],
          answer: 'g'
        },
        {
          question: '请听发音：【发音：hē shuǐ】是哪个词？',
          sound: 'hē shuǐ',
          options: ['哥哥', '喝水', '打靶'],
          answer: '喝水'
        }
      ]
    },
    {
      id: 6,
      unit: '第三单元·声母进阶关',
      title: '第 6 课 j q x',
      desc: '小鸡唧唧，气球高飞，小ü脱帽礼！',
      targetLetters: ['j', 'q', 'x'],
      rhyme: '母鸡母鸡 j j j，左上半圆 q q q，刀切西瓜 x x x。小ü见到 j q x，脱帽行礼去两点！',
      guideText: '★全册最核心考点：小ü碰上 j q x，两点必须摘掉（写成 ju, qu, xu），但发音依然读 ü！',
      tonesData: [
        { char: 'j', tones: ['jī', 'jí', 'jǐ', 'jì'], tip: '公鸡、吉利、几个、记住' },
        { char: 'q', tones: ['qī', 'qí', 'qǐ', 'qì'], tip: '七天、骑马、起来、空气' },
        { char: 'x', tones: ['xī', 'xí', 'xǐ', 'xì'], tip: '西瓜、学习、喜欢、细心' }
      ],
      words: [
        { py: 'qí mǎ', hanzi: '骑马', note: '两拼 q-í -> qí' },
        { py: 'jú huā', hanzi: '菊花', note: '小ü脱帽：j-ǘ -> jú' },
        { py: 'xī guā', hanzi: '西瓜', note: '两拼 x-ī -> xī' }
      ],
      quiz: [
        {
          question: '小ü遇到 j 拼在一起时，上面的两点要怎么处理？',
          sound: 'jú',
          options: ['留着两点', '去掉两点，写成 ju', '改成横线'],
          answer: '去掉两点，写成 ju'
        },
        {
          question: '左上半圆、竖在右边的是哪个字母？',
          sound: 'q',
          options: ['p', 'b', 'q'],
          answer: 'q'
        },
        {
          question: '拼读：x-i-à 合在一起读什么？',
          sound: 'xià',
          options: ['shà', 'xià', 'huà'],
          answer: 'xià'
        }
      ]
    },
    {
      id: 7,
      unit: '第三单元·平翘舌大作战',
      title: '第 7 课 z c s',
      desc: '像个2字写个字，平舌音大家族！',
      targetLetters: ['z', 'c', 's'],
      rhyme: '像个2字 z z z，半个圆圈 c c c，半个8字 s s s。zi ci si 整体读，平舌声音要记牢。',
      guideText: '发 z c s 时，舌尖平平地抵住上门牙后面，不要卷舌头哦！zi ci si 是整体认读音节。',
      tonesData: [
        { char: 'z', tones: ['zī', 'zí', 'zǐ', 'zì'], tip: '姿势、儿子、写字' },
        { char: 'c', tones: ['cī', 'cí', 'cǐ', 'cì'], tip: '瑕疵、词语、一次' },
        { char: 's', tones: ['sī', 'sí', 'sǐ', 'sì'], tip: '吐丝、四个' }
      ],
      words: [
        { py: 'zì jǐ', hanzi: '自己', note: '整体认读 zì' },
        { py: 'sì gè', hanzi: '四个', note: '整体认读 sì' },
        { py: 'cū xì', hanzi: '粗细', note: '平舌拼读 c-ū -> cū' }
      ],
      quiz: [
        {
          question: '【zi ci si】是整体认读音节吗？',
          sound: 'zì',
          options: ['是，不用拼直接读', '不是，必须拼读'],
          answer: '是，不用拼直接读'
        },
        {
          question: '读 z c s 的时候，舌头应该怎么样？',
          sound: 'zī',
          options: ['舌尖放平', '舌头卷得高高的', '舌头伸出口腔外'],
          answer: '舌尖放平'
        },
        {
          question: '“写字”的“字”读几声？',
          sound: 'zì',
          options: ['一声(zī)', '二声(zí)', '三声(zǐ)', '四声(zì)'],
          answer: '四声(zì)'
        }
      ]
    },
    {
      id: 8,
      unit: '第三单元·平翘舌大作战',
      title: '第 8 课 zh ch sh r',
      desc: '舌头轻轻翘起来，威风凛凛大狮子！',
      targetLetters: ['zh', 'ch', 'sh', 'r'],
      rhyme: '织毛衣 zh zh zh，吃苹果 ch ch ch，小狮子 sh sh sh，一轮红日 r r r。',
      guideText: '发 zh ch sh r 时，舌头往上翘起，挨着硬腭前面。zhi chi shi ri 也是整体认读音节！',
      tonesData: [
        { char: 'zh', tones: ['zhī', 'zhí', 'zhǐ', 'zhì'], tip: '知道、植物、手指、志气' },
        { char: 'ch', tones: ['chī', 'chí', 'chǐ', 'chì'], tip: '吃饭、池塘、尺子、翅膀' },
        { char: 'sh', tones: ['shī', 'shí', 'shǐ', 'shì'], tip: '老师、十个、开始、事情' },
        { char: 'r', tones: ['rī', 'rí', 'rǐ', 'rì'], tip: '日子、热烈' }
      ],
      words: [
        { py: 'zhī zhū', hanzi: '蜘蛛', note: '整体认读 zhī' },
        { py: 'chǐ zi', hanzi: '尺子', note: '整体认读 chǐ' },
        { py: 'shù lín', hanzi: '树林', note: '翘舌拼读 sh-ù' },
        { py: 'rì chū', hanzi: '日出', note: '整体认读 rì + ch-ū' }
      ],
      quiz: [
        {
          question: '请听发音，辨别是平舌还是翘舌：【发音：shī】',
          sound: 'shī',
          options: ['平舌(sī)', '翘舌(shī)'],
          answer: '翘舌(shī)'
        },
        {
          question: '整体认读音节【zhi chi shi ri】需要拼读吗？',
          sound: 'zhī',
          options: ['不需要，直接读', '需要 zh+i 慢慢拼'],
          answer: '不需要，直接读'
        },
        {
          question: '“吃饭”的“吃”声母是？',
          sound: 'chī',
          options: ['c', 'ch', 's'],
          answer: 'ch'
        }
      ]
    },
    {
      id: 9,
      unit: '第四单元·复韵母魔幻城堡',
      title: '第 9 课 ai ei ui',
      desc: '两个单韵母手拉手，复韵母来啦！',
      targetLetters: ['ai', 'ei', 'ui'],
      rhyme: '紧挨在一起 ai ai ai，用力拔萝卜 ei ei ei，围上红围巾 ui ui ui。',
      guideText: '标调歌第一句：“有 a 不放过，没 a 找 o e，i u 并列标在后”！注意 ui 的声调标在 i 上！',
      tonesData: [
        { char: 'ai', tones: ['āi', 'ái', 'ǎi', 'ài'], tip: '挨着、白兔、小矮人、爱心' },
        { char: 'ei', tones: ['ēi', 'éi', 'ěi', 'èi'], tip: '飞翔、谁的、给你、妹妹' },
        { char: 'ui', tones: ['uī', 'uí', 'uǐ', 'uì'], tip: '微风、回答、水果、开会' }
      ],
      words: [
        { py: 'bái tù', hanzi: '白兔', note: 'b-ái -> bái' },
        { py: 'mèi mei', hanzi: '妹妹', note: 'm-èi -> mèi' },
        { py: 'shuǐ guǒ', hanzi: '水果', note: 'sh-uǐ -> shuǐ' }
      ],
      quiz: [
        {
          question: '在复韵母 ui 身上标声调，应该标在谁头上？',
          sound: 'shuǐ',
          options: ['标在 u 上', '标在 i 上（i u并列标在后）'],
          answer: '标在 i 上（i u并列标在后）'
        },
        {
          question: '“白兔”的“白”是由哪个声母和韵母拼成的？',
          sound: 'bái',
          options: ['b + ái', 'd + ái', 'p + ái'],
          answer: 'b + ái'
        },
        {
          question: '请听发音：【发音：mèi】是哪个韵母？',
          sound: 'mèi',
          options: ['ai', 'ei', 'ui'],
          answer: 'ei'
        }
      ]
    },
    {
      id: 10,
      unit: '第四单元·复韵母魔幻城堡',
      title: '第 10 课 ao ou iu',
      desc: '小猫叫，海鸥飞，小鱼游泳！',
      targetLetters: ['ao', 'ou', 'iu'],
      rhyme: '棉袄暖和 ao ao ao，海鸥飞翔 ou ou ou，小鱼游水 iu iu iu。i 和 u 并在后，标调标在 u 上头！',
      guideText: '注意区分 ui 和 iu：u在前戴围巾 ui；i在前去游泳 iu。标调歌记住：“i u 并列标在后”！',
      tonesData: [
        { char: 'ao', tones: ['āo', 'áo', 'ǎo', 'ào'], tip: '高大、逃跑、小草、骄傲' },
        { char: 'ou', tones: ['ōu', 'óu', 'ǒu', 'òu'], tip: '欧洲、小猴、小狗、后边' },
        { char: 'iu', tones: ['iū', 'iú', 'iǔ', 'iù'], tip: '休假、牛角、九只、优秀' }
      ],
      words: [
        { py: 'xiǎo niǎo', hanzi: '小鸟', note: 'x-i-ǎo -> xiǎo' },
        { py: 'xiǎo gǒu', hanzi: '小狗', note: 'g-ǒu -> gǒu' },
        { py: 'niú nǎi', hanzi: '牛奶', note: 'n-iú -> niú' }
      ],
      quiz: [
        {
          question: '在 iu 身上标调，调号应该戴在谁头上？',
          sound: 'niú',
          options: ['戴在 i 上', '戴在 u 上（标在后）'],
          answer: '戴在 u 上（标在后）'
        },
        {
          question: '小鱼游泳是哪个复韵母？',
          sound: 'iū',
          options: ['ui', 'iu', 'ou'],
          answer: 'iu'
        },
        {
          question: '拼读：g-ǒu 组合起来读什么？',
          sound: 'gǒu',
          options: ['gǎo', 'gǒu', 'jiǔ'],
          answer: 'gǒu'
        }
      ]
    },
    {
      id: 11,
      unit: '第四单元·复韵母魔幻城堡',
      title: '第 11 课 ie üe er',
      desc: '一片树叶，月牙弯弯，还有神奇小耳朵！',
      targetLetters: ['ie', 'üe', 'er'],
      rhyme: '一片树叶 ie ie ie，月牙弯弯 üe üe üe，小小耳朵 er er er。er是特殊小韵母，从不和声母做朋友！',
      guideText: '★特别秘密：er 叫“特殊韵母”，它非常有性格，自己一个人就能自成音节（如耳朵 ěr、二 èr），不跟声母拼读！',
      tonesData: [
        { char: 'ie', tones: ['iē', 'ié', 'iě', 'iè'], tip: '椰树、爷爷、铁桥、树叶' },
        { char: 'üe', tones: ['üē', 'üé', 'üě', 'üè'], tip: '大约、学习、月亮' },
        { char: 'er', tones: ['ēr', 'ér', 'ěr', 'èr'], tip: '儿歌、耳朵、一二三' }
      ],
      words: [
        { py: 'yé ye', hanzi: '爷爷', note: '整体认读 ye' },
        { py: 'yuè liang', hanzi: '月亮', note: '整体认读 yue' },
        { py: 'ěr duo', hanzi: '耳朵', note: '特殊韵母 er' }
      ],
      quiz: [
        {
          question: '特殊韵母 er 喜欢和声母拼读吗？',
          sound: 'ěr',
          options: ['喜欢，天天拼', '不和声母拼，自己单独成音节'],
          answer: '不和声母拼，自己单独成音节'
        },
        {
          question: '“树叶”的整体认读音节是？',
          sound: 'yè',
          options: ['ye', 'yue', 'yuan'],
          answer: 'ye'
        },
        {
          question: '请听发音：【发音：yuè】是哪个词？',
          sound: 'yuè',
          options: ['月亮', '爷爷', '耳朵'],
          answer: '月亮'
        }
      ]
    },
    {
      id: 12,
      unit: '第四单元·鼻韵母大挑战',
      title: '第 12 课 an en in un ün',
      desc: '前鼻音五姐妹，舌尖轻轻顶门牙！',
      targetLetters: ['an', 'en', 'in', 'un', 'ün'],
      rhyme: '天安门前 an an an，按下门铃 en en en，树林深处 in in in，温水热茶 un un un，白云飘飘 ün ün ün。',
      guideText: '发前鼻韵母时，最后舌尖都要顶在上牙龈，气流从鼻子里出来，发音圆润干净！整体认读有 yuan yin yun！',
      tonesData: [
        { char: 'an', tones: ['ān', 'án', 'ǎn', 'àn'], tip: '平安、山岗、小草、海岸' },
        { char: 'en', tones: ['ēn', 'én', 'ěn', 'èn'], tip: '感恩、奔跑、人民、认字' },
        { char: 'in', tones: ['īn', 'ín', 'ǐn', 'ìn'], tip: '拼音、银白、近处' },
        { char: 'un', tones: ['ūn', 'ún', 'ǔn', 'ùn'], tip: '春天、白云、圆滚、困倦' },
        { char: 'ün', tones: ['ǖn', 'ǘn', 'ǚn', 'ǜn'], tip: '头晕、群众、手帕' }
      ],
      words: [
        { py: 'tiān ān mén', hanzi: '天安门', note: '前鼻音 an' },
        { py: 'pīn yīn', hanzi: '拼音', note: '前鼻音 in + 整体认读 yin' },
        { py: 'bái yún', hanzi: '白云', note: '整体认读 yun' }
      ],
      quiz: [
        {
          question: '“拼音”的“拼”韵母是前鼻韵母还是后鼻韵母？',
          sound: 'pīn',
          options: ['前鼻韵母 in', '后鼻韵母 ing'],
          answer: '前鼻韵母 in'
        },
        {
          question: '天安门的“安”拼音是？',
          sound: 'ān',
          options: ['an', 'en', 'ang'],
          answer: 'an'
        },
        {
          question: '【yuan, yin, yun】是什么音节？',
          sound: 'yīn',
          options: ['整体认读音节（不用拼直接读）', '两拼音节'],
          answer: '整体认读音节（不用拼直接读）'
        }
      ]
    },
    {
      id: 13,
      unit: '第四单元·鼻韵母大挑战',
      title: '第 13 课 ang eng ing ong',
      desc: '后鼻音四兄弟，后腔共鸣亮堂堂！',
      targetLetters: ['ang', 'eng', 'ing', 'ong'],
      rhyme: '山羊昂首 ang ang ang，清晨看灯 eng eng eng，雄鹰展翅 ing ing ing，闹钟走动 ong ong ong。',
      guideText: '发后鼻韵母时，舌根往后缩抵住软腭，鼻腔共鸣更强！ying 是它的整体认读音节！恭喜学完所有的拼音！',
      tonesData: [
        { char: 'ang', tones: ['āng', 'áng', 'ǎng', 'àng'], tip: '太阳、山羊、广场、放学' },
        { char: 'eng', tones: ['ēng', 'éng', 'ěng', 'èng'], tip: '台灯、蜜蜂、朋友、正当' },
        { char: 'ing', tones: ['īng', 'íng', 'ǐng', 'ìng'], tip: '老鹰、平安、听讲、星星' },
        { char: 'ong', tones: ['ōng', 'óng', 'ǒng', 'òng'], tip: '天空、红旗、松鼠、一同' }
      ],
      words: [
        { py: 'shān yáng', hanzi: '山羊', note: '后鼻音 ang' },
        { py: 'tái dēng', hanzi: '台灯', note: '后鼻音 eng' },
        { py: 'xīng xing', hanzi: '星星', note: '后鼻音 ing' },
        { py: 'hóng qí', hanzi: '红旗', note: '后鼻音 ong' }
      ],
      quiz: [
        {
          question: '“太阳”的“阳”是前鼻音还是后鼻音？',
          sound: 'yáng',
          options: ['后鼻音 ang', '前鼻音 an'],
          answer: '后鼻音 ang'
        },
        {
          question: '老鹰飞翔的整体认读音节是哪一个？',
          sound: 'yīng',
          options: ['ying', 'yin', 'ing'],
          answer: 'ying'
        },
        {
          question: '请听发音：【发音：hóng qí】对应哪个拼音？',
          sound: 'hóng qí',
          options: ['hóng qí', 'háng qí', 'héng qí'],
          answer: 'hóng qí'
        }
      ]
    }
  ]
};

// 导出或挂载至全局
if (typeof window !== 'undefined') {
  window.PINYIN_DATA = PINYIN_DATA;
}
