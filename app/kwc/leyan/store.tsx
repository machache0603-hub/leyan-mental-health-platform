/* 全局状态：路径路由 + 三端独立登录
   学生 = /  ·  教师 = /teacher  ·  管理员 = /admin
   每个 URL 显示对应角色登录页，登录后进入该门户。 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Role, MoodKey } from './data';
import { AuthApi } from './api';

interface Store {
  role: Role;                    // 当前 URL 对应角色
  authed: boolean;               // 当前角色是否已登录（决定登录页/门户）
  login: () => void;             // 登录成功
  logout: () => void;            // 退出登录（回到登录页）
  goRole: (r: Role) => void;     // 切换到另一端的登录 URL
  route: string;                 // 门户内当前页面 key
  go: (key: string) => void;
  todayMood: MoodKey | null;
  setTodayMood: (m: MoodKey) => void;
  dark: boolean;
  setDark: (b: boolean) => void;
  chatOpen: boolean;
  setChatOpen: (b: boolean) => void;
  anonymous: boolean;
  setAnonymous: (b: boolean) => void;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => useContext(Ctx)!;

const HOME: Record<Role, string> = { student: 's-home', teacher: 't-home', admin: 'a-cockpit' };
export const ROLE_PATH: Record<Role, string> = { student: '/', teacher: '/teacher', admin: '/admin' };
const PATH_ROLE: Record<string, Role> = { '': 'student', '/': 'student', '/teacher': 'teacher', '/admin': 'admin' };

const parsePath = (): Role => {
  const p = typeof location !== 'undefined' ? location.pathname.replace(/\/+$/, '') || '/' : '/';
  return PATH_ROLE[p] ?? 'student';
};

const ROLES: Role[] = ['student', 'teacher', 'admin'];
const AUTH_KEY = 'leyan:auth';
const readAuth = (): Role | null => {
  try { const v = sessionStorage.getItem(AUTH_KEY); return ROLES.includes(v as Role) ? (v as Role) : null; } catch { return null; }
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pathRole, setPathRole] = useState<Role>(parsePath());
  const [authedRole, setAuthedRole] = useState<Role | null>(readAuth());   // 刷新保持登录
  const [route, setRoute] = useState<string>(HOME[parsePath()]);
  const [todayMood, setTodayMood] = useState<MoodKey | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [anonymous, setAnonymous] = useState(true);

  const hour = new Date().getHours();
  const [dark, setDark] = useState<boolean>(hour >= 22 || hour < 6);

  const goRole = useCallback((r: Role) => {
    if (typeof history !== 'undefined') history.pushState({}, '', ROLE_PATH[r]);
    setPathRole(r);
    setChatOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const login = useCallback(() => {
    setAuthedRole(pathRole);
    try { sessionStorage.setItem(AUTH_KEY, pathRole); } catch { /* ignore */ }
    setRoute(HOME[pathRole]);
    setChatOpen(false);
    window.scrollTo(0, 0);
  }, [pathRole]);

  const logout = useCallback(() => {
    setAuthedRole(null);
    AuthApi.logout();                                       // 清除后端 token
    try { sessionStorage.removeItem(AUTH_KEY); } catch { /* ignore */ }
    setChatOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const go = useCallback((key: string) => { setRoute(key); window.scrollTo(0, 0); }, []);

  // 浏览器前进/后退
  useEffect(() => {
    const onPop = () => { setPathRole(parsePath()); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('ly-dark', dark);
  }, [dark]);

  const authed = authedRole !== null && authedRole === pathRole;

  return (
    <Ctx.Provider value={{
      role: pathRole, authed, login, logout, goRole,
      route, go, todayMood, setTodayMood, dark, setDark, chatOpen, setChatOpen, anonymous, setAnonymous,
    }}>
      {children}
    </Ctx.Provider>
  );
};
