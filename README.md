# LLM 算法工程师个人博客

基于 Astro 构建的个人技术博客，专注于 LLM 后训练、强化学习算法、框架、数据研发的分享和展示。

## 🚀 项目状态

✅ **Phase 1 完成**：基础框架搭建
- [x] Astro 项目初始化和基础配置
- [x] Tailwind CSS 样式系统
- [x] 基础页面布局和导航
- [x] GitHub Pages 部署配置
- [x] 示例博客文章

## 📋 开发计划

### Phase 2: 核心功能实现
- [ ] 数学公式渲染集成测试
- [ ] 代码高亮优化
- [ ] Jupyter Notebook 展示功能
- [ ] 搜索功能实现

### Phase 3: 数据集成
- [ ] WandB API 集成和数据同步
- [ ] GitHub 统计数据获取
- [ ] 个人介绍页面完善

### Phase 4: 多平台工具
- [ ] 内容格式转换器开发
- [ ] 图床管理系统
- [ ] 自动化导出脚本

### Phase 5: 优化和扩展
- [ ] 性能优化和缓存策略
- [ ] SEO 优化完善
- [ ] 监控和分析工具

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

- **框架**: Astro 4.x + TypeScript
- **样式**: Tailwind CSS + @tailwindcss/typography
- **内容**: Markdown + MDX
- **公式**: KaTeX
- **部署**: GitHub Pages

## 📚 更多信息

详细的项目需求和技术方案请参考 [CLAUDE.md](./CLAUDE.md)。