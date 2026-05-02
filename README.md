# StudyNote

基于 Vite + React + TypeScript 构建的现代化 AI 笔记应用，提供富文本编辑、灵活的文件夹组织，以及由 Claude API 驱动的 AI 写作辅助能力。

## 技术栈

| 层次 | 选型 |
|------|------|
| 构建工具 | Vite 5 |
| 前端框架 | React 19 + TypeScript |
| 编辑器 | TipTap v3 |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand v5 |
| 本地存储 | IndexedDB（Dexie.js） |
| AI 接入 | Anthropic SDK（claude-sonnet-4-6） |
| 后端代理 | Hono（Node.js，端口 3001） |
| 动画 | Framer Motion |
| 拖拽 | @dnd-kit |

## 快速开始

```bash
# 1. 克隆仓库
git clone https://git.muchen.fan/MikiVL/studynote.git
cd studynote

# 2. 安装依赖
npm install

# 3. 配置 API Key
cp .env.example .env
# 编辑 .env，填入你的 ANTHROPIC_API_KEY 和 ANTHROPIC_BASE_URL

# 4. 启动开发服务器（同时启动前端 + AI 代理）
npm run dev
```

浏览器访问 `http://localhost:5173`

## 功能一览

### 富文本编辑
- 标题（H1–H4）、段落、引用块、代码块（含语法高亮）
- 粗体、斜体、下划线、删除线、行内代码、高亮
- 有序/无序列表、任务列表（Checkbox）
- 表格、图片插入
- `/` 斜杠命令菜单快速插入内容块
- 浮动工具栏（选中文字后出现）
- 自动保存（防抖 1s）

### 笔记组织
- 多级文件夹嵌套
- 笔记标签（多标签、按标签过滤）
- 收藏标记
- 全文搜索（标题 + 正文 + 标签）
- 排序：按修改时间、创建时间、标题
- 拖拽移动笔记到文件夹
- 笔记/文件夹重命名、删除

### AI 功能
- **AI 续写**：点击 ⚡ 按钮，基于当前内容流式续写
- **AI 润色**：选中文字 → 浮动工具栏 → 润色，预览后替换
- **AI 摘要**：选中段落或全文生成摘要
- **翻译成英文**：选中文字 → 浮动工具栏 → 翻译
- **AI 问答**：可拖拽/缩放浮窗，针对当前笔记自由提问
- **模型管理**：支持添加多个 OpenAI 兼容模型，一键切换

### 界面体验
- 亮色 / 暗色主题切换
- 专注模式（隐藏侧边栏，全屏写作）
- 弹窗缩放动画（Framer Motion）

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + N` | 新建笔记 |
| `Cmd/Ctrl + \` | 切换专注模式 |
| `Cmd/Ctrl + Shift + J` | 打开 AI 助手 |
| `Cmd/Ctrl + B` | 粗体 |
| `Cmd/Ctrl + I` | 斜体 |
| `Cmd/Ctrl + Z` | 撤销 |
| `Cmd/Ctrl + Shift + Z` | 重做 |
| `/` | 命令菜单 |
| `Esc` | 退出专注模式 |

## 项目结构

```
studynote/
├── src/
│   ├── components/
│   │   ├── editor/        # TipTap 编辑器、浮动工具栏、欢迎页
│   │   ├── sidebar/       # 左侧导航栏
│   │   └── ai/            # AI 面板、模型管理弹窗
│   ├── stores/            # Zustand store
│   ├── db/                # Dexie.js IndexedDB 封装
│   ├── lib/               # 工具函数、AI 流式请求
│   └── test/              # Vitest 单元测试
├── server/                # Hono AI 代理服务
├── .env.example           # 环境变量模板
└── vite.config.ts
```

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_BASE_URL=https://api.anthropic.com
```

> `.env` 和运行时生成的 `models.json` 已加入 `.gitignore`，不会被提交。

## 构建

```bash
npm run build      # 生产构建，输出到 dist/
npm run preview    # 本地预览生产构建
```
