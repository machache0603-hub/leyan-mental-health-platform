-- ============================================================
-- 乐颜 · PostgreSQL 表结构（与《数据库与领域模型规格.md》一一对应）
-- 苍穹「领域模型设计器」按规格建模后，平台在 PostgreSQL 自动生成等价结构。
-- 本文件用于「真实可跑后端」直连 PostgreSQL 时建表。全部幂等（IF NOT EXISTS）。
-- 学生一律以脱敏编号关联，不存真实姓名/学号（合规）。
-- ============================================================

-- 1. 用户账号（登录鉴权用；密码只存 scrypt 加盐摘要，不存明文）
create table if not exists ly_user (
  id          bigserial primary key,
  account     varchar(64) unique not null,
  pwd_hash    varchar(255) not null,
  role        varchar(16)  not null,           -- student / teacher / admin
  name        varchar(64),
  number      varchar(32),                      -- 脱敏编号 / 工号
  create_time timestamptz default now()
);

-- 2. 学生（脱敏）
create table if not exists ly_student (
  id            varchar(16) primary key,
  number        varchar(32),
  alias         varchar(64),
  college       varchar(64),
  class_name    varchar(64),
  grade         varchar(16),
  risk_level    varchar(8),                     -- high/mid/low/none
  recent_mood   varchar(8),
  trend         varchar(64),                    -- 近7次，逗号分隔
  alerts        int default 0,
  interventions int default 0,
  tags          varchar(255),
  last_active   varchar(32)
);

-- 3. 心情打卡
create table if not exists ly_mood_log (
  id          bigserial primary key,
  student     varchar(32) not null,
  log_date    date        not null,
  mood        varchar(8)  not null,             -- joy/love/calm/low/anxious/sad
  note        text,
  anonymous   boolean default false,
  create_time timestamptz default now()
);
create index if not exists idx_mood_student_date on ly_mood_log(student, log_date);

-- 4. 情绪花园故事
create table if not exists ly_garden_story (
  id          bigserial primary key,
  student     varchar(32) not null,
  story_date  varchar(8),
  mood        varchar(8),
  text        text,
  create_time timestamptz default now()
);

-- 5. 小确幸日记
create table if not exists ly_diary (
  id          bigserial primary key,
  student     varchar(32) not null,
  diary_date  varchar(8),
  content     text not null,
  emoji       varchar(8),
  create_time timestamptz default now()
);

-- 6. 树洞帖子 + 抱抱关系
create table if not exists ly_treehole (
  id          bigserial primary key,
  content     text not null,
  tag         varchar(32),
  hugs        int default 0,
  same_feel   int default 0,
  anonymous   boolean default true,
  time_ago    varchar(32) default '刚刚',
  create_time timestamptz default now()
);
create table if not exists ly_treehole_hug (
  id          bigserial primary key,
  post        bigint not null,
  app_user    varchar(64) not null,
  create_time timestamptz default now(),
  unique(post, app_user)                        -- 一人一抱、可取消
);

-- 7. 疗愈画作（画廊）
create table if not exists ly_artwork (
  id          bigserial primary key,
  student     varchar(32) not null,
  prompt      text,
  palette     varchar(32),
  colors      varchar(255),                     -- 色板 hex，逗号分隔
  bright      int,
  warm        int,
  interpret   text,
  create_time timestamptz default now()
);

-- 8. 谈心记录（教师）
create table if not exists ly_talk_record (
  id          bigserial primary key,
  teacher     varchar(64),
  student     varchar(64) not null,
  talk_date   varchar(16),
  topic       varchar(128),
  summary     text,
  follow_up   text,
  done        boolean default false,
  create_time timestamptz default now()
);

-- 9. 预警事件
create table if not exists ly_alert (
  id           varchar(32) primary key,        -- AL-2061
  student      varchar(64) not null,
  class_name   varchar(64),
  level        varchar(8),                      -- high/mid/low/none
  reason       text,
  status       varchar(16) default 'new',       -- new/processing/resolved
  owner        varchar(64) default '—',
  trigger_time varchar(32),
  close_time   varchar(32),
  create_time  timestamptz default now()
);

-- 10. 班级
create table if not exists ly_class (
  id       varchar(16) primary key,
  name     varchar(64),
  temp     int,
  trend    int,
  students int,
  alerts   int
);

-- 11. 心理资源
create table if not exists ly_resource (
  id          bigserial primary key,
  title       varchar(128) not null,
  type        varchar(16),                      -- 音频/图文/活动/课程
  usage       int default 0,
  status      varchar(16) default '已上架',      -- 已上架/草稿
  emoji       varchar(8),
  create_time timestamptz default now()
);

-- 12. 系统配置（单例，按组织可扩展）。嵌套结构用 jsonb 存。
create table if not exists ly_config (
  id   int primary key default 1,
  data jsonb not null
);

-- 13. 悄悄话会话（学生本人私有；crisis 标记危机会话，供加急关注）
create table if not exists ly_chat_session (
  id          varchar(32) primary key,
  student     varchar(32) not null,
  preview     varchar(64),
  last_mood   varchar(8),
  crisis      boolean default false,
  start_time  timestamptz default now()
);
-- 14. 悄悄话消息
create table if not exists ly_chat_msg (
  id          bigserial primary key,
  session     varchar(32) not null,
  who         varchar(8)  not null,             -- me / warm
  content     text,
  mood        varchar(8),
  create_time timestamptz default now()
);
create index if not exists idx_chatmsg_session on ly_chat_msg(session);
