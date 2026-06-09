/* ============================================================
   乐颜 · 树洞广场控制器（KWC Kingscript）
   实体 ly_treehole（帖子）· ly_treehole_hug（抱抱关系，一人一抱可取消）。
   匿名发布：仅存匿名标识，不落真实学生身份。
   ============================================================ */
class TreeholeController {
  // 公共：按当前用户视角输出帖子列表（含是否抱过）
  private buildList(userId: string) {
    const rows = platform.orm.query('ly_treehole').orderBy('createTime', 'desc').list();
    return rows.map((t: any) => ({
      id: t.id, text: t.content, tag: t.tag, hugs: t.hugs, sameFeel: t.sameFeel,
      timeAgo: platform.timeAgo(t.createTime),
      hugged: platform.orm.query('ly_treehole_hug').where('post', t.id).where('user', userId).count() > 0,
    }));
  }

  // GET /treehole/list
  list(request: any, response: any) {
    response.json({ code: 0, data: this.buildList(platform.context.userId) });
  }

  // POST /treehole/create —— 匿名发帖
  create(request: any, response: any) {
    const { text, tag } = request.body || {};
    if (!text) { response.json({ code: 1, message: '内容不能为空' }); return; }
    const saved = platform.orm.insert('ly_treehole', {
      content: text, tag, hugs: 0, sameFeel: 0, anonymous: true, createTime: platform.now(),
    });
    response.json({ code: 0, data: { id: saved.id, text: saved.content, tag: saved.tag, hugs: 0, sameFeel: 0, timeAgo: '刚刚', hugged: false } });
  }

  // POST /treehole/toggleHug —— 抱抱 / 取消抱抱（幂等，按当前用户去重）
  toggleHug(request: any, response: any) {
    const userId = platform.context.userId;
    const { id } = request.body || {};
    const exists = platform.orm.query('ly_treehole_hug').where('post', id).where('user', userId).count();
    if (exists) {
      platform.orm.delete('ly_treehole_hug', { post: id, user: userId });
      platform.orm.decr('ly_treehole', id, 'hugs');
    } else {
      platform.orm.insert('ly_treehole_hug', { post: id, user: userId, createTime: platform.now() });
      platform.orm.incr('ly_treehole', id, 'hugs');
    }
    response.json({ code: 0, data: this.buildList(userId) });
  }
}

const kwcController = new TreeholeController();
export { kwcController };
