/* 轻量 SVG 数据可视化组件（无第三方依赖） */
import React from 'react';

const PRIMARY = '#ff8a5b';
const ACCENT = '#ffc46b';

/* 折线图（带渐变填充） */
export const LineChart: React.FC<{ data: number[]; labels?: string[]; height?: number; max?: number; min?: number; color?: string }> = ({ data, labels, height = 180, max, min, color = PRIMARY }) => {
  const w = 600, pad = 26;
  const hi = max ?? Math.max(...data) * 1.1;
  const lo = min ?? Math.min(...data) * 0.85;
  const span = hi - lo || 1;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (data.length - 1);
  const y = (v: number) => pad + (1 - (v - lo) / span) * (height - pad * 2);
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const area = `${pad},${height - pad} ${pts} ${w - pad},${height - pad}`;
  const id = 'lg' + color.replace(/[^a-z0-9]/gi, '');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(g => <line key={g} x1={pad} x2={w - pad} y1={pad + g * (height - pad * 2)} y2={pad + g * (height - pad * 2)} stroke="var(--ly-border)" strokeDasharray="4 5" />)}
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />)}
      {labels && data.map((_, i) => <text key={i} x={x(i)} y={height - 6} fontSize="11" fill="var(--ly-text-3)" textAnchor="middle">{labels[i]}</text>)}
    </svg>
  );
};

/* 柱状图 */
export const BarChart: React.FC<{ data: number[]; labels: string[]; height?: number; color?: string }> = ({ data, labels, height = 180, color = ACCENT }) => {
  const w = 600, pad = 26;
  const hi = Math.max(...data) * 1.15;
  const bw = (w - pad * 2) / data.length * 0.55;
  const x = (i: number) => pad + (i + 0.5) * ((w - pad * 2) / data.length);
  const y = (v: number) => pad + (1 - v / hi) * (height - pad * 2);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height}>
      {[0.33, 0.66].map(g => <line key={g} x1={pad} x2={w - pad} y1={pad + g * (height - pad * 2)} y2={pad + g * (height - pad * 2)} stroke="var(--ly-border)" strokeDasharray="4 5" />)}
      {data.map((v, i) => (
        <g key={i}>
          <rect x={x(i) - bw / 2} y={y(v)} width={bw} height={height - pad - y(v)} rx="6" fill={color} opacity={0.55 + 0.45 * (v / hi)} />
          <text x={x(i)} y={y(v) - 6} fontSize="11" fill="var(--ly-text-2)" textAnchor="middle" fontWeight="700">{v}</text>
          <text x={x(i)} y={height - 6} fontSize="11" fill="var(--ly-text-3)" textAnchor="middle">{labels[i]}</text>
        </g>
      ))}
    </svg>
  );
};

/* 环形进度 */
export const Ring: React.FC<{ value: number; size?: number; stroke?: number; label?: string; color?: string; sub?: string }> = ({ value, size = 130, stroke = 12, label, color = PRIMARY, sub }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - value / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ly-surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: size * 0.24, fontWeight: 800, color }}>{label ?? `${value}`}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--ly-text-3)' }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
};

/* 迷你折线（趋势） */
export const Sparkline: React.FC<{ data: number[]; width?: number; height?: number; color?: string }> = ({ data, width = 80, height = 28, color = PRIMARY }) => {
  const hi = Math.max(...data), lo = Math.min(...data), span = hi - lo || 1;
  const pts = data.map((v, i) => `${(i * width) / (data.length - 1)},${height - ((v - lo) / span) * height}`).join(' ');
  return <svg width={width} height={height}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
};

/* 水平条形排名 */
export const RankBars: React.FC<{ items: { name: string; value: number; color?: string }[]; max?: number; unit?: string }> = ({ items, max, unit = '' }) => {
  const hi = max ?? Math.max(...items.map(i => i.value));
  return (
    <div className="col gap-sm">
      {items.map((it, i) => (
        <div key={i} className="row gap-sm">
          <div style={{ width: 96, fontSize: 12.5 }} className="muted">{it.name}</div>
          <div className="flex1"><div className="bar" style={{ height: 18 }}><i style={{ width: `${(it.value / hi) * 100}%`, background: it.color }} /></div></div>
          <div style={{ width: 52, textAlign: 'right', fontSize: 12.5, fontWeight: 700 }}>{it.value}{unit}</div>
        </div>
      ))}
    </div>
  );
};
