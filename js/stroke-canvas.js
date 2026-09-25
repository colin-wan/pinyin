/**
 * 四线三格规范书写与动态描红板 (PinyinStrokeCanvas)
 * 1. 严格符合统编人教版小学一年级语文拼音四线三格规范（第一线至第四线，上格/中格/下格）
 * 2. 彻底修正书写字形错误：摒弃系统通用印刷字体，使用纯数学矢量路径绑定四线坐标
 *    - ɑ (单层圆润饱满单韵母，竖右弯坐落第三线)
 *    - b (长竖触及第一线附近，右半圆坐落中格)
 *    - p (直竖下探至第四线稍上，右上半圆坐落中格)
 *    - f、t (短横精准贴在第二红线上)
 *    - ɡ (单层带下格圆弧左弯钩)
 * 3. 真实分步笔顺逐笔动态书写：高亮墨绿笔触配合灵动跳动的笔尖光标，清晰直观演示每笔规范
 * 4. 支持单韵母、声母、复韵母与鼻韵母全部 47 个教学音节的标准笔画笔顺、占格规则与书写要领
 */

const PINYIN_STROKE_DATA = {
  // 6个单韵母
  'a': { displayChar: 'ɑ', grid: '占中格', strokes: ['左半圆', '竖右弯'], strokeOrder: '第一笔左半圆，第二笔竖右弯', count: 2, tips: '左半圆要圆润饱满占满中格，竖右弯紧贴第二、三线，不越界。' },
  'o': { displayChar: 'o', grid: '占中格', strokes: ['圆'], strokeOrder: '左上起笔，一笔写成圆', count: 1, tips: '从第二线左侧起笔向左画圆，圆圈饱满均匀贴紧上下两条红线。' },
  'e': { displayChar: 'e', grid: '占中格', strokes: ['横折左半圆'], strokeOrder: '从中间起笔，横折左半圆一笔写成', count: 1, tips: '从中格正中起笔向右写短横，随即向上向左画大半圆，一气呵成。' },
  'i': { displayChar: 'i', grid: '占上格和中格', strokes: ['竖', '点'], strokeOrder: '第一笔竖，第二笔点', count: 2, tips: '短竖端正居于中格，小圆点轻点在上格正中央，不可连笔。' },
  'u': { displayChar: 'u', grid: '占中格', strokes: ['竖右弯', '竖'], strokeOrder: '第一笔竖右弯，第二笔竖', count: 2, tips: '像个小杯子，第一笔竖右弯触底，第二笔直竖封右边，高矮一致。' },
  'ü': { displayChar: 'ü', grid: '占上格和中格', strokes: ['竖右弯', '竖', '左点', '右点'], strokeOrder: '先写 u，再在上面点两点（先左后右）', count: 4, tips: '杯身在中格，两只亮晶晶的小眼睛端正点在上格偏下位置。' },

  // 23个声母
  'b': { displayChar: 'b', grid: '占上格和中格', strokes: ['竖', '右半圆'], strokeOrder: '第一笔竖，第二笔右半圆', count: 2, tips: '长竖从中格向上挺直到上格，右半圆饱满端正占满中格。' },
  'p': { displayChar: 'p', grid: '占中格和下格', strokes: ['竖', '右上半圆'], strokeOrder: '第一笔竖，第二笔右上半圆', count: 2, tips: '竖从中格下探至下格中间，右上半圆圆润饱满坐落在中格。' },
  'm': { displayChar: 'm', grid: '占中格', strokes: ['竖', '左弯竖', '左弯竖'], strokeOrder: '第一笔竖，第二笔左弯竖，第三笔左弯竖', count: 3, tips: '两个小门洞宽度均匀对称，下端都要稳稳踩在第三线上。' },
  'f': { displayChar: 'f', grid: '占上格和中格', strokes: ['右弯竖', '短横'], strokeOrder: '第一笔右弯竖，第二笔短横', count: 2, tips: '像老爷爷的拐棍，从上格弯起向下直拉，短横正好贴在第二线上。' },
  'd': { displayChar: 'd', grid: '占上格和中格', strokes: ['左半圆', '竖'], strokeOrder: '第一笔左半圆，第二笔竖', count: 2, tips: '先在中格写满左半圆，再从上格垂直向下引一笔直竖贴紧半圆。' },
  't': { displayChar: 't', grid: '占上格和中格', strokes: ['竖右弯', '短横'], strokeOrder: '第一笔竖右弯，第二笔短横', count: 2, tips: '伞柄朝下从上格落到第三线右弯，短横压在第二红线上。' },
  'n': { displayChar: 'n', grid: '占中格', strokes: ['竖', '左弯竖'], strokeOrder: '第一笔竖，第二笔左弯竖', count: 2, tips: '一个门洞饱满居中，宽度适度，上下贴紧两条红线。' },
  'l': { displayChar: 'l', grid: '占上格和中格', strokes: ['竖'], strokeOrder: '一笔长竖到底', count: 1, tips: '从第一线下方起笔一笔笔直拉到第三线，直挺不弯曲。' },
  'g': { displayChar: 'ɡ', grid: '占中格和下格', strokes: ['左半圆', '竖左弯'], strokeOrder: '第一笔左半圆，第二笔竖左弯', count: 2, tips: '左半圆在中格，竖左弯自然滑向下格正中，弧度柔和。' },
  'k': { displayChar: 'k', grid: '占上格和中格', strokes: ['竖', '左斜右斜'], strokeOrder: '第一笔竖，第二笔左斜右斜', count: 2, tips: '长竖高高站上格，左斜右斜像机枪折角稳稳收在中格内。' },
  'h': { displayChar: 'h', grid: '占上格和中格', strokes: ['竖', '左弯竖'], strokeOrder: '第一笔竖，第二笔左弯竖', count: 2, tips: '长竖从上格起笔，左弯竖像小椅子稳稳摆放在中格。' },
  'j': { displayChar: 'j', grid: '占上中下三格', strokes: ['竖左弯', '点'], strokeOrder: '第一笔竖左弯，第二笔点', count: 2, tips: '竖左弯从中格穿过下格轻轻向左勾，小圆点轻点在上格。' },
  'q': { displayChar: 'q', grid: '占中格和下格', strokes: ['左半圆', '竖'], strokeOrder: '第一笔左半圆，第二笔竖', count: 2, tips: '左上半圆在中格饱满圆润，直竖从第二线垂直向下扎入下格。' },
  'x': { displayChar: 'x', grid: '占中格', strokes: ['右斜', '左斜'], strokeOrder: '第一笔右斜 \\，第二笔左斜 /', count: 2, tips: '先右斜后左斜，交点正好落在中格的正中央，两臂舒展。' },
  'zh': { displayChar: 'zh', grid: '占上格和中格', strokes: ['z', 'h'], strokeOrder: '先写 z，再写 h，两字母靠拢紧凑', count: 2, tips: '翘舌音两兄弟手拉手，z 占中格，h 占上格和中格，间距均匀。' },
  'ch': { displayChar: 'ch', grid: '占上格和中格', strokes: ['c', 'h'], strokeOrder: '先写 c，再写 h，靠拢写紧凑', count: 2, tips: 'c 占中格，h 占上格和中格，两字母不要分得太开。' },
  'sh': { displayChar: 'sh', grid: '占上格和中格', strokes: ['s', 'h'], strokeOrder: '先写 s，再写 h，靠拢写紧凑', count: 2, tips: 's 占中格，h 占上格和中格，整体和谐紧密。' },
  'r': { displayChar: 'r', grid: '占中格', strokes: ['竖', '右上弯'], strokeOrder: '第一笔竖，第二笔右上弯', count: 2, tips: '短竖居中格，右上弯像一株迎着朝阳刚发芽的小嫩草。' },
  'z': { displayChar: 'z', grid: '占中格', strokes: ['横折横'], strokeOrder: '一笔横折横写成', count: 1, tips: '横平竖斜横平，像个小鸭子稳坐中格，拐角干净利落。' },
  'c': { displayChar: 'c', grid: '占中格', strokes: ['左半圆'], strokeOrder: '一笔左半圆写成', count: 1, tips: '从右上起笔向左画半圆，圆弧饱满上下触碰第二、三线。' },
  's': { displayChar: 's', grid: '占中格', strokes: ['半个8字'], strokeOrder: '一笔写成，向左弯再向右弯', count: 1, tips: '像小蚕吐丝顺滑流畅，上小下大稳稳占满中格。' },
  'y': { displayChar: 'y', grid: '占中格和下格', strokes: ['右斜短', '左斜长'], strokeOrder: '第一笔右斜短，第二笔左斜长', count: 2, tips: '短斜在中格，长斜从中格直插下格底部，姿态挺拔。' },
  'w': { displayChar: 'w', grid: '占中格', strokes: ['斜下斜上', '斜下斜上'], strokeOrder: '斜下斜上斜下斜上', count: 2, tips: '两个小尖角都要触碰第三线，像两间并排倒映在水中的小屋。' },

  // 复韵母与特殊韵母
  'ai': { displayChar: 'ɑi', grid: '占上格和中格', strokes: ['ɑ', 'i'], strokeOrder: '先写 ɑ，再写 i，紧凑挨紧', count: 2, tips: '复韵母两个字母要写得亲密挨紧，不要隔开过大距离。' },
  'ei': { displayChar: 'ei', grid: '占上格和中格', strokes: ['e', 'i'], strokeOrder: '先写 e，再写 i，紧凑挨紧', count: 2, tips: 'e 居中格，i 占上中格，两者高矮呼应。' },
  'ui': { displayChar: 'ui', grid: '占上格和中格', strokes: ['u', 'i'], strokeOrder: '先写 u，再写 i，紧凑挨紧', count: 2, tips: 'u 占中格，i 占上中格，端正协调。' },
  'ao': { displayChar: 'ɑo', grid: '占中格', strokes: ['ɑ', 'o'], strokeOrder: '先写 ɑ，再写 o，都占中格', count: 2, tips: '两个圆润的小脑袋并排挨紧在中格。' },
  'ou': { displayChar: 'ou', grid: '占中格', strokes: ['o', 'u'], strokeOrder: '先写 o，再写 u，都占中格', count: 2, tips: 'o 和 u 大小匀称，整齐端坐在中格。' },
  'iu': { displayChar: 'iu', grid: '占上格和中格', strokes: ['i', 'u'], strokeOrder: '先写 i，再写 u，紧凑挨紧', count: 2, tips: 'i 和 u 并在后，字形舒展紧凑。' },
  'ie': { displayChar: 'ie', grid: '占上格和中格', strokes: ['i', 'e'], strokeOrder: '先写 i，再写 e，紧凑挨紧', count: 2, tips: 'i 占上中格，e 占中格，高低错落有致。' },
  'üe': { displayChar: 'üe', grid: '占上格和中格', strokes: ['ü', 'e'], strokeOrder: '先写 ü，再写 e，两点端正', count: 2, tips: '小 ü 戴好两顶小红帽，e 紧靠右侧。' },
  'er': { displayChar: 'er', grid: '占中格', strokes: ['e', 'r'], strokeOrder: '先写 e，再写 r，都占中格', count: 2, tips: '特殊小韵母，两个字母都稳居中格。' },

  // 前鼻韵母
  'an': { displayChar: 'ɑn', grid: '占中格', strokes: ['ɑ', 'n'], strokeOrder: '先写 ɑ，再写 n，都占中格', count: 2, tips: '天安门前两个小字母整齐居中，圆满大方。' },
  'en': { displayChar: 'en', grid: '占中格', strokes: ['e', 'n'], strokeOrder: '先写 e，再写 n，都占中格', count: 2, tips: '门铃响了，e 和 n 亲切挨在一起。' },
  'in': { displayChar: 'in', grid: '占上格和中格', strokes: ['i', 'n'], strokeOrder: '先写 i，再写 n，紧凑挨紧', count: 2, tips: 'i 占上中格，n 占中格，端正齐整。' },
  'un': { displayChar: 'un', grid: '占中格', strokes: ['u', 'n'], strokeOrder: '先写 u，再写 n，都占中格', count: 2, tips: '两个杯子门洞都在中格里端坐。' },
  'ün': { displayChar: 'ün', grid: '占上格和中格', strokes: ['ü', 'n'], strokeOrder: '先写 ü，再写 n，紧凑挨紧', count: 2, tips: '白云飘飘，ü 头戴两点，n 靠在身旁。' },

  // 后鼻韵母
  'ang': { displayChar: 'ɑnɡ', grid: '占中格和下格', strokes: ['ɑ', 'n', 'ɡ'], strokeOrder: '先写 ɑ，再写 n，最后写 ɡ', count: 3, tips: '三个字母紧密靠拢，ɑ 和 n 在中格，ɡ 尾巴伸入下格。' },
  'eng': { displayChar: 'enɡ', grid: '占中格和下格', strokes: ['e', 'n', 'ɡ'], strokeOrder: '先写 e，再写 n，最后写 ɡ', count: 3, tips: '清晨看台灯，e 和 n 在中格，ɡ 尾巴伸入下格。' },
  'ing': { displayChar: 'inɡ', grid: '占上中下三格', strokes: ['i', 'n', 'ɡ'], strokeOrder: '先写 i，再写 n，最后写 ɡ', count: 3, tips: '天上老鹰展翅，i 点入上格，ɡ 尾巴入下格。' },
  'ong': { displayChar: 'onɡ', grid: '占中格和下格', strokes: ['o', 'n', 'ɡ'], strokeOrder: '先写 o，再写 n，最后写 ɡ', count: 3, tips: '闹钟走动，o 和 n 在中格，ɡ 尾巴伸入下格。' }
};


/**
 * 统编人教版小学一年级语文拼音标准四线三格矢量笔画生成引擎
 * 严格按照第一线至第四线、上中下三格标准位置排布
 * 彻底解决传统字体 descender/ascender 比例失调、字母在四线三格悬空或越界问题
 */

function sampleArcPoints(cx, cy, rx, ry, startAngle, endAngle, numPoints = 16) {
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const ang = startAngle + (endAngle - startAngle) * t;
    points.push({
      x: cx + rx * Math.cos(ang),
      y: cy + ry * Math.sin(ang)
    });
  }
  return points;
}

function generateBaseLetterStrokes(charKey, cx, y1, y2, y3, y4) {
  const H = y3 - y2; // 中格高度
  const cy = (y2 + y3) / 2; // 中格水平中心线
  const rx = H * 0.44; // 标准字母半宽
  const ry = H * 0.48; // 标准中格半高

  switch (charKey) {
    case 'a': {
      // ɑ (小学统编规范单层：左半圆 + 竖右弯)
      // 1. 左半圆：从中格右上起笔逆时针画椭圆弧
      const p1 = sampleArcPoints(cx - rx * 0.08, cy, rx * 0.95, ry * 0.98, 0.35 * Math.PI, -1.35 * Math.PI, 18);
      // 2. 竖右弯：紧贴右边沿垂直下拉至接近第三线，轻微向右弯出底脚
      const p2 = [
        { x: cx + rx * 0.82, y: y2 },
        { x: cx + rx * 0.82, y: y3 - H * 0.18 },
        { x: cx + rx * 0.86, y: y3 - H * 0.08 },
        { x: cx + rx * 0.82 + H * 0.18, y: y3 }
      ];
      return [
        { name: '左半圆', points: p1 },
        { name: '竖右弯', points: p2 }
      ];
    }

    case 'o': {
      // o (圆：从中格顶偏左逆时针画整圆，占满中格)
      const p1 = sampleArcPoints(cx, cy, rx * 1.02, ry * 0.98, -0.5 * Math.PI, -2.5 * Math.PI, 24);
      return [{ name: '圆', points: p1 }];
    }

    case 'e': {
      // e (横折左半圆：从中格中心起笔向右短横，向上顺势向左画大半圆)
      const arc = sampleArcPoints(cx, cy, rx * 1.0, ry * 0.98, 0, -1.65 * Math.PI, 20);
      const p1 = [{ x: cx - rx * 0.78, y: cy }, ...arc];
      return [{ name: '横折左半圆', points: p1 }];
    }

    case 'i': {
      // i (竖 + 点：短竖在中格，小圆点在上格正中)
      return [
        { name: '竖', points: [{ x: cx, y: y2 }, { x: cx, y: y3 }] },
        { name: '点', type: 'dot', cx: cx, cy: (y1 + y2) / 2, r: 4.8 }
      ];
    }

    case 'u': {
      // u (竖右弯 + 竖：像小水杯在中格)
      const p1 = [
        { x: cx - rx * 0.82, y: y2 },
        { x: cx - rx * 0.82, y: y3 - H * 0.28 },
        { x: cx - rx * 0.75, y: y3 - H * 0.10 },
        { x: cx, y: y3 },
        { x: cx + rx * 0.75, y: y3 - H * 0.10 },
        { x: cx + rx * 0.82, y: y3 - H * 0.28 },
        { x: cx + rx * 0.82, y: y2 }
      ];
      const p2 = [
        { x: cx + rx * 0.82, y: y2 },
        { x: cx + rx * 0.82, y: y3 }
      ];
      return [
        { name: '竖右弯', points: p1 },
        { name: '竖', points: p2 }
      ];
    }

    case 'ü': {
      // ü (u + 左点 + 右点)
      const uStrokes = generateBaseLetterStrokes('u', cx, y1, y2, y3, y4);
      const dotY = y1 + (y2 - y1) * 0.58;
      return [
        uStrokes[0],
        uStrokes[1],
        { name: '左点', type: 'dot', cx: cx - rx * 0.45, cy: dotY, r: 4.2 },
        { name: '右点', type: 'dot', cx: cx + rx * 0.45, cy: dotY, r: 4.2 }
      ];
    }

    case 'b': {
      // b (竖：从第一线稍下起笔垂直入中格到第三线；右半圆：在中格饱满圆润)
      const p1 = [{ x: cx - rx * 0.82, y: y1 + 5 }, { x: cx - rx * 0.82, y: y3 }];
      const p2 = sampleArcPoints(cx - rx * 0.82, cy, rx * 1.65, ry * 0.98, -0.5 * Math.PI, 0.5 * Math.PI, 18);
      return [
        { name: '竖', points: p1 },
        { name: '右半圆', points: p2 }
      ];
    }

    case 'p': {
      // p (竖：从中格第二线起笔下拉直插第四线稍上；右上半圆：在中格)
      const p1 = [{ x: cx - rx * 0.82, y: y2 }, { x: cx - rx * 0.82, y: y4 - 5 }];
      const p2 = sampleArcPoints(cx - rx * 0.82, cy, rx * 1.65, ry * 0.98, -0.5 * Math.PI, 0.5 * Math.PI, 18);
      return [
        { name: '竖', points: p1 },
        { name: '右上半圆', points: p2 }
      ];
    }

    case 'm': {
      // m (竖 + 左弯竖 + 左弯竖：两个小门洞等宽平坐中格)
      const x1 = cx - rx * 1.25;
      const x2 = cx;
      const x3 = cx + rx * 1.25;
      const p1 = [{ x: x1, y: y2 }, { x: x1, y: y3 }];
      const p2 = [
        { x: x1, y: y2 + H * 0.35 },
        { x: x1 + rx * 0.25, y: y2 + H * 0.08 },
        { x: (x1 + x2) / 2, y: y2 },
        { x: x2 - rx * 0.25, y: y2 + H * 0.08 },
        { x: x2, y: y2 + H * 0.35 },
        { x: x2, y: y3 }
      ];
      const p3 = [
        { x: x2, y: y2 + H * 0.35 },
        { x: x2 + rx * 0.25, y: y2 + H * 0.08 },
        { x: (x2 + x3) / 2, y: y2 },
        { x: x3 - rx * 0.25, y: y2 + H * 0.08 },
        { x: x3, y: y2 + H * 0.35 },
        { x: x3, y: y3 }
      ];
      return [
        { name: '竖', points: p1 },
        { name: '左弯竖', points: p2 },
        { name: '左弯竖', points: p3 }
      ];
    }

    case 'f': {
      // f (右弯竖：从第一线右弯起笔垂直至第三线；短横：精准落在第二线上！)
      const p1 = [
        { x: cx + rx * 0.65, y: y1 + H * 0.38 },
        { x: cx + rx * 0.50, y: y1 + H * 0.12 },
        { x: cx + rx * 0.20, y: y1 + 3 },
        { x: cx - rx * 0.12, y: y1 + H * 0.12 },
        { x: cx - rx * 0.15, y: y2 },
        { x: cx - rx * 0.15, y: y3 }
      ];
      const p2 = [{ x: cx - rx * 0.78, y: y2 }, { x: cx + rx * 0.68, y: y2 }];
      return [
        { name: '右弯竖', points: p1 },
        { name: '短横', points: p2 }
      ];
    }

    case 'd': {
      // d (左半圆：在中格；竖：从第一线稍下直通第三线)
      const p1 = sampleArcPoints(cx + rx * 0.82, cy, rx * 1.65, ry * 0.98, 0.5 * Math.PI, 1.5 * Math.PI, 18);
      const p2 = [{ x: cx + rx * 0.82, y: y1 + 5 }, { x: cx + rx * 0.82, y: y3 }];
      return [
        { name: '左半圆', points: p1 },
        { name: '竖', points: p2 }
      ];
    }

    case 't': {
      // t (竖右弯：从第一线稍下直落第三线向右弯；短横：精准落在第二线上！)
      const p1 = [
        { x: cx - rx * 0.08, y: y1 + 7 },
        { x: cx - rx * 0.08, y: y3 - H * 0.22 },
        { x: cx, y: y3 - H * 0.06 },
        { x: cx + rx * 0.68, y: y3 }
      ];
      const p2 = [{ x: cx - rx * 0.75, y: y2 }, { x: cx + rx * 0.65, y: y2 }];
      return [
        { name: '竖右弯', points: p1 },
        { name: '短横', points: p2 }
      ];
    }

    case 'n': {
      // n (竖 + 左弯竖：单门洞在中格)
      const x1 = cx - rx * 0.82;
      const x2 = cx + rx * 0.82;
      const p1 = [{ x: x1, y: y2 }, { x: x1, y: y3 }];
      const p2 = [
        { x: x1, y: y2 + H * 0.35 },
        { x: x1 + rx * 0.35, y: y2 + H * 0.08 },
        { x: cx, y: y2 },
        { x: x2 - rx * 0.35, y: y2 + H * 0.08 },
        { x: x2, y: y2 + H * 0.35 },
        { x: x2, y: y3 }
      ];
      return [
        { name: '竖', points: p1 },
        { name: '左弯竖', points: p2 }
      ];
    }

    case 'l': {
      // l (一笔长竖：从第一线稍下笔直拉至第三线)
      return [{ name: '竖', points: [{ x: cx, y: y1 + 5 }, { x: cx, y: y3 }] }];
    }

    case 'g': {
      // ɡ (小学规范单层：左半圆在中格 + 竖左弯伸入下格)
      const p1 = sampleArcPoints(cx, cy, rx * 0.98, ry * 0.96, 0.32 * Math.PI, -1.35 * Math.PI, 18);
      const p2 = [
        { x: cx + rx * 0.82, y: y2 },
        { x: cx + rx * 0.82, y: y4 - H * 0.35 },
        { x: cx + rx * 0.65, y: y4 - H * 0.10 },
        { x: cx + rx * 0.20, y: y4 - 5 },
        { x: cx - rx * 0.45, y: y4 - 6 }
      ];
      return [
        { name: '左半圆', points: p1 },
        { name: '竖左弯', points: p2 }
      ];
    }

    case 'k': {
      // k (竖：从第一线到第三线；左斜右斜：像小机枪折角稳稳收在中格)
      const p1 = [{ x: cx - rx * 0.68, y: y1 + 5 }, { x: cx - rx * 0.68, y: y3 }];
      const p2 = [
        { x: cx + rx * 0.78, y: y2 + H * 0.12 },
        { x: cx - rx * 0.52, y: cy },
        { x: cx + rx * 0.85, y: y3 }
      ];
      return [
        { name: '竖', points: p1 },
        { name: '左斜右斜', points: p2 }
      ];
    }

    case 'h': {
      // h (长竖从第一线起笔 + 左弯竖像小椅子在中格)
      const x1 = cx - rx * 0.82;
      const x2 = cx + rx * 0.82;
      const p1 = [{ x: x1, y: y1 + 5 }, { x: x1, y: y3 }];
      const p2 = [
        { x: x1, y: y2 + H * 0.35 },
        { x: x1 + rx * 0.35, y: y2 + H * 0.08 },
        { x: cx, y: y2 },
        { x: x2 - rx * 0.35, y: y2 + H * 0.08 },
        { x: x2, y: y2 + H * 0.35 },
        { x: x2, y: y3 }
      ];
      return [
        { name: '竖', points: p1 },
        { name: '左弯竖', points: p2 }
      ];
    }

    case 'j': {
      // j (竖左弯从中格穿过下格轻轻向左勾 + 点在上格)
      const p1 = [
        { x: cx + rx * 0.18, y: y2 },
        { x: cx + rx * 0.18, y: y4 - H * 0.35 },
        { x: cx + rx * 0.05, y: y4 - H * 0.10 },
        { x: cx - rx * 0.25, y: y4 - 5 },
        { x: cx - rx * 0.62, y: y4 - 7 }
      ];
      return [
        { name: '竖左弯', points: p1 },
        { name: '点', type: 'dot', cx: cx + rx * 0.18, cy: (y1 + y2) / 2, r: 4.8 }
      ];
    }

    case 'q': {
      // q (左半圆在中格 + 直竖从中格直扎下格第四线稍上)
      const p1 = sampleArcPoints(cx - rx * 0.05, cy, rx * 0.96, ry * 0.96, 0.35 * Math.PI, -1.35 * Math.PI, 18);
      const p2 = [{ x: cx + rx * 0.82, y: y2 }, { x: cx + rx * 0.82, y: y4 - 5 }];
      return [
        { name: '左半圆', points: p1 },
        { name: '竖', points: p2 }
      ];
    }

    case 'x': {
      // x (右斜 \ + 左斜 /：交点精准落在中格正中央)
      const p1 = [{ x: cx - rx * 0.82, y: y2 }, { x: cx + rx * 0.82, y: y3 }];
      const p2 = [{ x: cx + rx * 0.82, y: y2 }, { x: cx - rx * 0.82, y: y3 }];
      return [
        { name: '右斜', points: p1 },
        { name: '左斜', points: p2 }
      ];
    }

    case 'r': {
      // r (短竖居中格 + 右上弯迎向朝阳)
      const p1 = [{ x: cx - rx * 0.58, y: y2 }, { x: cx - rx * 0.58, y: y3 }];
      const p2 = [
        { x: cx - rx * 0.58, y: y2 + H * 0.38 },
        { x: cx - rx * 0.20, y: y2 + H * 0.08 },
        { x: cx + rx * 0.20, y: y2 },
        { x: cx + rx * 0.65, y: y2 + H * 0.18 }
      ];
      return [
        { name: '竖', points: p1 },
        { name: '右上弯', points: p2 }
      ];
    }

    case 'z': {
      // z (横折横一笔写成，稳坐中格)
      const p1 = [
        { x: cx - rx * 0.82, y: y2 },
        { x: cx + rx * 0.82, y: y2 },
        { x: cx - rx * 0.82, y: y3 },
        { x: cx + rx * 0.82, y: y3 }
      ];
      return [{ name: '横折横', points: p1 }];
    }

    case 'c': {
      // c (左半圆饱满上下触碰第二、三线)
      const p1 = sampleArcPoints(cx + rx * 0.15, cy, rx * 0.95, ry * 0.98, 0.35 * Math.PI, -1.35 * Math.PI, 20);
      return [{ name: '左半圆', points: p1 }];
    }

    case 's': {
      // s (半个8字：向左弯再向右弯，上小下大稳稳占满中格)
      const p1 = [
        { x: cx + rx * 0.52, y: y2 + H * 0.14 },
        { x: cx + rx * 0.20, y: y2 + 2 },
        { x: cx - rx * 0.45, y: y2 + H * 0.14 },
        { x: cx - rx * 0.52, y: y2 + H * 0.34 },
        { x: cx, y: cy },
        { x: cx + rx * 0.55, y: y3 - H * 0.34 },
        { x: cx + rx * 0.55, y: y3 - H * 0.14 },
        { x: cx + rx * 0.20, y: y3 - 2 },
        { x: cx - rx * 0.55, y: y3 - H * 0.14 }
      ];
      return [{ name: '半个8字', points: p1 }];
    }

    case 'y': {
      // y (右斜短在中格 + 左斜长直插第四线底部)
      const p1 = [{ x: cx - rx * 0.82, y: y2 }, { x: cx, y: cy + H * 0.10 }];
      const p2 = [{ x: cx + rx * 0.82, y: y2 }, { x: cx - rx * 0.85, y: y4 - 5 }];
      return [
        { name: '右斜短', points: p1 },
        { name: '左斜长', points: p2 }
      ];
    }

    case 'w': {
      // w (斜下斜上斜下斜上：两尖角稳踩第三线)
      const p1 = [
        { x: cx - rx * 1.25, y: y2 },
        { x: cx - rx * 0.62, y: y3 },
        { x: cx, y: y2 }
      ];
      const p2 = [
        { x: cx, y: y2 },
        { x: cx + rx * 0.62, y: y3 },
        { x: cx + rx * 1.25, y: y2 }
      ];
      return [
        { name: '斜下斜上', points: p1 },
        { name: '斜下斜上', points: p2 }
      ];
    }

    default:
      return [{ name: charKey, points: [{ x: cx, y: y2 }, { x: cx, y: y3 }] }];
  }
}

/**
 * 分解并获取任意教学字母/复合拼音的完整矢量笔画
 */
function getLetterStrokes(letter, cx, y1, y2, y3, y4) {
  const norm = (letter || 'a').toLowerCase().trim().replace(/ɑ/g, 'a').replace(/ɡ/g, 'g');
  const H = y3 - y2;

  // 1. 单字母 (26个基础字母)
  if (norm.length === 1) {
    return generateBaseLetterStrokes(norm, cx, y1, y2, y3, y4);
  }

  // 2. 双字母组合 (zh, ch, sh, ai, ei, ui, ao, ou, iu, ie, üe, er, an, en, in, un, ün)
  if (norm.length === 2) {
    const c1 = norm[0];
    const c2 = norm[1];
    const spacing = H * 0.76;
    const x1 = cx - spacing * 0.52;
    const x2 = cx + spacing * 0.52;

    const s1 = generateBaseLetterStrokes(c1, x1, y1, y2, y3, y4);
    const s2 = generateBaseLetterStrokes(c2, x2, y1, y2, y3, y4);

    return [
      ...s1.map(s => ({ ...s, name: `${c1}：${s.name}` })),
      ...s2.map(s => ({ ...s, name: `${c2}：${s.name}` }))
    ];
  }

  // 3. 三字母组合 (ang, eng, ing, ong)
  if (norm.length === 3) {
    const c1 = norm[0];
    const c2 = norm[1];
    const c3 = norm[2];
    const spacing = H * 0.65;
    const x1 = cx - spacing * 1.05;
    const x2 = cx;
    const x3 = cx + spacing * 1.05;

    const s1 = generateBaseLetterStrokes(c1, x1, y1, y2, y3, y4);
    const s2 = generateBaseLetterStrokes(c2, x2, y1, y2, y3, y4);
    const s3 = generateBaseLetterStrokes(c3, x3, y1, y2, y3, y4);

    return [
      ...s1.map(s => ({ ...s, name: `${c1}：${s.name}` })),
      ...s2.map(s => ({ ...s, name: `${c2}：${s.name}` })),
      ...s3.map(s => ({ ...s, name: `${c3}：${s.name}` }))
    ];
  }

  return generateBaseLetterStrokes('a', cx, y1, y2, y3, y4);
}



class PinyinStrokeCanvas {
  constructor(canvasId, containerId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.container = document.getElementById(containerId);

    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.brushColor = '#2563EB'; // 默认纯正书写蓝
    this.brushWidth = 7;
    this.currentLetter = 'a';
    this.userStrokes = []; // 存储孩子手绘线条，不破坏底层四线三格与描红字模
    this.currentPath = null;
    this.demoTimer = null;

    this.initCanvasSize();
    this.bindEvents();
    this.drawBackground();
  }

  getStrokeInfo(letter) {
    const key = (letter || 'a').toLowerCase().trim().replace(/ɑ/g, 'a').replace(/ɡ/g, 'g');
    if (PINYIN_STROKE_DATA[key]) {
      return PINYIN_STROKE_DATA[key];
    }
    return {
      displayChar: key.replace(/a/g, 'ɑ').replace(/g/g, 'ɡ'),
      grid: '占中格',
      strokes: [key],
      strokeOrder: `先写 ${key}，一笔一画规范书写`,
      count: 1,
      tips: '按照四线三格规范端正书写，不越界。'
    };
  }

  initCanvasSize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 360;
    const height = rect.height || 260;

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // 彻底消除重置变形叠加
    this.ctx.scale(dpr, dpr);
    this.displayW = width;
    this.displayH = height;
  }

  /**
   * 绘制符合人教版教材标准的拼音四线三格
   */
  drawBackground() {
    if (!this.ctx) return;
    const w = this.displayW;
    const h = this.displayH;

    // 清空重绘
    this.ctx.clearRect(0, 0, w, h);

    // 计算标准四线三格坐标 (三格严格等高)
    const padding = 26;
    const usableH = h - padding * 2;
    const step = usableH / 3;

    const y1 = padding;             // 第一线（上虚线）
    const y2 = padding + step;         // 第二线（红实线-中格顶线）
    const y3 = padding + step * 2;     // 第三线（红实线-基准线）
    const y4 = padding + usableH;      // 第四线（下虚线）

    this.lineYs = [y1, y2, y3, y4];
    this.gridStep = step;

    // 中格微粉底色，温馨提示孩子主要字母身子住中格
    this.ctx.fillStyle = 'rgba(254, 243, 199, 0.55)';
    this.ctx.fillRect(0, y2, w, step);

    // 绘制 4 条标准基准线
    const lines = [
      { y: y1, color: '#60A5FA', dash: [5, 4], width: 1.5 }, // 第一线
      { y: y2, color: '#EF4444', dash: [], width: 2 },       // 第二线 (红实线)
      { y: y3, color: '#EF4444', dash: [], width: 2 },       // 第三线 (红实线-基准线)
      { y: y4, color: '#60A5FA', dash: [5, 4], width: 1.5 }  // 第四线
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

    this.ctx.setLineDash([]); // 还原实线

    // 左侧标注：上格、中格、下格水印标签
    this.ctx.save();
    this.ctx.font = 'bold 11px sans-serif';
    this.ctx.fillStyle = 'rgba(156, 163, 175, 0.65)';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('上格', 12, (y1 + y2) / 2);
    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
    this.ctx.fillText('中格', 12, (y2 + y3) / 2);
    this.ctx.fillStyle = 'rgba(156, 163, 175, 0.65)';
    this.ctx.fillText('下格', 12, (y3 + y4) / 2);
    this.ctx.restore();

    // 绘制浅色字模描红虚线与起笔顺序编号
    this.drawTraceGuide();

    // 绘制孩子书写的笔迹
    this.drawUserStrokes();
  }

  /**
   * 绘制单笔画线条（支持进度裁剪）
   */
  drawStrokePoints(ctx, points, progress = 1, style = {}) {
    if (!points || points.length < 2) return null;

    const segLens = [];
    let totalLen = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      segLens.push(dist);
      totalLen += dist;
    }

    if (totalLen <= 0) return null;

    const targetDist = Math.max(0, Math.min(totalLen, totalLen * progress));
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = style.color || '#059669';
    ctx.lineWidth = style.lineWidth || 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (style.dash) {
      ctx.setLineDash(style.dash);
    } else {
      ctx.setLineDash([]);
    }

    let covered = 0;
    let tipPoint = { x: points[0].x, y: points[0].y };
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < segLens.length; i++) {
      const segLen = segLens[i];
      const p1 = points[i];
      const p2 = points[i + 1];

      if (covered + segLen <= targetDist) {
        ctx.lineTo(p2.x, p2.y);
        covered += segLen;
        tipPoint = { x: p2.x, y: p2.y };
      } else {
        const remain = targetDist - covered;
        const ratio = segLen > 0 ? remain / segLen : 0;
        tipPoint = {
          x: p1.x + (p2.x - p1.x) * ratio,
          y: p1.y + (p2.y - p1.y) * ratio
        };
        ctx.lineTo(tipPoint.x, tipPoint.y);
        break;
      }
    }

    ctx.stroke();
    ctx.restore();

    if (style.showTip && progress > 0 && progress < 1) {
      this.drawPenBeacon(ctx, tipPoint.x, tipPoint.y);
    }

    return tipPoint;
  }

  /**
   * 绘制单笔画圆点
   */
  drawStrokeDot(ctx, stroke, progress = 1, style = {}) {
    const { cx, cy, r } = stroke;
    const curR = r * Math.min(1.0, progress * 1.2);
    ctx.save();
    ctx.fillStyle = style.color || '#059669';
    ctx.beginPath();
    ctx.arc(cx, cy, curR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (style.showTip && progress > 0 && progress < 1) {
      this.drawPenBeacon(ctx, cx, cy);
    }
    return { x: cx, y: cy };
  }

  drawSingleStroke(ctx, stroke, progress = 1, style = {}) {
    if (stroke.type === 'dot') {
      return this.drawStrokeDot(ctx, stroke, progress, style);
    }
    return this.drawStrokePoints(ctx, stroke.points, progress, style);
  }

  /**
   * 绘制笔尖动态光标 (吸引小朋友注意笔尖运动)
   */
  drawPenBeacon(ctx, x, y) {
    ctx.save();
    // 外层琥珀金呼吸光晕
    ctx.beginPath();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.arc(x, y, 9.5, 0, Math.PI * 2);
    ctx.fill();

    // 内层亮红笔尖核心
    ctx.beginPath();
    ctx.fillStyle = '#EF4444';
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 笔尖高光
    ctx.beginPath();
    ctx.fillStyle = '#FFFFFF';
    ctx.arc(x - 1, y - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * 绘制符合小学规范的拼音描红字模（严格基于四线三格基准线）
   */
  drawTraceGuide() {
    if (!this.currentLetter) return;
    const [y1, y2, y3, y4] = this.lineYs;
    const cx = this.displayW / 2;
    const strokes = getLetterStrokes(this.currentLetter, cx, y1, y2, y3, y4);
    const ctx = this.ctx;

    // 1. 绘制虚线描红骨架 (灰色规范基准)
    strokes.forEach(stroke => {
      this.drawSingleStroke(ctx, stroke, 1.0, {
        color: 'rgba(156, 163, 175, 0.45)',
        lineWidth: 6.5,
        dash: [4, 4]
      });
    });

    // 2. 绘制起笔位置编号引导气泡 (①, ②, ③)
    strokes.forEach((stroke, idx) => {
      let pt = null;
      if (stroke.type === 'dot') {
        pt = { x: stroke.cx, y: stroke.cy };
      } else if (stroke.points && stroke.points.length > 0) {
        pt = stroke.points[0];
      }
      if (pt) {
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = '#2563EB'; // 亮蓝起笔徽标
        ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(idx + 1), pt.x, pt.y + 0.5);
        ctx.restore();
      }
    });
  }

  /**
   * 绘制孩子手绘的笔迹
   */
  drawUserStrokes() {
    if (!this.userStrokes || this.userStrokes.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.userStrokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color || this.brushColor;
      ctx.lineWidth = stroke.width || this.brushWidth;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
    ctx.restore();
  }

  /**
   * 设置当前描红的字母并重置画布
   */
  setLetter(letter) {
    if (this.demoTimer) {
      clearInterval(this.demoTimer);
      this.demoTimer = null;
    }
    this.currentLetter = letter;
    this.userStrokes = [];
    this.initCanvasSize();
    this.drawBackground();
  }

  /**
   * 清除画布上孩子的涂鸦并恢复字模
   */
  clear() {
    if (this.demoTimer) {
      clearInterval(this.demoTimer);
      this.demoTimer = null;
    }
    this.userStrokes = [];
    this.initCanvasSize();
    this.drawBackground();
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
      e.preventDefault();
      this.isDrawing = true;
      const pos = getPos(e);
      this.currentPath = {
        color: this.brushColor,
        width: this.brushWidth,
        points: [pos]
      };
      this.userStrokes.push(this.currentPath);
      this.lastX = pos.x;
      this.lastY = pos.y;
    };

    const drawing = (e) => {
      if (!this.isDrawing || !this.currentPath) return;
      e.preventDefault();
      const pos = getPos(e);
      this.currentPath.points.push(pos);

      // 实时增量绘制当前片段
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.strokeStyle = this.brushColor;
      this.ctx.lineWidth = this.brushWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
      this.ctx.restore();

      this.lastX = pos.x;
      this.lastY = pos.y;
    };

    const stopDraw = () => {
      if (this.isDrawing) {
        this.isDrawing = false;
        this.currentPath = null;
      }
    };

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', drawing, { passive: false });
    canvas.addEventListener('touchend', stopDraw, { passive: false });
    canvas.addEventListener('touchcancel', stopDraw, { passive: false });

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', drawing);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);

    window.addEventListener('resize', () => {
      this.initCanvasSize();
      this.drawBackground();
    });
  }

  /**
   * 规范分步笔顺动画示范
   * 真实按笔顺逐笔生动书写，配合闪亮笔尖与笔顺名称实时播报
   * @param {function} onStepCallback - 每笔动画回调 (stepNumber, strokeName)
   * @param {function} onDone - 全部示范完成回调
   */
  demonstrate(onStepCallback = null, onDone = null) {
    if (this.demoTimer) {
      clearInterval(this.demoTimer);
      this.demoTimer = null;
    }

    this.userStrokes = [];
    this.drawBackground();

    const [y1, y2, y3, y4] = this.lineYs;
    const cx = this.displayW / 2;
    const strokes = getLetterStrokes(this.currentLetter, cx, y1, y2, y3, y4);

    if (!strokes || strokes.length === 0) {
      if (onDone) onDone();
      return;
    }

    let strokeIndex = 0;
    let progress = 0.0;
    let pauseRemaining = 0;

    // 触发第一笔回调
    if (onStepCallback) {
      onStepCallback(1, strokes[0].name);
    }

    this.demoTimer = setInterval(() => {
      if (pauseRemaining > 0) {
        pauseRemaining--;
        return;
      }

      progress += 0.045; // 平滑书写步长 (约 650ms/笔)

      // 重绘画布底色与描红基准
      this.drawBackground();
      const ctx = this.ctx;

      // 1. 绘制所有已经书写完成的笔画 (规范墨绿翡翠实线)
      for (let i = 0; i < strokeIndex; i++) {
        this.drawSingleStroke(ctx, strokes[i], 1.0, {
          color: '#059669',
          lineWidth: 7.2
        });
      }

      // 2. 动态书写当前进行中的笔画
      const curStroke = strokes[strokeIndex];
      this.drawSingleStroke(ctx, curStroke, Math.min(1.0, progress), {
        color: '#059669',
        lineWidth: 7.2,
        showTip: true
      });

      // 3. 右上角绘制规范笔顺角标卡片
      ctx.save();
      const badgeText = `第 ${strokeIndex + 1} 笔：${curStroke.name}`;
      ctx.font = 'bold 12px sans-serif';
      const textMetrics = ctx.measureText(badgeText);
      const bgW = textMetrics.width + 20;
      const bgH = 24;
      const bgX = this.displayW - bgW - 12;
      const bgY = 10;

      // 翡翠绿圆角标签
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bgX, bgY, bgW, bgH, 12) : ctx.rect(bgX, bgY, bgW, bgH);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, bgX + bgW / 2, bgY + bgH / 2);
      ctx.restore();

      // 当本笔写完时
      if (progress >= 1.0) {
        strokeIndex++;
        progress = 0;
        pauseRemaining = 6; // 停留约 180ms，体现书法顿笔呼吸感

        if (strokeIndex >= strokes.length) {
          clearInterval(this.demoTimer);
          this.demoTimer = null;

          // 保持全字墨绿实线最终呈现
          this.drawBackground();
          strokes.forEach(s => {
            this.drawSingleStroke(ctx, s, 1.0, {
              color: '#059669',
              lineWidth: 7.2
            });
          });

          // 播放成功音效
          if (window.audioEngine) {
            window.audioEngine.playSuccess();
          }
          if (onDone) onDone();
        } else {
          if (onStepCallback) {
            onStepCallback(strokeIndex + 1, strokes[strokeIndex].name);
          }
        }
      }
    }, 30);
  }
}

if (typeof window !== 'undefined') {
  window.PINYIN_STROKE_DATA = PINYIN_STROKE_DATA;
  window.PinyinStrokeCanvas = PinyinStrokeCanvas;
}

