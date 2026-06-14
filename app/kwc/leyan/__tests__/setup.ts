// vitest 全局测试初始化
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// 每个测试后清理渲染的 DOM，避免组件残留导致 getBy* 命中多个元素
afterEach(() => cleanup());
