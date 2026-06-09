/* ============================================================
   乐颜 · 心理资源中心控制器（KWC Kingscript）
   实体 ly_resource。前端 ResourceApi（管理端）调本控制器：增删改 + 上下架。
   ============================================================ */
class ResourceController {
  private buildList() {
    return platform.orm.query('ly_resource').orderBy('id', 'asc')
      .list(['id', 'title', 'type', 'usage', 'status', 'emoji']);
  }

  // GET /resource/list
  list(request: any, response: any) {
    response.json({ code: 0, data: this.buildList() });
  }

  // POST /resource/create —— 上传资源（默认草稿）
  create(request: any, response: any) {
    const { title, type, emoji, status } = request.body || {};
    if (!title) { response.json({ code: 1, message: '资源标题不能为空' }); return; }
    const saved = platform.orm.insert('ly_resource', {
      title, type, emoji, status: status || '草稿', usage: 0, createTime: platform.now(),
    });
    response.json({ code: 0, data: saved });
  }

  // POST /resource/update —— 编辑资源
  update(request: any, response: any) {
    const { id, title, type, emoji } = request.body || {};
    platform.orm.update('ly_resource', id, { title, type, emoji });
    response.json({ code: 0, data: this.buildList() });
  }

  // POST /resource/toggle —— 上架 / 下架
  toggle(request: any, response: any) {
    const { id } = request.body || {};
    const r = platform.orm.query('ly_resource').where('id', id).one();
    platform.orm.update('ly_resource', id, { status: r.status === '已上架' ? '草稿' : '已上架' });
    response.json({ code: 0, data: this.buildList() });
  }

  // POST /resource/remove —— 删除资源
  remove(request: any, response: any) {
    platform.orm.delete('ly_resource', request.body.id);
    response.json({ code: 0, data: this.buildList() });
  }
}

const kwcController = new ResourceController();
export { kwcController };
