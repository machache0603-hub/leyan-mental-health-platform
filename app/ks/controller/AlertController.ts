/* ============================================================
   乐颜 · 预警事件控制器（KWC Kingscript）
   实体 ly_alert。前端 AlertApi（管理端）调本控制器。
   闭环率/响应时长由本表统计；advance 推进状态机 new→processing→resolved。
   ============================================================ */
class AlertController {
  private buildList() {
    const rows = platform.orm.query('ly_alert').orderBy('createTime', 'desc')
      .list(['alertNo', 'student', 'className', 'level', 'reason', 'triggerTime', 'status', 'owner']);
    return rows.map((r: any) => ({ id: r.alertNo, student: r.student, cls: r.className, level: r.level, reason: r.reason, time: r.triggerTime, status: r.status, owner: r.owner }));
  }

  // GET /alert/list
  list(request: any, response: any) {
    response.json({ code: 0, data: this.buildList() });
  }

  // POST /alert/advance —— 推进处理状态（待处理→干预中→已闭环）
  advance(request: any, response: any) {
    const { id } = request.body || {};
    const me = platform.context.userName;
    const a = platform.orm.query('ly_alert').where('alertNo', id).one();
    if (!a) { response.json({ code: 1, message: '预警不存在' }); return; }
    if (a.status === 'new') {
      platform.orm.update('ly_alert', a.id, { status: 'processing', owner: a.owner === '—' ? me : a.owner });
    } else if (a.status === 'processing') {
      platform.orm.update('ly_alert', a.id, { status: 'resolved', closeTime: platform.now() });
    }
    response.json({ code: 0, data: this.buildList() });
  }
}

const kwcController = new AlertController();
export { kwcController };
