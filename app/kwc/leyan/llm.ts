/* ============================================================
   乐颜 · 真实大模型实现（经代理后端调用 DeepSeek/豆包/通义）
   ai.ts 在 'llm' 模式下委托到这里；任何失败由 ai.ts 回退 mock。
   前端只连代理(localhost:8787)，绝不持有 API Key。
   ============================================================ */
import type { EmotionResult, ChatReply, MoodForecast, TalkTopic, CommentStyle, ReportSection } from './ai';
import { MoodKey, StudentProfile, moodOf } from './data';

const PROXY = (import.meta as any).env?.VITE_LLM_PROXY || 'http://localhost:8787';

interface Msg { role: 'system' | 'user' | 'assistant'; content: string; }
async function chat(messages: Msg[], opts: { json?: boolean; temperature?: number } = {}): Promise<string> {
  const r = await fetch(`${PROXY}/api/llm/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, json: opts.json ?? false, temperature: opts.temperature ?? 0.7 }),
  });
  const data = await r.json();
  if (data.error) throw new Error(`${data.error}: ${data.message || ''}`);
  return String(data.text ?? '');
}
/** 解析模型返回的 JSON（容忍 ```json 包裹） */
function parseJson<T>(s: string): T {
  const m = s.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return JSON.parse(m ? m[0] : s) as T;
}

const PERSONA =
  '你是"小暖"，一盏拟人化小夜灯，是高校心理关爱平台"乐颜"里温柔的陪伴者。' +
  '说话像贴心朋友，简短、有温度、不说教、不卖弄。绝不使用"作为AI"之类表述。';

const MOOD_SET: MoodKey[] = ['joy', 'love', 'calm', 'low', 'anxious', 'sad'];
const safeMood = (m: any): MoodKey => (MOOD_SET.includes(m) ? m : 'calm');

/* —— 情绪识别 —— */
export async function detectEmotion(text: string): Promise<EmotionResult> {
  const out = await chat([
    { role: 'system', content: '你是情绪识别引擎。判断用户文本的情绪，只返回JSON。' },
    { role: 'user', content: `文本：「${text}」\n返回 {"mood":"joy|love|calm|low|anxious|sad","confidence":0~1,"keywords":[],"crisis":true/false}。crisis 指是否含自伤/轻生等危机信号。` },
  ], { json: true, temperature: 0.2 });
  const j = parseJson<any>(out);
  return { mood: safeMood(j.mood), confidence: Number(j.confidence) || 0.7, keywords: j.keywords || [], crisis: Boolean(j.crisis) };
}

/* —— 悄悄话对话 —— */
export async function smallTalk(text: string): Promise<ChatReply> {
  const out = await chat([
    { role: 'system', content: `${PERSONA} 只返回JSON。` },
    { role: 'user', content: `同学对你说：「${text}」。\n请共情回应（1~2句，可带一个温柔的追问）。返回 {"text":"回应","mood":"joy|love|calm|low|anxious|sad(你感知到的对方情绪)","crisis":bool,"suggestRelax":bool(对方疲惫/焦虑/难过时为true),"quickReplies":["3个简短快捷回复"]}。若检测到危机信号，text 要温柔确认安全并给出求助方向。` },
  ], { json: true, temperature: 0.8 });
  const j = parseJson<any>(out);
  return {
    text: String(j.text || '我在听，慢慢说。'),
    mood: safeMood(j.mood),
    crisis: Boolean(j.crisis),
    suggestRelax: Boolean(j.suggestRelax),
    quickReplies: Array.isArray(j.quickReplies) ? j.quickReplies.slice(0, 3) : ['嗯，是这样', '还有别的事', '陪我放松一下'],
  };
}

/* —— 画作解读 —— */
export async function interpretPainting(prompt: string): Promise<string> {
  return chat([
    { role: 'system', content: `${PERSONA}` },
    { role: 'user', content: `同学用一句话"${prompt}"画了一幅水彩心情画。请用 2~3 句温柔解读这幅画与TA此刻的心情，给一点鼓励。直接给解读文字。` },
  ], { temperature: 0.85 });
}

/* —— 未来心情预报（数值本地推算 + 洞察由模型生成） —— */
export async function forecastMood(history: { mood: MoodKey }[]): Promise<{ forecast: MoodForecast[]; insight: string }> {
  const recent = history.slice(-5).map(h => moodOf(h.mood).score);
  const avg = recent.reduce((a, b) => a + b, 0) / (recent.length || 1);
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const forecast = labels.map((d, i) => {
    const score = Math.max(20, Math.min(96, Math.round(avg + Math.sin(i / 1.6) * 8 + (i - 3) * 1.5)));
    return { date: d, score, label: score > 75 ? '晴' : score > 55 ? '多云' : score > 40 ? '小雨' : '阴' };
  });
  let insight = '';
  try {
    insight = await chat([
      { role: 'system', content: `${PERSONA}` },
      { role: 'user', content: `这位同学近期情绪分（越高越好）：${recent.join(',')}，预测下周走势：${forecast.map(f => f.score).join(',')}。用一句温柔的话给TA下周的心情小贴士。` },
    ], { temperature: 0.8 });
  } catch { insight = '下周慢慢来，记得给自己留点放松的时间。'; }
  return { forecast, insight };
}

/* —— 教师：谈心话题 —— */
export async function genTalkTopics(s: StudentProfile): Promise<TalkTopic[]> {
  const out = await chat([
    { role: 'system', content: '你是资深高校辅导员的谈心助手，懂心理沟通技巧，只返回JSON。' },
    { role: 'user', content: `学生（脱敏）：${s.grade}，关注等级${s.risk}，标签[${s.tags.join('、')}]，近期情绪偏${moodOf(s.recentMood).label}。\n生成3~4个谈心切入点，返回 [{"angle":"思路","opening":"一句可直接说的开场白","tip":"沟通提醒"}]。若为高关注，最后一条聚焦温和确认安全。` },
  ], { json: true, temperature: 0.7 });
  const arr = parseJson<any[]>(out);
  return arr.map(t => ({ angle: String(t.angle || ''), opening: String(t.opening || ''), tip: String(t.tip || '') }));
}

/* —— 教师：期末评语 —— */
export async function genComment(s: StudentProfile, style: CommentStyle): Promise<string> {
  const styleText = { encourage: '鼓励型，多肯定与温暖', advice: '建议型，给具体可行的建议', mixed: '综合型，肯定+建议平衡' }[style];
  const name = s.alias.split('（')[0];
  return chat([
    { role: 'system', content: '你是有温度的高校辅导员，写期末评语。' },
    { role: 'user', content: `为${name}写一段${styleText}的期末心理关怀评语（80~120字，第二人称，关注情绪与成长，避免空话）。学生标签：${s.tags.join('、')}。直接给评语。` },
  ], { temperature: 0.8 });
}

/* —— 教师：家校话术 —— */
export async function genParentScript(s: StudentProfile): Promise<string> {
  return chat([
    { role: 'system', content: '你是高校辅导员，撰写与家长沟通的温和话术。' },
    { role: 'user', content: `就${s.grade}学生近期心理状态，写一段给家长的沟通话术（100字左右）：先报平安，再温和提示多倾听少施压，并告知学校有心理支持。直接给话术。` },
  ], { temperature: 0.7 });
}

/* —— 教师：班级管理建议 —— */
export async function genClassAdvice(className: string, temp: number): Promise<string[]> {
  const out = await chat([
    { role: 'system', content: '你是高校心理育人专家，给班级管理建议，只返回JSON数组。' },
    { role: 'user', content: `班级"${className}"当前心理温度${temp}分（满分100，越低越需关注）。给3~4条可落地的班级心理建议，返回 ["建议1","建议2",...]。` },
  ], { json: true, temperature: 0.7 });
  const arr = parseJson<any>(out);
  return Array.isArray(arr) ? arr.map(String) : (arr.list || []).map(String);
}

/* —— 管理：全校行动建议 —— */
export async function genCampusAdvice(temp: number, openAlerts: number): Promise<string[]> {
  const out = await chat([
    { role: 'system', content: '你是高校心理健康中心的数据分析与决策助手，只返回JSON数组。' },
    { role: 'user', content: `全校心理温度${temp}分，待闭环预警${openAlerts}条，临近期末与答辩季。给4条面向管理者的行动建议（含资源调配/重点群体/预警督办/活动部署），返回 ["...","..."]。` },
  ], { json: true, temperature: 0.7 });
  const arr = parseJson<any>(out);
  return Array.isArray(arr) ? arr.map(String) : (arr.list || []).map(String);
}

/* —— 管理：周期数据报告 —— */
export async function genReport(period: string): Promise<ReportSection[]> {
  const out = await chat([
    { role: 'system', content: '你是高校心理健康数据分析师，撰写周期报告，只返回JSON。' },
    { role: 'user', content: `撰写"${period}"全校心理健康数据分析报告，含4部分：总体概览、风险态势、亮点与成效、行动建议。可用合理的模拟数字。返回 [{"title":"标题","body":"正文(60~100字)"}]。` },
  ], { json: true, temperature: 0.7 });
  const arr = parseJson<any[]>(out);
  return arr.map(s => ({ title: String(s.title || ''), body: String(s.body || '') }));
}
