/* ============================================================
   乐颜 · 谈心记录控制器（KWC Kingscript）
   实体 ly_talk_record。前端 TalkApi（教师端）调本控制器。
   ============================================================ */
class TalkController {
  private buildList() {
    const rows = platform.orm.query('ly_talk_record').orderBy('createTime', 'desc')
      .list(['id', 'student', 'talkDate', 'topic', 'summary', 'followUp', 'done']);
    return rows.map((r: any) => ({ id: r.id, student: r.student, date: r.talkDate, topic: r.topic, summary: r.summary, followUp: r.followUp, done: r.done }));
  }

  // GET /talk/list
  list(request: any, response: any) {
    response.json({ code: 0, data: this.buildList() });
  }

  // POST /talk/create —— 新增谈心记录
  create(request: any, response: any) {
    const teacher = platform.context.userName;
    const { student, date, topic, summary, followUp } = request.body || {};
    const saved = platform.orm.insert('ly_talk_record', {
      teacher, student, talkDate: date, topic, summary, followUp, done: false, createTime: platform.now(),
    });
    response.json({ code: 0, data: { id: saved.id, student, date, topic, summary, followUp, done: false } });
  }

  // POST /talk/toggleFollowUp —— 回访完成/取消
  toggleFollowUp(request: any, response: any) {
    const { id } = request.body || {};
    const rec = platform.orm.query('ly_talk_record').where('id', id).one();
    platform.orm.update('ly_talk_record', id, { done: !rec.done });
    response.json({ code: 0, data: this.buildList() });
  }
}

const kwcController = new TalkController();
export { kwcController };
