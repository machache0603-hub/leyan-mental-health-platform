<div align="center">

# 乐颜 · AI 原生智慧校园心理健康关爱平台

**第十五届中国软件杯 · A6 赛题作品**

一盏永远亮着的小夜灯 —— 不是冰冷的工具，是温暖的陪伴。

基于 **金蝶 AI 苍穹（Cosmic）低代码平台 + KWC 前端框架** 构建，覆盖「学生自助 · 教师关怀 · 管理决策」三端闭环。

</div>

---

## ✨ 项目亮点

- **三端 24 功能**：学生端 10 + 教师端 8 + 管理端 6，路径路由 + 独立登录（`/`、`/teacher`、`/admin`）。
- **苍穹双轨架构**：前端同一套 `api.ts`，本地连真实 Node 后端、上线连金蝶苍穹控制器，**复用苍穹 KAPI 形态** `/ierp/kapi/app/<控制器>/<方法>`，零改动互换。
- **真实可跑后端**：Node + **PostgreSQL**，12 张领域表、9 个控制器（与苍穹 Kingscript 镜像实现）。
- **核心业务闭环**：学生连续情绪低落 → 后端自动生成预警 → 管理端预警中心处置闭环。
- **真实大模型**：经零依赖代理后端调用 DeepSeek / 豆包 / 通义（OpenAI 兼容），失败自动回退规则模拟，**API Key 永不进前端**。
- **一键全栈启动**：`npm run dev:all` 自动起 PostgreSQL → 迁移 → 后端 → AI 代理 → 前端；无 PG/Docker 也能优雅降级，演示不白屏。
- **全脱敏合规**：所有数据为模拟，学生以编号关联，无真实姓名/学号。

## 🏗️ 数据后端三态（同一套前端代码）

```
              前端 api.ts
   VITE_DATA_BACKEND ┌── local  → 浏览器 localStorage（零后端，刷新不丢）
                     ├── server → 本地真实 Node + PostgreSQL（端口 8788）
                     └── cosmic → 金蝶苍穹控制器（生产，数据落 PostgreSQL）
   server 与 cosmic 复用同一 KAPI 形态，前端零改动；留空时自动选择。
```

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 一键全栈（自动判断 PostgreSQL / Docker；无则降级 localStorage 演示）
npm run dev:all
```

打开 **http://localhost:3000** —— 学生 `/` · 教师 `/teacher` · 管理 `/admin`。
演示账号见登录页「一键填入」，密码统一 `leyan123`。

> **没有 PostgreSQL / Docker？** 用内存版 PG 跑通真实后端：
> ```bash
> set PG_MEM=1 && npm run backend          # 终端1（macOS/Linux: PG_MEM=1 npm run backend）
> set VITE_DATA_BACKEND=server && npm run dev   # 终端2
> ```

## 🧱 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Vite，KWC（Kingdee Web Component）|
| 后端 | Node（零依赖 HTTP）+ PostgreSQL（`pg`）；生产为苍穹 Kingscript 控制器 |
| AI | 代理后端转发 DeepSeek / 豆包 / 通义（OpenAI 兼容），覆盖 10 个 AI 功能 |
| 平台 | 金蝶 AI 苍穹（低代码 + 领域模型 + Agent 工作流）|

## 📂 目录结构

```
app/kwc/leyan/     前端 SPA（theme/data/api/store/ui/charts/features 三端）
app/ks/controller/ 苍穹 Kingscript 控制器（9 个，真实 ORM 写法 + .kws 元数据）
server/            真实可跑后端（schema.sql / seed / migrate / index）
proxy/             AI 代理后端（藏 key，转发大模型）
scripts/dev-all.mjs 一键全栈编排
docs/              苍穹映射 / 建表规格 / 运行手册 / 接入大模型 等
```

## 🧠 AI 能力（10 项）

情绪识别 · 悄悄话对话 · 画作解读 · 心情预测洞察 · 谈心话题 · 期末评语 · 家校话术 · 班级建议 · 全校行动建议 · 数据报告。

## 🔒 安全与合规

- 全部为**模拟数据**，不含任何真实学生个人信息。
- 密码存 **scrypt 加盐哈希**（抗 GPU 爆破）；登录按「账号+IP」限速（10 分钟 5 次）；会话 token 8 小时滑动过期，登出即服务端作废。
- **全接口强制鉴权 + 按控制器角色隔离**（学生/教师/管理员互不可越权），SQL 全参数化，输入做枚举/长度校验，错误信息对客户端脱敏。
- 后端 / AI 代理 / 前端 dev server 默认**只监听本机回环**，CORS 白名单默认仅放行本机前端（局域网演示用 `HOST=0.0.0.0`+`CORS_ORIGIN` 显式打开）。
- 数据库连接、AI Key 只在服务端（`server/.env` / `proxy/.env`，均 gitignore），浏览器与仓库永不持有。

## 📚 文档

- [本地真实后端运行手册](docs/本地真实后端运行手册.md)
- [接入真实大模型](docs/接入真实大模型.md)
- [数据库与领域模型规格](docs/数据库与领域模型规格.md)
- [苍穹平台映射设计](docs/苍穹平台映射设计.md) · [苍穹接入部署手册](docs/苍穹接入部署手册.md)

## 📜 声明

本项目为软件竞赛参赛作品，仅用于教学演示，全部数据均为模拟，不构成任何心理健康专业建议。

> 模板说明（KWC 脚手架）见 [`README_zh.md`](README_zh.md)。
