/* ============================================================
   乐颜 · 品牌标识「小暖」—— 拟人化小夜灯
   一盏圆润的灯，一双温柔的眼睛（在听，不急着说），暖光晕染。
   纯 SVG 矢量，随主题变色。
   ============================================================ */
import React from 'react';

let uid = 0;

export const Logo: React.FC<{ size?: number; glow?: boolean; mood?: 'warm' | 'calm' | 'low'; awake?: boolean }> = ({
  size = 40, glow = true, mood = 'warm', awake = false,
}) => {
  const id = React.useMemo(() => `lamp${uid++}`, []);
  const palette = {
    warm: { a: '#ffe1b0', b: '#ffb066', c: '#f4894e', shell: '#ffd9a8' },
    calm: { a: '#d9f2e6', b: '#9fd9bf', c: '#6cc3a0', shell: '#cdeee0' },
    low: { a: '#dbecff', b: '#9fc4f0', c: '#6ea4df', shell: '#cfe3fb' },
  }[mood];

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${id}-body`} cx="42%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#fffdf8" />
          <stop offset="48%" stopColor={palette.a} />
          <stop offset="100%" stopColor={palette.c} />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="46%" r="50%">
          <stop offset="0%" stopColor={palette.b} stopOpacity="0.55" />
          <stop offset="100%" stopColor={palette.b} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-base`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.shell} />
          <stop offset="100%" stopColor={palette.c} />
        </linearGradient>
      </defs>

      {/* 暖光晕 */}
      {glow && <circle cx="32" cy="30" r="30" fill={`url(#${id}-glow)`} />}

      {/* 灯座 */}
      <rect x="23" y="49" width="18" height="6.5" rx="3.25" fill={`url(#${id}-base)`} />
      <rect x="26.5" y="46" width="11" height="6" rx="3" fill={palette.shell} />

      {/* 灯身：圆润的钟形 */}
      <path
        d="M32 8C20.4 8 12 17 12 29.5C12 39 18 45 22 46.8C23 47.3 24 47.6 25 47.6H39C40 47.6 41 47.3 42 46.8C46 45 52 39 52 29.5C52 17 43.6 8 32 8Z"
        fill={`url(#${id}-body)`} stroke={palette.c} strokeOpacity="0.35" strokeWidth="1.2"
      />

      {/* 高光 */}
      <ellipse cx="25" cy="22" rx="6.5" ry="8" fill="#ffffff" opacity="0.5" />

      {/* 一双温柔的眼睛（在听 → 弯弯的；醒着 → 圆圆的） */}
      {awake ? (
        <>
          <circle cx="26" cy="31" r="2.5" fill="#5a3b2a" />
          <circle cx="38" cy="31" r="2.5" fill="#5a3b2a" />
          <circle cx="26.9" cy="30.2" r="0.8" fill="#fff" />
          <circle cx="38.9" cy="30.2" r="0.8" fill="#fff" />
        </>
      ) : (
        <>
          <path d="M22.5 31.5C24 33.6 27.6 33.6 29.2 31.5" stroke="#5a3b2a" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M34.8 31.5C36.4 33.6 40 33.6 41.5 31.5" stroke="#5a3b2a" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {/* 腮红 */}
      <circle cx="21.5" cy="36" r="2.4" fill={palette.c} opacity="0.28" />
      <circle cx="42.5" cy="36" r="2.4" fill={palette.c} opacity="0.28" />
    </svg>
  );
};

/* 文字字标 */
export const Wordmark: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <span style={{ fontSize: size, fontWeight: 800, letterSpacing: 2, color: 'var(--ly-text)' }}>乐颜</span>
);
