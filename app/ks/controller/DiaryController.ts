/* ============================================================
   乐颜 · 小确幸日记控制器（KWC Kingscript）
   实体 ly_diary。前端 DiaryApi 调本控制器。
   platform 由苍穹运行时注入（ORM / 当前用户 / 工具）。
   ============================================================ */
class DiaryController {
  // GET /diary/list —— 当前学生的日记（时间倒序）
  list(request: any, response: any) {
    const student = platform.context.userNumber;
    const rows = platform.orm.query('ly_diary')
      .where('student', student).orderBy('createTime', 'desc')
      .list(['id', 'diaryDate', 'content', 'emoji']);
    response.json({ code: 0, data: rows.map((r: any) => ({ id: r.id, date: r.diaryDate, text: r.content, emoji: r.emoji })) });
  }

  // POST /diary/create —— 新增一条小确幸
  create(request: any, response: any) {
    const student = platform.context.userNumber;
    const { text, emoji } = request.body || {};
    if (!text) { response.json({ code: 1, message: '内容不能为空' }); return; }
    const saved = platform.orm.insert('ly_diary', {
      student, content: text, emoji, diaryDate: platform.today(), createTime: platform.now(),
    });
    response.json({ code: 0, data: { id: saved.id, date: saved.diaryDate, text: saved.content, emoji: saved.emoji } });
  }
}

const kwcController = new DiaryController();
export { kwcController };
