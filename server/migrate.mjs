/* ============================================================
   乐颜 · 迁移脚本：建表（schema.sql）+ 写种子（seed.mjs）
   幂等：表已存在不重建，表非空不重复灌种子。
   用法：node server/migrate.mjs
   ============================================================ */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool, q, ping, DB_LABEL } from './db.mjs';
import { seedAll } from './seed.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log(`[乐颜 迁移] 连接 ${DB_LABEL} …`);
  await ping();
  console.log('[乐颜 迁移] 连接成功，建表中…');
  const ddl = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await q(ddl);                                   // 多语句一次执行
  console.log('[乐颜 迁移] 表结构就绪，写入种子数据…');
  const seeded = await seedAll();
  console.log(seeded.length ? `[乐颜 迁移] 已灌入：${seeded.join('、')}` : '[乐颜 迁移] 数据已存在，跳过种子');
  console.log('[乐颜 迁移] ✅ 完成');
  await pool.end();
}

main().catch((e) => {
  console.error('[乐颜 迁移] ❌ 失败：', e.message);
  process.exit(1);
});
