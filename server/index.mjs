/* ============================================================
   乐颜 · 真实可跑后端（Node + PostgreSQL）
   ------------------------------------------------------------
   关键设计：HTTP 路由复用金蝶苍穹 KAPI 形态
       POST /ierp/kapi/app/<控制器>/<方法>
   因此前端「同一套 api.ts」本地连本服务、上线连苍穹，只换 base。
   响应统一 { code:0, data } / { code:1, message }。
   ============================================================ */
import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { q, ping, DB_LABEL, memDb } from './db.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const env = readFileSync(join(__dirname, '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* ignore */ }

const PORT = Number(process.env.PORT || 8788);
const ALLOW = process.env.CORS_ORIGIN || '*';

const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
const hhmm = () => new Date().toTimeString().slice(0, 5);
const fmtMD = (iso) => `${+iso.slice(5, 7)}/${+iso.slice(8, 10)}`;
const DEMO_STUDENT = '2026010188';
const LOW = new Set(['low', 'anxious', 'sad']);
const DEFAULT_CONFIG = { riskThresholdHigh: 3, riskThresholdMid: 4, notifyChannels: { app: true, sms: true, email: false }, anonymousDefault: true, nightMode: 'auto' };

/* —— 登录会话（进程内；重启失效，前端会重新登录） —— */
const sessions = new Map();          // token -> { account, role, name, number }

async function getConfig() {
  const r = await q(`select data from ly_config where id=1`);
  return r.rowCount ? r.rows[0].data : DEFAULT_CONFIG;
}
const studentOf = (ctx) => ctx.user?.number || DEMO_STUDENT;
const userKey = (ctx) => ctx.user?.account || 'anon';

/* SQL 片段：树洞列表（含当前用户是否抱过） */
const TREEHOLE_SELECT = (param) => `
  select t.id::int, t.content as text, t.tag, t.hugs, t.same_feel as "sameFeel", t.time_ago as "timeAgo",
         (h.app_user is not null) as hugged
  from ly_treehole t
  left join ly_treehole_hug h on h.post = t.id and h.app_user = ${param}
  order by t.id desc`;
const ALERT_SELECT = `select id, student, class_name as cls, level, reason, trigger_time as time, status, owner
                      from ly_alert order by create_time desc, id desc`;
const TALK_SELECT = `select id::int, student, talk_date as date, topic, summary, follow_up as "followUp", done
                     from ly_talk_record order by id desc`;
const RESOURCE_SELECT = `select id::int, title, type, usage, status, emoji from ly_resource order by id asc`;

/* ============================================================
   控制器路由表：键为「控制器.方法」，值为 async (params, ctx) => data
   ============================================================ */
const routes = {
  /* ---------- 心情打卡 / 情绪花园 ---------- */
  async 'MoodController.getHistory'(p, ctx) {
    const r = await q(`select to_char(log_date,'FMMM/FMDD') as date, mood, note
                       from ly_mood_log where student=$1 order by log_date asc, id asc`, [studentOf(ctx)]);
    return r.rows;
  },
  async 'MoodController.checkin'(p, ctx) {
    const student = studentOf(ctx);
    const today = new Date().toISOString().slice(0, 10);
    await q(`insert into ly_mood_log(student, log_date, mood, note, anonymous) values($1,$2,$3,$4,$5)`,
      [student, today, p.mood, p.note || null, !!p.anonymous]);
    // —— 预警联动：连续 N 次低落自动生成预警，打通 学生→管理端 闭环 ——
    const cfg = await getConfig();
    const n = Number(cfg.riskThresholdHigh) || 3;
    const recent = await q(`select mood from ly_mood_log where student=$1 order by log_date desc, id desc limit $2`, [student, n]);
    const allLow = recent.rows.length >= n && recent.rows.every((r) => LOW.has(r.mood));
    let alertTriggered = false;
    if (allLow) {
      const open = await q(`select 1 from ly_alert where student like $1 and status <> 'resolved' limit 1`, [`%${student}%`]);
      if (!open.rowCount) {
        const id = 'AL-' + String(Date.now()).slice(-4);
        await q(`insert into ly_alert(id, student, class_name, level, reason, trigger_time, status, owner)
                 values($1,$2,'—','high',$3,$4,'new','—')`,
          [id, `我（${student}）`, `连续 ${n} 次情绪低落，系统自动预警`, `今天 ${hhmm()}`]);
        alertTriggered = true;
      }
    }
    return { date: fmtMD(today), mood: p.mood, note: p.note, alertTriggered };
  },
  async 'MoodController.listStories'(p, ctx) {
    const r = await q(`select story_date as date, mood, text from ly_garden_story where student=$1 order by id desc`, [studentOf(ctx)]);
    return r.rows;
  },

  /* ---------- 小确幸日记 ---------- */
  async 'DiaryController.list'(p, ctx) {
    const r = await q(`select id::int, diary_date as date, content as text, emoji from ly_diary where student=$1 order by id desc`, [studentOf(ctx)]);
    return r.rows;
  },
  async 'DiaryController.create'(p, ctx) {
    if (!p.text) throw { code: 1, message: '内容不能为空' };
    const d = fmtMD(new Date().toISOString().slice(0, 10));
    const r = await q(`insert into ly_diary(student, diary_date, content, emoji) values($1,$2,$3,$4)
                       returning id::int, diary_date as date, content as text, emoji`,
      [studentOf(ctx), d, p.text, p.emoji || '📝']);
    return r.rows[0];
  },

  /* ---------- 树洞广场 ---------- */
  async 'TreeholeController.list'(p, ctx) {
    const r = await q(TREEHOLE_SELECT('$1'), [userKey(ctx)]);
    return r.rows;
  },
  async 'TreeholeController.create'(p, ctx) {
    if (!p.text) throw { code: 1, message: '内容不能为空' };
    const ins = await q(`insert into ly_treehole(content, tag) values($1,$2)
                         returning id::int, content as text, tag, hugs, same_feel as "sameFeel", time_ago as "timeAgo"`,
      [p.text, p.tag || '#情绪']);
    return { ...ins.rows[0], hugged: false };
  },
  async 'TreeholeController.toggleHug'(p, ctx) {
    const user = userKey(ctx);
    const ex = await q(`select 1 from ly_treehole_hug where post=$1 and app_user=$2`, [p.id, user]);
    if (ex.rowCount) {
      await q(`delete from ly_treehole_hug where post=$1 and app_user=$2`, [p.id, user]);
      await q(`update ly_treehole set hugs = greatest(hugs - 1, 0) where id=$1`, [p.id]);
    } else {
      await q(`insert into ly_treehole_hug(post, app_user) values($1,$2) on conflict do nothing`, [p.id, user]);
      await q(`update ly_treehole set hugs = hugs + 1 where id=$1`, [p.id]);
    }
    const r = await q(TREEHOLE_SELECT('$1'), [user]);
    return r.rows;
  },

  /* ---------- 谈心记录（教师） ---------- */
  async 'TalkController.list'() {
    const r = await q(TALK_SELECT);
    return r.rows;
  },
  async 'TalkController.create'(p, ctx) {
    const teacher = ctx.user?.name || ctx.user?.account || '老师';
    const r = await q(`insert into ly_talk_record(teacher, student, talk_date, topic, summary, follow_up, done)
                       values($1,$2,$3,$4,$5,$6,false)
                       returning id::int, student, talk_date as date, topic, summary, follow_up as "followUp", done`,
      [teacher, p.student, p.date, p.topic, p.summary, p.followUp]);
    return r.rows[0];
  },
  async 'TalkController.toggleFollowUp'(p) {
    await q(`update ly_talk_record set done = not done where id=$1`, [p.id]);
    const r = await q(TALK_SELECT);
    return r.rows;
  },

  /* ---------- 预警管理（管理端） ---------- */
  async 'AlertController.list'() {
    const r = await q(ALERT_SELECT);
    return r.rows;
  },
  async 'AlertController.advance'(p) {
    const cur = await q(`select status from ly_alert where id=$1`, [p.id]);
    if (!cur.rowCount) throw { code: 1, message: '预警不存在' };
    const s = cur.rows[0].status;
    if (s === 'new') await q(`update ly_alert set status='processing', owner=case when owner='—' then '张老师' else owner end where id=$1`, [p.id]);
    else if (s === 'processing') await q(`update ly_alert set status='resolved', close_time=$2 where id=$1`, [p.id, `今天 ${hhmm()}`]);
    const r = await q(ALERT_SELECT);
    return r.rows;
  },

  /* ---------- 系统配置（管理端） ---------- */
  async 'ConfigController.get'() {
    return await getConfig();
  },
  async 'ConfigController.save'(p) {
    await q(`insert into ly_config(id,data) values(1,$1) on conflict (id) do update set data=$1`, [JSON.stringify(p)]);
    return p;
  },

  /* ---------- 我的画廊（疗愈画作） ---------- */
  async 'GalleryController.list'(p, ctx) {
    const r = await q(`select id::int, prompt, palette, colors, bright, warm, interpret as interp
                       from ly_artwork where student=$1 order by id desc`, [studentOf(ctx)]);
    return r.rows.map((row) => ({ ...row, colors: (row.colors || '').split(',').filter(Boolean) }));
  },
  async 'GalleryController.create'(p, ctx) {
    const colors = Array.isArray(p.colors) ? p.colors.join(',') : (p.colors || '');
    const r = await q(`insert into ly_artwork(student, prompt, palette, colors, bright, warm, interpret)
                       values($1,$2,$3,$4,$5,$6,$7)
                       returning id::int, prompt, palette, colors, bright, warm, interpret as interp`,
      [studentOf(ctx), p.prompt || '', p.palette || '', colors, p.bright ?? 0, p.warm ?? 0, p.interpret || '']);
    const row = r.rows[0];
    row.colors = (row.colors || '').split(',').filter(Boolean);
    return row;
  },

  /* ---------- 资源中心（管理端 CRUD + 上下架） ---------- */
  async 'ResourceController.list'() {
    const r = await q(RESOURCE_SELECT);
    return r.rows;
  },
  async 'ResourceController.create'(p) {
    if (!p.title) throw { code: 1, message: '资源标题不能为空' };
    const r = await q(`insert into ly_resource(title, type, emoji, status, usage) values($1,$2,$3,$4,0)
                       returning id::int, title, type, usage, status, emoji`,
      [p.title, p.type || '图文', p.emoji || '📦', p.status || '草稿']);
    return r.rows[0];
  },
  async 'ResourceController.update'(p) {
    await q(`update ly_resource set title=coalesce($2,title), type=coalesce($3,type), emoji=coalesce($4,emoji) where id=$1`,
      [p.id, p.title ?? null, p.type ?? null, p.emoji ?? null]);
    const r = await q(RESOURCE_SELECT);
    return r.rows;
  },
  async 'ResourceController.toggle'(p) {
    await q(`update ly_resource set status = case when status='已上架' then '草稿' else '已上架' end where id=$1`, [p.id]);
    const r = await q(RESOURCE_SELECT);
    return r.rows;
  },
  async 'ResourceController.remove'(p) {
    await q(`delete from ly_resource where id=$1`, [p.id]);
    const r = await q(RESOURCE_SELECT);
    return r.rows;
  },

  /* ---------- 登录鉴权 ---------- */
  async 'AuthController.login'(p) {
    const r = await q(`select account, role, name, number from ly_user where account=$1 and role=$2 and pwd_hash=$3`,
      [String(p.account || '').trim(), p.role, sha256(p.pwd || '')]);
    if (!r.rowCount) throw { code: 1, message: '账号或密码不正确' };
    const u = r.rows[0];
    const token = randomBytes(24).toString('hex');
    sessions.set(token, u);
    return { token, account: u.account, role: u.role, name: u.name, number: u.number };
  },
  async 'AuthController.me'(p, ctx) {
    if (!ctx.user) throw { code: 1, message: '未登录' };
    return ctx.user;
  },
};

/* ============================================================
   HTTP 服务
   ============================================================ */
const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOW);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
};
const send = (res, code, obj) => { cors(res); res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((resolve) => {
  let b = ''; req.on('data', (c) => { b += c; if (b.length > 2e6) req.destroy(); });
  req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } });
});

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }

  if (req.url === '/api/health') {
    let db = false;
    try { db = await ping(); } catch { /* db 未就绪 */ }
    return send(res, 200, { ok: true, db, database: DB_LABEL, port: PORT, sessions: sessions.size });
  }

  const m = req.url.match(/^\/ierp\/kapi\/app\/([A-Za-z]+)\/([A-Za-z]+)/);
  if (m && req.method === 'POST') {
    const key = `${m[1]}.${m[2]}`;
    const handler = routes[key];
    if (!handler) return send(res, 200, { code: 1, message: `未知接口 ${key}` });
    try {
      const body = await readBody(req);
      const auth = req.headers['authorization'] || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      const ctx = { user: sessions.get(token) || null, token };
      const data = await handler(body, ctx);
      return send(res, 200, { code: 0, data });
    } catch (e) {
      // 仅业务异常（数字 code）原样返回；其余（如 pg 的 ECONNREFUSED 字符串 code）统一包成 code:1
      if (e && typeof e === 'object' && typeof e.code === 'number') return send(res, 200, e);
      console.error(`[乐颜 后端] ${key} 出错：`, e?.message || e);
      const dbDown = e && (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || /ECONNREFUSED|connect|password|database .* does not exist/i.test(e?.message || ''));
      return send(res, 200, { code: 1, message: dbDown ? '数据库未连接，请先起库并迁移（详见后端运行手册）' : (e?.message || '服务器错误') });
    }
  }

  send(res, 404, { code: 1, message: 'NOT_FOUND' });
});

// PG_MEM 测试模式：进程内建表 + 灌种子（无需外部 PostgreSQL）
if (process.env.PG_MEM === '1' && memDb) {
  try {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    memDb.public.none(schema);
    const { seedAll } = await import('./seed.mjs');
    const seeded = await seedAll();
    console.log('[乐颜 后端] pg-mem 建表+种子完成：' + (seeded.join('、') || '数据已存在'));
  } catch (e) {
    console.error('[乐颜 后端] pg-mem 初始化失败：', e.message);
  }
}

server.listen(PORT, async () => {
  let db = false;
  try { db = await ping(); } catch { /* ignore */ }
  console.log(`[乐颜 后端] http://localhost:${PORT}  (苍穹 KAPI 形态 /ierp/kapi/app/...)`);
  console.log(`[乐颜 后端] PostgreSQL ${DB_LABEL} —— ${db ? '已连接 ✅' : '未连接 ⚠️（请先起库并 migrate）'}`);
  if (!db) console.log('  提示：docker compose up -d db  然后  node server/migrate.mjs');
});
