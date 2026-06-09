/* ============================================================
   乐颜 · 登录页（按 URL 路径区分三端：/ 学生 · /teacher 教师 · /admin 管理员）
   演示环境：内置演示账号，可一键填入。数据均为模拟。
   ============================================================ */
import React, { useEffect, useState } from 'react';
import { useStore } from './store';
import { Role } from './data';
import { AuthApi } from './api';
import { Logo } from './Logo';
import { Icon } from './Icon';
import { IMG, Img } from './assets';

interface RoleMeta {
  title: string; sub: string; icon: string; accent: string; soft: string;
  account: string; accountLabel: string; pwd: string;
}
const META: Record<Role, RoleMeta> = {
  student: { title: '学生端', sub: '我的心灵小窝 · 一盏永远亮着的小夜灯', icon: 'student', accent: '#f4703f',
    soft: 'linear-gradient(150deg,#fff3e8,#ffe7d6)', account: '2026010188', accountLabel: '学号', pwd: 'leyan123' },
  teacher: { title: '教师端', sub: '关爱每一位学生 · 把时间还给关心本身', icon: 'teacher', accent: '#3f7fd6',
    soft: 'linear-gradient(150deg,#eaf3ff,#e3ecff)', account: 'T0231', accountLabel: '工号', pwd: 'leyan123' },
  admin: { title: '管理员端', sub: '全校心理治理 · 数据支撑科学决策', icon: 'shield', accent: '#2e9367',
    soft: 'linear-gradient(150deg,#e8f7ef,#e2f3ec)', account: 'admin', accountLabel: '账号', pwd: 'leyan123' },
};

export const Login: React.FC = () => {
  const { role, login, goRole, dark, setDark } = useStore();
  const m = META[role];
  const [account, setAccount] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // 切换端时清空表单
  useEffect(() => { setAccount(''); setPwd(''); setErr(''); }, [role]);

  const fill = () => { setAccount(m.account); setPwd(m.pwd); setErr(''); };
  const submit = async () => {
    if (!account.trim() || !pwd.trim()) { setErr('请输入账号和密码'); return; }
    setBusy(true); setErr('');
    try {
      await AuthApi.login(account, pwd, role);            // server 模式后端校验发 token；local 模式校验演示账号
      login();
    } catch {
      setErr('账号或密码不正确，试试下方的演示账号吧');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ly-login" style={{ ['--accent' as any]: m.accent }}>
      <div className="ly-login-top">
        <div className="row gap-sm">
          <Img src={IMG.logo} alt="乐颜" fallback={<Logo size={36} mood={dark ? 'low' : 'warm'} />} style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>乐颜</div>
        </div>
        <button className="ly-icon-btn" onClick={() => setDark(!dark)} title={dark ? '切换日间' : '切换夜间'}><Icon name={dark ? 'sun' : 'moon'} size={18} /></button>
      </div>

      <div className="ly-login-wrap">
        {/* 左侧品牌 */}
        <div className="ly-login-brand" style={{ background: m.soft, position: 'relative', overflow: 'hidden' }}>
          {/* 可选登录背景图：放图即生效，无图时用上面的渐变 */}
          <Img src={IMG.loginBg} alt="" fallback={null}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
          <Img src={IMG.hero} alt="小暖" fallback={<Logo size={120} />} style={{ width: 150, height: 150, objectFit: 'contain' }} />
          <h1>AI 原生智慧校园<br />心理健康关爱平台</h1>
          <p>一盏永远亮着的小夜灯，<br />不是冰冷的工具，是温暖的陪伴。</p>
          <div className="ly-login-roles">
            {(['student', 'teacher', 'admin'] as Role[]).map(r => (
              <button key={r} className={`chip ${r === role ? 'chip-primary' : ''}`} onClick={() => goRole(r)}>
                <Icon name={META[r].icon} size={13} /> {META[r].title}
              </button>
            ))}
          </div>
          </div>
        </div>

        {/* 右侧登录表单 */}
        <div className="ly-login-form">
          <div className="ly-login-roleicon" style={{ background: m.accent }}><Icon name={m.icon} size={26} /></div>
          <div className="ly-login-title">{m.title}登录</div>
          <div className="dim" style={{ fontSize: 12.5, marginBottom: 22 }}>{m.sub}</div>

          <label className="ly-field-label">{m.accountLabel}</label>
          <div className="ly-field">
            <Icon name="student" size={16} style={{ color: 'var(--ly-text-3)' }} />
            <input className="ly-field-input" placeholder={`请输入${m.accountLabel}`} value={account} name="ly-account" autoComplete="off"
              onChange={e => setAccount(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>

          <label className="ly-field-label">密码</label>
          <div className="ly-field">
            <Icon name="lock" size={16} style={{ color: 'var(--ly-text-3)' }} />
            <input className="ly-field-input" type="password" placeholder="请输入密码" value={pwd} name="ly-pwd" autoComplete="new-password"
              onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>

          {err && <div className="ly-login-err">{err}</div>}

          <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 18, background: m.accent }} onClick={submit} disabled={busy}>
            {busy ? '正在为你打开温暖的角落…' : '登 录'}
          </button>

          <div className="ly-login-demo">
            <span className="dim">演示账号：{m.account} / {m.pwd}</span>
            <button className="chip" onClick={fill}>一键填入</button>
          </div>
          <div className="dim tcenter" style={{ fontSize: 11, marginTop: 18, lineHeight: 1.7 }}>
            登录即表示同意《用户协议》与《隐私政策》<br />
            演示环境 · 数据均为模拟，不含真实个人信息
          </div>
        </div>
      </div>
    </div>
  );
};
