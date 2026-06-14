/* ============================================================
   乐颜 · 线性图标集（统一描边矢量，替代 emoji 当图标的做法）
   currentColor 着色，1.7 描边，圆角端点。
   ============================================================ */
import React from 'react';

const P: Record<string, React.ReactNode> = {
  // —— 通用 / 顶栏 ——
  home: <path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  sun: <><circle cx="12" cy="12" r="4.2" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5Z" />,
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5L6 16ZM10 19a2 2 0 0 0 4 0" />,
  spark: <path d="M12 3l1.8 4.7L18.5 9l-4.2 2.1L12 16l-2.3-4.9L5.5 9l4.7-1.3L12 3Z" />,
  // —— 学生端 ——
  chat: <path d="M5 5h14v10H9l-4 3.5V5Z" />,
  flower: <><circle cx="12" cy="11" r="2.4" /><path d="M12 8.6c0-2.4 3.4-2.6 3.4 0 2.2-1 3.4 2.2 1.2 3.1 2.2 1 .9 4-1.2 3.1.6 2.4-3 2.6-3.4.4-.4 2.2-4 2-3.4-.4-2.2.9-3.4-2.1-1.2-3.1-2.2-1-.9-4 1.2-3.1-.6-2.4 3-2.6 3.4-.4ZM12 14v6" /></>,
  palette: <path d="M12 3a9 9 0 0 0 0 18c1.7 0 2-1.4 1.1-2.3-.9-1 .1-2.2 1.4-2.2H17a4 4 0 0 0 4-4c0-4.7-4-9.5-9-9.5ZM7.5 12.5h.01M10 8.5h.01M14.5 8h.01" />,
  tree: <path d="M12 3c3 0 5 2.3 5 5 0 2-1.3 3.4-2.6 4H9.6C8.3 11.4 7 10 7 8c0-2.7 2-5 5-5ZM12 13v8M8.5 18h7" />,
  book: <path d="M6 4h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 1 5 18.5v-13A1.5 1.5 0 0 1 6.5 4H7M9 4v16" />,
  headphone: <path d="M5 13v-1a7 7 0 0 1 14 0v1M5 13h2.2c.4 0 .8.3.8.8V18c0 .5-.4.8-.8.8H6a1 1 0 0 1-1-1V13ZM19 13h-2.2c-.4 0-.8.3-.8.8V18c0 .5.4.8.8.8H18a1 1 0 0 0 1-1V13Z" />,
  bubble: <><path d="M9 14a4 4 0 1 1 4-4" /><circle cx="16.5" cy="13.5" r="2.5" /><circle cx="7" cy="17" r="1.5" /></>,
  library: <path d="M5 5h3v14H5zM10.5 5h3v14h-3zM16 5.5l3 .8-3 13-3-.8" />,
  sprout: <path d="M12 20v-7M12 13c0-3 2.5-4 4.5-3.8C16.7 11.5 15 13 12 13ZM12 13c0-2.4-2-3.4-3.6-3.2C8.2 11.8 9.6 13 12 13ZM8 20h8" />,
  // —— 教师端 ——
  gauge: <path d="M5 18a8 8 0 1 1 14 0M12 18l3.5-4.5" />,
  cloudsun: <path d="M7 8.5a3 3 0 0 1 5.7-1.3M16 11.5a3.2 3.2 0 0 1 .2 6.4H8a3.5 3.5 0 0 1-.3-7 4 4 0 0 1 7.8-.2M5.5 5.5 4.5 4.5M16 5l1-1M4 9H3" />,
  folder: <path d="M4 7a1 1 0 0 1 1-1h4l2 2h7a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z" />,
  wand: <path d="M5 19 16 8M14 6l1.5-1.5M18 10l1.5-1.5M19 14l1 .3M9 4l.3 1M15.5 6.5 17 8" />,
  notebook: <path d="M7 4h10a1 1 0 0 1 1 1v15l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1ZM9 8h6M9 11h6" />,
  camp: <path d="M12 4 4 19h16L12 4ZM12 9l4 10M12 9 8 19" />,
  cup: <path d="M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8ZM16 9h2.5a2 2 0 0 1 0 4H16M5 20h11" />,
  // —— 管理端 ——
  map: <path d="m9 4 6 2 5-2v14l-5 2-6-2-5 2V6l5-2Zm0 0v14m6-12v14" />,
  alert: <path d="M12 4 3 19h18L12 4ZM12 10v4M12 17h.01" />,
  box: <path d="M4 8 12 4l8 4-8 4-8-4Zm0 0v8l8 4 8-4V8M12 12v8" />,
  report: <path d="M7 4h7l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM14 4v4h4M9 17v-3M12 17v-5M15 17v-2" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" /></>,
  // —— 角色 ——
  student: <path d="M12 5 3 9l9 4 9-4-9-4ZM7 11.5V16c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4.5M21 9v5" />,
  teacher: <path d="M4 5h16v10H4zM4 19h16M9 11l2-3 2 2 2-3" />,
  shield: <path d="M12 4 5 6.5V12c0 4 3 6.7 7 8 4-1.3 7-4 7-8V6.5L12 4ZM9.5 12l1.8 1.8L15 10" />,
  // —— 小图标 ——
  heart: <path d="M12 19s-6-4-8-8c-1.3-2.6.6-5.5 3.4-5.5 1.7 0 2.8 1 3.6 2 .8-1 1.9-2 3.6-2C20.4 5.5 22.3 8.4 21 11c-2 4-9 8-9 8Z" />,
  pin: <path d="M12 21s6-5.3 6-10A6 6 0 0 0 6 11c0 4.7 6 10 6 10ZM12 11h.01" />,
  water: <path d="M12 4s6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 6-10 6-10Z" />,
  send: <path d="M5 12 20 5l-4 14-4-5-7-2Z" />,
  lock: <path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z" />,
  plus: <path d="M12 5v14M5 12h14" />,
};

export const Icon: React.FC<{ name: string; size?: number; stroke?: number; style?: React.CSSProperties }> = ({ name, size = 20, stroke = 1.7, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
    {P[name] || P.spark}
  </svg>
);
