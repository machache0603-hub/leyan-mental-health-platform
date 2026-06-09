/* ============================================================
   乐颜 · 心情打卡控制器（KWC Kingscript）
   实体：ly_mood_log（打卡）· ly_garden_story（花园故事）· ly_alert（预警）
   前端 MoodApi 调本控制器（/ierp/kapi/app/MoodController/*）。
   ------------------------------------------------------------
   运行时由苍穹注入全局 platform：
     platform.orm     —— 领域模型 ORM（query/insert/update/delete/incr…）
     platform.context —— 当前登录人（userId / userName / userNumber 脱敏编号）
     platform.workflow—— 业务流程引擎（触发预警工作流）
     platform.now()/today()/seq()/fmt() —— 平台工具
   ============================================================ */
class MoodController {
  // GET /mood/history —— 当前学生近 N 天心情（升序，供成长曲线/花园）
  getHistory(request: any, response: any) {
    const student = platform.context.userNumber;
    const days = Number(request.query?.days ?? 14);
    const rows = platform.orm.query('ly_mood_log')
      .where('student', student).orderBy('logDate', 'asc').limit(days)
      .list(['logDate', 'mood', 'note']);
    const data = rows.map((r: any) => ({ date: platform.fmt(r.logDate, 'M/d'), mood: r.mood, note: r.note }));
    response.json({ code: 0, data });
  }

  // POST /mood/checkin —— 心情签到（浇水）+ 连续低落自动预警（学生→管理端闭环）
  checkin(request: any, response: any) {
    const student = platform.context.userNumber;
    const { mood, note, anonymous } = request.body || {};
    // 1) 写入打卡
    platform.orm.insert('ly_mood_log', { student, mood, note, anonymous: !!anonymous, logDate: platform.today() });
    // 2) 连续低落检测 → 触发预警工作流
    const cfg = platform.orm.query('ly_config').one() || { riskThresholdHigh: 3 };
    const n = Number(cfg.riskThresholdHigh) || 3;
    const recent = platform.orm.query('ly_mood_log')
      .where('student', student).orderBy('logDate', 'desc').limit(n).list(['mood']);
    const low = ['low', 'anxious', 'sad'];
    const allLow = recent.length >= n && recent.every((r: any) => low.indexOf(r.mood) >= 0);
    let alertTriggered = false;
    if (allLow) {
      const open = platform.orm.query('ly_alert').where('student', student).notEq('status', 'resolved').count();
      if (!open) {
        platform.orm.insert('ly_alert', {
          alertNo: 'AL-' + platform.seq(), student, level: 'high',
          reason: '连续 ' + n + ' 次情绪低落，系统自动预警', status: 'new', triggerTime: platform.now(),
        });
        platform.workflow.trigger('ly_alert_flow', { student });   // 通知辅导员、生成待办
        alertTriggered = true;
      }
    }
    response.json({ code: 0, data: { mood, note, alertTriggered } });
  }

  // POST /mood/listStories —— 情绪花园故事
  listStories(request: any, response: any) {
    const student = platform.context.userNumber;
    const rows = platform.orm.query('ly_garden_story')
      .where('student', student).orderBy('createTime', 'desc')
      .list(['storyDate', 'mood', 'text']);
    response.json({ code: 0, data: rows.map((r: any) => ({ date: r.storyDate, mood: r.mood, text: r.text })) });
  }
}

const kwcController = new MoodController();
export { kwcController };
