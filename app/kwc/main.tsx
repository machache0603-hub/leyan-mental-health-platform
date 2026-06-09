import React from 'react';
import ReactDOM from 'react-dom/client';
import { setBasePath } from '@kdcloudjs/shoelace/dist/utilities/base-path.js';
import App from './leyan/App';

setBasePath(import.meta.env.SHOELACE_BASE_URL);

// 乐颜 · AI原生智慧校园心理健康关爱平台
// dev server 入口：挂载完整 SPA（学生端/教师端/管理端 共 24 功能）
const el = document.createElement('div');
document.body.appendChild(el);
ReactDOM.createRoot(el).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
