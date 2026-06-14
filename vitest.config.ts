import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        include: ['app/kwc/**/__tests__/**/*.test.tsx'],
        setupFiles: ['./app/kwc/leyan/__tests__/setup.ts'],
        // 测试固定走规则 mock：确定性、不发网络请求（避免被 .env.local 的 llm 模式带跑）
        env: { VITE_AI_BACKEND: 'mock', VITE_DATA_BACKEND: 'local' },
        globals: true
    }
});
