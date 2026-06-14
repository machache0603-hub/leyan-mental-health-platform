/* 共享 UI 组件：卡片、状态、心情、按钮、弹窗、异步 hook 等 */
import React, { useEffect, useRef, useState } from 'react';
import { WARM_LOADING, WARM_EMPTY, WARM_ERROR, MOODS, MoodKey, moodOf } from './data';
import { IMG, Img } from './assets';

/* 通用区块标题 */
export const SectionHeader: React.FC<{ title: React.ReactNode; sub?: string; icon?: string; right?: React.ReactNode }> = ({ title, sub, icon, right }) => (
  <div className="row-between" style={{ marginBottom: 14 }}>
    <div>
      <div className="section-title">{icon && <span className="sh-badge">{icon}</span>}{title}</div>
      {sub && <div className="section-sub">{sub}</div>}
    </div>
    {right}
  </div>
);

/* 暖心加载态 */
export const WarmLoading: React.FC<{ text?: string }> = ({ text }) => (
  <div className="state-box" role="status" aria-live="polite">
    <div className="spinner" aria-hidden="true" />
    <div className="state-text">{text || WARM_LOADING}</div>
  </div>
);

/* 暖心空状态（有插画用插画，没有回退到 emoji） */
export const WarmEmpty: React.FC<{ emoji?: string; text?: string }> = ({ emoji = '🌱', text }) => (
  <div className="state-box">
    <Img src={IMG.empty} alt="" fallback={<span className="state-emoji">{emoji}</span>}
      style={{ width: 120, height: 120, objectFit: 'contain', margin: '0 auto 6px', display: 'block' }} />
    <div className="state-text">{text || WARM_EMPTY}</div>
  </div>
);

/* 暖心错误态（可选重试） */
export const WarmError: React.FC<{ text?: string; onRetry?: () => void }> = ({ text, onRetry }) => (
  <div className="state-box" role="alert">
    <span className="state-emoji">🌧️</span>
    <div className="state-text">{text || WARM_ERROR}</div>
    {onRetry && <button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={onRetry}>重试一下</button>}
  </div>
);

/* 统计卡 */
export const StatCard: React.FC<{ value: React.ReactNode; label: string; icon?: string; tone?: string; sub?: React.ReactNode }> = ({ value, label, icon, tone, sub }) => (
  <div className="card hover">
    <div className="row-between">
      <div className="stat-label">{label}</div>
      {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
    </div>
    <div className="stat mt-sm" style={{ color: tone }}>{value}</div>
    {sub && <div className="stat-label" style={{ marginTop: 6 }}>{sub}</div>}
  </div>
);

/* 进度条 */
export const Bar: React.FC<{ pct: number; color?: string; label?: string }> = ({ pct, color, label }) => {
  const v = Math.round(Math.max(0, Math.min(100, pct)));
  return (
    <div className="bar" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <i style={{ width: `${Math.max(2, v)}%`, background: color }} />
    </div>
  );
};

/* 心情选择器 */
export const MoodPicker: React.FC<{ value: MoodKey | null; onChange: (m: MoodKey) => void; size?: number }> = ({ value, onChange, size = 56 }) => (
  <div className="row wrap gap-sm">
    {MOODS.map(m => {
      const on = value === m.key;
      return (
        <button key={m.key} onClick={() => onChange(m.key)} aria-pressed={on} aria-label={`心情：${m.label}`}
          style={{
            width: size, height: size, borderRadius: 18, fontSize: size * 0.42,
            display: 'grid', placeItems: 'center', transition: 'all var(--dur-base) var(--ease-spring)',
            background: on ? m.color : 'var(--ly-surface-2)',
            boxShadow: on ? '0 8px 18px rgba(0,0,0,.12)' : 'none',
            transform: on ? 'translateY(-4px) scale(1.06)' : 'none',
            position: 'relative',
          }} title={m.label}>
          {m.emoji}
          <span style={{ position: 'absolute', bottom: -20, fontSize: 11, color: on ? 'var(--ly-primary-deep)' : 'var(--ly-text-3)', fontWeight: on ? 700 : 500 }}>{m.label}</span>
        </button>
      );
    })}
  </div>
);

/* 心情小标 */
export const MoodTag: React.FC<{ mood: MoodKey }> = ({ mood }) => {
  const m = moodOf(mood);
  return <span className="chip" style={{ background: 'transparent', color: m.color }}>{m.emoji} {m.label}</span>;
};

/* 弹窗 */
export const Modal: React.FC<{ open: boolean; onClose: () => void; title?: string; children: React.ReactNode; width?: number }> = ({ open, onClose, title, children, width = 520 }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';           // 锁背景滚动
    ref.current?.focus();                               // 打开即把焦点移入弹窗
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(40,30,25,.42)', backdropFilter: 'blur(3px)', zIndex: 80, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title || '对话框'}
        className="scale-in" onClick={e => e.stopPropagation()} style={{ background: 'var(--ly-surface)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--ly-shadow-lg)', width, maxWidth: '100%', maxHeight: '88vh', overflow: 'auto', padding: 26, outline: 'none' }}>
        {title && <div className="row-between" style={{ marginBottom: 16 }}>
          <div className="section-title">{title}</div>
          <button className="ly-icon-btn" onClick={onClose} aria-label="关闭">✕</button>
        </div>}
        {children}
      </div>
    </div>
  );
};

/* 错误边界：单个功能渲染崩溃时只回退本页，不白屏全站。
   外层用 key={route} 包裹即可在切换页面时自动复位。 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('[乐颜] 页面渲染出错：', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="state-box" role="alert">
          <span className="state-emoji">🌧️</span>
          <div className="state-text">这个页面遇到了一点小问题，正在为你兜底</div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={() => this.setState({ error: null })}>重新加载本页</button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* 通用异步 hook：自动 loading / data / error，含暖心加载文案。
   关键修复：捕获 reject —— 否则失败会永远停在加载态（无限 spinner）。 */
export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList = []): { loading: boolean; data: T | null; error: unknown; reload: () => void } {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [n, setN] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fnRef.current()
      .then(d => { if (alive) { setData(d); setLoading(false); } })
      .catch(e => { if (alive) { setError(e); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { loading, data, error, reload: () => setN(x => x + 1) };
}

/* 打字机效果文本 */
export const Typing: React.FC<{ text: string; speed?: number; onDone?: () => void }> = ({ text, speed = 28, onDone }) => {
  const [shown, setShown] = useState('');
  useEffect(() => {
    setShown('');
    let i = 0;
    const t = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) { clearInterval(t); onDone?.(); }
    }, speed);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return <>{shown}</>;
};
