/* ============================================================
   教师端 · 9 个功能
   ============================================================ */
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { TalkApi, ScoreApi } from '../api';
import { TalkRecord, ScoreRecord, MoodPrediction, TeacherPerformance } from '../data';
import { SectionHeader, WarmLoading, WarmEmpty, WarmError, Modal, useAsync, MoodTag, Bar } from '../ui';
import { Sparkline, RankBars, BarChart } from '../charts';
import {
  classWeathers, studentProfiles, RISK_META, talkRecords as seedTalks, campActivities,
  moodOf, StudentProfile, alertTrend,
} from '../data';
import { genTalkTopics, genComment, genParentScript, genClassAdvice, genTeacherPerformance, CommentStyle, TalkTopic, TeacherPerfEval } from '../ai';

/* 从脱敏别名提取编号：'同学A（编号 2026-A1）' → '2026-A1' */
const codeOf = (s: StudentProfile) => (s.alias.match(/编号\s*([\w-]+)/)?.[1]) || s.id;
const deltaChip = (d: number) => d > 0 ? 'chip-ok' : d < 0 ? 'chip-danger' : 'chip';
const deltaText = (d: number) => `${d > 0 ? '↑ +' : d < 0 ? '↓ ' : '→ '}${d === 0 ? '持平' : Math.abs(d)}`;

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
      <div className="card card-pad-lg ly-banner ly-banner-cool">
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
      <div className="ly-split ly-split-archive">
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
      {topics.loading ? <WarmLoading /> : topics.error ? <WarmError onRetry={topics.reload} /> : (
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
      <div className="ly-split ly-split-wide">
        <div className="card center col ly-banner ly-banner-nature" style={{ padding: 30 }}>
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
      <div className="card card-pad-lg ly-banner ly-banner-warm">
        <h1 style={{ fontSize: 21, color: 'var(--ly-text)', lineHeight: 1.6 }}>"老师，你今天也辛苦了。<br />记得对自己温柔一点。"</h1>
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

/* ⑲ 成绩导入（教师端第 9 个功能：成绩导入 · 成绩→心情预测 · 学院教师绩效看板） */
export const ScoreImport: React.FC = () => {
  const [tab, setTab] = useState<'import' | 'predict' | 'perf'>('import');
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="成绩导入" sub="把学业波动纳入关爱视野——成绩→心情预测，让关心先于问题发生" icon="📊" />
      <div className="card" style={{ background: 'var(--ly-surface-2)' }}>
        <span style={{ fontSize: 13 }}>🔒 <b>关怀优先</b>：成绩仅用于「学业陪伴」的关怀提示，全部脱敏、不排名公示；成绩关怀 Agent 会结合心情历史预测情绪风险，必要时联动「预警跟进」。</span>
      </div>
      <div className="pill-tab">
        <button className={tab === 'import' ? 'on' : ''} onClick={() => setTab('import')}>成绩导入</button>
        <button className={tab === 'predict' ? 'on' : ''} onClick={() => setTab('predict')}>成绩 → 心情预测</button>
        <button className={tab === 'perf' ? 'on' : ''} onClick={() => setTab('perf')}>教师绩效看板</button>
      </div>
      {tab === 'import' && <ScoreImportTab />}
      {tab === 'predict' && <MoodPredictTab />}
      {tab === 'perf' && <PerfBoardTab />}
    </div>
  );
};

/* —— 成绩导入 + 列表 —— */
const ScoreImportTab: React.FC = () => {
  const [list, setList] = useState<ScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: codeOf(studentProfiles[0]), course: '', score: '', prevScore: '' });
  const load = () => { setLoading(true); ScoreApi.list().then(r => { setList(r); setLoading(false); }); };
  useEffect(load, []);
  const save = () => {
    if (!form.code || !form.course.trim() || form.score === '') return;
    const prof = studentProfiles.find(s => codeOf(s) === form.code);
    ScoreApi.importScore([{
      student: form.code, className: prof?.cls, course: form.course.trim(),
      score: Number(form.score), prevScore: form.prevScore === '' ? undefined : Number(form.prevScore),
    }]).then(() => { setForm({ code: codeOf(studentProfiles[0]), course: '', score: '', prevScore: '' }); setOpen(false); load(); });
  };
  return (
    <div className="col gap-md">
      <div className="row-between">
        <span className="muted" style={{ fontSize: 13 }}>共 {list.length} 条成绩记录</span>
        <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>+ 录入成绩</button>
      </div>
      {loading ? <WarmLoading /> : list.length === 0 ? <WarmEmpty emoji="📊" text="还没有成绩，点右上角录入第一条" /> : (
        <div className="col gap-sm">
          {list.map(s => (
            <div key={s.id} className="row-between card hover" style={{ padding: 14 }}>
              <div className="col" style={{ alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{s.student} · {s.course}</span>
                <span className="dim" style={{ fontSize: 11.5 }}>{s.className} · {s.term}{s.rank ? ` · 班级第 ${s.rank} 名` : ''}</span>
              </div>
              <div className="row gap-sm" style={{ alignItems: 'center' }}>
                <span className="dim" style={{ fontSize: 12 }}>上次 {s.prevScore}</span>
                <span style={{ fontWeight: 800, fontSize: 18 }}>{s.score}</span>
                <span className={`chip ${deltaChip(s.delta)}`}>{deltaText(s.delta)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="录入 / 导入成绩">
        <div className="col gap-sm">
          <select className="input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}>
            {studentProfiles.map(s => <option key={s.id} value={codeOf(s)}>{s.alias}</option>)}
          </select>
          <input className="input" placeholder="课程名称（如 机器学习）" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} />
          <div className="row gap-sm">
            <input className="input" type="number" placeholder="本次成绩" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
            <input className="input" type="number" placeholder="上次成绩（选填）" value={form.prevScore} onChange={e => setForm({ ...form, prevScore: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={save}>保存成绩</button>
          <p className="muted" style={{ fontSize: 12 }}>提示：实际部署支持 Excel 批量导入（ScoreController.importScore 接收成绩数组），此处演示单条录入。</p>
        </div>
      </Modal>
    </div>
  );
};

/* —— 成绩 → 心情预测（成绩关怀 Agent） —— */
const TREND_META: Record<MoodPrediction['trend'], { label: string; arrow: string; color: string }> = {
  up: { label: '心情走高', arrow: '↑', color: 'var(--ok)' },
  down: { label: '心情走低', arrow: '↓', color: 'var(--danger)' },
  flat: { label: '心情平稳', arrow: '→', color: 'var(--ly-text-2)' },
};
const MoodPredictTab: React.FC = () => {
  const [code, setCode] = useState(codeOf(studentProfiles[0]));
  const [pred, setPred] = useState<MoodPrediction | null>(null);
  const [busy, setBusy] = useState(false);
  const run = (c: string) => { setBusy(true); setPred(null); ScoreApi.moodPrediction(c).then(p => { setPred(p); setBusy(false); }); };
  useEffect(() => { run(code); }, []); // 首屏给一个示例
  const prof = studentProfiles.find(s => codeOf(s) === code);
  return (
    <div className="col gap-md">
      <div className="card">
        <div className="row-between wrap gap-sm">
          <select className="input" style={{ maxWidth: 300 }} value={code} onChange={e => setCode(e.target.value)}>
            {studentProfiles.map(s => <option key={s.id} value={codeOf(s)}>{s.alias}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => run(code)}>预测心情趋势</button>
        </div>
        {prof && <div className="row wrap gap-xs mt-sm">{prof.tags.map(t => <span key={t} className="chip">{t}</span>)}</div>}
      </div>
      {busy ? <WarmLoading text="成绩关怀 Agent 正在结合成绩与心情历史推演…" /> : pred ? (
        <div className="card">
          <div className="grid g3">
            <div className="card" style={{ background: 'var(--ly-surface-2)', padding: 16 }}>
              <div className="stat-label">预测心情</div>
              <div style={{ fontSize: 24, marginTop: 4 }}>{moodOf(pred.predictedMood).emoji} {moodOf(pred.predictedMood).label}</div>
            </div>
            <div className="card" style={{ background: 'var(--ly-surface-2)', padding: 16 }}>
              <div className="stat-label">心情走势</div>
              <div style={{ fontSize: 22, marginTop: 4, color: TREND_META[pred.trend].color, fontWeight: 800 }}>{TREND_META[pred.trend].arrow} {TREND_META[pred.trend].label}</div>
            </div>
            <div className="card" style={{ background: 'var(--ly-surface-2)', padding: 16 }}>
              <div className="stat-label">学业风险</div>
              <div className="mt-sm"><span className={`chip ${RISK_META[pred.risk].chip}`}>{RISK_META[pred.risk].label}</span> <span className="dim" style={{ fontSize: 12 }}>置信度 {Math.round(pred.confidence * 100)}%</span></div>
            </div>
          </div>
          <div className="card mt-md" style={{ background: 'var(--ly-surface-2)' }}>
            <div className="section-sub" style={{ marginBottom: 6 }}>💡 洞察</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.8 }}>{pred.insight}</p>
          </div>
          <div className="mt-md">
            <div className="section-sub" style={{ marginBottom: 8 }}>关怀建议</div>
            <div className="col gap-sm">
              {pred.suggestions.map((a, i) => (
                <div key={i} className="row gap-sm card" style={{ background: 'var(--ly-surface-2)', padding: 14 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--ly-primary)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: 13.5, lineHeight: 1.7 }}>{a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : <WarmEmpty emoji="🔮" text="选择学生，预测成绩对心情的影响" />}
    </div>
  );
};

/* —— 学院教师绩效看板 —— */
const PerfBoardTab: React.FC = () => {
  const colleges = ['全部', '计算机学院', '人工智能学院', '软件学院'];
  const [college, setCollege] = useState('全部');
  const perf = useAsync<TeacherPerformance[]>(() => ScoreApi.teacherPerformance({ college }), [college]);
  const [sel, setSel] = useState<TeacherPerformance | null>(null);
  const [evalRes, setEvalRes] = useState<TeacherPerfEval | null>(null);
  const [busy, setBusy] = useState(false);
  const openEval = (t: TeacherPerformance) => {
    setSel(t); setEvalRes(null); setBusy(true);
    genTeacherPerformance(t).then(e => { setEvalRes(e); setBusy(false); });
  };
  return (
    <div className="col gap-md">
      <div className="pill-tab" style={{ flexWrap: 'wrap' }}>
        {colleges.map(c => <button key={c} className={college === c ? 'on' : ''} onClick={() => setCollege(c)}>{c}</button>)}
      </div>
      {perf.loading ? <WarmLoading /> : perf.error ? <WarmError onRetry={perf.reload} /> : (perf.data!.length === 0 ? <WarmEmpty emoji="🏅" text="该学院暂无绩效数据" /> : (
        <>
          <div className="card">
            <SectionHeader title="综合绩效排名" sub="预警闭环率 · 谈心活跃 · 心情改善 · 学业陪伴 的加权" icon="🏅" />
            <RankBars items={perf.data!.map((t, i) => ({ name: `${i + 1}. ${t.teacher}`, value: t.composite, color: i === 0 ? 'var(--ok)' : undefined }))} max={100} unit=" 分" />
          </div>
          <div className="col gap-sm">
            {perf.data!.map(t => (
              <div key={t.id ?? t.teacher} className="card hover">
                <div className="row-between wrap gap-sm">
                  <div className="row gap-sm" style={{ alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{t.teacher}</span>
                    <span className="dim" style={{ fontSize: 12 }}>{t.college} · {t.period}</span>
                  </div>
                  <div className="row gap-sm" style={{ alignItems: 'center' }}>
                    <span className="chip chip-primary">综合 {t.composite}</span>
                    <button className="chip" onClick={() => openEval(t)}>查看评估 →</button>
                  </div>
                </div>
                <div className="grid g4 mt-sm">
                  <div className="card" style={{ background: 'var(--ly-surface-2)', padding: 12 }}><div className="stat-label">预警闭环率</div><div className="stat-sm mt-sm">{t.alertCloseRate}%</div></div>
                  <div className="card" style={{ background: 'var(--ly-surface-2)', padding: 12 }}><div className="stat-label">谈心次数</div><div className="stat-sm mt-sm">{t.talkCount}</div></div>
                  <div className="card" style={{ background: 'var(--ly-surface-2)', padding: 12 }}><div className="stat-label">心情改善分</div><div className="stat-sm mt-sm">{t.moodImproveScore}</div></div>
                  <div className="card" style={{ background: 'var(--ly-surface-2)', padding: 12 }}><div className="stat-label">学业陪伴分</div><div className="stat-sm mt-sm">{t.academicCompanionScore}</div></div>
                </div>
              </div>
            ))}
          </div>
        </>
      ))}
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.teacher} · 绩效评估` : ''} width={560}>
        {busy ? <WarmLoading text="智能助手正在生成绩效评估…" /> : evalRes && (
          <div className="col gap-md">
            <div className="row gap-sm" style={{ alignItems: 'center' }}>
              <span className="chip chip-primary" style={{ fontSize: 13 }}>评级 {evalRes.grade}</span>
              {sel && <span className="chip chip-ok">综合 {sel.composite} 分</span>}
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.8 }}>{evalRes.summary}</p>
            <div>
              <div className="section-sub" style={{ marginBottom: 6 }}>✨ 亮点</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>{evalRes.highlights.map((h, i) => <li key={i} style={{ fontSize: 13, lineHeight: 1.7 }}>{h}</li>)}</ul>
            </div>
            <div>
              <div className="section-sub" style={{ marginBottom: 6 }}>📌 改进建议</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>{evalRes.suggestions.map((h, i) => <li key={i} style={{ fontSize: 13, lineHeight: 1.7 }}>{h}</li>)}</ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
