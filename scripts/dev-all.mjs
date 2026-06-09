/* ============================================================
   乐颜 · 一键启动全栈（零依赖 Node 编排）
   顺序：PostgreSQL(可选 docker) → 迁移+种子 → 后端API → AI代理 → 前端
   连不上 PG 时自动降级前端为 local(localStorage) 模式，演示永不挂。
   用法：npm run dev:all      （Ctrl+C 停止全部）
   ============================================================ */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PGHOST = process.env.PGHOST || 'localhost';
const PGPORT = Number(process.env.PGPORT || 5432);

const C = { reset: '\x1b[0m', cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m', magenta: '\x1b[35m', blue: '\x1b[34m' };
const log = (m) => console.log(`${C.cyan}[乐颜]${C.reset} ${m}`);
const warn = (m) => console.log(`${C.yellow}[乐颜]${C.reset} ${m}`);

function tcpUp(host, port, timeout = 1500) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host, port });
    let done = false;
    const finish = (ok) => { if (!done) { done = true; sock.destroy(); resolve(ok); } };
    sock.setTimeout(timeout);
    sock.on('connect', () => finish(true));
    sock.on('timeout', () => finish(false));
    sock.on('error', () => finish(false));
  });
}
async function waitTcp(host, port, tries = 40) {
  for (let i = 0; i < tries; i++) { if (await tcpUp(host, port)) return true; await new Promise(r => setTimeout(r, 1000)); }
  return false;
}
const hasCmd = (cmd) => { try { return spawnSync(cmd, ['--version'], { shell: true, stdio: 'ignore' }).status === 0; } catch { return false; } };

const children = [];
function run(name, color, cmd, args, opts = {}) {
  const child = spawn(cmd, args, { cwd: ROOT, shell: opts.shell ?? false, env: { ...process.env, ...(opts.env || {}) } });
  const prefix = `${color}[${name}]${C.reset} `;
  const pipe = (stream) => stream && stream.on('data', (d) => {
    const text = d.toString();
    text.split(/\r?\n/).forEach((line, i, arr) => { if (i === arr.length - 1 && line === '') return; process.stdout.write(prefix + line + '\n'); });
  });
  pipe(child.stdout); pipe(child.stderr);
  child.on('exit', (code) => warn(`${name} 退出 (code ${code})`));
  children.push(child);
  return child;
}
process.on('SIGINT', () => { log('正在停止全部服务…'); children.forEach(c => { try { c.kill(); } catch { /* ignore */ } }); process.exit(0); });

(async () => {
  console.log(`\n${C.magenta}乐颜 · 一键启动全栈${C.reset}   (Ctrl+C 停止)\n`);

  // 1) PostgreSQL
  let pgUp = await tcpUp(PGHOST, PGPORT);
  if (pgUp) log(`PostgreSQL 已在 ${PGHOST}:${PGPORT} ✅`);
  else {
    warn(`未发现 PostgreSQL(${PGHOST}:${PGPORT})`);
    if (hasCmd('docker')) {
      log('检测到 Docker，启动数据库容器 (docker compose up -d db)…');
      spawnSync('docker', ['compose', 'up', '-d', 'db'], { cwd: ROOT, shell: true, stdio: 'inherit' });
      log('等待数据库就绪…');
      pgUp = await waitTcp(PGHOST, PGPORT, 40);
      log(pgUp ? '数据库就绪 ✅' : '数据库仍未就绪 ⚠️');
    } else {
      warn('未检测到 Docker —— 将以「本地 localStorage 模式」启动（演示照常可用）。');
      warn('启用真实 PostgreSQL：安装 Docker 后重跑，或手动起 PG 再 npm run db:migrate');
    }
  }

  // 2) 后端依赖 + 迁移
  if (pgUp && !existsSync(join(ROOT, 'server', 'node_modules', 'pg', 'package.json'))) {
    log('安装后端依赖 (npm install --prefix server)…');
    const r = spawnSync('npm', ['install', '--prefix', 'server'], { cwd: ROOT, shell: true, stdio: 'inherit' });
    if (r.status !== 0) { warn('后端依赖安装失败（可能离线），改用本地模式。'); pgUp = false; }
  }
  if (pgUp) {
    log('数据库迁移 + 种子 (node server/migrate.mjs)…');
    const r = spawnSync(process.execPath, ['server/migrate.mjs'], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) { warn('迁移失败，改用本地模式。'); pgUp = false; }
  }

  // 3) 启动服务
  if (pgUp) run('后端', C.green, process.execPath, ['server/index.mjs']);
  run('AI代理', C.blue, process.execPath, ['proxy/llm-proxy.mjs']);
  run('前端', C.magenta, 'npm', ['run', 'dev'], { shell: true, env: { VITE_DATA_BACKEND: pgUp ? 'server' : 'local' } });

  setTimeout(() => {
    console.log(`\n${C.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
    log('前端     http://localhost:3000   学生 /  ·  教师 /teacher  ·  管理 /admin');
    if (pgUp) log('后端API  http://localhost:8788/api/health   数据 → PostgreSQL');
    log('AI代理   http://localhost:8787/api/health   (填 key 走真实大模型)');
    log(`数据模式 ${pgUp ? 'server（真实后端 + PostgreSQL）' : 'local（浏览器 localStorage 持久化）'}`);
    log('演示账号 学号/工号 见登录页「一键填入」，密码统一 leyan123');
    console.log(`${C.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}\n`);
  }, 2600);
})();
