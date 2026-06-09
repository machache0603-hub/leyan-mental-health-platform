/* ============================================================
   乐颜 · 数据库连接（PostgreSQL）
   ------------------------------------------------------------
   - 读取 server/.env（简易解析，无需 dotenv）
   - 导出连接池 pool、查询助手 q、健康探测 ping
   - 连接信息只在服务端，前端永不持有
   - 设 PG_MEM=1 时用 pg-mem(内存版 PostgreSQL)，零外部依赖，
     供「无 PG 环境的一键演示/自测」用；生产路径完全不受影响。
   ============================================================ */
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// —— 加载 server/.env ——
try {
  const env = readFileSync(join(__dirname, '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* 没有 .env 也能起，用默认/环境变量 */ }

// 真实 PG 把 DATE 解析成字符串（避免时区偏移），与 pg-mem 行为对齐
pg.types.setTypeParser(1082, (v) => v);

let pool;
let ping;
let DB_LABEL;
let memDb = null;

if (process.env.PG_MEM === '1') {
  // —— 内存版 PostgreSQL（测试/零依赖演示）——
  const { newDb, DataType } = await import('pg-mem');
  memDb = newDb();
  // pg-mem 未内置 to_char，注册项目用到的日期格式化（只需 M/D）
  const toMD = (d) => { const dt = d instanceof Date ? d : new Date(d); return `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`; };
  for (const t of [DataType.date, DataType.timestamp, DataType.timestamptz]) {
    try { memDb.public.registerFunction({ name: 'to_char', args: [t, DataType.text], returns: DataType.text, implementation: toMD, impure: false }); } catch { /* 重复签名忽略 */ }
  }
  const { Pool } = memDb.adapters.createPg();
  pool = new Pool();
  ping = async () => true;
  DB_LABEL = 'pg-mem（内存版 PostgreSQL · 测试模式）';
} else {
  // —— 真实 PostgreSQL ——
  const cfg = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || 'leyan',
        password: process.env.PGPASSWORD || 'leyan',
        database: process.env.PGDATABASE || 'leyan',
      };
  pool = new pg.Pool({ ...cfg, max: 8, idleTimeoutMillis: 30000, connectionTimeoutMillis: 4000 });
  ping = async () => { const c = await pool.connect(); try { await c.query('select 1'); return true; } finally { c.release(); } };
  DB_LABEL = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@/]*@/, ':****@') : `${cfg.host}:${cfg.port}/${cfg.database}`;
}

/** 执行 SQL（参数化，防注入） */
export const q = (text, params) => pool.query(text, params);

export { pool, ping, DB_LABEL, memDb };
