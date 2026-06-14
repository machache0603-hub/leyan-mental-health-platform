/* ============================================================
   乐颜 · 应用外壳（导航 / 布局 / 小暖悬浮球）
   ============================================================ */
import React, { useState, useEffect } from 'react';
import './theme.css';
import { StoreProvider, useStore } from './store';
import { Role } from './data';
import { Modal, ErrorBoundary } from './ui';
import { Logo, Wordmark } from './Logo';
import { Icon } from './Icon';
import { IMG, Img } from './assets';
import { Login } from './Login';
import {
  StudentHome, SecretTalk, Garden, ArtStudio, Treehole, Growth,
  WarmStation, Diary, Radio, Workshop, ChatPanel,
} from './features/student';
import {
  TeacherHome, ClassWeather, StudentArchive, TeacherAssistant,
  TalkRecords, Camp, ClassTree, TeacherRest,
} from './features/teacher';
import {
  Cockpit, TempMap, AlertCenter, ResourceCenter, DataReport, SystemConfig,
} from './features/admin';

interface NavItem { key: string; label: string; icon: string; comp: React.FC; group: string; }
interface NavConfig { label: string; icon: string; items: NavItem[]; }

const NAV: Record<Role, NavConfig> = {
  student: {
    label: '学生', icon: 'student',
    items: [
      { key: 's-home', label: '暖心首页', icon: 'home', comp: StudentHome, group: '我的小窝' },
      { key: 's-talk', label: '悄悄话', icon: 'chat', comp: SecretTalk, group: '我的小窝' },
      { key: 's-garden', label: '情绪花园', icon: 'flower', comp: Garden, group: '我的小窝' },
      { key: 's-art', label: '艺术疗愈画室', icon: 'palette', comp: ArtStudio, group: '表达与陪伴' },
      { key: 's-treehole', label: '树洞广场', icon: 'tree', comp: Treehole, group: '表达与陪伴' },
      { key: 's-diary', label: '小确幸日记', icon: 'book', comp: Diary, group: '表达与陪伴' },
      { key: 's-radio', label: '心灵电台', icon: 'headphone', comp: Radio, group: '休息与成长' },
      { key: 's-workshop', label: '治愈工坊', icon: 'bubble', comp: Workshop, group: '休息与成长' },
      { key: 's-station', label: '暖心小站', icon: 'library', comp: WarmStation, group: '休息与成长' },
      { key: 's-growth', label: '成长空间', icon: 'sprout', comp: Growth, group: '休息与成长' },
    ],
  },
  teacher: {
    label: '教师', icon: 'teacher',
    items: [
      { key: 't-home', label: '教师工作台', icon: 'gauge', comp: TeacherHome, group: '概览' },
      { key: 't-weather', label: '班级晴雨表', icon: 'cloudsun', comp: ClassWeather, group: '概览' },
      { key: 't-archive', label: '学生档案', icon: 'folder', comp: StudentArchive, group: '关爱学生' },
      { key: 't-assistant', label: '智能助手', icon: 'wand', comp: TeacherAssistant, group: '关爱学生' },
      { key: 't-talk', label: '谈心记录本', icon: 'notebook', comp: TalkRecords, group: '关爱学生' },
      { key: 't-camp', label: '陪伴训练营', icon: 'camp', comp: Camp, group: '班级经营' },
      { key: 't-tree', label: '班级心理树', icon: 'tree', comp: ClassTree, group: '班级经营' },
      { key: 't-rest', label: '教师休憩站', icon: 'cup', comp: TeacherRest, group: '关爱自己' },
    ],
  },
  admin: {
    label: '管理', icon: 'shield',
    items: [
      { key: 'a-cockpit', label: '校园心理驾驶舱', icon: 'gauge', comp: Cockpit, group: '全局视图' },
      { key: 'a-map', label: '心理温度地图', icon: 'map', comp: TempMap, group: '全局视图' },
      { key: 'a-alert', label: '预警管理中心', icon: 'alert', comp: AlertCenter, group: '风险治理' },
      { key: 'a-resource', label: '资源中心', icon: 'box', comp: ResourceCenter, group: '运营管理' },
      { key: 'a-report', label: '数据报告', icon: 'report', comp: DataReport, group: '运营管理' },
      { key: 'a-config', label: '系统配置', icon: 'gear', comp: SystemConfig, group: '运营管理' },
    ],
  },
};

const Sidebar: React.FC<{ open?: boolean }> = ({ open }) => {
  const { role, route, go, dark, logout } = useStore();
  const cfg = NAV[role];
  const groups = Array.from(new Set(cfg.items.map(i => i.group)));
  return (
    <aside className={`ly-sidebar ${open ? 'open' : ''}`}>
      <div className="ly-brand">
        <div className="ly-brand-logo">
          <Img src={IMG.logo} alt="乐颜" fallback={<Logo size={42} mood={dark ? 'low' : 'warm'} />} style={{ width: 44, height: 44, objectFit: 'contain' }} />
        </div>
        <div>
          <div className="ly-brand-name">乐颜</div>
          <div className="ly-brand-sub">让每一天都有好脸色</div>
        </div>
      </div>
      <div className="ly-portal-badge">
        <Icon name={cfg.icon} size={15} /> {cfg.label}端
      </div>
      {groups.map(g => (
        <div key={g}>
          <div className="ly-nav-group-title">{g}</div>
          {cfg.items.filter(i => i.group === g).map(i => (
            <button key={i.key} className={`ly-nav-item ${route === i.key ? 'on' : ''}`} onClick={() => go(i.key)}>
              <span className="ico"><Icon name={i.icon} size={18} /></span>{i.label}
            </button>
          ))}
        </div>
      ))}
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <button className="ly-nav-item" onClick={logout} style={{ width: '100%', color: 'var(--ly-text-2)' }}>
          <span className="ico"><Icon name="send" size={17} style={{ transform: 'rotate(180deg)' }} /></span>退出登录
        </button>
        <div className="dim tcenter" style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11 }}>第十五届软件杯 · A6 赛题</div>
          <div style={{ fontSize: 11, marginTop: 2 }}>基于金蝶 AI 苍穹 · KWC</div>
        </div>
      </div>
    </aside>
  );
};

const TopBar: React.FC<{ item: NavItem; onMenu?: () => void }> = ({ item, onMenu }) => {
  const { dark, setDark, role } = useStore();
  const sub: Record<Role, string> = { student: '今天也要好好的呀', teacher: '张老师 · 计算机学院辅导员', admin: '校心理健康教育中心' };
  return (
    <header className="ly-topbar">
      <div className="row gap-sm">
        <button className="ly-icon-btn ly-burger" onClick={onMenu} aria-label="打开导航菜单"><Icon name="menu" size={18} /></button>
        <span style={{ color: 'var(--ly-primary-deep)', display: 'grid', placeItems: 'center' }}><Icon name={item.icon} size={20} /></span>
        <div>
          <div className="ly-topbar-title">{item.label}</div>
          <div className="ly-topbar-sub">{sub[role]}</div>
        </div>
      </div>
      <div className="ly-topbar-actions">
        <button className="ly-icon-btn" onClick={() => setDark(!dark)} aria-label={dark ? '切换日间模式' : '切换夜间模式'} title={dark ? '切换日间' : '切换夜间'}><Icon name={dark ? 'sun' : 'moon'} size={18} /></button>
        <button className="ly-icon-btn" aria-label="通知" title="通知"><Icon name="bell" size={18} /></button>
        <div className="ly-avatar">{role === 'student' ? '颜' : role === 'teacher' ? '师' : '管'}</div>
      </div>
    </header>
  );
};

/* 小暖悬浮球 + 弹出悄悄话 */
const WarmBall: React.FC = () => {
  const { chatOpen, setChatOpen, todayMood, role } = useStore();
  if (role !== 'student') return null;   // 学生端常驻陪伴
  const low = todayMood === 'low' || todayMood === 'sad' || todayMood === 'anxious';
  return (
    <>
      {!chatOpen && (
        <>
          <div className="warm-ball-tip">点我，和小暖说说话吧</div>
          <button className="warm-ball" onClick={() => setChatOpen(true)} title="小暖一直都在">
            <Img src={IMG.logo} alt="小暖" fallback={<Logo size={44} mood={low ? 'low' : 'warm'} glow={false} />} style={{ width: 46, height: 46, objectFit: 'contain' }} />
          </button>
        </>
      )}
      <Modal open={chatOpen} onClose={() => setChatOpen(false)} title="悄悄话 · 小暖在听" width={460}>
        <ChatPanel compact />
      </Modal>
    </>
  );
};

/* 夜间细星点背景 */
const Stars: React.FC = () => (
  <svg className="ly-bg-stars" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
    {Array.from({ length: 40 }).map((_, i) => {
      const x = (i * 137.5) % 100, y = (i * 91.3) % 100, r = (i % 3) * 0.4 + 0.5;
      return <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} fill="#fff" opacity={0.3 + (i % 4) * 0.15} />;
    })}
  </svg>
);

/* 背景氛围图（放图即生效；无图时回退到 CSS 柔光晕 + 星点） */
const BgLayer: React.FC = () => {
  const { dark } = useStore();
  return (
    <div className="ly-bg-layer">
      <Img key={dark ? 'n' : 'l'} src={dark ? IMG.bgNight : IMG.bgLight} alt="" fallback={null}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: dark ? 0.5 : 0.6 }} />
      <Stars />
    </div>
  );
};

const Shell: React.FC = () => {
  const { role, route } = useStore();
  const [navOpen, setNavOpen] = useState(false);
  const item = NAV[role].items.find(i => i.key === route) || NAV[role].items[0];
  const Comp = item.comp;
  useEffect(() => { setNavOpen(false); }, [route]);   // 移动端：导航后自动收起抽屉
  return (
    <div className="ly-shell">
      <Sidebar open={navOpen} />
      {navOpen && <div className="ly-nav-scrim" onClick={() => setNavOpen(false)} />}
      <main className="ly-main">
        <TopBar item={item} onMenu={() => setNavOpen(true)} />
        <div className="ly-page"><ErrorBoundary key={route}><Comp /></ErrorBoundary></div>
      </main>
      <WarmBall />
    </div>
  );
};

const Root: React.FC = () => {
  const { authed } = useStore();
  return (
    <>
      <BgLayer />
      {authed ? <Shell /> : <Login />}
    </>
  );
};

const App: React.FC = () => (
  <div className="ly-root">
    <StoreProvider><Root /></StoreProvider>
  </div>
);

export default App;
