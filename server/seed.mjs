/* ============================================================
   乐颜 · 种子数据（与前端 data.ts 一致，全部脱敏模拟）
   仅在对应表为空时写入，幂等可重复执行，不覆盖用户数据。
   ============================================================ */
import { randomBytes, scryptSync } from 'node:crypto';
import { q } from './db.mjs';

/** scrypt 加盐哈希（与 server/index.mjs 的 verifyPwd 同格式） */
const hashPwd = (pwd, salt = randomBytes(16).toString('hex')) =>
  `scrypt$${salt}$${scryptSync(String(pwd), salt, 64).toString('hex')}`;
const p2 = (s) => String(s).padStart(2, '0');
/** 'M/D' -> '2026-MM-DD' */
const toDate = (md) => { const [m, d] = md.split('/'); return `2026-${p2(m)}-${p2(d)}`; };

const DEMO_STUDENT = '2026010188';   // 演示学生的脱敏编号（其本人数据的归属键）

/* ---------------- 演示账号（密码统一 leyan123，仅存摘要） ---------------- */
const USERS = [
  { account: '2026010188', role: 'student', name: '同学（脱敏）', number: DEMO_STUDENT },
  { account: 'T0231', role: 'teacher', name: '张老师', number: 'T0231' },
  { account: 'admin', role: 'admin', name: '心理中心管理员', number: 'admin' },
];

const MOOD_HISTORY = [
  ['5/24', 'calm'], ['5/25', 'joy'], ['5/26', 'low', '答辩被导师批评了'], ['5/27', 'anxious', '论文还差一章'],
  ['5/28', 'anxious'], ['5/29', 'low'], ['5/30', 'calm'], ['5/31', 'joy', '投稿被接收啦'],
  ['6/1', 'love'], ['6/2', 'calm'], ['6/3', 'low', '最近睡不好'], ['6/4', 'anxious'],
  ['6/5', 'calm'], ['6/6', 'joy'],
];
const GARDEN = [
  ['6/6', 'joy', '今天导师夸我实验做得扎实，开心到想转圈圈。'],
  ['6/3', 'low', '连续熬夜改论文，有点撑不住，但还是挺过来了。'],
  ['5/31', 'joy', '一作论文被 EI 会议接收，这朵向日葵开得特别大。'],
  ['5/26', 'low', '组会汇报卡壳了，回去抱着小暖聊了很久。'],
];
const DIARY = [
  ['6/6', '食堂阿姨今天给我多打了一块鸡腿，还说我看着瘦了要多吃点。', '🍗'],
  ['6/5', '下楼时一只橘猫蹭了蹭我的裤腿，软软的。', '🐱'],
  ['6/4', '雨后操场的味道，和小时候一模一样。', '🌧️'],
  ['6/2', '室友默默帮我带了早饭，放在桌上还贴了张便利贴。', '🥪'],
];
const TREEHOLE = [
  ['毕业论文盲审快出结果了，每天醒来第一件事就是刷邮箱，心脏都要跳出来了。', '#学业压力', 128, 342, '12 分钟前'],
  ['一个人在异地读研，今天生日，没人记得，但我给自己买了块小蛋糕。', '#孤独', 256, 198, '1 小时前'],
  ['和最好的朋友闹掰了，删了又加，加了又删，好幼稚但好难过。', '#人际关系', 89, 167, '2 小时前'],
  ['其实我没有大家看起来那么开朗，只是不想让别人担心而已。', '#情绪', 412, 589, '3 小时前'],
  ['今天面试通过了！想第一个告诉这里，因为你们陪我熬过了最焦虑的那段时间。', '#好消息', 678, 88, '5 小时前'],
];
const TALKS = [
  ['张老师', '同学A（2026-A1）', '6/4', '近期睡眠与情绪', '了解到主要压力来自小论文返修和延毕担忧，已建议拆解任务并转介心理中心。', '6/11 前回访睡眠改善情况', false],
  ['张老师', '同学B（2026-B7）', '6/2', '论文进度焦虑', '协助制定每周里程碑，情绪较前缓解。', '关注答辩周状态', true],
];
const ALERTS = [
  ['AL-2061', '同学A（2026-A1）', '人工智能研二·1班', 'high', '连续 3 天情绪「难过」，且深夜活跃、提及"撑不住"', '今天 02:14', 'new', '—'],
  ['AL-2058', '同学D（2026-D9）', '人工智能研二·1班', 'high', '情绪持续低落，树洞发布含负面关键词内容', '昨天 23:40', 'processing', '张老师'],
  ['AL-2050', '同学F（2026-F5）', '计算机研二·1班', 'mid', '7 天内 4 次「低落」打卡', '6/4 18:20', 'processing', '李老师'],
  ['AL-2041', '同学B（2026-B7）', '计算机研二·1班', 'mid', '心理量表得分进入预警区间', '6/2 10:05', 'resolved', '李老师'],
  ['AL-2033', '同学G（2026-G8）', '计算机研一·1班', 'low', '主动求助：考试焦虑', '5/30 14:12', 'resolved', '王老师'],
];
const RESOURCES = [
  ['考前减压音频合集', '音频', 3420, '已上架', '🎧'],
  ['研究生心理调适手册', '图文', 1890, '已上架', '📖'],
  ['团体沙盘活动方案', '活动', 156, '已上架', '🏖️'],
  ['正念冥想 21 天计划', '课程', 2310, '已上架', '🧘'],
  ['新生适应主题班会', '活动', 0, '草稿', '📝'],
];
const STUDENTS = [
  ['s01', '2026-A1', '同学A（编号 2026-A1）', '人工智能学院', '人工智能研二·1班', '研二', 'high', 'sad', 'calm,low,low,anxious,sad,sad,sad', 4, 2, '睡眠紊乱,社交回避,学业压力', '3 小时前'],
  ['s02', '2026-B7', '同学B（编号 2026-B7）', '计算机学院', '计算机研二·1班', '研二', 'mid', 'anxious', 'joy,calm,anxious,low,anxious,anxious,low', 2, 1, '论文焦虑', '1 天前'],
  ['s03', '2026-C3', '同学C（编号 2026-C3）', '计算机学院', '计算机研一·2班', '研一', 'low', 'calm', 'calm,calm,joy,calm,low,calm,calm', 0, 0, '适应良好', '20 分钟前'],
  ['s04', '2026-D9', '同学D（编号 2026-D9）', '人工智能学院', '人工智能研二·1班', '研二', 'high', 'anxious', 'low,anxious,anxious,sad,anxious,sad,anxious', 3, 1, '就业焦虑,情绪低落', '5 小时前'],
  ['s05', '2026-E2', '同学E（编号 2026-E2）', '软件学院', '软件工程研一·1班', '研一', 'none', 'joy', 'joy,joy,love,calm,joy,joy,love', 0, 0, '阳光开朗', '刚刚'],
  ['s06', '2026-F5', '同学F（编号 2026-F5）', '计算机学院', '计算机研二·1班', '研二', 'mid', 'low', 'calm,low,low,calm,anxious,low,low', 1, 0, '人际困扰', '2 天前'],
];
const CLASSES = [
  ['c1', '计算机研一·1班', 82, 3, 32, 0],
  ['c2', '计算机研一·2班', 76, -2, 30, 1],
  ['c3', '计算机研二·1班', 61, -8, 28, 3],
  ['c4', '软件工程研一·1班', 88, 5, 34, 0],
  ['c5', '人工智能研二·1班', 54, -11, 26, 4],
];
const CONFIG = {
  riskThresholdHigh: 3,
  riskThresholdMid: 4,
  notifyChannels: { app: true, sms: true, email: false },
  anonymousDefault: true,
  nightMode: 'auto',
};

async function isEmpty(table) {
  const r = await q(`select count(*)::int as n from ${table}`);
  return r.rows[0].n === 0;
}

export async function seedAll() {
  const log = [];

  if (await isEmpty('ly_user')) {
    for (const u of USERS)
      await q(`insert into ly_user(account, pwd_hash, role, name, number) values($1,$2,$3,$4,$5)`,
        [u.account, hashPwd('leyan123'), u.role, u.name, u.number]);
    log.push(`ly_user(${USERS.length})`);
  }
  if (await isEmpty('ly_mood_log')) {
    for (const [md, mood, note] of MOOD_HISTORY)
      await q(`insert into ly_mood_log(student, log_date, mood, note) values($1,$2,$3,$4)`,
        [DEMO_STUDENT, toDate(md), mood, note ?? null]);
    log.push(`ly_mood_log(${MOOD_HISTORY.length})`);
  }
  if (await isEmpty('ly_garden_story')) {
    for (const [d, mood, text] of GARDEN)
      await q(`insert into ly_garden_story(student, story_date, mood, text) values($1,$2,$3,$4)`,
        [DEMO_STUDENT, d, mood, text]);
    log.push(`ly_garden_story(${GARDEN.length})`);
  }
  if (await isEmpty('ly_diary')) {
    for (const [d, text, emoji] of DIARY)
      await q(`insert into ly_diary(student, diary_date, content, emoji) values($1,$2,$3,$4)`,
        [DEMO_STUDENT, d, text, emoji]);
    log.push(`ly_diary(${DIARY.length})`);
  }
  if (await isEmpty('ly_treehole')) {
    for (const [text, tag, hugs, same, ago] of TREEHOLE)
      await q(`insert into ly_treehole(content, tag, hugs, same_feel, time_ago) values($1,$2,$3,$4,$5)`,
        [text, tag, hugs, same, ago]);
    log.push(`ly_treehole(${TREEHOLE.length})`);
  }
  if (await isEmpty('ly_talk_record')) {
    for (const [t, s, d, topic, sum, fu, done] of TALKS)
      await q(`insert into ly_talk_record(teacher, student, talk_date, topic, summary, follow_up, done) values($1,$2,$3,$4,$5,$6,$7)`,
        [t, s, d, topic, sum, fu, done]);
    log.push(`ly_talk_record(${TALKS.length})`);
  }
  if (await isEmpty('ly_alert')) {
    for (const [id, s, cls, lvl, reason, time, status, owner] of ALERTS)
      await q(`insert into ly_alert(id, student, class_name, level, reason, trigger_time, status, owner) values($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, s, cls, lvl, reason, time, status, owner]);
    log.push(`ly_alert(${ALERTS.length})`);
  }
  if (await isEmpty('ly_resource')) {
    for (const [title, type, usage, status, emoji] of RESOURCES)
      await q(`insert into ly_resource(title, type, usage, status, emoji) values($1,$2,$3,$4,$5)`,
        [title, type, usage, status, emoji]);
    log.push(`ly_resource(${RESOURCES.length})`);
  }
  if (await isEmpty('ly_student')) {
    for (const r of STUDENTS)
      await q(`insert into ly_student(id, number, alias, college, class_name, grade, risk_level, recent_mood, trend, alerts, interventions, tags, last_active)
               values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, r);
    log.push(`ly_student(${STUDENTS.length})`);
  }
  if (await isEmpty('ly_class')) {
    for (const r of CLASSES)
      await q(`insert into ly_class(id, name, temp, trend, students, alerts) values($1,$2,$3,$4,$5,$6)`, r);
    log.push(`ly_class(${CLASSES.length})`);
  }
  // 配置：单例 upsert
  await q(`insert into ly_config(id, data) values(1, $1)
           on conflict (id) do nothing`, [JSON.stringify(CONFIG)]);

  return log;
}
