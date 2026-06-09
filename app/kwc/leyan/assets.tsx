/* ============================================================
   乐颜 · 图片资源（本地静态文件，不使用任何外链网址）
   图片放在 app/kwc/static/img/，dev server 以 /img/<名> 访问。
   未放图时自动回退到 SVG/emoji 兜底，界面不报错。
   ============================================================ */
import React, { useState } from 'react';

export const IMG = {
  logo: '/img/xiaonuan-logo.png',
  hero: '/img/xiaonuan-hero.png',
  empty: '/img/xiaonuan-empty.png',
  bgLight: '/img/bg-ambient-light.jpg',
  bgNight: '/img/bg-ambient-night.jpg',
  gardenBanner: '/img/garden-banner.jpg',
  loginBg: '/img/login-bg.jpg',
};

/* 带兜底的图片：图不存在时渲染 fallback（SVG/emoji），存在时显示图片 */
export const Img: React.FC<{
  src: string;
  alt?: string;
  fallback?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}> = ({ src, alt = '', fallback = null, style, className }) => {
  const [err, setErr] = useState(false);
  if (err) return <>{fallback}</>;
  return <img src={src} alt={alt} className={className} style={style} onError={() => setErr(true)} draggable={false} />;
};
