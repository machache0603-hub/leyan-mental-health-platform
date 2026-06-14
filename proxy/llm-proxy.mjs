/* ============================================================
   乐颜 · LLM 代理后端（零依赖 Node，藏住 API Key）
   ------------------------------------------------------------
   前端只调本代理，本代理再转发到 OpenAI 兼容大模型
   (DeepSeek / 豆包·火山方舟 / 通义千问)。API Key 只存在
   本进程的环境变量里，浏览器永远拿不到。

   运行：
     1) 复制 proxy/.env.example 为 proxy/.env，填入你的 key/模型
     2) node proxy/llm-proxy.mjs      （需 Node 18+，用内置 fetch）
   ============================================================ */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// —— 加载 proxy/.env（简易解析，无需 dotenv 依赖） ——
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const env = readFileSync(join(__dirname, '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* 没有 .env 也能起，只是没配 key 时返回提示 */ }

const PORT = Number(process.env.PORT || 8787);
/** 默认只听本机回环（代理背后是付费 key，防局域网盗用）；需要时设 HOST=0.0.0.0 */
const HOST = process.env.HOST || '127.0.0.1';
const BASE = (process.env.LLM_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const KEY = process.env.LLM_API_KEY || '';
const MODEL = process.env.LLM_MODEL || 'deepseek-v4-pro';
/** 文生图（StepFun 阶跃星辰）：艺术疗愈画室用，key 同样只在服务端 */
const IMG_BASE = (process.env.IMAGE_BASE_URL || 'https://api.stepfun.com/v1').replace(/\/$/, '');
const IMG_KEY = process.env.IMAGE_API_KEY || '';
const IMG_MODEL = process.env.IMAGE_MODEL || 'step-1x-medium';
/** CORS 白名单（逗号分隔），默认只放行本机前端 */
const ALLOW_LIST = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',').map((x) => x.trim()).filter(Boolean);

const cors = (res) => {
  const o = res.__origin;
  const allow = ALLOW_LIST.includes('*') ? (o || '*') : (o && ALLOW_LIST.includes(o) ? o : ALLOW_LIST[0]);
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
};
const json = (res, code, obj) => { cors(res); res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

const server = createServer(async (req, res) => {
  res.__origin = req.headers.origin;
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }

  if (req.url === '/api/health') {
    return json(res, 200, { ok: true, model: MODEL, base: BASE, hasKey: Boolean(KEY), image: { model: IMG_MODEL, base: IMG_BASE, hasKey: Boolean(IMG_KEY) } });
  }

  if (req.url === '/api/llm/chat' && req.method === 'POST') {
    if (!KEY) return json(res, 200, { error: 'NO_API_KEY', message: '代理未配置 LLM_API_KEY（前端会自动回退到 mock）' });
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', async () => {
      try {
        const { messages, temperature = 0.7, json: wantJson = false, max_tokens = 800 } = JSON.parse(body || '{}');
        const payload = { model: MODEL, messages, temperature, max_tokens };
        if (wantJson) payload.response_format = { type: 'json_object' };
        const r = await fetch(`${BASE}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
          body: JSON.stringify(payload),
        });
        if (!r.ok) { const t = await r.text(); return json(res, 200, { error: 'UPSTREAM', status: r.status, message: t.slice(0, 500) }); }
        const data = await r.json();
        const text = data?.choices?.[0]?.message?.content ?? '';
        return json(res, 200, { text });
      } catch (e) {
        return json(res, 200, { error: 'PROXY', message: String(e?.message || e) });
      }
    });
    return;
  }

  if (req.url === '/api/image/generate' && req.method === 'POST') {
    if (!IMG_KEY) return json(res, 200, { error: 'NO_IMAGE_KEY', message: '代理未配置 IMAGE_API_KEY（前端会回退到占位画布）' });
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', async () => {
      try {
        const { prompt, size = '1024x1024' } = JSON.parse(body || '{}');
        if (!prompt || !String(prompt).trim()) return json(res, 200, { error: 'BAD_PROMPT', message: '缺少画面描述' });
        const payload = { model: IMG_MODEL, prompt: String(prompt).slice(0, 512), size, n: 1, response_format: 'url' };
        const r = await fetch(`${IMG_BASE}/images/generations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${IMG_KEY}` },
          body: JSON.stringify(payload),
        });
        if (!r.ok) { const t = await r.text(); return json(res, 200, { error: 'UPSTREAM', status: r.status, message: t.slice(0, 500) }); }
        const data = await r.json();
        const item = data?.data?.[0] || {};
        if (item.finish_reason === 'content_filtered') return json(res, 200, { error: 'FILTERED', message: '画面描述未通过内容审核，换个说法试试' });
        const url = item.url || (item.b64_json ? `data:image/png;base64,${item.b64_json}` : '');
        if (!url) return json(res, 200, { error: 'NO_IMAGE', message: '未返回图片' });
        return json(res, 200, { url, seed: item.seed });
      } catch (e) {
        return json(res, 200, { error: 'PROXY', message: String(e?.message || e) });
      }
    });
    return;
  }

  json(res, 404, { error: 'NOT_FOUND' });
});

server.listen(PORT, HOST, () => {
  console.log(`[乐颜 LLM 代理] http://${HOST}:${PORT}  model=${MODEL}  hasKey=${Boolean(KEY)}`);
  console.log(`  生图(StepFun) model=${IMG_MODEL}  hasKey=${Boolean(IMG_KEY)}`);
  if (!KEY) console.log('  ⚠️  未检测到 LLM_API_KEY —— 复制 proxy/.env.example 为 proxy/.env 并填入 key');
  if (HOST !== '127.0.0.1') console.log('  ⚠️  正在监听非回环地址，请确认 CORS_ORIGIN 已收紧到可信来源');
});
