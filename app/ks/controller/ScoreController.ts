/* ============================================================
   乐颜 · 成绩控制器（KWC Kingscript）
   实体 ly_score / ly_teacher_performance。前端 ScoreApi（教师端）调本控制器。
   成绩仅用于「学业陪伴」关怀提示，全部脱敏，不做评比公示。
   ============================================================ */
class ScoreController {
  private buildList(filter: any) {
    let query = platform.orm.query('ly_score').orderBy('id', 'desc');
    if (filter && filter.student) query = query.where('student', filter.student);
    if (filter && filter.term) query = query.where('term', filter.term);
    if (filter && filter.course) query = query.where('course', filter.course);
    return query.list(['id', 'student', 'className', 'term', 'course', 'score', 'prevScore', 'delta', 'rank']);
  }

  // POST /score/importScore —— 批量导入成绩（自动计算与上次的变化 delta）
  importScore(request: any, response: any) {
    const rows = (request.body && request.body.rows) || [];
    let imported = 0;
    for (const r of rows) {
      if (!r || !r.student || !r.course) continue;
      const prev = (r.prevScore === null || r.prevScore === undefined) ? null : Number(r.prevScore);
      const delta = prev === null ? null : Number(r.score) - prev;
      platform.orm.insert('ly_score', {
        student: r.student, className: r.className || '', term: r.term || '2025-2026 春',
        course: r.course, score: Number(r.score), prevScore: prev, delta, rank: r.rank, createTime: platform.now(),
      });
      imported++;
    }
    response.json({ code: 0, data: { imported, list: this.buildList(null) } });
  }

  // POST /score/listScores —— 成绩列表（可按学生 / 学期 / 课程过滤）
  listScores(request: any, response: any) {
    response.json({ code: 0, data: this.buildList(request.body || {}) });
  }

  // POST /score/moodPrediction —— 成绩→心情预测，生产环境委托「成绩关怀 Agent」
  moodPrediction(request: any, response: any) {
    const { student } = request.body || {};
    const latest = platform.orm.query('ly_score').where('student', student).orderBy('id', 'desc').one(['course', 'delta', 'score']);
    const stu = platform.orm.query('ly_student').where('number', student).one(['trend']);
    const recentMoods = stu && stu.trend ? String(stu.trend).split(',') : [];
    // 生产：经苍穹 AI 网关调用「成绩关怀 Agent」的 predictMoodByGrade 能力
    const pred = platform.ai.agent('成绩关怀').invoke('predictMoodByGrade', {
      course: latest && latest.course, scoreDelta: (latest && latest.delta) || 0,
      current: latest && latest.score, recentMoods,
    });
    response.json({ code: 0, data: Object.assign({ student, course: latest && latest.course, scoreDelta: (latest && latest.delta) || 0 }, pred) });
  }

  // POST /score/teacherPerformance —— 学院教师绩效看板（按学院 + 周期，综合分降序）
  teacherPerformance(request: any, response: any) {
    const { college, period } = request.body || {};
    let query = platform.orm.query('ly_teacher_performance').orderBy('composite', 'desc');
    if (college && college !== '全部') query = query.where('college', college);
    if (period) query = query.where('period', period);
    return response.json({
      code: 0,
      data: query.list(['id', 'teacher', 'college', 'period', 'alertCloseRate', 'talkCount', 'moodImproveScore', 'academicCompanionScore', 'composite']),
    });
  }
}

const kwcController = new ScoreController();
export { kwcController };
