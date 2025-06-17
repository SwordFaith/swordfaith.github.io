# LLM 算法工程师个人博客

基于 Astro 5.x 构建的个人技术博客，专注于 LLM 后训练、强化学习算法、框架、数据研发的分享和展示。

## 🚀 项目状态

### ✅ Phase 1-3 已完成

**Phase 1: 基础框架搭建**
- [x] Astro 5.x + TypeScript + Tailwind CSS 架构
- [x] 响应式布局和导航系统
- [x] GitHub Pages 自动部署配置
- [x] SEO 优化和站点地图

**Phase 2: 核心功能实现** 
- [x] 数学公式渲染（KaTeX）
- [x] 代码高亮（Shiki）+ 复制功能
- [x] Jupyter Notebook 展示功能
- [x] Pagefind 全文搜索

**Phase 3: 数据集成**
- [x] WandB API 集成和数据同步
- [x] GitHub 统计数据获取和展示
- [x] 个人展示页面完善
- [x] 环境配置和 API 客户端

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

- **前端框架**: Astro 5.x + TypeScript
- **样式系统**: Tailwind CSS + @tailwindcss/typography
- **内容管理**: Astro Content Collections (Markdown + MDX)
- **公式渲染**: KaTeX + remark-math + rehype-katex
- **代码高亮**: Shiki (支持多主题)
- **搜索引擎**: Pagefind (本地搜索)
- **数据集成**: WandB API + GitHub API + 缓存机制
- **部署平台**: GitHub Pages + GitHub Actions
- **开发工具**: ESLint + TypeScript 严格模式

## 🌟 核心特性

### 📝 内容创作
- **数学公式支持**: 完整的 LaTeX 语法支持，行内和块级公式
- **代码高亮**: 多语言语法高亮，支持复制功能
- **Jupyter Notebook**: 原生支持 .ipynb 文件展示
- **全文搜索**: 中文内容全文搜索，支持标签筛选

### 📊 数据驱动展示
- **WandB 集成**: 实验数据嵌入和统计展示
- **GitHub 统计**: 个人代码统计、语言分析、项目展示
- **智能缓存**: API 数据缓存机制，避免频繁请求

### 🚀 开发体验
- **组件化架构**: 20+ 个可复用组件
- **TypeScript 支持**: 完整的类型安全
- **热重载开发**: 快速的开发反馈
- **自动部署**: GitHub Actions 自动构建和部署

## 🔧 环境配置

### API 密钥设置

复制 `.env.example` 为 `.env` 并配置：

```bash
# WandB 配置
WANDB_ENTITY=your-wandb-entity
WANDB_API_KEY=your-wandb-api-key

# GitHub 配置  
GITHUB_USERNAME=your-github-username
GITHUB_TOKEN=your-github-personal-access-token
```

### 开发命令

```bash
# 开发服务器
npm run dev

# 构建 + 搜索索引
npm run build

# WandB 数据同步
npm run sync:wandb

# 类型检查
npm run typecheck
```

## 📚 更多信息

详细的项目需求和技术方案请参考 [CLAUDE.md](./CLAUDE.md)。