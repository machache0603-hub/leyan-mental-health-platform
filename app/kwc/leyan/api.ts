/* ============================================================
   乐颜 · 数据访问层（前端唯一数据出入口）
   ------------------------------------------------------------
   三种数据源，组件代码完全一致（都用 Promise）：
   1) 'local'  —— 浏览器 localStorage 持久化（无后端也能演示，刷新不丢）
   2) 'server' —— 本地真实后端 Node + PostgreSQL（端口 8788）
   3) 'cosmic' —— 金蝶苍穹 KWC 控制器（生产，数据落 PostgreSQL）

   关键：'server' 与 'cosmic' 复用同一套苍穹 KAPI URL 形态
        POST /ierp/kapi/app/<控制器>/<方法>
   因此「本地真后端」与「上线苍穹」前端零改动，只换 base 地址。

   选择优先级：VITE_DATA_BACKEND（local/server/cosmic）> 运行时检测苍穹 > local。
   ============================================================ */
import {
  myMoodHistory, gardenStories, treeholePosts, diaryEntries,
  talkRecords as seedTalks, alertEvents as seedAlerts, defaultConfig,
  resourceItems as seedResources,
  MoodLog, TreeholePost, DiaryEntry, TalkRecord, AlertEvent, AlertStatus, MoodKey, ResourceItem, Role,
} from './data';

type Backend = 'local' | 'server' | 'cosmic';

const detectCosmic = (): boolean =>
  typeof window !== 'undefined' && Boolean((window as any).__KWC_PLATFORM__);

const ENV_BACKEND = ((import.meta as any).env?.VITE_DATA_BACKEND || '').toLowerCase();
export const BACKEND: Backend =
  ENV_BACKEND === 'server' ? 'server'
  : ENV_BACKEND === 'cosmic' ? 'cosmic'
  : ENV_BACKEND === 'local' ? 'local'
  : detectCosmic() ? 'cosmic' : 'local';

/** 是否走远端（server / cosmic 共享 KAPI 调用） */
const REMOTE = BACKEND !== 'local';

const COSMIC_BASE: string = (typeof window !== 'undefined' && (window as any).__KWC_COSMIC_BASE__) || '';
const SERVER_BASE: string = (import.meta as any).env?.VITE_SERVER_BASE || 'http://localhost:8788';

/* ---------------- 登录 token（仅存服务端发的随机 token，无明文） ---------------- */
const TOKEN_KEY = 'leyan:token';
export const getToken = (): string => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
const setToken = (t: string) => { try { sessionStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ } };
const clearToken = () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } };

/* ---------------- 苍穹 / 真实后端 KAPI 调用 ---------------- */
async function callKapi<T>(controller: string, method: string, params?: any): Promise<T> {
  const base = BACKEND === 'server' ? SERVER_BASE : COSMIC_BASE;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${base}/ierp/kapi/app/${controller}/${method}`, {
    method: 'POST',
    headers,
    credentials: BACKEND === 'cosmic' ? 'include' : 'same-origin',
    body: JSON.stringify(params ?? {}),
  });
  if (!res.ok) throw new Error(`${controller}.${method} ${res.status}`);
  const json = await res.json();
  if (json && json.code !== undefined && json.code !== 0) throw new Error(json.message || '后端错误');
  return (json.data ?? json) as T;
}

/* ---------------- 本地持久化（localStorage） ---------------- */
const KEY = (k: string) => `leyan:${k}`;
function lget<T>(k: string, seed: T): T {
  try {
    const raw = localStorage.getItem(KEY(k));
    if (raw == null) { localStorage.setItem(KEY(k), JSON.stringify(seed)); return seed; }
    return JSON.parse(raw) as T;
  } catch { return seed; }
}
function lset<T>(k: string, v: T): T {
  try { localStorage.setItem(KEY(k), JSON.stringify(v)); } catch { /* 隐私模式忽略 */ }
  return v;
}
const delay = <T,>(v: T) => new Promise<T>(r => setTimeout(() => r(v), 120)); // 模拟网络
const todayMD = () => { const d = new Date(); return `${d.getMonth() + 1}/${d.getDate()}`; };

/* ============================================================
   业务接口（组件只调这些；三种后端实现一致）
   ============================================================ */

/* —— 心情打卡 / 情绪花园 —— */
export interface CheckinResult extends MoodLog { alertTriggered?: boolean; }
export const MoodApi = {
  history(): Promise<MoodLog[]> {
    if (REMOTE) return callKapi('MoodController', 'getHistory', { days: 14 });
    return delay(lget('mood_history', myMoodHistory));
  },
  checkin(mood: MoodKey, note?: string, anonymous?: boolean): Promise<CheckinResult> {
    if (REMOTE) return callKapi('MoodController', 'checkin', { mood, note, anonymous });
    const entry: MoodLog = { date: todayMD(), mood, note };
    const list = lget<MoodLog[]>('mood_history', myMoodHistory);
    lset('mood_history', [...list, entry]);
    // 本地也做一次"连续低落"判断，便于无后端时演示预警提示
    const low = new Set(['low', 'anxious', 'sad']);
    const last3 = [...list, entry].slice(-3);
    const alertTriggered = last3.length >= 3 && last3.every(m => low.has(m.mood));
    return delay({ ...entry, alertTriggered });
  },
  stories(): Promise<typeof gardenStories> {
    if (REMOTE) return callKapi('MoodController', 'listStories');
    return delay(lget('garden_stories', gardenStories));
  },
};

/* —— 小确幸日记 —— */
export const DiaryApi = {
  list(): Promise<DiaryEntry[]> {
    if (REMOTE) return callKapi('DiaryController', 'list');
    return delay(lget('diary', diaryEntries));
  },
  add(text: string, emoji: string): Promise<DiaryEntry> {
    if (REMOTE) return callKapi('DiaryController', 'create', { text, emoji });
    const entry: DiaryEntry = { id: Date.now(), date: todayMD(), text, emoji };
    const list = lget<DiaryEntry[]>('diary', diaryEntries);
    lset('diary', [entry, ...list]);
    return delay(entry);
  },
};

/* —— 树洞广场 —— */
export const TreeholeApi = {
  list(): Promise<TreeholePost[]> {
    if (REMOTE) return callKapi('TreeholeController', 'list');
    return delay(lget('treehole', treeholePosts));
  },
  add(text: string, tag: string): Promise<TreeholePost> {
    if (REMOTE) return callKapi('TreeholeController', 'create', { text, tag });
    const post: TreeholePost = { id: Date.now(), text, tag, hugs: 0, sameFeel: 0, timeAgo: '刚刚' };
    const list = lget<TreeholePost[]>('treehole', treeholePosts);
    lset('treehole', [post, ...list]);
    return delay(post);
  },
  toggleHug(id: number): Promise<TreeholePost[]> {
    if (REMOTE) return callKapi('TreeholeController', 'toggleHug', { id });
    const list = lget<TreeholePost[]>('treehole', treeholePosts)
      .map(p => p.id === id ? { ...p, hugged: !p.hugged, hugs: p.hugs + (p.hugged ? -1 : 1) } : p);
    lset('treehole', list);
    return delay(list);
  },
};

/* —— 我的画廊（疗愈画作） —— */
export interface Artwork { id: number; prompt: string; palette?: string; colors: string[]; bright?: number; warm?: number; interp: string; }
export const GalleryApi = {
  list(): Promise<Artwork[]> {
    if (REMOTE) return callKapi('GalleryController', 'list');
    return delay(lget('gallery', [] as Artwork[]));
  },
  add(a: Omit<Artwork, 'id'>): Promise<Artwork> {
    if (REMOTE) return callKapi('GalleryController', 'create', { ...a, interpret: a.interp });
    const item: Artwork = { id: Date.now(), ...a };
    lset('gallery', [item, ...lget<Artwork[]>('gallery', [])]);
    return delay(item);
  },
};

/* —— 谈心记录（教师） —— */
export const TalkApi = {
  list(): Promise<TalkRecord[]> {
    if (REMOTE) return callKapi('TalkController', 'list');
    return delay(lget('talks', seedTalks));
  },
  add(rec: Omit<TalkRecord, 'id' | 'done'>): Promise<TalkRecord> {
    if (REMOTE) return callKapi('TalkController', 'create', rec);
    const r: TalkRecord = { id: Date.now(), done: false, ...rec };
    lset('talks', [r, ...lget<TalkRecord[]>('talks', seedTalks)]);
    return delay(r);
  },
  toggle(id: number): Promise<TalkRecord[]> {
    if (REMOTE) return callKapi('TalkController', 'toggleFollowUp', { id });
    const list = lget<TalkRecord[]>('talks', seedTalks).map(t => t.id === id ? { ...t, done: !t.done } : t);
    lset('talks', list);
    return delay(list);
  },
};

/* —— 预警管理（管理端） —— */
export const AlertApi = {
  list(): Promise<AlertEvent[]> {
    if (REMOTE) return callKapi('AlertController', 'list');
    return delay(lget('alerts', seedAlerts));
  },
  advance(id: string): Promise<AlertEvent[]> {
    if (REMOTE) return callKapi('AlertController', 'advance', { id });
    const list = lget<AlertEvent[]>('alerts', seedAlerts).map(a =>
      a.id === id ? { ...a, status: (a.status === 'new' ? 'processing' : 'resolved') as AlertStatus, owner: a.owner === '—' ? '张老师' : a.owner } : a);
    lset('alerts', list);
    return delay(list);
  },
};

/* —— 资源中心（管理端 CRUD + 上下架） —— */
export const ResourceApi = {
  list(): Promise<ResourceItem[]> {
    if (REMOTE) return callKapi('ResourceController', 'list');
    return delay(lget('resources', seedResources));
  },
  add(r: { title: string; type: string; emoji: string; status?: string }): Promise<ResourceItem> {
    if (REMOTE) return callKapi('ResourceController', 'create', r);
    const item = { id: Date.now(), usage: 0, status: (r.status || '草稿') as ResourceItem['status'], title: r.title, type: r.type, emoji: r.emoji } as ResourceItem;
    lset('resources', [...lget<ResourceItem[]>('resources', seedResources), item]);
    return delay(item);
  },
  update(id: number, patch: { title?: string; type?: string; emoji?: string }): Promise<ResourceItem[]> {
    if (REMOTE) return callKapi('ResourceController', 'update', { id, ...patch });
    const list = lget<ResourceItem[]>('resources', seedResources).map(x => x.id === id ? { ...x, ...patch } : x);
    return delay(lset('resources', list));
  },
  toggle(id: number): Promise<ResourceItem[]> {
    if (REMOTE) return callKapi('ResourceController', 'toggle', { id });
    const list = lget<ResourceItem[]>('resources', seedResources).map(x => x.id === id ? { ...x, status: (x.status === '已上架' ? '草稿' : '已上架') as ResourceItem['status'] } : x);
    return delay(lset('resources', list));
  },
  remove(id: number): Promise<ResourceItem[]> {
    if (REMOTE) return callKapi('ResourceController', 'remove', { id });
    const list = lget<ResourceItem[]>('resources', seedResources).filter(x => x.id !== id);
    return delay(lset('resources', list));
  },
};

/* —— 系统配置（管理端） —— */
export const ConfigApi = {
  get(): Promise<typeof defaultConfig> {
    if (REMOTE) return callKapi('ConfigController', 'get');
    return delay(lget('config', defaultConfig));
  },
  save(cfg: typeof defaultConfig): Promise<typeof defaultConfig> {
    if (REMOTE) return callKapi('ConfigController', 'save', cfg);
    return delay(lset('config', cfg));
  },
};

/* —— 登录鉴权 —— */
export interface AuthUser { token: string; account: string; role: Role; name: string; number: string; }
const DEMO: Record<Role, { account: string; pwd: string; name: string; number: string }> = {
  student: { account: '2026010188', pwd: 'leyan123', name: '同学（脱敏）', number: '2026010188' },
  teacher: { account: 'T0231', pwd: 'leyan123', name: '张老师', number: 'T0231' },
  admin: { account: 'admin', pwd: 'leyan123', name: '心理中心管理员', number: 'admin' },
};
export const AuthApi = {
  /** 登录：server 模式后端校验并发 token；local 模式按演示账号校验 */
  login(account: string, pwd: string, role: Role): Promise<AuthUser> {
    if (REMOTE) return callKapi<AuthUser>('AuthController', 'login', { account, pwd, role }).then(u => { setToken(u.token); return u; });
    const d = DEMO[role];
    if (account.trim() !== d.account || pwd !== d.pwd) return Promise.reject(new Error('账号或密码不正确'));
    const u: AuthUser = { token: `local-${role}`, account: d.account, role, name: d.name, number: d.number };
    setToken(u.token);
    return delay(u);
  },
  logout() { clearToken(); },
};

/** 后端健康探测（server 模式用；返回是否连上 PostgreSQL） */
export async function serverHealth(): Promise<{ ok: boolean; db: boolean } | null> {
  if (BACKEND !== 'server') return null;
  try { const r = await fetch(`${SERVER_BASE}/api/health`); return await r.json(); } catch { return { ok: false, db: false }; }
}

/** 开发用：清空本地数据，恢复种子数据 */
export function resetLocal() {
  ['mood_history', 'garden_stories', 'diary', 'treehole', 'gallery', 'talks', 'alerts', 'resources', 'config']
    .forEach(k => localStorage.removeItem(KEY(k)));
}
