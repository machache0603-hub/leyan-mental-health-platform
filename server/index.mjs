/* ============================================================
   乐颜 · 真实可跑后端（Node + PostgreSQL）
   ------------------------------------------------------------
   关键设计：HTTP 路由复用金蝶苍穹 KAPI 形态
       POST /ierp/kapi/app/<控制器>/<方法>
   因此前端「同一套 api.ts」本地连本服务、上线连苍穹，只换 base。
   响应统一 { code:0, data } / { code:1, message }。
   ============================================================ */
import { createServer } from 'node:http';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
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
/** 监听地址：默认只听本机回环，需要局域网演示时设 HOST=0.0.0.0（并配好 CORS_ORIGIN） */
const HOST = process.env.HOST || '127.0.0.1';
/** CORS 白名单（逗号分隔）。默认只放行本机前端，不再是 '*' */
const ALLOW_LIST = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',').map((x) => x.trim()).filter(Boolean);

const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
const hhmm = () => new Date().toTimeString().slice(0, 5);
const fmtMD = (iso) => `${+iso.slice(5, 7)}/${+iso.slice(8, 10)}`;
const LOW = new Set(['low', 'anxious', 'sad']);
const MOOD_SET = new Set(['joy', 'love', 'calm', 'low', 'anxious', 'sad']);
const DEFAULT_CONFIG = { riskThresholdHigh: 3, riskThresholdMid: 4, notifyChannels: { app: true, sms: true, email: false }, anonymousDefault: true, nightMode: 'auto' };

/** 文本字段统一裁剪（防超长灌库） */
const cap = (v, max) => String(v ?? '').slice(0, max);

/* —— 密码哈希：scrypt（加盐、抗 GPU 爆破）。兼容旧 sha256，登录成功后自动升级 —— */
const hashPwd = (pwd, salt = randomBytes(16).toString('hex')) =>
  `scrypt$${salt}$${scryptSync(String(pwd), salt, 64).toString('hex')}`;
function verifyPwd(pwd, stored) {
  try {
    if (String(stored).startsWith('scrypt$')) {
      const [, salt, key] = String(stored).split('$');
      const calc = scryptSync(String(pwd), salt, 64);
      const ref = Buffer.from(key, 'hex');
      return calc.length === ref.length && timingSafeEqual(calc, ref);
    }
    const a = Buffer.from(sha256(pwd));            // 旧格式兼容
    const b = Buffer.from(String(stored));
    return a.length === b.length && timingSafeEqual(a, b);
  } catch { return false; }
}

/* —— 登录限速：同一「账号|IP」10 分钟内最多失败 5 次 —— */
const loginAttempts = new Map();    // key -> { fails, blockedUntil, last }
function rateGate(key) {
  const now = Date.now();
  if (loginAttempts.size > 5000) {                 // 惰性清理，防内存膨胀
    for (const [k, v] of loginAttempts) if (v.blockedUntil < now && now - v.last > 600000) loginAttempts.delete(k);
  }
  const e = loginAttempts.get(key) || { fails: 0, blockedUntil: 0, last: now };
  if (e.blockedUntil > now) return { ok: false };
  return {
    ok: true,
    fail() { e.fails++; e.last = now; if (e.fails >= 5) { e.blockedUntil = now + 600000; e.fails = 0; } loginAttempts.set(key, e); },
    clear() { loginAttempts.delete(key); },
  };
}

/* —— 登录会话（进程内；带 8 小时滑动过期） —— */
const SESSION_TTL = 8 * 3600 * 1000;
const sessions = new Map();          // token -> { user, expires }

/* —— 接口鉴权表：除登录外全部要求 token；按控制器要求角色 —— */
const PUBLIC_ROUTES = new Set(['AuthController.login']);
const ROUTE_ROLE = {
  MoodController: 'student', DiaryController: 'student', GalleryController: 'student', TreeholeController: 'student',
  TalkController: 'teacher',
  AlertController: 'admin', ConfigController: 'admin', ResourceController: 'admin',
  AuthController: 'any',
};

async function getConfig() {
  const r = await q(`select data from ly_config where id=1`);
  return r.rowCount ? r.rows[0].data : DEFAULT_CONFIG;
}
const studentOf = (ctx) => ctx.user.number;       // 鉴权层保证 user 存在
const userKey = (ctx) => ctx.user.account;

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
    if (!MOOD_SET.has(p.mood)) throw { code: 1, message: '无效的心情类型' };
    const student = studentOf(ctx);
    const today = new Date().toISOString().slice(0, 10);
    await q(`insert into ly_mood_log(student, log_date, mood, note, anonymous) values($1,$2,$3,$4,$5)`,
      [student, today, p.mood, p.note ? cap(p.note, 500) : null, !!p.anonymous]);
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
    if (!p.text || !String(p.text).trim()) throw { code: 1, message: '内容不能为空' };
    const d = fmtMD(new Date().toISOString().slice(0, 10));
    const r = await q(`insert into ly_diary(student, diary_date, content, emoji) values($1,$2,$3,$4)
                       returning id::int, diary_date as date, content as text, emoji`,
      [studentOf(ctx), d, cap(p.text, 2000), cap(p.emoji || '📝', 8)]);
    return r.rows[0];
  },

  /* ---------- 树洞广场 ---------- */
  async 'TreeholeController.list'(p, ctx) {
    const r = await q(TREEHOLE_SELECT('$1'), [userKey(ctx)]);
    return r.rows;
  },
  async 'TreeholeController.create'(p, ctx) {
    if (!p.text || !String(p.text).trim()) throw { code: 1, message: '内容不能为空' };
    const ins = await q(`insert into ly_treehole(content, tag) values($1,$2)
                         returning id::int, content as text, tag, hugs, same_feel as "sameFeel", time_ago as "timeAgo"`,
      [cap(p.text, 2000), cap(p.tag || '#情绪', 32)]);
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
    const teacher = ctx.user.name || ctx.user.account;
    const r = await q(`insert into ly_talk_record(teacher, student, talk_date, topic, summary, follow_up, done)
                       values($1,$2,$3,$4,$5,$6,false)
                       returning id::int, student, talk_date as date, topic, summary, follow_up as "followUp", done`,
      [teacher, cap(p.student, 64), cap(p.date, 16), cap(p.topic, 128), cap(p.summary, 2000), cap(p.followUp, 500)]);
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
    const colors = (Array.isArray(p.colors) ? p.colors : []).slice(0, 8).map((c) => cap(c, 16)).join(',');
    const clamp = (v) => Math.max(0, Math.min(100, Number(v) || 0));
    const r = await q(`insert into ly_artwork(student, prompt, palette, colors, bright, warm, interpret)
                       values($1,$2,$3,$4,$5,$6,$7)
                       returning id::int, prompt, palette, colors, bright, warm, interpret as interp`,
      [studentOf(ctx), cap(p.prompt, 500), cap(p.palette, 32), colors, clamp(p.bright), clamp(p.warm), cap(p.interpret, 2000)]);
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
    if (!p.title || !String(p.title).trim()) throw { code: 1, message: '资源标题不能为空' };
    const r = await q(`insert into ly_resource(title, type, emoji, status, usage) values($1,$2,$3,$4,0)
                       returning id::int, title, type, usage, status, emoji`,
      [cap(p.title, 128), cap(p.type || '图文', 16), cap(p.emoji || '📦', 8), p.status === '已上架' ? '已上架' : '草稿']);
    return r.rows[0];
  },
  async 'ResourceController.update'(p) {
    await q(`update ly_resource set title=coalesce($2,title), type=coalesce($3,type), emoji=coalesce($4,emoji) where id=$1`,
      [p.id, p.title != null ? cap(p.title, 128) : null, p.type != null ? cap(p.type, 16) : null, p.emoji != null ? cap(p.emoji, 8) : null]);
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
  async 'AuthController.login'(p, ctx) {
    const account = cap(p.account, 64).trim();
    const role = ['student', 'teacher', 'admin'].includes(p.role) ? p.role : '';
    if (!account || !role) throw { code: 1, message: '账号或密码不正确' };
    const gate = rateGate(`${account}|${ctx.ip}`);                 // 防爆破
    if (!gate.ok) throw { code: 1, message: '尝试次数过多，请 10 分钟后再试' };
    const r = await q(`select account, pwd_hash as hash, role, name, number from ly_user where account=$1 and role=$2`,
      [account, role]);
    const u = r.rows[0];
    if (!u || !verifyPwd(p.pwd || '', u.hash)) { gate.fail(); throw { code: 1, message: '账号或密码不正确' }; }
    gate.clear();
    if (!String(u.hash).startsWith('scrypt$')) {                   // 旧 sha256 透明升级为 scrypt
      await q(`update ly_user set pwd_hash=$2 where account=$1`, [account, hashPwd(p.pwd)]);
    }
    const token = randomBytes(24).toString('hex');
    sessions.set(token, { user: { account: u.account, role: u.role, name: u.name, number: u.number }, expires: Date.now() + SESSION_TTL });
    return { token, account: u.account, role: u.role, name: u.name, number: u.number };
  },
  async 'AuthController.logout'(p, ctx) {
    if (ctx.token) sessions.delete(ctx.token);                     // 服务端作废会话
    return { ok: true };
  },
  async 'AuthController.me'(p, ctx) {
    return ctx.user;
  },
};

/* ============================================================
   HTTP 服务
   ============================================================ */
const cors = (res) => {
  const o = res.__origin;                                  // 由请求入口注入
  const allow = ALLOW_LIST.includes('*') ? (o || '*') : (o && ALLOW_LIST.includes(o) ? o : ALLOW_LIST[0]);
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
};
const send = (res, code, obj) => { cors(res); res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((resolve) => {
  let b = ''; req.on('data', (c) => { b += c; if (b.length > 2e6) req.destroy(); });
  req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } });
});

const server = createServer(async (req, res) => {
  res.__origin = req.headers.origin;
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
      // 会话查找（带滑动过期）
      let user = null;
      const sess = sessions.get(token);
      if (sess) {
        if (Date.now() > sess.expires) sessions.delete(token);
        else { sess.expires = Date.now() + SESSION_TTL; user = sess.user; }
      }
      const ctx = { user, token, ip: req.socket.remoteAddress || '' };
      // —— 强制鉴权 + 角色校验（除 login 外全部要求登录） ——
      if (!PUBLIC_ROUTES.has(key)) {
        if (!ctx.user) return send(res, 200, { code: 401, message: '未登录或会话已过期' });
        const need = ROUTE_ROLE[m[1]];
        if (need && need !== 'any' && ctx.user.role !== need) {
          return send(res, 200, { code: 403, message: '无权访问该接口' });
        }
      }
      const data = await handler(body, ctx);
      return send(res, 200, { code: 0, data });
    } catch (e) {
      // 仅业务异常（数字 code）原样返回；其余统一脱敏，细节只记服务端日志
      if (e && typeof e === 'object' && typeof e.code === 'number') return send(res, 200, e);
      console.error(`[乐颜 后端] ${key} 出错：`, e?.message || e);
      const dbDown = e && (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' || /ECONNREFUSED|connect|password|database .* does not exist/i.test(e?.message || ''));
      return send(res, 200, { code: 1, message: dbDown ? '数据库未连接，请先起库并迁移（详见后端运行手册）' : '服务器开小差了，请稍后再试' });
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

server.listen(PORT, HOST, async () => {
  let db = false;
  try { db = await ping(); } catch { /* ignore */ }
  console.log(`[乐颜 后端] http://${HOST}:${PORT}  (苍穹 KAPI 形态 /ierp/kapi/app/...)`);
  if (HOST !== '127.0.0.1') console.log('  ⚠️  正在监听非回环地址，请确认 CORS_ORIGIN 已收紧到可信来源');
  console.log(`[乐颜 后端] PostgreSQL ${DB_LABEL} —— ${db ? '已连接 ✅' : '未连接 ⚠️（请先起库并 migrate）'}`);
  if (!db) console.log('  提示：docker compose up -d db  然后  node server/migrate.mjs');
});
