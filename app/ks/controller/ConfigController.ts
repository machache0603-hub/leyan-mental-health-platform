/* ============================================================
   乐颜 · 系统配置控制器（KWC Kingscript）
   实体 ly_config（单例/按组织）。前端 ConfigApi（管理端）调本控制器。
   ============================================================ */
class ConfigController {
  // GET /config/get
  get(request: any, response: any) {
    const cfg = platform.orm.query('ly_config').where('org', platform.context.orgId).one();
    response.json({ code: 0, data: cfg || platform.defaults.config });
  }

  // POST /config/save —— 保存阈值/通知渠道/匿名默认等
  save(request: any, response: any) {
    const cfg = request.body || {};
    platform.orm.upsert('ly_config', { org: platform.context.orgId }, cfg);
    response.json({ code: 0, data: cfg });
  }
}

const kwcController = new ConfigController();
export { kwcController };
