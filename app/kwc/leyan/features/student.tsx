/* ============================================================
   学生端 · 10 个功能
   ============================================================ */
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { SectionHeader, WarmLoading, WarmEmpty, MoodPicker, MoodTag, Modal, useAsync, Typing, Bar } from '../ui';
import { LineChart, Sparkline } from '../charts';
import {
  MOODS, moodOf, MoodKey, WARM_NOTES, myMoodHistory, LAST_14_DAYS, gardenStories,
  treeholePosts as seedPosts, diaryEntries as seedDiary, radioTracks, workshops, knowledgeList, myMilestones,
} from '../data';
import { smallTalk, ChatReply, interpretPainting, forecastMood, MoodForecast } from '../ai';
import { Icon } from '../Icon';
import { Logo } from '../Logo';
import { IMG, Img } from '../assets';
import { DiaryApi, TreeholeApi, MoodApi, GalleryApi, Artwork } from '../api';
import { TreeholePost, DiaryEntry } from '../data';

/* ----------------------------------------------------------------
   ② 悄悄话 —— 与小暖聊天（核心，悬浮球复用）
   ---------------------------------------------------------------- */
interface Msg { id: number; who: 'me' | 'warm'; text: string; mood?: MoodKey; typing?: boolean; }
let mid = 100;

export const ChatPanel: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { anonymous, setAnonymous, go, setChatOpen } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 1, who: 'warm', text: '嗨，我是小暖。这里很安全，你可以和我说任何事，开心的、难过的，我都在听。今天过得怎么样呀？' },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [ballMood, setBallMood] = useState<MoodKey>('joy');
  const [relax, setRelax] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => { scroller.current?.scrollTo({ top: 1e6, behavior: 'smooth' }); }, [msgs, thinking]);

  const send = async (text: string) => {
    if (!text.trim() || thinking) return;
    setInput('');
    setMsgs(m => [...m, { id: ++mid, who: 'me', text }]);
    setThinking(true);
    const reply: ChatReply = await smallTalk(text);
    setBallMood(reply.mood);
    setRelax(reply.suggestRelax);
    setThinking(false);
    setMsgs(m => [...m, { id: ++mid, who: 'warm', text: reply.text, mood: reply.mood, typing: true }]);
  };

  const m = moodOf(ballMood);
  return (
    <div className="col" style={{ height: compact ? 520 : 'calc(100vh - 210px)', minHeight: 420 }}>
      {/* 小夜灯 · 灯光随情绪变色 */}
      <div className="row gap-md" style={{ padding: '4px 4px 14px' }}>
        <div style={{
          width: 54, height: 54, borderRadius: '50%', display: 'grid', placeItems: 'center',
          boxShadow: `0 6px 20px ${m.color}66`, transition: 'all .6s', background: `${m.color}1a`,
        }}>
          <Img src={IMG.logo} alt="小暖" fallback={<Logo size={42} mood={m.key === 'low' || m.key === 'sad' ? 'low' : m.key === 'calm' ? 'calm' : 'warm'} glow={false} />} style={{ width: 44, height: 44, objectFit: 'contain' }} />
        </div>
        <div className="flex1">
          <div style={{ fontWeight: 700 }}>小暖</div>
          <div className="dim" style={{ fontSize: 12 }}>灯光会随你的心情变色 · 此刻感知到「{m.label}」</div>
        </div>
        <button className="chip" onClick={() => setAnonymous(!anonymous)} title="匿名开关">
          {anonymous ? '🕶️ 匿名中' : '👤 实名'}
        </button>
      </div>

      {/* 对话区（信纸气泡） */}
      <div ref={scroller} className="flex1" style={{ overflowY: 'auto', padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {msgs.map(msg => (
          <div key={msg.id} className="fade-in" style={{ alignSelf: msg.who === 'me' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
            <div style={{
              padding: '12px 16px', fontSize: 14, lineHeight: 1.7,
              borderRadius: msg.who === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.who === 'me' ? 'linear-gradient(120deg, var(--ly-primary), var(--ly-primary-soft))' : 'var(--ly-surface-2)',
              color: msg.who === 'me' ? '#fff' : 'var(--ly-text)',
              boxShadow: 'var(--ly-shadow-sm)',
              backgroundImage: msg.who === 'warm' ? 'repeating-linear-gradient(var(--ly-surface-2), var(--ly-surface-2) 27px, var(--ly-border) 28px)' : undefined,
            }}>
              {msg.typing ? <Typing text={msg.text} /> : msg.text}
            </div>
          </div>
        ))}
        {thinking && <div style={{ alignSelf: 'flex-start' }} className="chip">小暖正在认真听你说… 💭</div>}
        {relax && !thinking && (
          <div className="card scale-in" style={{ alignSelf: 'flex-start', padding: 14, background: 'var(--ly-surface-3)' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>🫧 要不要一起放松一下？</div>
            <div className="dim" style={{ fontSize: 12.5, marginBottom: 10 }}>我感觉你有点累了，做个一分钟练习吧。</div>
            <button className="btn btn-primary btn-sm" onClick={() => { setChatOpen(false); go('s-workshop'); }}>去治愈工坊</button>
          </div>
        )}
      </div>

      {/* 快捷情绪 + 入口 */}
      <div className="row wrap gap-xs" style={{ padding: '10px 4px 8px' }}>
        {['😊 今天很开心', '😔 有点累', '😰 好焦虑', '🌙 睡不着'].map(q => (
          <button key={q} className="chip" onClick={() => send(q.slice(2))}>{q}</button>
        ))}
        <button className="chip chip-primary" onClick={() => { setChatOpen(false); go('s-diary'); }}>📔 写日记</button>
        <button className="chip chip-primary" onClick={() => { setChatOpen(false); go('s-radio'); }}>🎧 听电台</button>
      </div>

      {/* 输入 */}
      <div className="row gap-sm" style={{ paddingTop: 4 }}>
        <input className="input" placeholder="把心里的话说给小暖听…" value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)} />
        <button className="btn btn-primary" onClick={() => send(input)} disabled={thinking}>送出</button>
      </div>
    </div>
  );
};

export const SecretTalk: React.FC = () => (
  <div className="ly-page-enter">
    <SectionHeader title="悄悄话" sub="和小暖聊聊，这里只有你和它。可匿名。" icon="💬" />
    <div className="card card-pad-lg"><ChatPanel /></div>
  </div>
);

/* ----------------------------------------------------------------
   ① 暖心首页
   ---------------------------------------------------------------- */
const QUICK_ENTRIES = [
  { key: 's-talk', label: '悄悄话', icon: 'chat', desc: '和小暖聊聊', color: 'var(--ly-primary)' },
  { key: 's-garden', label: '情绪花园', icon: 'flower', desc: '今天开什么花', color: 'var(--mood-joy)' },
  { key: 's-art', label: '艺术疗愈', icon: 'palette', desc: '画出心情', color: 'var(--ly-pink)' },
  { key: 's-treehole', label: '树洞广场', icon: 'tree', desc: '说说心事', color: 'var(--ly-mint)' },
  { key: 's-radio', label: '心灵电台', icon: 'headphone', desc: '听点温柔的', color: 'var(--mood-anxious)' },
  { key: 's-workshop', label: '治愈工坊', icon: 'bubble', desc: '一起放松', color: 'var(--mood-low)' },
];

export const StudentHome: React.FC = () => {
  const { go, todayMood, setTodayMood } = useStore();
  const [alerted, setAlerted] = useState(false);
  const note = WARM_NOTES[new Date().getDate() % WARM_NOTES.length];
  const pick = (m: MoodKey) => {
    setTodayMood(m);
    MoodApi.checkin(m).then(r => setAlerted(!!r.alertTriggered)).catch(() => { /* 离线忽略，仍记录在本地 */ });
  };
  return (
    <div className="ly-page-enter col gap-md">
      {/* 暖心签 */}
      <div className="card card-pad-lg" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', opacity: .95 }}>
          <Img src={IMG.hero} alt="小暖" fallback={<Logo size={104} />} style={{ width: 132, height: 132, objectFit: 'contain' }} />
        </div>
        <div className="chip chip-primary">今日暖心签</div>
        <h1 style={{ fontSize: 25, marginTop: 14, lineHeight: 1.55, maxWidth: 540, letterSpacing: 0.3 }}>{note}</h1>
        <div className="row gap-sm mt-md">
          <button className="btn btn-primary" onClick={() => go('s-talk')}><Icon name="chat" size={16} /> 和小暖说说话</button>
          <button className="btn btn-ghost" onClick={() => go('s-diary')}><Icon name="book" size={16} /> 记录小确幸</button>
        </div>
      </div>

      {/* 三秒心情 */}
      <div className="card">
        <SectionHeader title="此刻的心情" sub="三秒点选，让小暖懂你今天" icon="🎐" />
        <div style={{ paddingBottom: 22 }}><MoodPicker value={todayMood} onChange={pick} /></div>
        {todayMood && <div className="chip chip-ok scale-in" style={{ marginTop: 6 }}>已记录 · 今天你是「{moodOf(todayMood).label}」的 {moodOf(todayMood).emoji} 这朵 {moodOf(todayMood).flower} 已种进花园</div>}
        {alerted && <div className="chip chip-warn scale-in" style={{ marginTop: 8, display: 'block', lineHeight: 1.6 }}>💛 小暖注意到你最近接连有些低落，已悄悄请辅导员多关心你一点。你不是一个人。</div>}
      </div>

      {/* 六个功能入口 */}
      <div>
        <SectionHeader title="想去哪里走走？" />
        <div className="grid g3">
          {QUICK_ENTRIES.map(e => (
            <button key={e.key} className="card hover" onClick={() => go(e.key)} style={{ textAlign: 'left', cursor: 'pointer' }}>
              <div className="row gap-md">
                <div style={{ width: 46, height: 46, borderRadius: 14, background: e.color, color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={e.icon} size={22} /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{e.label}</div>
                  <div className="dim" style={{ fontSize: 12.5 }}>{e.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------
   ③ 情绪花园
   ---------------------------------------------------------------- */
export const Garden: React.FC = () => {
  const { todayMood, setTodayMood } = useStore();
  const [open, setOpen] = useState<typeof gardenStories[0] | null>(null);
  const [watered, setWatered] = useState(false);
  const fc = useAsync(() => forecastMood(myMoodHistory), []);
  const streak = 21;
  const water = () => {
    const m = todayMood ?? 'calm';
    setTodayMood(m);
    MoodApi.checkin(m).then(() => setWatered(true)).catch(() => setWatered(true));
  };
  return (
    <div className="ly-page-enter col gap-md">
      {/* 顶部横幅（有图用图，无图用渐变兜底） */}
      <div style={{ position: 'relative', minHeight: 132, borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'linear-gradient(120deg,#eafbe7,#dff1ff)' }}>
        <Img src={IMG.gardenBanner} alt="" fallback={null} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(255,251,246,.92) 28%, rgba(255,251,246,.35) 70%, rgba(255,251,246,0))' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '26px 30px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>情绪花园</h2>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>连续签到 {streak} 天 · 每一朵花，都是你走过的一天</p>
        </div>
      </div>

      {/* 今日花 + 签到 */}
      <div className="card card-pad-lg" style={{ background: 'linear-gradient(160deg,#f3fbe9,#e9f7ff)', border: 'none' }}>
        <div className="row-between wrap gap-md">
          <div className="row gap-md">
            <div style={{ fontSize: 64 }} className="scale-in">{todayMood ? moodOf(todayMood).flower : '🌱'}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{todayMood ? `今天开出了一朵 ${moodOf(todayMood).label} 之花` : '今天还没有浇水哦'}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>签到就是给心情浇水，连续签到可解锁稀有花。</div>
              <div className="row gap-xs mt-sm">
                <span className="chip chip-ok">🔥 连续 {streak} 天</span>
                <span className="chip">🏵️ 已解锁稀有花 3 种</span>
              </div>
            </div>
          </div>
          <button className="btn btn-primary btn-lg" onClick={water} disabled={watered}>{watered ? '🌸 今天已浇水' : '💧 浇水签到'}</button>
        </div>
      </div>

      {/* 花园网格（近 14 天） */}
      <div className="card">
        <SectionHeader title="我的花田" sub="近 14 天" icon="🌸" />
        <div className="row wrap gap-sm">
          {myMoodHistory.map((d, i) => (
            <div key={i} title={`${d.date} · ${moodOf(d.mood).label}`} style={{
              width: 64, height: 78, borderRadius: 16, background: 'var(--ly-surface-2)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              border: `1.5px solid ${moodOf(d.mood).color}33`,
            }}>
              <div style={{ fontSize: 26 }}>{moodOf(d.mood).flower}</div>
              <div className="dim" style={{ fontSize: 10.5 }}>{d.date}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid g2">
        {/* 未来天气预报 */}
        <div className="card">
          <SectionHeader title="未来心情天气预报" sub="基于你的情绪轨迹智能预测" icon="🔮" />
          {fc.loading ? <WarmLoading /> : (
            <>
              <div className="row wrap" style={{ justifyContent: 'space-between' }}>
                {fc.data!.forecast.map((f: MoodForecast, i) => (
                  <div key={i} className="col center" style={{ gap: 4, width: 44 }}>
                    <div className="dim" style={{ fontSize: 11 }}>{f.date}</div>
                    <div style={{ fontSize: 22 }}>{f.label === '晴' ? '☀️' : f.label === '多云' ? '⛅' : f.label === '小雨' ? '🌦️' : '☁️'}</div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{f.score}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ background: 'var(--ly-surface-2)', padding: 14, marginTop: 14 }}>
                <span style={{ fontSize: 13 }}>🌈 {fc.data!.insight}</span>
              </div>
            </>
          )}
        </div>

        {/* 过去的故事卡片 */}
        <div className="card">
          <SectionHeader title="过去的故事" sub="点开翻看那一天" icon="📖" />
          <div className="col gap-sm">
            {gardenStories.map((s, i) => (
              <button key={i} className="card hover" onClick={() => setOpen(s)} style={{ padding: 14, textAlign: 'left', cursor: 'pointer' }}>
                <div className="row gap-sm">
                  <div style={{ fontSize: 28 }}>{moodOf(s.mood).flower}</div>
                  <div className="flex1">
                    <div className="row-between"><span style={{ fontWeight: 600, fontSize: 13 }}>{s.date}</span><MoodTag mood={s.mood} /></div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.text}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.date} 的故事` : ''}>
        {open && <div className="col gap-md">
          <div style={{ fontSize: 56, textAlign: 'center' }}>{moodOf(open.mood).flower}</div>
          <MoodTag mood={open.mood} />
          <p style={{ fontSize: 15, lineHeight: 1.8 }}>{open.text}</p>
        </div>}
      </Modal>
    </div>
  );
};

/* ----------------------------------------------------------------
   ④ 艺术疗愈画室
   ---------------------------------------------------------------- */
const PALETTES: Record<string, string[]> = {
  暖阳: ['#ffd194', '#ffb88c', '#ff8a5b', '#f4703f'],
  静海: ['#caf0f8', '#90e0ef', '#48cae4', '#0096c7'],
  暮紫: ['#e0c3fc', '#c8a2f0', '#a87fe0', '#8e6fd0'],
  森野: ['#d8f3dc', '#b7e4c7', '#74c69d', '#40916c'],
};
export const ArtStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [palette, setPalette] = useState('暖阳');
  const [bright, setBright] = useState(60);
  const [warm, setWarm] = useState(70);
  const [painting, setPainting] = useState<{ colors: string[]; interp: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [gallery, setGallery] = useState<Artwork[]>([]);
  useEffect(() => { GalleryApi.list().then(setGallery).catch(() => { /* 离线忽略 */ }); }, []);
  const saveToGallery = () => {
    if (!painting) return;
    GalleryApi.add({ prompt: prompt || palette, palette, colors: painting.colors, bright, warm, interp: painting.interp })
      .then(item => setGallery(g => [item, ...g])).catch(() => { /* 离线忽略 */ });
  };

  const draw = async () => {
    setBusy(true); setPainting(null);
    const interp = await interpretPainting(prompt || palette);
    const cols = PALETTES[palette];
    setPainting({ colors: cols, interp });
    setBusy(false);
  };
  const KEYWORDS = ['平静的海', '温暖的拥抱', '雨后的天空', '深夜的星河', '一束光'];

  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="艺术疗愈画室" sub="说一句话，让心情变成一幅水彩画" icon="🎨" />
      <div className="grid g2" style={{ gridTemplateColumns: '1fr 1.1fr' }}>
        {/* 控制台 */}
        <div className="card">
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>想画点什么？</div>
          <textarea className="textarea" placeholder="例如：我想画一片很安静的海，月光洒在上面…" value={prompt} onChange={e => setPrompt(e.target.value)} />
          <div className="row wrap gap-xs mt-sm">
            {KEYWORDS.map(k => <button key={k} className="chip" onClick={() => setPrompt(k)}>{k}</button>)}
          </div>
          <div className="divider" />
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>色调</div>
          <div className="row wrap gap-xs">
            {Object.keys(PALETTES).map(p => (
              <button key={p} className={`chip ${palette === p ? 'chip-primary' : ''}`} onClick={() => setPalette(p)}>
                <span style={{ display: 'inline-flex' }}>{PALETTES[p].map(c => <i key={c} style={{ width: 10, height: 10, borderRadius: 3, background: c, display: 'inline-block', marginRight: 2 }} />)}</span> {p}
              </button>
            ))}
          </div>
          <div className="mt-md col gap-sm">
            <div><div className="dim" style={{ fontSize: 12 }}>明暗 {bright}</div><input type="range" min={0} max={100} value={bright} onChange={e => setBright(+e.target.value)} style={{ width: '100%', accentColor: 'var(--ly-primary)' }} /></div>
            <div><div className="dim" style={{ fontSize: 12 }}>冷暖 {warm}</div><input type="range" min={0} max={100} value={warm} onChange={e => setWarm(+e.target.value)} style={{ width: '100%', accentColor: 'var(--ly-primary)' }} /></div>
          </div>
          <button className="btn btn-primary btn-lg mt-md" style={{ width: '100%' }} onClick={draw} disabled={busy}>{busy ? '正在为你作画…' : '🖌️ 生成画作'}</button>
        </div>

        {/* 画布 */}
        <div className="card col">
          <div style={{
            flex: 1, minHeight: 280, borderRadius: 18, position: 'relative', overflow: 'hidden',
            filter: `brightness(${0.6 + bright / 160}) saturate(${0.6 + warm / 120})`,
            background: painting
              ? `radial-gradient(circle at 30% 30%, ${painting.colors[0]}, transparent 60%), radial-gradient(circle at 70% 60%, ${painting.colors[2]}, transparent 55%), linear-gradient(160deg, ${painting.colors[1]}, ${painting.colors[3]})`
              : 'var(--ly-surface-2)',
            display: 'grid', placeItems: 'center', transition: 'all .8s',
          }}>
            {!painting && !busy && <span className="dim">画布在等待你的心情…</span>}
            {busy && <WarmLoading text="正在把你的心情调成颜色…" />}
            {painting && <span style={{ fontSize: 60, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.2))' }}>🌊</span>}
          </div>
          {painting && (
            <div className="card scale-in" style={{ background: 'var(--ly-surface-2)', padding: 14, marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>🪄 小暖的温柔解读</div>
              <p style={{ fontSize: 13, lineHeight: 1.7 }}>{painting.interp}</p>
              <button className="btn btn-ghost btn-sm mt-sm" onClick={saveToGallery}>💾 保存到画廊</button>
            </div>
          )}
        </div>
      </div>

      {/* 画廊 */}
      <div className="card">
        <SectionHeader title="我的画廊" icon="🖼️" />
        {gallery.length === 0 ? <WarmEmpty emoji="🎨" text="还没有作品，画一幅试试吧" /> : (
          <div className="row wrap gap-sm">
            {gallery.map((g, i) => (
              <div key={i} className="scale-in" style={{ width: 130 }}>
                <div style={{ height: 90, borderRadius: 12, background: `linear-gradient(160deg, ${g.colors[1]}, ${g.colors[3]})` }} />
                <div className="dim" style={{ fontSize: 11, marginTop: 4, textAlign: 'center' }}>{g.prompt}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------
   ⑤ 树洞广场
   ---------------------------------------------------------------- */
export const Treehole: React.FC = () => {
  const [posts, setPosts] = useState<TreeholePost[]>([]);
  const [text, setText] = useState('');
  const [tag, setTag] = useState('#情绪');
  const TAGS = ['#情绪', '#学业压力', '#孤独', '#人际关系', '#好消息'];
  useEffect(() => { TreeholeApi.list().then(setPosts); }, []);
  const hug = (id: number) => TreeholeApi.toggleHug(id).then(setPosts);
  const post = () => {
    if (!text.trim()) return;
    TreeholeApi.add(text, tag).then(() => TreeholeApi.list().then(setPosts));
    setText('');
  };
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="树洞广场" sub="匿名说出心事，这里的每个人都会轻轻抱抱你" icon="🌳" />
      <div className="card">
        <textarea className="textarea" placeholder="把心事丢进树洞吧，没有人知道是你…" value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 70 }} />
        <div className="row-between wrap gap-sm mt-sm">
          <div className="row wrap gap-xs">{TAGS.map(t => <button key={t} className={`chip ${tag === t ? 'chip-primary' : ''}`} onClick={() => setTag(t)}>{t}</button>)}</div>
          <button className="btn btn-primary" onClick={post}>🕊️ 匿名发布</button>
        </div>
      </div>
      <div className="col gap-sm">
        {posts.map(p => (
          <div key={p.id} className="card hover fade-in">
            <div className="row-between"><span className="chip chip-primary">{p.tag}</span><span className="dim" style={{ fontSize: 12 }}>{p.timeAgo}</span></div>
            <p style={{ fontSize: 14.5, lineHeight: 1.8, margin: '12px 0' }}>{p.text}</p>
            <div className="row-between">
              <span className="dim" style={{ fontSize: 12.5 }}>🫂 {p.sameFeel} 人和你有同样的感受</span>
              <button className={`btn btn-sm ${p.hugged ? 'btn-primary' : 'btn-outline'}`} onClick={() => hug(p.id)}>
                {p.hugged ? '已抱抱' : '抱抱'} 🤗 {p.hugs}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------
   ⑥ 成长空间
   ---------------------------------------------------------------- */
export const Growth: React.FC = () => {
  const scores = myMoodHistory.map(h => moodOf(h.mood).score);
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="成长空间" sub="回头看看，你已经走了这么远" icon="🌱" />
      <div className="grid g4">
        <div className="card"><div className="stat-label">连续签到</div><div className="stat mt-sm">21<span style={{ fontSize: 14 }}> 天</span></div></div>
        <div className="card"><div className="stat-label">和小暖聊过</div><div className="stat mt-sm">36<span style={{ fontSize: 14 }}> 次</span></div></div>
        <div className="card"><div className="stat-label">收到的抱抱</div><div className="stat mt-sm">128</div></div>
        <div className="card"><div className="stat-label">完成练习</div><div className="stat mt-sm">19<span style={{ fontSize: 14 }}> 次</span></div></div>
      </div>
      <div className="card">
        <SectionHeader title="情绪温度曲线" sub="近 14 天 · 起起落落都是真实的你" icon="📈" />
        <LineChart data={scores} labels={LAST_14_DAYS} max={100} min={20} />
      </div>
      <div className="card">
        <SectionHeader title="成长里程碑" icon="🏅" />
        <div className="col" style={{ position: 'relative' }}>
          {myMilestones.map((m, i) => (
            <div key={i} className="row gap-md" style={{ padding: '12px 0', borderLeft: '2px solid var(--ly-border)', marginLeft: 20, paddingLeft: 24, position: 'relative' }}>
              <div style={{ position: 'absolute', left: -19, top: 14, width: 36, height: 36, borderRadius: '50%', background: 'var(--ly-surface)', border: '2px solid var(--ly-primary-soft)', display: 'grid', placeItems: 'center', fontSize: 17 }}>{m.icon}</div>
              <div className="flex1">
                <div className="row-between"><span style={{ fontWeight: 700 }}>{m.title}</span><span className="dim" style={{ fontSize: 12 }}>{m.date}</span></div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------
   ⑦ 暖心小站
   ---------------------------------------------------------------- */
export const WarmStation: React.FC = () => {
  const [open, setOpen] = useState<typeof knowledgeList[0] | null>(null);
  const cats = ['全部', ...Array.from(new Set(knowledgeList.map(k => k.cat)))];
  const [cat, setCat] = useState('全部');
  const list = knowledgeList.filter(k => cat === '全部' || k.cat === cat);
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="暖心小站" sub="心理知识与自助资源，慢慢翻一翻" icon="📚" />
      <div className="pill-tab">{cats.map(c => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="grid g2">
        {list.map(k => (
          <button key={k.id} className="card hover" onClick={() => setOpen(k)} style={{ textAlign: 'left', cursor: 'pointer' }}>
            <div className="row gap-md">
              <div style={{ fontSize: 34 }}>{k.emoji}</div>
              <div className="flex1">
                <div className="row-between"><span style={{ fontWeight: 700 }}>{k.title}</span><span className="chip">{k.cat}</span></div>
                <p className="muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>{k.summary}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title}>
        {open && <div className="col gap-md">
          <div style={{ fontSize: 44, textAlign: 'center' }}>{open.emoji}</div>
          <p style={{ fontSize: 15, lineHeight: 1.9 }}>{open.summary}</p>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.8 }}>记住，寻求帮助从来不是软弱的表现。如果你需要，校园心理中心和 24 小时热线 0571-8888XXXX 一直都在。</p>
        </div>}
      </Modal>
    </div>
  );
};

/* ----------------------------------------------------------------
   ⑧ 小确幸日记
   ---------------------------------------------------------------- */
const EMOJIS = ['🍗', '🐱', '🌧️', '🥪', '☕', '🌸', '📚', '🎵', '🌙', '🍰'];
export const Diary: React.FC = () => {
  const [list, setList] = useState<DiaryEntry[]>([]);
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState('🌸');
  useEffect(() => { DiaryApi.list().then(setList); }, []);
  const add = () => {
    if (!text.trim()) return;
    DiaryApi.add(text, emoji).then(() => DiaryApi.list().then(setList));
    setText('');
  };
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="小确幸日记" sub="再微小的好事，也值得被记住" icon="📔" />
      <div className="card" style={{ background: 'linear-gradient(120deg,#fff6e9,#fff)' }}>
        <div className="row wrap gap-xs" style={{ marginBottom: 10 }}>
          {EMOJIS.map(e => <button key={e} onClick={() => setEmoji(e)} style={{ fontSize: 22, padding: 4, borderRadius: 10, background: emoji === e ? 'var(--ly-surface-3)' : 'transparent' }}>{e}</button>)}
        </div>
        <textarea className="textarea" placeholder="今天，有什么让你嘴角微微上扬的小事？" value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 64 }} />
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}><button className="btn btn-primary" onClick={add}>✨ 记下来</button></div>
      </div>
      <div className="grid g2">
        {list.map(d => (
          <div key={d.id} className="card hover fade-in" style={{ background: 'var(--ly-surface)' }}>
            <div className="row gap-md">
              <div style={{ fontSize: 32 }}>{d.emoji}</div>
              <div className="flex1"><p style={{ fontSize: 14, lineHeight: 1.7 }}>{d.text}</p><div className="dim" style={{ fontSize: 11.5, marginTop: 6 }}>{d.date}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------
   ⑨ 心灵电台
   ---------------------------------------------------------------- */
export const Radio: React.FC = () => {
  const [playing, setPlaying] = useState<number | null>(null);
  const cats = ['全部', ...Array.from(new Set(radioTracks.map(t => t.cat)))];
  const [cat, setCat] = useState('全部');
  const list = radioTracks.filter(t => cat === '全部' || t.cat === cat);
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="心灵电台" sub="治愈音频 · 助眠音乐 · 引导冥想" icon="🎧" />
      <div className="pill-tab">{cats.map(c => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}</div>
      {playing !== null && (
        <div className="card scale-in" style={{ background: 'linear-gradient(120deg, var(--mood-anxious), var(--mood-low))', color: '#fff', border: 'none' }}>
          <div className="row gap-md">
            <div style={{ fontSize: 44 }} className="state-emoji">{radioTracks.find(t => t.id === playing)?.cover}</div>
            <div className="flex1">
              <div style={{ fontWeight: 700, fontSize: 15 }}>{radioTracks.find(t => t.id === playing)?.title}</div>
              <div style={{ fontSize: 12.5, opacity: .85 }}>正在播放 · {radioTracks.find(t => t.id === playing)?.author}</div>
              <div className="bar mt-sm" style={{ background: 'rgba(255,255,255,.3)' }}><i style={{ width: '38%', background: '#fff' }} /></div>
            </div>
            <button className="ly-icon-btn" onClick={() => setPlaying(null)} style={{ background: 'rgba(255,255,255,.25)', color: '#fff' }}>⏸</button>
          </div>
        </div>
      )}
      <div className="grid g2">
        {list.map(t => (
          <button key={t.id} className="card hover" onClick={() => setPlaying(t.id)} style={{ textAlign: 'left', cursor: 'pointer' }}>
            <div className="row gap-md">
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--ly-surface-2)', display: 'grid', placeItems: 'center', fontSize: 28 }}>{t.cover}</div>
              <div className="flex1">
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.title}</div>
                <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>{t.author} · {t.len}</div>
              </div>
              <span className="chip chip-primary">{t.cat}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------
   ⑩ 治愈工坊（互动练习）
   ---------------------------------------------------------------- */
const BreathExercise: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [round, setRound] = useState(1);
  useEffect(() => {
    const seq: ('in' | 'hold' | 'out')[] = ['in', 'hold', 'out'];
    const durs = { in: 4000, hold: 7000, out: 8000 };
    let t: ReturnType<typeof setTimeout>;
    const tick = (p: 'in' | 'hold' | 'out') => {
      setPhase(p);
      const next = seq[(seq.indexOf(p) + 1) % 3];
      t = setTimeout(() => { if (p === 'out') setRound(r => r + 1); tick(next); }, durs[p]);
    };
    tick('in');
    return () => clearTimeout(t);
  }, []);
  const label = phase === 'in' ? '吸气…' : phase === 'hold' ? '屏住…' : '呼气…';
  const scale = phase === 'in' ? 1.5 : phase === 'hold' ? 1.5 : 0.8;
  return (
    <div className="col center gap-lg" style={{ padding: 20 }}>
      <div style={{ width: 180, height: 180, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle at 38% 32%, #fff, var(--ly-primary-soft) 70%)', transform: `scale(${scale})`, transition: `transform ${phase === 'in' ? 4 : phase === 'hold' ? 0.4 : 8}s ease-in-out`, display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: 18 }}>{label}</div>
      </div>
      <div className="muted">第 {round} 轮 · 跟着光呼吸就好</div>
      <button className="btn btn-ghost" onClick={onClose}>完成练习</button>
    </div>
  );
};

const GratitudeExercise: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [items, setItems] = useState(['', '', '']);
  const done = items.filter(i => i.trim()).length;
  return (
    <div className="col gap-md" style={{ padding: 4 }}>
      <p className="muted">写下今天三件值得感谢的小事，哪怕很小。</p>
      {items.map((v, i) => (
        <input key={i} className="input" placeholder={`第 ${i + 1} 件…`} value={v} onChange={e => setItems(arr => arr.map((x, j) => j === i ? e.target.value : x))} />
      ))}
      {done === 3 && <div className="chip chip-ok scale-in">🌟 太棒了，你看，温暖一直都在</div>}
      <button className="btn btn-primary" onClick={onClose} disabled={done < 1}>收好这份感恩</button>
    </div>
  );
};

export const Workshop: React.FC = () => {
  const [active, setActive] = useState<typeof workshops[0] | null>(null);
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="治愈工坊" sub="几分钟的小练习，给情绪松松绑" icon="🫧" />
      <div className="grid g2">
        {workshops.map(w => (
          <button key={w.id} className="card hover" onClick={() => setActive(w)} style={{ textAlign: 'left', cursor: 'pointer' }}>
            <div className="row gap-md">
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--ly-surface-2)', display: 'grid', placeItems: 'center', fontSize: 28 }}>{w.emoji}</div>
              <div className="flex1">
                <div className="row-between"><span style={{ fontWeight: 700, fontSize: 15 }}>{w.title}</span><span className="chip">⏱ {w.mins} 分钟</span></div>
                <p className="muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>{w.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.title}>
        {active?.type === 'breath' && <BreathExercise onClose={() => setActive(null)} />}
        {active?.type === 'gratitude' && <GratitudeExercise onClose={() => setActive(null)} />}
        {active && active.type !== 'breath' && active.type !== 'gratitude' && (
          <div className="col gap-md">
            <div style={{ fontSize: 48, textAlign: 'center' }}>{active.emoji}</div>
            <p style={{ fontSize: 15, lineHeight: 1.9 }}>{active.desc}</p>
            <p className="muted" style={{ fontSize: 13.5 }}>跟随引导，慢慢来，不用追求完美。当你准备好了，就可以开始。</p>
            <button className="btn btn-primary" onClick={() => setActive(null)}>开始练习</button>
          </div>
        )}
      </Modal>
    </div>
  );
};
