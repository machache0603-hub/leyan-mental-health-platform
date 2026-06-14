/* ============================================================
   管理端 · 6 个功能
   ============================================================ */
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { SectionHeader, WarmLoading, WarmError, Modal, useAsync, Bar } from '../ui';
import { LineChart, BarChart, Ring, RankBars } from '../charts';
import {
  adminKpi, collegeTemps, alertTrend, alertEvents as seedAlerts, ALERT_STATUS_META,
  RISK_META, defaultConfig, AlertStatus,
} from '../data';
import { genCampusAdvice, genReport, ReportSection } from '../ai';
import { AlertApi, ConfigApi, ResourceApi } from '../api';
import { AlertEvent, ResourceItem } from '../data';

/* ⑲ 校园心理驾驶舱 */
export const Cockpit: React.FC = () => {
  const { go } = useStore();
  const advice = useAsync(() => genCampusAdvice(adminKpi.campusTemp, adminKpi.alertOpen), []);
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="校园心理驾驶舱" sub="全校心理状态宏观视图 · 数据每日更新" icon="🛰️" />
      <div className="grid g4">
        <div className="card center col" style={{ background: 'linear-gradient(135deg,#fff1e0,#ffe6d0)', border: 'none' }}>
          <Ring value={adminKpi.campusTemp} label={`${adminKpi.campusTemp}`} sub="全校心理温度" size={120} />
        </div>
        <div className="card"><div className="stat-label">覆盖学生</div><div className="stat mt-sm">{adminKpi.coveredStudents.toLocaleString()}</div><div className="stat-label" style={{ marginTop: 6 }}>活跃率 {adminKpi.activeRate}%</div></div>
        <div className="card"><div className="stat-label">待闭环预警</div><div className="stat mt-sm" style={{ color: 'var(--danger)' }}>{adminKpi.alertOpen}</div><div className="stat-label" style={{ marginTop: 6 }}>闭环率 {adminKpi.alertResolvedRate}%</div></div>
        <div className="card"><div className="stat-label">关爱满意度</div><div className="stat mt-sm">{adminKpi.satisfaction}<span style={{ fontSize: 14 }}>/5</span></div><div className="stat-label" style={{ marginTop: 6 }}>⭐⭐⭐⭐⭐</div></div>
      </div>

      <div className="grid g2" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        <div className="card">
          <SectionHeader title="全校预警趋势" sub="近 8 周新增预警数" icon="📈" right={<button className="chip" onClick={() => go('a-alert')}>预警中心 →</button>} />
          <LineChart data={alertTrend.map(a => a.count)} labels={alertTrend.map(a => a.week)} color="#ff7a7a" />
        </div>
        <div className="card">
          <SectionHeader title="各学院心理热度" sub="温度越低越需关注" icon="🏛️" right={<button className="chip" onClick={() => go('a-map')}>温度地图 →</button>} />
          <RankBars items={collegeTemps.slice().sort((a, b) => a.temp - b.temp).slice(0, 6).map(c => ({ name: c.name.replace('学院', ''), value: c.temp, color: c.temp < 65 ? 'var(--danger)' : c.temp < 75 ? 'var(--warn)' : 'var(--ok)' }))} max={100} unit="" />
        </div>
      </div>

      {/* AI 行动建议 */}
      <div className="card" style={{ background: 'linear-gradient(120deg,#f3ecff,#eaf6ff)', border: 'none' }}>
        <SectionHeader title="智能行动建议" sub="基于全校数据的多步推理洞察" icon="🧠" />
        {advice.loading ? <WarmLoading text="正在分析全校心理态势…" /> : advice.error ? <WarmError onRetry={advice.reload} /> : (
          <div className="col gap-sm">
            {advice.data!.map((a, i) => (
              <div key={i} className="row gap-sm card" style={{ background: 'var(--ly-surface)', padding: 14 }}>
                <span style={{ fontSize: 18 }}>{['📌', '🎯', '⏱️', '💡'][i % 4]}</span>
                <span style={{ fontSize: 13.5, lineHeight: 1.7 }}>{a}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ⑳ 心理温度地图 */
export const TempMap: React.FC = () => {
  const tempColor = (t: number) => t < 65 ? '#ff7a7a' : t < 72 ? '#ffb84d' : t < 80 ? '#ffd166' : '#7fd1ae';
  const [sel, setSel] = useState<typeof collegeTemps[0] | null>(null);
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="心理温度地图" sub="以学院为单位的心理状态分布 · 颜色越暖越健康" icon="🗺️" />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {collegeTemps.map(c => (
          <button key={c.name} className="card hover" onClick={() => setSel(c)} style={{ cursor: 'pointer', background: `linear-gradient(160deg, ${tempColor(c.temp)}22, var(--ly-surface))`, borderTop: `4px solid ${tempColor(c.temp)}` }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.name}</div>
            <div className="row" style={{ alignItems: 'baseline', gap: 6, marginTop: 10 }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: tempColor(c.temp) }}>{c.temp}</span>
              <span className="dim" style={{ fontSize: 11 }}>°心理</span>
            </div>
            <div className="dim row-between" style={{ fontSize: 11.5, marginTop: 8 }}>
              <span>{c.students} 人</span>
              {c.alerts > 5 ? <span style={{ color: 'var(--danger)' }}>⚠️ {c.alerts}</span> : <span>⚠️ {c.alerts}</span>}
            </div>
          </button>
        ))}
      </div>
      <div className="card row gap-lg wrap" style={{ background: 'var(--ly-surface-2)' }}>
        <span className="muted" style={{ fontSize: 12.5 }}>图例：</span>
        {[['#7fd1ae', '健康 ≥80'], ['#ffd166', '良好 72-79'], ['#ffb84d', '关注 65-71'], ['#ff7a7a', '预警 <65']].map(([c, l]) => (
          <span key={l} className="row gap-xs" style={{ fontSize: 12.5 }}><i style={{ width: 14, height: 14, borderRadius: 4, background: c, display: 'inline-block' }} />{l}</span>
        ))}
      </div>
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.name}>
        {sel && <div className="col gap-md">
          <div className="grid g3">
            <div className="card" style={{ background: 'var(--ly-surface-2)', padding: 14 }}><div className="stat-label">心理温度</div><div className="stat-sm mt-sm" style={{ color: tempColor(sel.temp) }}>{sel.temp}</div></div>
            <div className="card" style={{ background: 'var(--ly-surface-2)', padding: 14 }}><div className="stat-label">在校学生</div><div className="stat-sm mt-sm">{sel.students}</div></div>
            <div className="card" style={{ background: 'var(--ly-surface-2)', padding: 14 }}><div className="stat-label">待处理预警</div><div className="stat-sm mt-sm" style={{ color: 'var(--danger)' }}>{sel.alerts}</div></div>
          </div>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.8 }}>{sel.temp < 65 ? '该学院心理温度偏低，建议优先下沉心理资源，安排专职老师驻点，并启动专项关怀计划。' : '该学院整体状态良好，建议保持现有关爱节奏，持续监测重点群体。'}</p>
        </div>}
      </Modal>
    </div>
  );
};

/* ㉑ 预警管理中心 */
export const AlertCenter: React.FC = () => {
  const [list, setList] = useState<AlertEvent[]>([]);
  const [tab, setTab] = useState<AlertStatus | 'all'>('all');
  const tabs: [AlertStatus | 'all', string][] = [['all', '全部'], ['new', '待处理'], ['processing', '干预中'], ['resolved', '已闭环']];
  useEffect(() => { AlertApi.list().then(setList); }, []);
  const filtered = list.filter(a => tab === 'all' || a.status === tab);
  const advance = (id: string) => AlertApi.advance(id).then(setList);
  const counts = { new: list.filter(a => a.status === 'new').length, processing: list.filter(a => a.status === 'processing').length, resolved: list.filter(a => a.status === 'resolved').length };
  const total = counts.new + counts.processing + counts.resolved;
  const accepted = counts.processing + counts.resolved;          // 已受理（含闭环）
  const closeRate = total ? Math.round((counts.resolved / total) * 100) : 0;
  const funnel = [
    { k: '触发', n: total, c: 'var(--danger)' },
    { k: '受理干预', n: accepted, c: 'var(--warn)' },
    { k: '已闭环', n: counts.resolved, c: 'var(--ok)' },
  ];
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="预警管理中心" sub="预警事件从触发到闭环的全程追踪" icon="🚨" />
      <div className="grid g3">
        <div className="card center col" style={{ borderTop: '4px solid var(--danger)' }}><div className="stat" style={{ color: 'var(--danger)' }}>{counts.new}</div><div className="stat-label">待处理</div></div>
        <div className="card center col" style={{ borderTop: '4px solid var(--warn)' }}><div className="stat" style={{ color: 'var(--warn)' }}>{counts.processing}</div><div className="stat-label">干预中</div></div>
        <div className="card center col" style={{ borderTop: '4px solid var(--ok)' }}><div className="stat" style={{ color: 'var(--ok)' }}>{counts.resolved}</div><div className="stat-label">已闭环</div></div>
      </div>

      {/* 预警闭环漏斗：触发 → 受理 → 闭环 的转化全景（招牌闭环可视化） */}
      <div className="card">
        <SectionHeader title="预警闭环漏斗" sub="从触发到闭环的转化全景" icon="🔄"
          right={<span className="chip chip-ok">闭环率 {closeRate}%</span>} />
        <div className="col gap-sm">
          {funnel.map(s => (
            <div key={s.k} className="row gap-sm">
              <span className="dim" style={{ width: 64, fontSize: 12.5, flexShrink: 0 }}>{s.k}</span>
              <div className="flex1"><Bar pct={total ? (s.n / total) * 100 : 0} color={s.c} label={`${s.k} ${s.n} 条`} /></div>
              <span style={{ width: 30, textAlign: 'right', fontWeight: 700 }}>{s.n}</span>
            </div>
          ))}
        </div>
        <div className="dim" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>
          平均首次响应 4.3h · 数据贯通「学生打卡 → 连续低落自动预警 → 教师受理干预 → 标记闭环回访」
        </div>
      </div>

      <div className="pill-tab">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      <div className="col gap-sm">
        {filtered.map(a => (
          <div key={a.id} className="card hover">
            <div className="row-between wrap gap-sm">
              <div className="row gap-sm">
                <span className={`chip ${RISK_META[a.level].chip}`}>{RISK_META[a.level].label}</span>
                <span style={{ fontWeight: 700 }}>{a.student}</span>
                <span className="dim" style={{ fontSize: 12 }}>{a.id}</span>
              </div>
              <span className={`chip ${ALERT_STATUS_META[a.status].chip}`}>{ALERT_STATUS_META[a.status].label}</span>
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, margin: '10px 0' }}>{a.reason}</p>
            <div className="row-between dim" style={{ fontSize: 12 }}>
              <span>{a.cls} · {a.time} · 负责人 {a.owner}</span>
              {a.status !== 'resolved' && <button className="btn btn-primary btn-sm" onClick={() => advance(a.id)}>{a.status === 'new' ? '受理并干预' : '标记闭环'}</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ㉒ 资源中心 —— 真实增删改 + 上下架（ResourceApi → 后端/本地持久化） */
const RES_TYPES = ['音频', '图文', '活动', '课程'];
const RES_EMOJI: Record<string, string> = { 音频: '🎧', 图文: '📖', 活动: '🏖️', 课程: '🧘' };
export const ResourceCenter: React.FC = () => {
  const [list, setList] = useState<ResourceItem[]>([]);
  const [type, setType] = useState('全部');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceItem | null>(null);
  const [form, setForm] = useState({ title: '', type: '图文', emoji: '📖' });

  const load = () => ResourceApi.list().then(setList).catch(() => { /* 离线忽略 */ });
  useEffect(() => { load(); }, []);

  const types = ['全部', ...Array.from(new Set(list.map(r => r.type)))];
  const filtered = list.filter(r => type === '全部' || r.type === type);

  const openAdd = () => { setEditing(null); setForm({ title: '', type: '图文', emoji: '📖' }); setOpen(true); };
  const openEdit = (r: ResourceItem) => { setEditing(r); setForm({ title: r.title, type: r.type, emoji: r.emoji }); setOpen(true); };
  const submit = async () => {
    if (!form.title.trim()) return;
    if (editing) await ResourceApi.update(editing.id, form).then(setList);
    else await ResourceApi.add({ ...form, status: '草稿' }).then(load);
    setOpen(false);
  };
  const toggle = (r: ResourceItem) => ResourceApi.toggle(r.id).then(setList);
  const remove = (r: ResourceItem) => ResourceApi.remove(r.id).then(setList);

  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="资源中心" sub="管理平台所有心理资源与活动内容" icon="📦" right={<button className="btn btn-primary btn-sm" onClick={openAdd}>+ 上传资源</button>} />
      <div className="pill-tab">{types.map(t => <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>{t}</button>)}</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--ly-surface-2)', textAlign: 'left' }}>
              {['资源', '类型', '使用量', '状态', '操作'].map(h => <th key={h} style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--ly-text-3)', fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--ly-border)' }}>
                <td style={{ padding: '12px 16px' }}><span style={{ fontSize: 20, marginRight: 8 }}>{r.emoji}</span><span style={{ fontWeight: 600, fontSize: 13.5 }}>{r.title}</span></td>
                <td style={{ padding: '12px 16px' }}><span className="chip">{r.type}</span></td>
                <td style={{ padding: '12px 16px', fontSize: 13.5 }}>{r.usage.toLocaleString()}</td>
                <td style={{ padding: '12px 16px' }}><span className={`chip ${r.status === '已上架' ? 'chip-ok' : 'chip-warn'}`}>{r.status}</span></td>
                <td style={{ padding: '12px 16px' }}>
                  <div className="row gap-xs">
                    <button className="chip chip-primary" onClick={() => openEdit(r)}>编辑</button>
                    <button className="chip" onClick={() => toggle(r)}>{r.status === '已上架' ? '下架' : '上架'}</button>
                    <button className="chip chip-danger" onClick={() => remove(r)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} style={{ padding: 26, textAlign: 'center', color: 'var(--ly-text-3)', fontSize: 13 }}>这个分类下还没有资源，点右上角「上传资源」添加一个吧</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? '编辑资源' : '上传资源'} width={420}>
        <div className="col gap-sm">
          <label className="dim" style={{ fontSize: 12 }}>资源标题</label>
          <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="例如：考前减压音频合集" />
          <label className="dim" style={{ fontSize: 12 }}>类型</label>
          <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, emoji: RES_EMOJI[e.target.value] || f.emoji }))}>
            {RES_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="dim" style={{ fontSize: 12 }}>图标 emoji</label>
          <input className="input" value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} maxLength={2} style={{ width: 90 }} />
          <div className="row gap-sm" style={{ marginTop: 8 }}>
            <button className="btn btn-primary" onClick={submit}>{editing ? '保存修改' : '确认上传'}</button>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>取消</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ㉓ 数据报告 */
export const DataReport: React.FC = () => {
  const [period, setPeriod] = useState('2026 年 6 月第 1 周');
  const rep = useAsync<ReportSection[]>(() => genReport(period), [period]);
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="数据报告" sub="自动生成周期性数据分析报告，支持导出" icon="📑" right={
        <div className="row gap-sm">
          <select className="input" style={{ padding: '7px 12px' }} value={period} onChange={e => setPeriod(e.target.value)}>
            <option>2026 年 6 月第 1 周</option><option>2026 年 5 月</option><option>2026 年第二季度</option>
          </select>
          <button className="btn btn-primary btn-sm">⬇ 导出 PDF</button>
        </div>
      } />
      <div className="grid g2">
        <div className="card"><SectionHeader title="心理温度走势" icon="🌡️" /><LineChart data={[72, 71, 73, 74, 73, 75, 74]} labels={['周一', '周二', '周三', '周四', '周五', '周六', '周日']} max={85} min={60} /></div>
        <div className="card"><SectionHeader title="各功能使用分布" icon="📊" /><BarChart data={[124, 98, 76, 64, 52, 41]} labels={['悄悄话', '花园', '电台', '树洞', '工坊', '画室']} /></div>
      </div>
      <div className="card">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <div className="section-title">📄 {period} · 心理健康数据分析报告</div>
          <span className="chip chip-ok">自动生成</span>
        </div>
        {rep.loading ? <WarmLoading text="正在汇总本期数据，生成报告…" /> : rep.error ? <WarmError onRetry={rep.reload} /> : (
          <div className="col gap-md">
            {rep.data!.map((s, i) => (
              <div key={i}>
                <div style={{ fontWeight: 700, color: 'var(--ly-primary-deep)', marginBottom: 4 }}>{i + 1}. {s.title}</div>
                <p style={{ fontSize: 13.8, lineHeight: 1.9 }}>{s.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ㉔ 系统配置 */
export const SystemConfig: React.FC = () => {
  const [cfg, setCfg] = useState(defaultConfig);
  const [saved, setSaved] = useState(false);
  useEffect(() => { ConfigApi.get().then(setCfg); }, []);
  const doSave = () => ConfigApi.save(cfg).then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); });
  const flip = (k: keyof typeof cfg.notifyChannels) => setCfg(c => ({ ...c, notifyChannels: { ...c.notifyChannels, [k]: !c.notifyChannels[k] } }));
  const Toggle: React.FC<{ on: boolean; onClick: () => void }> = ({ on, onClick }) => (
    <button onClick={onClick} style={{ width: 46, height: 26, borderRadius: 999, background: on ? 'var(--ly-primary)' : 'var(--ly-surface-3)', position: 'relative', transition: 'all .2s' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'all .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
    </button>
  );
  return (
    <div className="ly-page-enter col gap-md">
      <SectionHeader title="系统配置" sub="预警阈值 · 权限 · 通知策略等全局设置" icon="⚙️" />
      <div className="card">
        <SectionHeader title="预警阈值" sub="智能预警的触发规则" icon="🎚️" />
        <div className="col gap-md">
          <div className="row-between"><span style={{ fontSize: 13.5 }}>连续「低落/难过」天数触发<b> 高预警</b></span>
            <div className="row gap-sm"><input type="range" min={2} max={7} value={cfg.riskThresholdHigh} onChange={e => setCfg({ ...cfg, riskThresholdHigh: +e.target.value })} style={{ accentColor: 'var(--ly-primary)' }} /><span className="chip chip-primary">{cfg.riskThresholdHigh} 天</span></div>
          </div>
          <div className="row-between"><span style={{ fontSize: 13.5 }}>7 天内「低落」次数触发<b> 中预警</b></span>
            <div className="row gap-sm"><input type="range" min={2} max={7} value={cfg.riskThresholdMid} onChange={e => setCfg({ ...cfg, riskThresholdMid: +e.target.value })} style={{ accentColor: 'var(--ly-primary)' }} /><span className="chip chip-primary">{cfg.riskThresholdMid} 次</span></div>
          </div>
        </div>
      </div>
      <div className="grid g2">
        <div className="card">
          <SectionHeader title="通知渠道" icon="🔔" />
          <div className="col gap-md">
            {([['app', 'App 站内推送'], ['sms', '短信通知'], ['email', '邮件通知']] as [keyof typeof cfg.notifyChannels, string][]).map(([k, l]) => (
              <div key={k} className="row-between"><span style={{ fontSize: 13.5 }}>{l}</span><Toggle on={cfg.notifyChannels[k]} onClick={() => flip(k)} /></div>
            ))}
          </div>
        </div>
        <div className="card">
          <SectionHeader title="隐私与权限" icon="🔒" />
          <div className="col gap-md">
            <div className="row-between"><span style={{ fontSize: 13.5 }}>学生默认匿名倾诉</span><Toggle on={cfg.anonymousDefault} onClick={() => setCfg({ ...cfg, anonymousDefault: !cfg.anonymousDefault })} /></div>
            <div className="row-between"><span style={{ fontSize: 13.5 }}>深夜自动暗色模式</span><Toggle on={cfg.nightMode === 'auto'} onClick={() => setCfg({ ...cfg, nightMode: cfg.nightMode === 'auto' ? 'off' : 'auto' })} /></div>
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>所有学生数据均脱敏存储，教师仅在预警授权范围内可见个案详情，严格遵循最小必要原则。</div>
          </div>
        </div>
      </div>
      <div className="row gap-sm">
        <button className="btn btn-primary" onClick={doSave}>保存配置</button>
        {saved && <span className="chip chip-ok scale-in">✓ 已保存，配置即时生效</span>}
      </div>
    </div>
  );
};
