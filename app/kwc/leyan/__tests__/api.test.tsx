/* ChatApi 聊天记录持久化（local 模式）测试 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ChatApi } from '../api';

const turn = (sessionId: string | null, mine: string, warm: string, mood: any, crisis = false) =>
  ChatApi.saveTurn({ sessionId, user: { who: 'me', text: mine }, warm: { who: 'warm', text: warm, mood }, crisis });

describe('ChatApi 聊天记录持久化（local）', () => {
  beforeEach(() => localStorage.clear());

  it('saveTurn 建会话，listSessions / getMessages 能读回', async () => {
    const r1 = await turn(null, '我有点累', '我在，慢慢说', 'low');
    expect(r1.sessionId).toBeTruthy();
    const r2 = await turn(r1.sessionId, '谢谢你', '随时都在', 'calm');
    expect(r2.sessionId).toBe(r1.sessionId);           // 同一会话续写

    const sessions = await ChatApi.listSessions();
    expect(sessions.length).toBe(1);
    expect(sessions[0].preview).toContain('我有点累');

    const msgs = await ChatApi.getMessages(r1.sessionId);
    expect(msgs.length).toBe(4);                        // 2 轮 × 2 条
    expect(msgs[0].text).toBe('我有点累');
    expect(msgs[3].text).toBe('随时都在');
  });

  it('危机会话被标记 crisis=true（供加急关注）', async () => {
    const r = await turn(null, '我想死了', '我在，你不是一个人', 'sad', true);
    const sessions = await ChatApi.listSessions();
    expect(sessions.find(s => s.id === r.sessionId)?.crisis).toBe(true);
  });

  it('新会话置顶（最近的在最前）', async () => {
    const a = await turn(null, '第一段对话', '嗯', 'calm');
    const b = await turn(null, '第二段对话', '嗯', 'calm');
    const sessions = await ChatApi.listSessions();
    expect(sessions[0].id).toBe(b.sessionId);
    expect(sessions[1].id).toBe(a.sessionId);
  });
});
