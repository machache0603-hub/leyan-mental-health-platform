/* ============================================================
   教师端 · 8 个功能
   ============================================================ */
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { TalkApi } from '../api';
import { TalkRecord } from '../data';
import { SectionHeader, WarmLoading, WarmEmpty, Modal, useAsync, MoodTag, Bar } from '../ui';
import { Sparkline, RankBars, BarChart } from '../charts';
import {
  classWeathers, studentProfiles, RISK_META, talkRecords as seedTalks, campActivities,
  moodOf, StudentProfile, alertTrend,
} from '../data';
import { genTalkTopics, genComment, genParentScript, genClassAdvice, CommentStyle, TalkTopic } from '../ai';

/* ⑪ 教师工作台 */
export const TeacherHome: React.FC = () => {
  const { go } = useStore();
  const high = studentProfiles.filter(s => s.risk === 'high').length;
  const todo = [
    { t: '回访 同学A 的睡眠改善情况', due: '6/11 前', tone: 'chip-danger' },
    { t: '处理「人工智能研二·1班」温度预警', due: '今天', tone: 'chip-warn' },
    { t: '完成本周班级心理周报', due: '6/8', tone: 'chip' },
  ];
  return (
    <div className="ly-page-enter col gap-md">
      <div className="card card-pad-lg" style={{ background: 'linear-gradient(120deg,#eaf6ff,#f3ecff)', border: 'none' }}>
        <div className="chip chip-primary">教师工作台</div>
        <h1 style={{ fontSize: 23, marginTop: 12 }}>张老师，早安 ☀️</h1>
        <p className="muted" style={{ marginTop: 6 }}>你负责的 3 个班级，今天整体平稳。有 {high} 位同学需要你多一点关心。</p>
      </div>
      <div className="grid g4">
        <div className="card"><div className="stat-label">在管学生</div><div className="stat mt-sm">90</div></div>
        <div className="card"><div className="stat-label">高关注</div><div className="stat mt-sm" style={{ color: 'var(--danger)' }}>{high}</div></div>
        <div className="card"><div className="stat-label">待办事项</div><div className="stat mt-sm">{todo.length}</div></div>
        <div className="card"><div className="stat-label">本周谈心</div><div className="stat mt-sm">5</div></div>
      </div>
      <div className="grid g2">
        <div className="card">
          <SectionHeader title="今日待办" icon="📌" right={<button className="chip" onClick={() => go('t-talk')}>谈心记录本 →</button>} />
          <div className="col gap-sm">
            {todo.map((x, i) => (
              <div key={i} className="row-between card" style={{ padding: 14, background: 'var(--ly-surface-2)' }}>
                <span style={{ fontSize: 13.5 }}>{x.t}</span><span className={`chip ${x.tone}`}>{x.due}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <SectionHeader title="需要关心的同学" icon="💗" right={<button className="chip" onClick={() => go('t-archive')}>学生档案 →</button>} />
          <div className="col gap-sm">
            {studentProfiles.filter(s => s.risk === 'high' || s.risk === 'mid').map(s => (
              <button key={s.id} className="row-between card hover" onClick={() => go('t-archive')} style={{ padding: 14, cursor: 'pointer' }}>
                <div className="col" style={{ alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{s.alias.split('（')[0]}</span>
                  <span className="dim" style={{ fontSize: 11.5 }}>{s.cls}</span>
                </div>
                <div className="row gap-sm">
                  <Sparkline data={s.trend.map(t => moodOf(t).score)} color={RISK_META[s.risk].color} />
                  <span className={`chip ${RISK_META[s.risk].chip}`}>{RISK_META[s.risk].label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ⑫ 班级晴雨表 */
export const ClassWeather: React.FC = () => {
  const tempIcon = (t: number) => t >= 80 ? '☀️' : t >= 70 ? '⛅' : t >= 60 ? '🌥️' : '🌧️';
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="班级晴雨表" sub="各班匿名心理状态总览 · 温度偏低的班级一目了然" icon="🌦️" />
      <div className="grid g3">
        {classWeathers.map(c => {
          const low = c.temp < 65;
          return (
            <div key={c.id} className="card hover" style={{ borderTop: `4px solid ${low ? 'var(--danger)' : c.temp < 75 ? 'var(--warn)' : 'var(--ok)'}` }}>
              <div className="row-between">
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 30 }}>{tempIcon(c.temp)}</div>
              </div>
              <div className="row gap-sm mt-sm" style={{ alignItems: 'baseline' }}>
                <div className="stat-sm" style={{ color: low ? 'var(--danger)' : 'var(--ly-text)' }}>{c.temp}</div>
                <span className="dim" style={{ fontSize: 12 }}>心理温度</span>
                <span className={`chip ${c.trend >= 0 ? 'chip-ok' : 'chip-danger'}`} style={{ marginLeft: 'auto' }}>{c.trend >= 0 ? '↑' : '↓'} {Math.abs(c.trend)}</span>
              </div>
              <Bar pct={c.temp} color={low ? 'var(--danger)' : undefined} />
              <div className="row-between mt-sm dim" style={{ fontSize: 12 }}>
                <span>👥 {c.students} 人</span>
                <span>{c.alerts > 0 ? <span style={{ color: 'var(--danger)' }}>⚠️ {c.alerts} 条预警</span> : '✓ 暂无预警'}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="card" style={{ background: 'var(--ly-surface-2)' }}>
        <span style={{ fontSize: 13 }}>🔒 <b>隐私保护</b>：班级晴雨表仅展示匿名聚合数据，不指向任何具体学生。只有触发预警时，授权教师才能在「学生档案」中查看脱敏详情。</span>
      </div>
    </div>
  );
};

/* ⑬ 学生档案 */
export const StudentArchive: React.FC = () => {
  const [sel, setSel] = useState<StudentProfile>(studentProfiles[0]);
  const [filter, setFilter] = useState('全部');
  const filters = ['全部', '高关注', '中关注', '状态良好'];
  const map: Record<string, string> = { 高关注: 'high', 中关注: 'mid', 状态良好: 'none' };
  const list = studentProfiles.filter(s => filter === '全部' || s.risk === map[filter] || (filter === '状态良好' && s.risk === 'low'));
  return (
    <div className="ly-page-enter">
      <SectionHeader title="学生档案" sub="情绪趋势 · 预警历史 · 干预记录（数据已脱敏）" icon="🗂️" />
      <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div className="card" style={{ alignSelf: 'start' }}>
          <div className="pill-tab" style={{ flexWrap: 'wrap', marginBottom: 12 }}>{filters.map(f => <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div>
          <div className="col gap-sm">
            {list.map(s => (
              <button key={s.id} className={`row-between card hover`} onClick={() => setSel(s)} style={{ padding: 12, cursor: 'pointer', border: sel.id === s.id ? '1.5px solid var(--ly-primary-soft)' : undefined }}>
                <div className="col" style={{ alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.alias.split('（')[0]}</span>
                  <span className="dim" style={{ fontSize: 11 }}>{s.cls}</span>
                </div>
                <span className={`chip ${RISK_META[s.risk].chip}`}>{RISK_META[s.risk].label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="row-between">
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{sel.alias}</div>
              <div className="muted" style={{ fontSize: 13 }}>{sel.cls} · {sel.grade} · 最近活跃 {sel.lastActive}</div>
            </div>
            <span className={`chip ${RISK_META[sel.risk].chip}`}>{RISK_META[sel.risk].label}</span>
          </div>
          <div className="row wrap gap-xs mt-sm">{sel.tags.map(t => <span key={t} className="chip">{t}</span>)}</div>
          <div className="grid g3 mt-md">
            <div className="card" style={{ background: 'var(--ly-surface-2)', padding: 14 }}><div className="stat-label">当前情绪</div><div style={{ fontSize: 22, marginTop: 4 }}>{moodOf(sel.recentMood).emoji} {moodOf(sel.recentMood).label}</div></div>
            <div className="card" style={{ background: 'var(--ly-surface-2)', padding: 14 }}><div className="stat-label">累计预警</div><div className="stat-sm mt-sm">{sel.alerts}</div></div>
            <div className="card" style={{ background: 'var(--ly-surface-2)', padding: 14 }}><div className="stat-label">干预次数</div><div className="stat-sm mt-sm">{sel.interventions}</div></div>
          </div>
          <div className="mt-md">
            <div className="section-sub" style={{ marginBottom: 8 }}>近 7 次情绪趋势</div>
            <div className="row gap-sm" style={{ height: 70, alignItems: 'flex-end' }}>
              {sel.trend.map((t, i) => (
                <div key={i} className="col center flex1" style={{ gap: 4 }}>
                  <div style={{ width: '100%', maxWidth: 30, height: moodOf(t).score * 0.6, background: moodOf(t).color, borderRadius: 6, opacity: .85 }} />
                  <span style={{ fontSize: 14 }}>{moodOf(t).emoji}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="divider" />
          <TeacherAssistantInline student={sel} />
        </div>
      </div>
    </div>
  );
};

/* ⑭ 教师 AI 助手（页面无"AI"字样，称"智能助手"） */
const TeacherAssistantInline: React.FC<{ student: StudentProfile }> = ({ student }) => {
  const topics = useAsync<TalkTopic[]>(() => genTalkTopics(student), [student.id]);
  return (
    <div>
      <SectionHeader title="谈心切入点建议" sub="智能助手为这位同学生成的沟通思路" icon="💡" />
      {topics.loading ? <WarmLoading /> : (
        <div className="col gap-sm">
          {topics.data!.map((t, i) => (
            <div key={i} className="card" style={{ background: 'var(--ly-surface-2)', padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{i + 1}. {t.angle}</div>
              <p style={{ fontSize: 13.5, margin: '6px 0', color: 'var(--ly-primary-deep)' }}>{t.opening}</p>
              <p className="muted" style={{ fontSize: 12.5 }}>💬 {t.tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const TeacherAssistant: React.FC = () => {
  const [tab, setTab] = useState<'comment' | 'parent' | 'class'>('comment');
  const [student, setStudent] = useState(studentProfiles[0]);
  const [style, setStyle] = useState<CommentStyle>('mixed');
  const [comment, setComment] = useState('');
  const [parent, setParent] = useState('');
  const [cls, setCls] = useState(classWeathers[2]);
  const [advice, setAdvice] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const runComment = async (st: CommentStyle) => { setStyle(st); setBusy(true); setComment(await genComment(student, st)); setBusy(false); };
  const runParent = async () => { setBusy(true); setParent(await genParentScript(student)); setBusy(false); };
  const runClass = async () => { setBusy(true); setAdvice(await genClassAdvice(cls.name, cls.temp)); setBusy(false); };

  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="智能助手" sub="自动生成评语、家校话术、班级建议，把时间还给关心本身" icon="🪄" />
      <div className="pill-tab">
        <button className={tab === 'comment' ? 'on' : ''} onClick={() => setTab('comment')}>期末评语</button>
        <button className={tab === 'parent' ? 'on' : ''} onClick={() => setTab('parent')}>家校沟通话术</button>
        <button className={tab === 'class' ? 'on' : ''} onClick={() => setTab('class')}>班级管理建议</button>
      </div>

      {tab === 'comment' && (
        <div className="card">
          <div className="row-between wrap gap-sm">
            <select className="input" style={{ maxWidth: 280 }} value={student.id} onChange={e => setStudent(studentProfiles.find(s => s.id === e.target.value)!)}>
              {studentProfiles.map(s => <option key={s.id} value={s.id}>{s.alias}</option>)}
            </select>
            <div className="pill-tab">
              <button className={style === 'encourage' ? 'on' : ''} onClick={() => runComment('encourage')}>鼓励型</button>
              <button className={style === 'advice' ? 'on' : ''} onClick={() => runComment('advice')}>建议型</button>
              <button className={style === 'mixed' ? 'on' : ''} onClick={() => runComment('mixed')}>综合型</button>
            </div>
          </div>
          <div className="card mt-md" style={{ background: 'var(--ly-surface-2)', minHeight: 120 }}>
            {busy ? <WarmLoading text="正在为这位同学斟酌用词…" /> : comment ? <p style={{ fontSize: 14.5, lineHeight: 1.9 }}>{comment}</p> : <WarmEmpty emoji="✍️" text="选择风格，一键生成评语" />}
          </div>
          {comment && <button className="btn btn-ghost btn-sm mt-sm">📋 复制评语</button>}
        </div>
      )}

      {tab === 'parent' && (
        <div className="card">
          <div className="row-between wrap gap-sm">
            <select className="input" style={{ maxWidth: 280 }} value={student.id} onChange={e => setStudent(studentProfiles.find(s => s.id === e.target.value)!)}>
              {studentProfiles.map(s => <option key={s.id} value={s.id}>{s.alias}</option>)}
            </select>
            <button className="btn btn-primary" onClick={runParent}>生成沟通话术</button>
          </div>
          <div className="card mt-md" style={{ background: 'var(--ly-surface-2)', minHeight: 120 }}>
            {busy ? <WarmLoading /> : parent ? <p style={{ fontSize: 14.5, lineHeight: 1.9 }}>{parent}</p> : <WarmEmpty emoji="📞" text="生成与家长沟通的温和话术" />}
          </div>
        </div>
      )}

      {tab === 'class' && (
        <div className="card">
          <div className="row-between wrap gap-sm">
            <select className="input" style={{ maxWidth: 280 }} value={cls.id} onChange={e => setCls(classWeathers.find(c => c.id === e.target.value)!)}>
              {classWeathers.map(c => <option key={c.id} value={c.id}>{c.name}（温度 {c.temp}）</option>)}
            </select>
            <button className="btn btn-primary" onClick={runClass}>生成管理建议</button>
          </div>
          <div className="mt-md">
            {busy ? <WarmLoading /> : advice.length ? (
              <div className="col gap-sm">
                {advice.map((a, i) => (
                  <div key={i} className="row gap-sm card" style={{ background: 'var(--ly-surface-2)', padding: 14 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--ly-primary)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ fontSize: 13.5, lineHeight: 1.7 }}>{a}</span>
                  </div>
                ))}
              </div>
            ) : <WarmEmpty emoji="🏫" text="选择班级，生成针对性管理建议" />}
          </div>
        </div>
      )}
    </div>
  );
};

/* ⑮ 谈心记录本 */
export const TalkRecords: React.FC = () => {
  const [list, setList] = useState<TalkRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ student: '', topic: '', summary: '', followUp: '' });
  useEffect(() => { TalkApi.list().then(setList); }, []);
  const save = () => {
    if (!form.student || !form.summary) return;
    TalkApi.add({ date: '6/6', ...form }).then(() => TalkApi.list().then(setList));
    setForm({ student: '', topic: '', summary: '', followUp: '' }); setOpen(false);
  };
  const toggle = (id: number) => TalkApi.toggle(id).then(setList);
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="谈心记录本" sub="每一次用心的谈话，都值得被记录与跟进" icon="📒" right={<button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>+ 新建记录</button>} />
      <div className="col gap-sm">
        {list.map(t => (
          <div key={t.id} className="card hover">
            <div className="row-between">
              <div className="row gap-sm"><span style={{ fontWeight: 700 }}>{t.student}</span><span className="chip">{t.topic}</span></div>
              <span className="dim" style={{ fontSize: 12 }}>{t.date}</span>
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: '10px 0' }}>{t.summary}</p>
            <div className="row-between card" style={{ background: 'var(--ly-surface-2)', padding: '10px 14px' }}>
              <span style={{ fontSize: 12.5 }}>📍 后续跟进：{t.followUp}</span>
              <button className={`chip ${t.done ? 'chip-ok' : 'chip-warn'}`} onClick={() => toggle(t.id)}>{t.done ? '✓ 已跟进' : '待跟进'}</button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="新建谈心记录">
        <div className="col gap-sm">
          <input className="input" placeholder="学生（脱敏编号）" value={form.student} onChange={e => setForm({ ...form, student: e.target.value })} />
          <input className="input" placeholder="谈话主题" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} />
          <textarea className="textarea" placeholder="谈话内容摘要…" value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} />
          <input className="input" placeholder="后续跟进计划" value={form.followUp} onChange={e => setForm({ ...form, followUp: e.target.value })} />
          <button className="btn btn-primary" onClick={save}>保存记录</button>
        </div>
      </Modal>
    </div>
  );
};

/* ⑯ 陪伴训练营 */
export const Camp: React.FC = () => {
  const [acts, setActs] = useState(campActivities);
  const join = (id: number) => setActs(a => a.map(x => x.id === id ? { ...x, joined: Math.min(x.total, x.joined + 1) } : x));
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="陪伴训练营" sub="发起班级集体打卡与团体练习，温暖一起生长" icon="🏕️" right={<button className="btn btn-primary btn-sm">+ 发起活动</button>} />
      <div className="grid g3">
        {acts.map(a => (
          <div key={a.id} className="card hover">
            <div style={{ fontSize: 38 }}>{a.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>{a.title}</div>
            <p className="muted" style={{ fontSize: 12.5, margin: '6px 0 12px', lineHeight: 1.6 }}>{a.desc}</p>
            <div className="row-between dim" style={{ fontSize: 12, marginBottom: 6 }}><span>已参与 {a.joined}/{a.total}</span><span>{a.days} 天</span></div>
            <Bar pct={(a.joined / a.total) * 100} />
            <button className="btn btn-outline btn-sm mt-sm" style={{ width: '100%' }} onClick={() => join(a.id)}>邀请加入</button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ⑰ 班级心理树 */
export const ClassTree: React.FC = () => {
  const [growth, setGrowth] = useState(68);
  const stage = growth > 80 ? '🌳' : growth > 50 ? '🌲' : growth > 25 ? '🌱' : '🌰';
  const acts = [
    { who: '同学E', what: '完成了今日早安打卡', pts: 2, t: '10 分钟前' },
    { who: '同学C', what: '在树洞给同学送出 3 个抱抱', pts: 3, t: '32 分钟前' },
    { who: '同学B', what: '完成一次正念呼吸练习', pts: 2, t: '1 小时前' },
    { who: '同学A', what: '主动预约了心理咨询', pts: 5, t: '2 小时前' },
  ];
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="班级心理树" sub="全班合种一棵树，每个积极行为都让它长大一点" icon="🌳" />
      <div className="grid g2" style={{ gridTemplateColumns: '1fr 1.2fr' }}>
        <div className="card center col" style={{ background: 'linear-gradient(180deg,#eafbe7,#d7f0ff)', border: 'none', padding: 30 }}>
          <div style={{ fontSize: 120, lineHeight: 1, filter: 'drop-shadow(0 10px 20px rgba(80,160,90,.3))' }} className="state-emoji">{stage}</div>
          <div style={{ fontWeight: 800, fontSize: 18, marginTop: 12 }}>成长值 {growth} / 100</div>
          <div className="muted" style={{ fontSize: 13 }}>计算机研一·1班 的小树</div>
          <button className="btn btn-primary mt-md" onClick={() => setGrowth(g => Math.min(100, g + 4))}>🌟 浇灌一下（+4）</button>
        </div>
        <div className="card">
          <SectionHeader title="温暖正在发生" icon="✨" />
          <div className="col gap-sm">
            {acts.map((a, i) => (
              <div key={i} className="row-between card" style={{ background: 'var(--ly-surface-2)', padding: 12 }}>
                <div><span style={{ fontWeight: 600, fontSize: 13 }}>{a.who}</span> <span className="muted" style={{ fontSize: 13 }}>{a.what}</span></div>
                <div className="row gap-sm"><span className="chip chip-ok">+{a.pts}</span><span className="dim" style={{ fontSize: 11 }}>{a.t}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ⑱ 教师休憩站 */
export const TeacherRest: React.FC = () => {
  const tips = [
    { icon: '☕', title: '给自己 5 分钟', desc: '关心学生之前，先关心自己。泡杯茶，什么都不想。' },
    { icon: '🚶', title: '课间走一走', desc: '离开办公室，到走廊尽头看看窗外的树。' },
    { icon: '📖', title: '今日寄语', desc: '"你不必成为完美的老师，温暖的陪伴本身就足够有力量。"' },
    { icon: '🧘', title: '肩颈放松', desc: '耸肩—停留—放下，重复三次，释放伏案的紧绷。' },
  ];
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="教师休憩站" sub="照顾学生的人，也需要被照顾" icon="🍵" />
      <div className="card card-pad-lg" style={{ background: 'linear-gradient(120deg,#fff3e0,#ffe9ec)', border: 'none' }}>
        <h1 style={{ fontSize: 21, color: '#6b4a36', lineHeight: 1.6 }}>"老师，你今天也辛苦了。<br />记得对自己温柔一点。"</h1>
      </div>
      <div className="grid g2">
        {tips.map((t, i) => (
          <div key={i} className="card hover">
            <div className="row gap-md">
              <div style={{ fontSize: 34 }}>{t.icon}</div>
              <div><div style={{ fontWeight: 700 }}>{t.title}</div><p className="muted" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.7 }}>{t.desc}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
