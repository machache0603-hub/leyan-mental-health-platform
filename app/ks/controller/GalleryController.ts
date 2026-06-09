/* ============================================================
   乐颜 · 疗愈画作 / 我的画廊控制器（KWC Kingscript）
   实体 ly_artwork。前端 GalleryApi（学生端艺术疗愈）调本控制器。
   ============================================================ */
class GalleryController {
  // GET /gallery/list —— 当前学生的画作
  list(request: any, response: any) {
    const student = platform.context.userNumber;
    const rows = platform.orm.query('ly_artwork')
      .where('student', student).orderBy('createTime', 'desc')
      .list(['id', 'prompt', 'palette', 'colors', 'bright', 'warm', 'interpret']);
    response.json({ code: 0, data: rows.map((r: any) => ({
      id: r.id, prompt: r.prompt, palette: r.palette,
      colors: (r.colors || '').split(',').filter((x: string) => x),
      bright: r.bright, warm: r.warm, interp: r.interpret,
    })) });
  }

  // POST /gallery/create —— 保存一幅画作
  create(request: any, response: any) {
    const student = platform.context.userNumber;
    const { prompt, palette, colors, bright, warm, interpret } = request.body || {};
    const saved = platform.orm.insert('ly_artwork', {
      student, prompt, palette, colors: (colors || []).join(','), bright, warm, interpret, createTime: platform.now(),
    });
    response.json({ code: 0, data: { id: saved.id, prompt, palette, colors: colors || [], bright, warm, interp: interpret } });
  }
}

const kwcController = new GalleryController();
export { kwcController };
