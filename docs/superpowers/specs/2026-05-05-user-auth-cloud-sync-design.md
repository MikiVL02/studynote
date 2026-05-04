# 用户认证 + 云端同步 + 评论系统设计文档

**日期：** 2026-05-05  
**作者：** MikiVL  
**状态：** 已批准

---

## 背景与目标

当前笔记应用（www.mikivl.online/app）的所有数据存储在浏览器 IndexedDB 中，清除浏览器数据或换设备即丢失。本次扩展目标：

1. 添加用户账号系统（用户名+密码注册/登录）
2. 登录用户的笔记双存——本地 IndexedDB 继续作为缓存，服务端 SQLite 持久化
3. 云存储功能需邀请码激活（预生成 10 个）
4. 主页（www.mikivl.online）新增评论区，登录用户可发评论

---

## 架构总览

```
前端（React）          服务端（Hono + Node.js）   数据库（SQLite + Drizzle）
────────────────       ──────────────────────     ───────────────────────────
IndexedDB（本地）  ←→  /api/auth/*                users
                       /api/notes/*        ←────  notes
                       /api/folders/*      ←────  folders
                       /api/comments/*     ←────  comments
                       /api/ai/*（已有）           invite_codes
```

---

## 数据库 Schema

### users
```sql
id          TEXT PRIMARY KEY  -- nanoid
username    TEXT UNIQUE NOT NULL
passwordHash TEXT NOT NULL    -- bcrypt hash
cloudEnabled INTEGER DEFAULT 0  -- 0=未激活，1=已激活（填写邀请码后）
createdAt   INTEGER NOT NULL
```

### notes
```sql
id          TEXT PRIMARY KEY
userId      TEXT NOT NULL REFERENCES users(id)
title       TEXT NOT NULL DEFAULT ''
content     TEXT NOT NULL DEFAULT ''
folderId    TEXT              -- null = 根目录
tags        TEXT NOT NULL DEFAULT '[]'  -- JSON 数组
starred     INTEGER DEFAULT 0
wordCount   INTEGER DEFAULT 0
deletedAt   INTEGER           -- null = 未删除，软删除时间戳
createdAt   INTEGER NOT NULL
updatedAt   INTEGER NOT NULL
```

### folders
```sql
id          TEXT PRIMARY KEY
userId      TEXT NOT NULL REFERENCES users(id)
name        TEXT NOT NULL
parentId    TEXT              -- null = 根目录
order       INTEGER DEFAULT 0
createdAt   INTEGER NOT NULL
```

### comments
```sql
id          TEXT PRIMARY KEY
userId      TEXT NOT NULL REFERENCES users(id)
content     TEXT NOT NULL
createdAt   INTEGER NOT NULL
```

### invite_codes
```sql
code        TEXT PRIMARY KEY
usedByUserId TEXT             -- null = 未使用
usedAt      INTEGER           -- null = 未使用
```

---

## 认证方案

- **JWT**，签发时有效期 30 天，存储在 `localStorage`（key: `mikivl_token`）
- 无 refresh token（30 天足够，过期重新登录）
- 密码使用 bcrypt hash（cost factor 10）
- 所有 `/api/notes/*`、`/api/folders/*` 接口需携带 `Authorization: Bearer <token>`

---

## 同步策略

**本地优先，登录后同步：**

1. **未登录**：完全使用 IndexedDB，功能不受影响
2. **登录时**：执行全量同步——拉取云端数据与本地合并，以 `updatedAt` 较新的为准
3. **本地写操作**（create/update/delete）：操作完成后立即异步推送到云端（fire-and-forget，失败静默）
4. **冲突处理**：同一条笔记本地和云端都有修改，取 `updatedAt` 较大的版本

**同步接口：**

- `GET /api/notes/sync` — 返回该用户全量笔记和文件夹
- `POST /api/notes/sync` — 批量 upsert 笔记和文件夹（幂等）

---

## API 接口定义

### 认证

```
POST /api/auth/register
Body: { username: string, password: string }
Response: { token: string, user: { id, username, cloudEnabled } }

POST /api/auth/login
Body: { username: string, password: string }
Response: { token: string, user: { id, username, cloudEnabled } }

POST /api/auth/activate
Header: Authorization: Bearer <token>
Body: { code: string }
Response: { success: true }
```

### 同步

```
GET /api/notes/sync
Header: Authorization: Bearer <token>
Response: { notes: Note[], folders: Folder[] }

POST /api/notes/sync
Header: Authorization: Bearer <token>
Body: { notes: Note[], folders: Folder[] }
Response: { synced: number }
```

### 笔记 CRUD（单条操作，供实时同步用）

```
PUT /api/notes/:id          -- upsert 单条笔记
DELETE /api/notes/:id       -- 软删除（设置 deletedAt）
PUT /api/folders/:id        -- upsert 单条文件夹
DELETE /api/folders/:id     -- 删除文件夹
```

### 评论

```
GET /api/comments           -- 获取所有评论（公开）
POST /api/comments          -- 发布评论（需登录）
Header: Authorization: Bearer <token>
Body: { content: string }
Response: { id, username, content, createdAt }
```

---

## 前端改动

### 新增文件
- `src/lib/auth.ts` — JWT 存取、login/register/activate API 封装
- `src/lib/sync.ts` — 全量同步、单条推送、冲突合并逻辑
- `src/components/auth/LoginModal.tsx` — 登录/注册弹窗（Tab 切换），含邀请码激活入口
- `src/components/auth/UserMenu.tsx` — 侧边栏底部用户区域（头像、用户名、云同步状态、登出）

### 修改文件
- `src/stores/appStore.ts` — 添加 `currentUser`、`syncStatus` state；写操作（createNote/updateNote/deleteNote/restoreNote/createFolder/updateFolder/deleteFolder）完成后触发 `sync.pushOne()`
- `src/components/sidebar/Sidebar.tsx` — 底部添加 `<UserMenu />`
- `homepage/index.html` — 底部新增评论区（读取 `/api/comments`，登录用户可发评论）

### appStore 新增 state
```typescript
currentUser: { id: string; username: string; cloudEnabled: boolean } | null
syncStatus: 'idle' | 'syncing' | 'error'
```

---

## 服务端文件结构

```
server/
├── index.ts          （已有，注册新路由）
├── db.ts             （Drizzle 初始化，schema 定义，DB 文件路径：/opt/mikivl/data/app.db）
├── middleware/
│   └── auth.ts       （JWT 验证，注入 c.set('userId', ...)）
└── routes/
    ├── auth.ts       （register/login/activate）
    ├── notes.ts      （sync GET/POST + 单条 CRUD）
    ├── folders.ts    （单条 CRUD）
    └── comments.ts   （list/create）
```

---

## 邀请码

预生成 10 个，数据库初始化时写入：

```
MIKI-A7X2-KP9Q
MIKI-B3N8-WR4L
MIKI-C6M1-ZT7Y
MIKI-D9F5-HJ2V
MIKI-E4K3-QN6U
MIKI-F8R7-XG1S
MIKI-G2W4-LB5E
MIKI-H5T9-MC8D
MIKI-J1P6-VF3O
MIKI-K7Q2-YH4N
```

---

## 部署变更

- 服务端新增依赖：`drizzle-orm`、`better-sqlite3`、`bcryptjs`、`jsonwebtoken`
- SQLite 数据库文件：`/opt/mikivl/data/app.db`（首次启动自动创建）
- 服务器需创建目录：`mkdir -p /opt/mikivl/data`
- PM2 重启 hono-server 后生效

---

## 分拆子项目顺序

由于子系统间有依赖关系，按以下顺序实现：

1. **服务端基础层**（db.ts + schema + auth 路由）
2. **前端认证**（LoginModal + UserMenu + auth.ts + appStore 扩展）
3. **云同步**（sync.ts + notes/folders 路由 + appStore 写操作触发同步）
4. **首页评论**（comments 路由 + homepage/index.html 评论区）
