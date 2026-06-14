/* 共享 UI 组件交互 + 无障碍 + useAsync 健壮性测试 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, renderHook, waitFor } from '@testing-library/react';
import { MoodPicker, Modal, useAsync } from '../ui';

describe('MoodPicker 心情选择器', () => {
  it('点击心情触发 onChange，并带正确的 MoodKey', () => {
    const onChange = vi.fn();
    render(<MoodPicker value={null} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('心情：开心'));
    expect(onChange).toHaveBeenCalledWith('joy');
  });

  it('选中项标记 aria-pressed=true（无障碍）', () => {
    const { getByLabelText } = render(<MoodPicker value="calm" onChange={() => {}} />);
    expect(getByLabelText('心情：平静')).toHaveAttribute('aria-pressed', 'true');
    expect(getByLabelText('心情：开心')).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('Modal 弹窗', () => {
  it('open 时渲染内容与 dialog 语义', () => {
    render(<Modal open onClose={() => {}} title="测试弹窗"><p>弹窗内容</p></Modal>);
    expect(screen.getByText('弹窗内容')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('按 Esc 触发 onClose', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="x"><p>c</p></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('点击关闭按钮触发 onClose', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="x"><p>c</p></Modal>);
    fireEvent.click(screen.getByLabelText('关闭'));
    expect(onClose).toHaveBeenCalled();
  });

  it('open=false 时不渲染', () => {
    render(<Modal open={false} onClose={() => {}}><p>隐藏内容</p></Modal>);
    expect(screen.queryByText('隐藏内容')).toBeNull();
  });
});

describe('useAsync 健壮性（回归：失败不再卡在加载态）', () => {
  it('成功：loading 落定为 false 且拿到 data', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.resolve(42)));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(42);
    expect(result.current.error).toBeNull();
  });

  it('失败：捕获 error 且 loading 落定为 false（此前会无限转圈）', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.reject(new Error('boom'))));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();
  });
});
