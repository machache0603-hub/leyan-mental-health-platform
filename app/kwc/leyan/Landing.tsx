/* ============================================================
   乐颜 · 门户入口页（选择身份 → 进入三个独立门户之一）
   ============================================================ */
import React from 'react';
import { useStore } from './store';
import { Role } from './data';
import { Logo } from './Logo';
import { Icon } from './Icon';
import { IMG, Img } from './assets';

interface Portal {
  role: Role; icon: string; title: string; sub: string;
  desc: string; features: string[]; accent: string; soft: string; count: string;
}

const PORTALS: Portal[] = [
  {
    role: 'student', icon: 'student', title: '学生端', sub: '我的心灵小窝',
    desc: '一盏永远亮着的小夜灯，陪你聊天、种花、写日记，把情绪轻轻安放。',
    features: ['悄悄话 · 小暖陪伴', '情绪花园 · 每日心情', '树洞广场 · 匿名倾诉', '治愈工坊 · 放松练习'],
    accent: '#f4703f', soft: 'linear-gradient(160deg,#fff3e8,#ffe7d6)', count: '10 项功能',
  },
  {
    role: 'teacher', icon: 'teacher', title: '教师端', sub: '关爱每一位学生',
    desc: '班级状态一目了然，智能助手帮你生成谈心话题与评语，把时间还给关心本身。',
    features: ['班级晴雨表 · 状态总览', '学生档案 · 情绪趋势', '智能助手 · 谈心建议', '谈心记录 · 跟进闭环'],
    accent: '#3f7fd6', soft: 'linear-gradient(160deg,#eaf3ff,#e3ecff)', count: '8 项功能',
  },
  {
    role: 'admin', icon: 'shield', title: '管理端', sub: '全校心理治理',
    desc: '校园心理驾驶舱与温度地图，预警从触发到闭环全程追踪，数据支撑决策。',
    features: ['心理驾驶舱 · 宏观视图', '温度地图 · 学院分布', '预警中心 · 闭环追踪', '数据报告 · 智能生成'],
    accent: '#2e9367', soft: 'linear-gradient(160deg,#e8f7ef,#e2f3ec)', count: '6 项功能',
  },
];

export const Landing: React.FC = () => {
  const { enter, dark, setDark } = useStore();
  return (
    <div className="ly-landing">
      <div className="ly-landing-top">
        <div className="row gap-sm">
          <Img src={IMG.logo} alt="乐颜" fallback={<Logo size={40} mood={dark ? 'low' : 'warm'} />} style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: 1 }}>乐颜</div>
            <div className="dim" style={{ fontSize: 11 }}>让每一天都有好脸色</div>
          </div>
        </div>
        <button className="ly-icon-btn" onClick={() => setDark(!dark)} title={dark ? '切换日间' : '切换夜间'}><Icon name={dark ? 'sun' : 'moon'} size={18} /></button>
      </div>

      <div className="ly-landing-hero">
        <Img src={IMG.hero} alt="小暖" fallback={<Logo size={92} />} style={{ width: 110, height: 110, objectFit: 'contain' }} />
        <div className="ly-landing-tagline">
          <h1>你好呀，欢迎来到<span style={{ color: 'var(--ly-primary-deep)' }}>乐颜</span></h1>
          <p className="muted">AI 原生智慧校园心理健康关爱平台 · 请选择你的身份进入</p>
        </div>
      </div>

      <div className="ly-portal-grid">
        {PORTALS.map(p => (
          <button key={p.role} className="ly-portal-card" onClick={() => enter(p.role)} style={{ ['--accent' as any]: p.accent }}>
            <div className="ly-portal-head" style={{ background: p.soft }}>
              <div className="ly-portal-ico" style={{ background: p.accent }}><Icon name={p.icon} size={26} /></div>
              <span className="chip" style={{ background: '#ffffffcc', color: p.accent }}>{p.count}</span>
            </div>
            <div className="ly-portal-body">
              <div className="row-between">
                <div>
                  <div className="ly-portal-title">{p.title}</div>
                  <div className="dim" style={{ fontSize: 12.5 }}>{p.sub}</div>
                </div>
              </div>
              <p className="muted" style={{ fontSize: 13, lineHeight: 1.7, margin: '12px 0 14px' }}>{p.desc}</p>
              <ul className="ly-portal-feats">
                {p.features.map(f => <li key={f}><Icon name="heart" size={13} style={{ color: p.accent }} /> {f}</li>)}
              </ul>
              <div className="ly-portal-enter" style={{ color: p.accent }}>进入{p.title} <Icon name="send" size={15} /></div>
            </div>
          </button>
        ))}
      </div>

      <div className="ly-landing-foot dim">
        第十五届软件杯 · A6 赛题　|　基于金蝶 AI 苍穹低代码平台 + KWC 前端框架　|　数据均为模拟，不含真实个人信息
      </div>
    </div>
  );
};
