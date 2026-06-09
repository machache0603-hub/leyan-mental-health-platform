/* ============================================================
   乐颜 · 登录鉴权控制器（KWC Kingscript）
   实体 ly_user。前端 AuthApi 调本控制器。
   ------------------------------------------------------------
   说明：生产环境通常直接复用苍穹统一身份（SSO / 当前登录态），
   本控制器用于与「本地真实后端」保持同一套契约（双轨对齐），
   也便于演示账号体系。密码只比对 sha256 摘要，绝不存明文。
   ============================================================ */
class AuthController {
  // POST /auth/login —— 校验账号密码，签发会话 token
  login(request: any, response: any) {
    const { account, pwd, role } = request.body || {};
    const u = platform.orm.query('ly_user').where('account', account).where('role', role).one();
    if (!u || u.pwdHash !== platform.crypto.sha256(pwd)) {
      response.json({ code: 1, message: '账号或密码不正确' });
      return;
    }
    const token = platform.token.issue({ account: u.account, role: u.role });
    response.json({ code: 0, data: { token, account: u.account, role: u.role, name: u.name, number: u.number } });
  }

  // POST /auth/me —— 用 token 取当前登录人
  me(request: any, response: any) {
    const u = platform.token.verify(request.headers.authorization);
    if (!u) { response.json({ code: 1, message: '未登录' }); return; }
    response.json({ code: 0, data: u });
  }
}

const kwcController = new AuthController();
export { kwcController };
