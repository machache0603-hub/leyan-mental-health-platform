/* AI 能力（mock 模式）核心逻辑测试：情绪识别 + 危机检测 + 悄悄话回复契约。
   测试环境未设 VITE_AI_BACKEND=llm，dispatch 走规则 mock，结果确定可断言。 */
import { describe, it, expect, vi } from 'vitest';

// 把 llm 模块置空：dispatch 的真实模型分支会因函数 undefined 抛错而回退到规则 mock，
// 从而让本套测试确定性地验证 mock 逻辑、不发任何网络请求（不受 .env.local 影响）。
vi.mock('../llm', () => ({}));

import { detectEmotion, smallTalk, predictMoodByGrade } from '../ai';

describe('detectEmotion 情绪识别', () => {
  it('识别危机信号（自伤/轻生）→ crisis=true 且 mood=sad', async () => {
    const r = await detectEmotion('我不想活了');
    expect(r.crisis).toBe(true);
    expect(r.mood).toBe('sad');
  });

  it('回归：直接表达「我想死了」必须识别为危机（修复前会漏判）', async () => {
    for (const txt of ['我想死了', '我想自杀', '活着没意思', '撑不下去了']) {
      const r = await detectEmotion(txt);
      expect(r.crisis, `「${txt}」应触发危机`).toBe(true);
    }
  });

  it('多个负面词 → anxious，且不误判为危机', async () => {
    const r = await detectEmotion('压力好大，好焦虑，晚上失眠');
    expect(r.mood).toBe('anxious');
    expect(r.crisis).toBe(false);
  });

  it('正向文本 → joy', async () => {
    const r = await detectEmotion('今天太好了，好开心');
    expect(r.mood).toBe('joy');
    expect(r.crisis).toBe(false);
  });

  it('返回置信度与关键词', async () => {
    const r = await detectEmotion('有点累');
    expect(r.confidence).toBeGreaterThan(0);
    expect(Array.isArray(r.keywords)).toBe(true);
  });
});

describe('smallTalk 悄悄话回复契约', () => {
  it('危机文本 → crisis=true、建议放松、回复含求助热线', async () => {
    const r = await smallTalk('我想死了');
    expect(r.crisis).toBe(true);
    expect(r.suggestRelax).toBe(true);
    expect(r.quickReplies.length).toBeGreaterThan(0);
    expect(r.text).toContain('12356');   // 必须给出求助方向，不能轻描淡写
  });

  it('普通文本 → 返回完整回复结构', async () => {
    const r = await smallTalk('今天过得还不错');
    expect(typeof r.text).toBe('string');
    expect(r.text.length).toBeGreaterThan(0);
    expect(['joy', 'love', 'calm', 'low', 'anxious', 'sad']).toContain(r.mood);
    expect(Array.isArray(r.quickReplies)).toBe(true);
  });
});

describe('predictMoodByGrade 成绩→心情预测（成绩关怀 Agent）', () => {
  it('成绩大幅下滑 + 近期情绪偏低 → 高学业风险、心情走低、给出关怀建议', async () => {
    const r = await predictMoodByGrade({ course: '机器学习', scoreDelta: -21, current: 68, recentMoods: ['anxious', 'sad', 'sad'] });
    expect(r.trend).toBe('down');
    expect(r.risk).toBe('high');
    expect(r.insight.length).toBeGreaterThan(0);
    expect(r.suggestions.length).toBeGreaterThan(0);
    expect(['joy', 'love', 'calm', 'low', 'anxious', 'sad']).toContain(r.predictedMood);
  });

  it('成绩稳中有升 → 走势向好、低风险', async () => {
    const r = await predictMoodByGrade({ course: '软件工程', scoreDelta: 6, current: 94, recentMoods: ['joy', 'calm', 'joy'] });
    expect(r.trend).toBe('up');
    expect(['low', 'none']).toContain(r.risk);
  });
});
