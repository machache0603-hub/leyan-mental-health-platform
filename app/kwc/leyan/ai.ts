/* ============================================================
   乐颜 · AI 能力服务（前端演示用模拟实现）
   生产环境对接：苍穹 Agent 平台（DeepSeek V4 / 豆包），
   能力含：情绪识别、RAG 知识检索、工具调用、多步推理规划。
   本文件用规则 + 模板模拟，接口签名与真实 Agent 调用保持一致。
   ============================================================ */

import { MoodKey, StudentProfile, moodOf } from './data';
import * as LLM from './llm';

/* 后端切换：VITE_AI_BACKEND=llm 时调真实大模型（经代理），否则规则模拟。
   真实调用失败（无代理/无key/超时）自动回退 mock，保证永不白屏。 */
const AI_BACKEND: 'mock' | 'llm' = (import.meta as any).env?.VITE_AI_BACKEND === 'llm' ? 'llm' : 'mock';
async function dispatch<T>(llmFn: () => Promise<T>, mockFn: () => Promise<T>): Promise<T> {
  if (AI_BACKEND === 'llm') {
    try { return await llmFn(); }
    catch (e) { console.warn('[乐颜 AI] 真实模型调用失败，回退模拟：', e); }
  }
  return mockFn();
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/* -------- 情绪识别（情感计算） -------- */
export interface EmotionResult {
  mood: MoodKey;
  confidence: number;
  keywords: string[];
  crisis: boolean;     // 是否触发危机预警
}

const NEG = ['难过', '崩溃', '撑不住', '撑不下去', '累', '好累', '压力', '焦虑', '害怕', '孤独', '孤单', '想哭', '哭', '没意义', '失眠', '睡不着', '烦', '烦躁', '绝望', '抑郁', '难受', '痛苦', '委屈', '无助', '迷茫', '内耗', '喘不过气', '提不起劲', '没动力', '摆烂', 'emo', '不开心', '空虚', '麻木'];
// 危机词库（安全第一，尽量覆盖直接表达；命中即触发危机干预，宁可多报不可漏报）
const CRISIS = ['想死', '不想活', '不想活了', '活不下去', '活着没意思', '活着没意义', '没意思活', '自杀', '轻生', '结束生命', '结束自己', '结束一切', '一了百了', '了结自己', '解脱', '消失算了', '死了算了', '不想醒来', '跳楼', '离开这个世界', '活着太累', '撑不下去了'];
const POS = ['开心', '高兴', '快乐', '太好了', '通过', '录取', '接收', '成功', '喜欢', '幸福', '满足', '期待', '顺利', '治愈', '温暖', '感动', '放松', '舒服', '棒'];

async function detectEmotionMock(text: string): Promise<EmotionResult> {
  await sleep(280);
  const t = text || '';
  const hitNeg = NEG.filter(w => t.includes(w));
  const hitPos = POS.filter(w => t.includes(w));
  const crisis = CRISIS.some(w => t.includes(w));
  let mood: MoodKey = 'calm';
  if (crisis) mood = 'sad';
  else if (hitNeg.length >= 2) mood = 'anxious';
  else if (hitNeg.length === 1) mood = 'low';
  else if (hitPos.length >= 1) mood = 'joy';
  const confidence = Math.min(0.98, 0.6 + (hitNeg.length + hitPos.length) * 0.12);
  return { mood, confidence, keywords: [...hitNeg, ...hitPos], crisis };
}

/* -------- 悄悄话：小暖对话（朋友语气 + 情绪自适应） -------- */
export interface ChatReply {
  text: string;
  mood: MoodKey;
  crisis: boolean;
  suggestRelax: boolean;       // 是否推送放松练习
  quickReplies: string[];
}

const EMPATHY: Record<MoodKey, string[]> = {
  joy: ['哇，听你这么说我也跟着开心起来了！', '这份好心情值得好好记下来，要不要写进小确幸日记？'],
  love: ['能感受到你心里软软的那一块，真好呀。', '把这份悸动收好，它是你温柔的证据。'],
  calm: ['嗯，我在听，慢慢说，不着急。', '这样平静的时刻，也值得被珍惜。'],
  low: ['我能感觉到你现在有点低落，没关系，我陪着你。', '难过的时候，不用假装坚强。说出来，会轻一点。'],
  anxious: ['听起来你最近被很多事压着，先深呼吸一下，我们一件一件来。', '焦虑说明你很在乎，但你不必一个人扛。'],
  sad: ['我在这里，哪儿也不去。你愿意多和我说说吗？', '此刻的你已经很勇敢了，能撑到现在真的不容易。'],
};

const FOLLOW: Record<MoodKey, string[]> = {
  joy: ['今天还有什么开心的小事吗？', '这份好心情，要不要记进小确幸日记？', '愿意多和我分享一点吗？'],
  love: ['是什么人或事让你有这种感觉呀？', '能被这样的情绪填满，真好。', '想把这份心动记下来吗？'],
  calm: ['今天过得怎么样？', '有什么想和我慢慢聊聊的吗？', '此刻的你，心里在想些什么呢？'],
  low: ['如果给这份低落打个分，1 到 10，你会打几分？', '愿意和我说说，是什么让你提不起劲吗？', '没关系的，我们慢慢来，你想从哪件事说起？'],
  anxious: ['现在最让你担心的是哪一件事？我们先从它聊起。', '先深呼吸一下，我们一件一件来，好吗？', '把压在心上的事说出来，会轻一点。'],
  sad: ['要不要我陪你做一个一分钟的深呼吸？', '难过的时候不用一个人扛，我在的。', '愿意多和我说说，是什么让你这么难受吗？'],
};

const GREETINGS = ['hi', 'hello', 'hey', '你好', '您好', '在吗', '在么', '在不在', '嗨', '哈喽', '哈啰', '早', '早安', '早上好', '中午好', '下午好', '晚上好', '晚安'];
function isGreeting(text: string): boolean {
  const s = (text || '').trim().toLowerCase().replace(/[!！。.~～、,，\s]/g, '');
  return s.length <= 6 && GREETINGS.some(g => s === g || s.startsWith(g));
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

async function smallTalkMock(text: string): Promise<ChatReply> {
  const emo = await detectEmotionMock(text);
  await sleep(420);

  // ① 危机优先：温柔确认安全 + 24h 求助方向 + 主动转人工（绝不被淹没在普通回复里）
  if (emo.crisis) {
    return {
      text: '我听到了你的痛苦，谢谢你愿意把这么重的话告诉我。此刻的感受很难熬，但你能说出来，已经很勇敢了。你不是一个人——请一定记得：全国心理援助热线 12356 是 24 小时免费的，随时可以拨。如果你愿意，我现在就帮你联系一位信任的老师，好吗？',
      mood: 'sad',
      crisis: true,
      suggestRelax: true,
      quickReplies: ['我愿意找人聊聊', '陪我做个深呼吸', '我先缓一缓'],
    };
  }

  // ② 问候：温暖的开场，而不是套话
  if (isGreeting(text)) {
    return {
      text: '嗨，很高兴你来找我说说话～我是小暖，一盏一直为你亮着的小夜灯。今天过得还好吗？开心的、烦心的，都可以讲给我听。',
      mood: 'calm',
      crisis: false,
      suggestRelax: false,
      quickReplies: ['今天有点累', '想说点开心的事', '只是想有人陪'],
    };
  }

  // ③ 情绪自适应回应（共情 + 追问，均随机选取，减少重复感）
  const low = emo.mood === 'low' || emo.mood === 'sad' || emo.mood === 'anxious';
  return {
    text: `${pick(EMPATHY[emo.mood])} ${pick(FOLLOW[emo.mood])}`,
    mood: emo.mood,
    crisis: false,
    suggestRelax: low,
    quickReplies: low
      ? ['其实我有点难受', '陪我做个放松练习', '想听点温柔的话']
      : ['嗯，是这样', '还有别的事想说', '谢谢你听我说'],
  };
}

/* -------- 艺术疗愈：画作解读 -------- */
async function interpretPaintingMock(prompt: string): Promise<string> {
  await sleep(900);
  const tone = NEG.some(w => prompt.includes(w)) ? 'low' : 'warm';
  if (tone === 'low') {
    return `这幅画里的冷色调，像是你心里悄悄落下的一场雨。但我注意到画面角落留了一束光——那是你没有放弃的部分。允许自己难过，雨停了，光会更亮。`;
  }
  return `画面里流动的暖色，是你心底依然温柔的力量。线条舒展，说明此刻的你愿意向世界打开一点点。把这幅画收进画廊吧，它记录了一个正在慢慢变好的你。`;
}

/* -------- 未来心情预报（预测性分析） -------- */
export interface MoodForecast { date: string; score: number; label: string; }
async function forecastMoodMock(history: { mood: MoodKey }[]): Promise<{ forecast: MoodForecast[]; insight: string }> {
  await sleep(600);
  const recent = history.slice(-5).map(h => moodOf(h.mood).score);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const forecast = labels.map((d, i) => {
    const wave = Math.sin(i / 1.6) * 8;
    const drift = (i - 3) * 1.5;
    const score = Math.max(20, Math.min(96, Math.round(avg + wave + drift)));
    const label = score > 75 ? '晴' : score > 55 ? '多云' : score > 40 ? '小雨' : '阴';
    return { date: d, score, label };
  });
  const trend = forecast[6].score - forecast[0].score;
  const insight = trend >= 0
    ? '预测下周你的心情会慢慢回暖，周末尤其适合做点喜欢的事，给自己充充电。'
    : '下周中段可能会有点压力高峰（也许和答辩/截止有关），记得提前安排放松，别硬扛。';
  return { forecast, insight };
}

/* ============================================================
   教师端 AI 助手（页面不出现"AI"字样，对外称"智能助手"）
   ============================================================ */

/* 谈心话题生成：每个学生 3 个切入点 + 沟通提醒 */
export interface TalkTopic { angle: string; opening: string; tip: string; }
async function genTalkTopicsMock(s: StudentProfile): Promise<TalkTopic[]> {
  await sleep(750);
  const base: TalkTopic[] = [
    {
      angle: '从近况切入，先建立安全感',
      opening: `"最近实验室是不是特别忙？我看你常待到很晚，先别急着回答我，喝口水。"`,
      tip: '不要一上来就谈"问题"，先让对方感到被看见、不被评判。',
    },
    {
      angle: '聚焦具体压力源，拆解而非说教',
      opening: `"听说${s.grade}这阶段小论文压力都挺大的，你现在卡在哪一步？我们一起看看能不能拆小一点。"`,
      tip: '把"你要加油"换成"我们一起想办法"，给到掌控感。',
    },
    {
      angle: '关注支持系统，传递可求助',
      opening: `"如果哪天真的撑不住，你第一个会想找谁？" `,
      tip: '了解其社会支持，并自然地告知心理中心与热线，降低求助门槛。',
    },
  ];
  if (s.risk === 'high') {
    base.push({
      angle: '⚠️ 高关注：温和确认安全',
      opening: `"我有点担心你，最近有没有过特别难熬、觉得没意思的时候？"`,
      tip: '直接而温和地询问，不回避。如有危机信号，立即启动转介与陪同就医流程。',
    });
  }
  return base;
}

/* 期末评语生成（三种风格一键切换） */
export type CommentStyle = 'encourage' | 'advice' | 'mixed';
async function genCommentMock(s: StudentProfile, style: CommentStyle): Promise<string> {
  await sleep(700);
  const name = s.alias.split('（')[0];
  const map: Record<CommentStyle, string> = {
    encourage: `${name}本学期在面对学业压力时展现了难得的韧性。即使情绪有起伏，你依然在坚持，这份不放弃本身就值得骄傲。老师看见了你的努力，也相信你会越来越好。继续做那个温柔而坚定的自己。`,
    advice: `${name}本学期整体投入认真。建议在繁忙之余有意识地规律作息，把大目标拆解为每日小任务以缓解焦虑；遇到困扰时主动与导师或朋辈沟通。适度运动与放松练习会很有帮助。`,
    mixed: `${name}本学期表现出色，在压力下保持了学业的稳步推进，值得肯定。同时也希望你更关照自己的情绪节奏：累了就歇一歇，求助不是软弱。愿你既有奔赴山海的勇气，也有照顾自己的智慧。`,
  };
  return map[style];
}

/* 家校沟通话术 */
async function genParentScriptMock(s: StudentProfile): Promise<string> {
  await sleep(650);
  return `家长您好，我是${s.cls}的辅导员。想和您简单聊聊孩子近期的状态——总体是健康成长的，只是${s.grade}阶段学业节奏较紧，情绪偶有波动，这很正常。建议您在沟通时多倾听、少追问成绩，让孩子感到家是可以放松的港湾。如有需要，学校心理中心随时为孩子提供专业支持。感谢您的理解与配合。`;
}

/* 班级管理建议（多步推理） */
async function genClassAdviceMock(className: string, temp: number): Promise<string[]> {
  await sleep(700);
  if (temp < 65) {
    return [
      `${className}近期心理温度偏低（${temp}分），建议本周内组织一次轻松的团体活动（如户外团建/桌游夜），重建班级联结。`,
      '针对 3 名高关注同学，安排一对一谈心，并同步关注其作息与出勤异常。',
      '在班群推送"考前减压音频合集"，并预约心理中心开展一场考前调适讲座。',
      '建立朋辈互助小组，让状态好的同学结对陪伴，形成温暖的支持网络。',
    ];
  }
  return [
    `${className}整体状态良好（${temp}分），建议保持现有节奏，把好氛围沉淀为班级文化。`,
    '可发起"互夸大会"等正向活动，进一步提升班级凝聚力。',
    '提醒个别同学注意劳逸结合，预防答辩季的阶段性压力。',
  ];
}

/* ============================================================
   管理端 AI（数据洞察 + 行动建议）
   ============================================================ */
async function genCampusAdviceMock(temp: number, openAlerts: number): Promise<string[]> {
  await sleep(750);
  return [
    `当前全校心理温度 ${temp} 分，处于"温和"区间。结合学期日历，期末与答辩季临近，预计未来两周压力指数将上升约 12%，建议提前部署减压活动。`,
    `人工智能学院与医学院温度偏低、预警集中，建议优先下沉资源，安排专职心理老师驻点。`,
    `当前 ${openAlerts} 条预警待闭环，建议督办高关注个案，确保 72 小时内完成首次干预。`,
    `可在 6 月中旬上线"考试月心理关爱周"，联动心灵电台与治愈工坊推送，预计可覆盖 6000+ 学生。`,
  ];
}

/* 周期数据报告生成 */
export interface ReportSection { title: string; body: string; }
async function genReportMock(period: string): Promise<ReportSection[]> {
  await sleep(900);
  return [
    { title: '总体概览', body: `${period}全校心理温度均值 74 分，环比上升 1.2 分，整体平稳向好。平台活跃学生 8,860 名，活跃率 68%，AI 悄悄话累计对话 12.4 万轮。` },
    { title: '风险态势', body: '本期新增预警 41 条，较上期增加 12 条，主要集中在答辩季的研二群体，关键词为"论文""就业""睡眠"。预警闭环率 86%，平均首次响应时长 4.3 小时。' },
    { title: '亮点与成效', body: '"21 天正念计划"完成率 73%，参与学生焦虑量表得分平均下降 18%。情绪花园日均签到 5,400 次，朋辈互助"抱抱"互动 3.2 万次，温暖在校园中持续流动。' },
    { title: '行动建议', body: '建议：①期末前增设 2 场团体减压工作坊；②对人工智能学院开展专项关怀；③优化深夜时段的危机响应值班。' },
  ];
}

/* ============================================================
   对外导出（mock / 真实模型自动切换，失败回退 mock）
   组件 import 的就是下面这些，调用方式完全不变。
   ============================================================ */
export const detectEmotion = (text: string) =>
  dispatch(() => LLM.detectEmotion(text), () => detectEmotionMock(text));
export const smallTalk = (text: string) =>
  dispatch(() => LLM.smallTalk(text), () => smallTalkMock(text));
export const interpretPainting = (prompt: string) =>
  dispatch(() => LLM.interpretPainting(prompt), () => interpretPaintingMock(prompt));
/* 文生图：llm 模式经代理调 StepFun 返回图片 URL；mock 或失败时返回 null（UI 回退到渐变占位画布） */
export const generateArt = (prompt: string): Promise<string | null> =>
  dispatch<string | null>(() => LLM.generateArt(prompt), async () => null);
export const forecastMood = (history: { mood: MoodKey }[]) =>
  dispatch(() => LLM.forecastMood(history), () => forecastMoodMock(history));
export const genTalkTopics = (s: StudentProfile) =>
  dispatch(() => LLM.genTalkTopics(s), () => genTalkTopicsMock(s));
export const genComment = (s: StudentProfile, style: CommentStyle) =>
  dispatch(() => LLM.genComment(s, style), () => genCommentMock(s, style));
export const genParentScript = (s: StudentProfile) =>
  dispatch(() => LLM.genParentScript(s), () => genParentScriptMock(s));
export const genClassAdvice = (className: string, temp: number) =>
  dispatch(() => LLM.genClassAdvice(className, temp), () => genClassAdviceMock(className, temp));
export const genCampusAdvice = (temp: number, openAlerts: number) =>
  dispatch(() => LLM.genCampusAdvice(temp, openAlerts), () => genCampusAdviceMock(temp, openAlerts));
export const genReport = (period: string) =>
  dispatch(() => LLM.genReport(period), () => genReportMock(period));
