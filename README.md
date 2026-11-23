# LLM 算法工程师个人博客

基于 Astro 7.x 构建的个人技术博客，专注于 LLM 后训练、强化学习算法、框架、数据研发的分享和展示。

## 🚀 项目状态

### ✅ Phase 1-3 已完成

**Phase 1: 基础框架搭建**
- [x] Astro 7.x + TypeScript + Tailwind CSS 架构
- [x] 响应式布局和导航系统
- [x] GitHub Pages 自动部署配置
- [x] SEO 优化和站点地图

**Phase 2: 核心功能实现** 
- [x] 数学公式渲染（KaTeX）
- [x] 代码高亮（Shiki，亮/暗双主题）
- [x] Jupyter Notebook 展示功能（代码单元支持复制）
- [x] Pagefind 全文搜索

**Phase 3: 数据集成**
- [x] WandB 实验结果嵌入（文章 frontmatter `wandb` 字段 → iframe）
- [x] GitHub 统计：部署构建时尽力刷新（不提交），失败时回退到仓库内的 JSON 快照；每周定时重新构建
- [x] 个人展示页面完善

## 📋 下一步开发

### 🎯 Phase 4: 多平台内容分发工具
- [ ] 知乎导出器（HTML + 公式转图片）
- [ ] 微信公众号导出器（富文本 + CSS 内联）
- [ ] Medium 导出器（Markdown + API 集成）
- [ ] 小红书多图生成器（1080x1350 卡片）
- [ ] 图床管理系统（七牛云/阿里云 OSS）
- [ ] 一键发布自动化脚本

### 🔧 优化项目
- [ ] API 密钥配置和功能测试
- [ ] 构建时 API 调用优化
- [ ] 组件代码重构和样式统一
- [ ] 性能优化和缓存策略

## 🛠️ 本地开发

Node.js 版本以 `.nvmrc` 为准（Node 24，可用 `nvm use`），CI 同样读取该文件；`package.json` 的 `engines` 最低要求 22.23.4。

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建项目
npm run build

# 预览构建结果
npm run preview
```

- 草稿（frontmatter `draft: true`，包括公式渲染、代码高亮两篇测试文章）不进入生产构建，也不出现在列表、标签、RSS 中；`npm run dev` 下可通过 `/blog/<slug>` 直接访问。
- 向 `main` 提交的 Pull Request 会在 GitHub Actions 中运行 lint、typecheck、测试和构建，但不部署。

## 📝 添加新文章

在 `src/content/blog/` 目录下创建新的 Markdown 文件：

```markdown
---
title: "文章标题"
description: "文章描述"
publishDate: 2024-01-01
tags: ["标签1", "标签2"]
author: "作者名"
katex: true  # 启用数学公式
---

# 文章内容
```

## 🔧 技术栈

- **前端框架**: Astro 7.x + TypeScript
- **样式系统**: Tailwind CSS + @tailwindcss/typography
- **内容管理**: Astro Content Collections (Markdown + MDX)
- **公式渲染**: KaTeX + remark-math + rehype-katex
- **代码高亮**: Shiki (支持多主题)
- **搜索引擎**: Pagefind (本地搜索)
- **数据集成**: WandB iframe 嵌入 + GitHub 统计（部署时刷新的静态 JSON，仓库内快照兜底）
- **部署平台**: GitHub Pages + GitHub Actions
- **字体**: Inter Variable + JetBrains Mono Variable，通过 @fontsource-variable 自托管（不依赖 Google Fonts）
- **开发工具**: ESLint + TypeScript（`astro check`）+ Vitest

## 🌟 核心特性

### 📝 内容创作
- **数学公式支持**: 完整的 LaTeX 语法支持，行内和块级公式
- **代码高亮**: 多语言语法高亮（Notebook 代码单元支持复制）
- **Jupyter Notebook**: 原生支持 .ipynb 文件展示
- **全文搜索**: Pagefind 索引已发布的博客文章和 Notebook 详情页；文章另可通过标签页按标签浏览（标签 URL 是由标签文本生成的 slug，规则见 `src/utils/tags.ts` 的 `getTagSlug()`：去掉 `/ \ ? # %` 和控制字符，去掉首尾的点和空白，内部连续空白变为 `-`，其余字符（包括大小写和中文）保持不变，如 `RLHF` → `/tags/RLHF`、`reward model` → `/tags/reward-model`、`C#` → `/tags/C`；slug 为空、以 `.html` 结尾、超过 200 字节，或两个标签的 slug 不区分大小写相同时，构建直接报错）

### 📊 数据驱动展示
- **WandB 集成**: 在文章 frontmatter 中配置 `wandb.projectId` / `wandb.runId`，文末嵌入对应运行页面
- **GitHub 统计**: 个人代码统计、语言分析、项目展示
- **静态数据**: GitHub 统计在构建时从 `src/data/github-stats.json` 静态渲染，浏览时不调用 GitHub API。该文件的来源：
  - 部署（push 到 `main`、手动运行、每周定时）在构建前尽力运行 `npm run sync:github:daily` 刷新数据，只用于本次构建、不提交；需要仓库 Secret `_GITHUB_TOKEN`，缺失、失败、超时或数据无效时回退到仓库内的快照并输出 warning
  - `scheduled-deploy.yml` 每周一 03:23 UTC 重新构建并部署一次，让关于页拿到新数据
  - 仓库内提交的快照是兜底（PR 检查也用它构建），通过手动运行 "Sync GitHub Stats Data" workflow 或本地 `npm run sync:github:daily` 更新

### 🚀 开发体验
- **组件化架构**: 28 个 `.astro` 组件
- **TypeScript 支持**: 完整的类型安全
- **热重载开发**: 快速的开发反馈
- **自动部署**: GitHub Actions 自动构建和部署；PR 只做检查
- **404 页面**: 自定义 404 页（`src/pages/404.astro`）

## 🔧 环境配置

### 环境变量

构建本身不需要任何环境变量：站点标题、描述和 URL 写在 `src/config/site.ts`（`SITE` 对象），不再使用 `SITE_URL` / `SITE_TITLE` / `SITE_DESCRIPTION` 环境变量或仓库 Variables。

可用变量见 `.env.example`。只有 GitHub 统计同步脚本需要以下变量（不会自动读取 `.env`，需在 shell 中导出；CI 中由 `deploy.yml` 和 `sync-data.yml` 从仓库 Secret `_GITHUB_TOKEN`、Variable `_GITHUB_USERNAME` 注入）：

```bash
GITHUB_USERNAME=your-github-username   # 可选，默认 SwordFaith
GITHUB_TOKEN=your-github-personal-access-token
```

### 开发命令

```bash
# 开发服务器
npm run dev

# 构建 + 搜索索引
npm run build

# 代码检查 / 类型检查 / 测试（Vitest）
npm run lint
npm run typecheck
npm test

# 同步 GitHub 统计并改写 src/data/github-stats.json（提交后即更新兜底快照；直接用 Node 运行 TypeScript）
GITHUB_TOKEN=... npm run sync:github:daily
```

## 📚 更多信息

详细的项目需求和技术方案请参考 [CLAUDE.md](./CLAUDE.md)。
