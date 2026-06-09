/* ============================================================
   乐颜 · 模拟数据层
   全部为模拟数据，不含任何真实学生个人信息。
   对应苍穹领域模型（见 docs/苍穹平台映射设计.md）。
   ============================================================ */

export type Role = 'student' | 'teacher' | 'admin';

export type MoodKey = 'joy' | 'love' | 'calm' | 'low' | 'anxious' | 'sad';

export interface MoodMeta {
  key: MoodKey;
  label: string;
  emoji: string;
  flower: string;     // 情绪花园对应花
  color: string;      // CSS 变量
  score: number;      // 心理温度贡献 0-100
}

export const MOODS: MoodMeta[] = [
  { key: 'joy', label: '开心', emoji: '😊', flower: '🌻', color: 'var(--mood-joy)', score: 92 },
  { key: 'love', label: '心动', emoji: '🥰', flower: '🌹', color: 'var(--mood-love)', score: 88 },
  { key: 'calm', label: '平静', emoji: '😌', flower: '🌷', color: 'var(--mood-calm)', score: 78 },
  { key: 'low', label: '低落', emoji: '😔', flower: '🪻', color: 'var(--mood-low)', score: 48 },
  { key: 'anxious', label: '焦虑', emoji: '😰', flower: '🌿', color: 'var(--mood-anxious)', score: 38 },
  { key: 'sad', label: '难过', emoji: '😢', flower: '🥀', color: 'var(--mood-sad)', score: 28 },
];

export const moodOf = (k: MoodKey) => MOODS.find(m => m.key === k)!;

/* 每日暖心签 */
export const WARM_NOTES = [
  '你今天也辛苦了，先给自己一个拥抱吧。',
  '不必把每一步都走得完美，慢慢来比较快。',
  '难过是允许的，它来过，也会走。',
  '你已经做得很好了，比你以为的好得多。',
  '今天的太阳，也想照照你的笑脸。',
  '世界很吵，但你可以为自己留一个安静的角落。',
  '你值得被温柔以待，包括来自你自己的温柔。',
  '即使是一棵慢慢长大的树，也在努力向着光。',
];

/* 治愈系加载/空/错误文案（全站通用，不说"加载中"） */
export const WARM_LOADING = '正在为你准备一个温暖的角落~';
export const WARM_EMPTY = '这里还没有记录，开始你的第一个故事吧';
export const WARM_ERROR = '出点小问题，再试一次就好';

/* ---------------------- 学生：心情历史 ---------------------- */
export interface MoodLog { date: string; mood: MoodKey; note?: string; }

const days = (n: number) => {
  const arr: string[] = [];
  const base = new Date('2026-06-06');
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base); d.setDate(base.getDate() - i);
    arr.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return arr;
};
export const LAST_14_DAYS = days(14);

export const myMoodHistory: MoodLog[] = [
  { date: '5/24', mood: 'calm' }, { date: '5/25', mood: 'joy' },
  { date: '5/26', mood: 'low', note: '答辩被导师批评了' }, { date: '5/27', mood: 'anxious', note: '论文还差一章' },
  { date: '5/28', mood: 'anxious' }, { date: '5/29', mood: 'low' },
  { date: '5/30', mood: 'calm' }, { date: '5/31', mood: 'joy', note: '投稿被接收啦' },
  { date: '6/1', mood: 'love' }, { date: '6/2', mood: 'calm' },
  { date: '6/3', mood: 'low', note: '最近睡不好' }, { date: '6/4', mood: 'anxious' },
  { date: '6/5', mood: 'calm' }, { date: '6/6', mood: 'joy' },
];

/* ---------------------- 情绪花园 ---------------------- */
export interface GardenStory { date: string; mood: MoodKey; text: string; }
export const gardenStories: GardenStory[] = [
  { date: '6/6', mood: 'joy', text: '今天导师夸我实验做得扎实，开心到想转圈圈。' },
  { date: '6/3', mood: 'low', text: '连续熬夜改论文，有点撑不住，但还是挺过来了。' },
  { date: '5/31', mood: 'joy', text: '一作论文被 EI 会议接收，这朵向日葵开得特别大。' },
  { date: '5/26', mood: 'low', text: '组会汇报卡壳了，回去抱着小暖聊了很久。' },
];

/* ---------------------- 树洞广场 ---------------------- */
export interface TreeholePost {
  id: number; text: string; tag: string;
  hugs: number; sameFeel: number; timeAgo: string; hugged?: boolean;
}
export const treeholePosts: TreeholePost[] = [
  { id: 1, text: '毕业论文盲审快出结果了，每天醒来第一件事就是刷邮箱，心脏都要跳出来了。', tag: '#学业压力', hugs: 128, sameFeel: 342, timeAgo: '12 分钟前' },
  { id: 2, text: '一个人在异地读研，今天生日，没人记得，但我给自己买了块小蛋糕。', tag: '#孤独', hugs: 256, sameFeel: 198, timeAgo: '1 小时前' },
  { id: 3, text: '和最好的朋友闹掰了，删了又加，加了又删，好幼稚但好难过。', tag: '#人际关系', hugs: 89, sameFeel: 167, timeAgo: '2 小时前' },
  { id: 4, text: '其实我没有大家看起来那么开朗，只是不想让别人担心而已。', tag: '#情绪', hugs: 412, sameFeel: 589, timeAgo: '3 小时前' },
  { id: 5, text: '今天面试通过了！想第一个告诉这里，因为你们陪我熬过了最焦虑的那段时间。', tag: '#好消息', hugs: 678, sameFeel: 88, timeAgo: '5 小时前' },
];

/* ---------------------- 小确幸日记 ---------------------- */
export interface DiaryEntry { id: number; date: string; text: string; emoji: string; }
export const diaryEntries: DiaryEntry[] = [
  { id: 1, date: '6/6', text: '食堂阿姨今天给我多打了一块鸡腿，还说我看着瘦了要多吃点。', emoji: '🍗' },
  { id: 2, date: '6/5', text: '下楼时一只橘猫蹭了蹭我的裤腿，软软的。', emoji: '🐱' },
  { id: 3, date: '6/4', text: '雨后操场的味道，和小时候一模一样。', emoji: '🌧️' },
  { id: 4, date: '6/2', text: '室友默默帮我带了早饭，放在桌上还贴了张便利贴。', emoji: '🥪' },
];

/* ---------------------- 心灵电台 ---------------------- */
export interface RadioTrack { id: number; title: string; author: string; cat: string; len: string; cover: string; }
export const radioTracks: RadioTrack[] = [
  { id: 1, title: '晚安，今天的你已经很努力了', author: '小暖电台', cat: '助眠', len: '12:30', cover: '🌙' },
  { id: 2, title: '十分钟正念呼吸 · 把焦虑放下', author: '心理中心', cat: '冥想', len: '10:08', cover: '🧘' },
  { id: 3, title: '雨声白噪音 · 适合写论文的夜晚', author: '自然之声', cat: '白噪音', len: '45:00', cover: '🌧️' },
  { id: 4, title: '给独自在外的你 · 一封语音信', author: '学长学姐', cat: '陪伴', len: '08:42', cover: '💌' },
  { id: 5, title: '森林晨光 · 唤醒平静的一天', author: '自然之声', cat: '白噪音', len: '30:00', cover: '🌲' },
  { id: 6, title: '考前减压引导 · 你已准备得足够好', author: '心理中心', cat: '冥想', len: '15:20', cover: '🍃' },
];

/* ---------------------- 治愈工坊（互动练习） ---------------------- */
export interface Workshop { id: number; title: string; desc: string; emoji: string; mins: number; type: 'breath' | 'gratitude' | 'grounding' | 'muscle'; }
export const workshops: Workshop[] = [
  { id: 1, title: '4-7-8 深呼吸', desc: '吸气 4 秒，屏息 7 秒，呼气 8 秒，三轮即可平复。', emoji: '🫧', mins: 3, type: 'breath' },
  { id: 2, title: '5-4-3-2-1 着陆练习', desc: '说出你看到的、听到的、触到的……把自己拉回当下。', emoji: '🌍', mins: 5, type: 'grounding' },
  { id: 3, title: '三件感恩小事', desc: '写下今天三件值得感谢的小事，重新发现温暖。', emoji: '🙏', mins: 4, type: 'gratitude' },
  { id: 4, title: '渐进式肌肉放松', desc: '从脚趾到额头，逐组绷紧再松开，释放身体的紧绷。', emoji: '💆', mins: 8, type: 'muscle' },
];

/* ---------------------- 暖心小站（心理知识） ---------------------- */
export interface Knowledge { id: number; title: string; summary: string; cat: string; emoji: string; }
export const knowledgeList: Knowledge[] = [
  { id: 1, title: '如何与论文焦虑共处', summary: '焦虑不是敌人，它提醒你在乎。试着把大目标拆成今天能完成的一小步。', cat: '学业', emoji: '📄' },
  { id: 2, title: '睡不着的夜晚，可以这样做', summary: '不要强迫入睡。离开床，做点无聊的事，困意来了再回来。', cat: '睡眠', emoji: '😴' },
  { id: 3, title: '当朋友说"我不想活了"', summary: '认真倾听，不评判，不说教。陪伴本身就是力量，并及时寻求专业帮助。', cat: '互助', emoji: '🤝' },
  { id: 4, title: '识别你的情绪信号', summary: '身体会先于大脑察觉情绪：心跳、肩颈紧绷都是信号，学会读懂它们。', cat: '自我觉察', emoji: '🌡️' },
];

/* ---------------------- 成长空间（打卡轨迹） ---------------------- */
export interface Milestone { date: string; title: string; desc: string; icon: string; }
export const myMilestones: Milestone[] = [
  { date: '6/6', title: '连续签到 21 天', desc: '情绪花园解锁稀有花「极光鸢尾」', icon: '🏵️' },
  { date: '6/1', title: '完成 10 次深呼吸练习', desc: '焦虑指数较上月下降 23%', icon: '🫧' },
  { date: '5/28', title: '在树洞收到 100 个抱抱', desc: '你也温暖了很多人', icon: '🫂' },
  { date: '5/20', title: '第一次和小暖聊天', desc: '一切温暖的开始', icon: '🌱' },
];

/* ============================================================
   教师 / 管理端数据
   ============================================================ */

export interface ClassWeather { id: string; name: string; temp: number; trend: number; students: number; alerts: number; }
export const classWeathers: ClassWeather[] = [
  { id: 'c1', name: '计算机研一·1班', temp: 82, trend: 3, students: 32, alerts: 0 },
  { id: 'c2', name: '计算机研一·2班', temp: 76, trend: -2, students: 30, alerts: 1 },
  { id: 'c3', name: '计算机研二·1班', temp: 61, trend: -8, students: 28, alerts: 3 },
  { id: 'c4', name: '软件工程研一·1班', temp: 88, trend: 5, students: 34, alerts: 0 },
  { id: 'c5', name: '人工智能研二·1班', temp: 54, trend: -11, students: 26, alerts: 4 },
];

export type RiskLevel = 'high' | 'mid' | 'low' | 'none';
export interface StudentProfile {
  id: string; alias: string; cls: string; grade: string;
  risk: RiskLevel; recentMood: MoodKey;
  trend: MoodKey[];          // 近 7 次
  alerts: number; interventions: number;
  tags: string[]; lastActive: string;
}
export const studentProfiles: StudentProfile[] = [
  { id: 's01', alias: '同学A（编号 2026-A1）', cls: '人工智能研二·1班', grade: '研二', risk: 'high', recentMood: 'sad',
    trend: ['calm','low','low','anxious','sad','sad','sad'], alerts: 4, interventions: 2, tags: ['睡眠紊乱','社交回避','学业压力'], lastActive: '3 小时前' },
  { id: 's02', alias: '同学B（编号 2026-B7）', cls: '计算机研二·1班', grade: '研二', risk: 'mid', recentMood: 'anxious',
    trend: ['joy','calm','anxious','low','anxious','anxious','low'], alerts: 2, interventions: 1, tags: ['论文焦虑'], lastActive: '1 天前' },
  { id: 's03', alias: '同学C（编号 2026-C3）', cls: '计算机研一·2班', grade: '研一', risk: 'low', recentMood: 'calm',
    trend: ['calm','calm','joy','calm','low','calm','calm'], alerts: 0, interventions: 0, tags: ['适应良好'], lastActive: '20 分钟前' },
  { id: 's04', alias: '同学D（编号 2026-D9）', cls: '人工智能研二·1班', grade: '研二', risk: 'high', recentMood: 'anxious',
    trend: ['low','anxious','anxious','sad','anxious','sad','anxious'], alerts: 3, interventions: 1, tags: ['就业焦虑','情绪低落'], lastActive: '5 小时前' },
  { id: 's05', alias: '同学E（编号 2026-E2）', cls: '软件工程研一·1班', grade: '研一', risk: 'none', recentMood: 'joy',
    trend: ['joy','joy','love','calm','joy','joy','love'], alerts: 0, interventions: 0, tags: ['阳光开朗'], lastActive: '刚刚' },
  { id: 's06', alias: '同学F（编号 2026-F5）', cls: '计算机研二·1班', grade: '研二', risk: 'mid', recentMood: 'low',
    trend: ['calm','low','low','calm','anxious','low','low'], alerts: 1, interventions: 0, tags: ['人际困扰'], lastActive: '2 天前' },
];

export const RISK_META: Record<RiskLevel, { label: string; color: string; chip: string }> = {
  high: { label: '高关注', color: 'var(--danger)', chip: 'chip-danger' },
  mid: { label: '中关注', color: 'var(--warn)', chip: 'chip-warn' },
  low: { label: '低关注', color: 'var(--ok)', chip: 'chip-ok' },
  none: { label: '状态良好', color: 'var(--ly-mint)', chip: 'chip-ok' },
};

/* 谈心记录 */
export interface TalkRecord { id: number; student: string; date: string; topic: string; summary: string; followUp: string; done: boolean; }
export const talkRecords: TalkRecord[] = [
  { id: 1, student: '同学A（2026-A1）', date: '6/4', topic: '近期睡眠与情绪', summary: '了解到主要压力来自小论文返修和延毕担忧，已建议拆解任务并转介心理中心。', followUp: '6/11 前回访睡眠改善情况', done: false },
  { id: 2, student: '同学B（2026-B7）', date: '6/2', topic: '论文进度焦虑', summary: '协助制定每周里程碑，情绪较前缓解。', followUp: '关注答辩周状态', done: true },
];

/* 预警事件 */
export type AlertStatus = 'new' | 'processing' | 'resolved';
export interface AlertEvent { id: string; student: string; cls: string; level: RiskLevel; reason: string; time: string; status: AlertStatus; owner: string; }
export const alertEvents: AlertEvent[] = [
  { id: 'AL-2061', student: '同学A（2026-A1）', cls: '人工智能研二·1班', level: 'high', reason: '连续 3 天情绪「难过」，且深夜活跃、提及"撑不住"', time: '今天 02:14', status: 'new', owner: '—' },
  { id: 'AL-2058', student: '同学D（2026-D9）', cls: '人工智能研二·1班', level: 'high', reason: '情绪持续低落，树洞发布含负面关键词内容', time: '昨天 23:40', status: 'processing', owner: '张老师' },
  { id: 'AL-2050', student: '同学F（2026-F5）', cls: '计算机研二·1班', level: 'mid', reason: '7 天内 4 次「低落」打卡', time: '6/4 18:20', status: 'processing', owner: '李老师' },
  { id: 'AL-2041', student: '同学B（2026-B7）', cls: '计算机研二·1班', level: 'mid', reason: '心理量表得分进入预警区间', time: '6/2 10:05', status: 'resolved', owner: '李老师' },
  { id: 'AL-2033', student: '同学G（2026-G8）', cls: '计算机研一·1班', level: 'low', reason: '主动求助：考试焦虑', time: '5/30 14:12', status: 'resolved', owner: '王老师' },
];

export const ALERT_STATUS_META: Record<AlertStatus, { label: string; chip: string }> = {
  new: { label: '待处理', chip: 'chip-danger' },
  processing: { label: '干预中', chip: 'chip-warn' },
  resolved: { label: '已闭环', chip: 'chip-ok' },
};

/* 学院心理温度（管理端地图） */
export interface CollegeTemp { name: string; temp: number; students: number; alerts: number; }
export const collegeTemps: CollegeTemp[] = [
  { name: '计算机学院', temp: 78, students: 1240, alerts: 6 },
  { name: '人工智能学院', temp: 62, students: 860, alerts: 11 },
  { name: '软件学院', temp: 84, students: 1020, alerts: 3 },
  { name: '机械工程学院', temp: 75, students: 1380, alerts: 5 },
  { name: '经济管理学院', temp: 80, students: 1560, alerts: 4 },
  { name: '外国语学院', temp: 86, students: 720, alerts: 2 },
  { name: '材料科学学院', temp: 71, students: 940, alerts: 7 },
  { name: '医学院', temp: 68, students: 1120, alerts: 9 },
];

/* 全校预警趋势（近 8 周） */
export const alertTrend = [
  { week: 'W1', count: 18 }, { week: 'W2', count: 22 }, { week: 'W3', count: 15 },
  { week: 'W4', count: 27 }, { week: 'W5', count: 31 }, { week: 'W6', count: 24 },
  { week: 'W7', count: 29 }, { week: 'W8', count: 41 },
];

/* 资源中心 */
export interface ResourceItem { id: number; title: string; type: string; usage: number; status: '已上架' | '草稿'; emoji: string; }
export const resourceItems: ResourceItem[] = [
  { id: 1, title: '考前减压音频合集', type: '音频', usage: 3420, status: '已上架', emoji: '🎧' },
  { id: 2, title: '研究生心理调适手册', type: '图文', usage: 1890, status: '已上架', emoji: '📖' },
  { id: 3, title: '团体沙盘活动方案', type: '活动', usage: 156, status: '已上架', emoji: '🏖️' },
  { id: 4, title: '正念冥想 21 天计划', type: '课程', usage: 2310, status: '已上架', emoji: '🧘' },
  { id: 5, title: '新生适应主题班会', type: '活动', usage: 0, status: '草稿', emoji: '📝' },
];

/* 系统配置默认值 */
export const defaultConfig = {
  riskThresholdHigh: 3,     // 连续低落天数触发高预警
  riskThresholdMid: 4,      // 7天内低落次数触发中预警
  notifyChannels: { app: true, sms: true, email: false },
  anonymousDefault: true,
  nightMode: 'auto',
};

/* 管理端 KPI */
export const adminKpi = {
  campusTemp: 74,            // 全校心理温度
  coveredStudents: 8860,
  activeRate: 68,            // 活跃率 %
  alertOpen: 9,
  alertResolvedRate: 86,     // 干预闭环率 %
  satisfaction: 4.7,
};

/* 班级心理树 / 陪伴训练营 */
export interface CampActivity { id: number; title: string; desc: string; joined: number; total: number; days: number; emoji: string; }
export const campActivities: CampActivity[] = [
  { id: 1, title: '21 天早安打卡', desc: '每天一句早安，唤醒元气满满的一天', joined: 26, total: 32, days: 21, emoji: '🌅' },
  { id: 2, title: '正念呼吸周', desc: '连续 7 天集体冥想，给大脑放个假', joined: 19, total: 32, days: 7, emoji: '🧘' },
  { id: 3, title: '互夸大会', desc: '匿名给同学写一句真诚的赞美', joined: 30, total: 32, days: 3, emoji: '💌' },
];
