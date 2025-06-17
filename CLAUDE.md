# LLM 算法工程师个人博客项目

## 项目概述
基于 Astro 构建的个人技术博客，专注于 LLM 后训练、强化学习算法、框架、数据研发的分享和展示。

## 核心需求

### 1. 技术博客功能
- 算法解析、实验记录、论文笔记
- 公式渲染支持（LaTeX）
- 代码高亮和展示
- Jupyter Notebook 直接发布
- WandB 实验结果嵌入

### 2. 个人展示页面
- 个人简介和研究方向
- 发表工作展示（论文、专利、开源项目）
- 行业观察和技术趋势分析
- 技能矩阵和职业时间轴

### 3. 多平台内容分发
- 知乎：HTML 导入，公式转图片
- 微信公众号：Markdown → 富文本，CSS 内联
- Medium：Markdown 直接导入
- 掘金/CSDN：Markdown 原生支持
- 小红书：文章 → 多图卡片（1080x1350）

## 技术方案

### 1. 核心架构
- **框架**：Astro 4.x + TypeScript
- **样式**：Tailwind CSS + 自定义组件库
- **部署**：GitHub Pages（主）+ Vercel（预留）
- **CI/CD**：GitHub Actions 自动部署

### 2. 内容处理
- **公式渲染**：remark-math + rehype-katex + KaTeX（已实现）
- **代码高亮**：Shiki + 自定义组件（支持复制功能，已实现）
- **Notebook 解析**：自定义 TypeScript 解析器 + 显示组件（已实现）
- **图表可视化**：Observable Plot + Plotly.js（待实现）

### 3. 数据集成
- **WandB**：API 定时同步 + 静态缓存 + iframe 嵌入
- **GitHub**：GraphQL API 获取项目统计和贡献数据
- **学术数据**：Google Scholar API（论文信息同步）

### 4. 多平台转载工具
- **格式转换器**：Markdown → 各平台特定格式
- **图片处理**：统一图床管理（七牛云/阿里云OSS）
- **公式转换**：LaTeX → 图片（知乎/微信）/ MathML（Medium）
- **多图生成**：文章自动切分为小红书卡片图片
- **自动化脚本**：一键导出各平台内容

### 5. 性能优化
- **静态生成**：Astro 岛屿架构，按需加载（已实现）
- **图片优化**：WebP 转换 + 懒加载（待实现）
- **公式缓存**：服务端预渲染 + CDN 缓存（已实现）
- **搜索功能**：Pagefind 本地搜索引擎（组件已准备，待启用）
- **SEO 优化**：Open Graph、Twitter Card、结构化数据（基础已实现）

## 项目结构
```
src/
├── pages/
│   ├── index.astro              # 首页
│   ├── about.astro              # 关于我页面
│   ├── blog/
│   │   └── [...slug].astro      # 博客文章页面
│   └── notebooks/
│       └── [...slug].astro      # Notebook 展示页面
├── components/
│   ├── layout/
│   │   └── BaseLayout.astro     # 基础布局（已实现）
│   ├── blog/
│   │   └── CodeBlock.astro      # 代码高亮组件（已实现）
│   ├── notebook/
│   │   ├── NotebookViewer.astro # 完整Notebook查看器（已实现）
│   │   └── SimpleNotebookViewer.astro # 简化Notebook显示（已实现）
│   ├── search/
│   │   └── SearchBox.astro      # 搜索组件（已实现）
│   ├── wandb/
│   │   ├── WandBEmbed.astro     # WandB 嵌入组件（已实现）
│   │   └── WandBStats.astro     # WandB 统计组件（已实现）
│   └── about/
│       ├── GitHubStats.astro    # GitHub 统计（已实现）
│       ├── Timeline.astro       # 时间轴组件（待实现）
│       ├── PublicationCard.astro # 论文卡片（待实现）
│       └── SkillRadar.astro     # 技能雷达图（待实现）
├── content/
│   ├── blog/                    # 博客文章 Markdown
│   ├── notebooks/               # Jupyter Notebook 文件
│   └── config.ts                # 内容集合配置
├── scripts/
│   ├── sync-wandb.ts            # WandB 数据同步（已实现）
│   ├── build-search-index.ts    # 搜索索引构建（已实现）
│   ├── export-zhihu.ts          # 知乎格式导出（待实现）
│   ├── export-wechat.ts         # 微信公众号导出（待实现）
│   ├── export-medium.ts         # Medium 导出（待实现）
│   └── export-xiaohongshu.ts    # 小红书多图导出（待实现）
├── utils/
│   ├── notebook-parser.ts       # Notebook 解析器（已实现）
│   ├── wandb-client.ts          # WandB API 客户端（已实现）
│   ├── github-client.ts         # GitHub API 客户端（已实现）
│   ├── image-uploader.ts        # 图床上传工具（待实现）
│   ├── format-converter.ts      # 格式转换器（待实现）
│   └── math-renderer.ts         # 数学公式渲染（待实现）
└── config/
    ├── astro.config.mjs         # Astro 配置
    ├── tailwind.config.js       # Tailwind 配置
    └── deploy.yml               # GitHub Actions 配置
├── .env.example                 # 环境变量配置模板（已实现）
└── package.json                 # 项目依赖和脚本配置
```

## 开发计划

### ✅ Phase 1: 基础框架搭建（已完成）
1. ✅ Astro 项目初始化和基础配置
2. ✅ Tailwind CSS 样式系统搭建
3. ✅ 基础页面布局和导航
4. ✅ GitHub Pages 部署配置

### ✅ Phase 2: 核心功能实现（已完成）
1. ✅ Markdown 博客系统
2. ✅ 数学公式渲染集成
3. ✅ 代码高亮和语法支持
4. ✅ Jupyter Notebook 展示功能

### ✅ Phase 3: 数据集成（已完成）
1. ✅ WandB API 集成和数据同步
2. ✅ GitHub 统计数据获取
3. ✅ 个人介绍页面完善
4. ✅ 搜索功能实现

### Phase 4: 多平台内容分发工具
1. **知乎导出器**：HTML 格式 + LaTeX 公式转图片 + 代码块格式化
2. **微信公众号导出器**：Markdown → 富文本 + CSS 内联样式 + 图片处理
3. **Medium 导出器**：保持 Markdown 格式 + 图片上传 + Meta 信息处理
4. **小红书多图生成器**：文章切分 → 1080x1350 卡片图片 + 统一设计模板
5. **掘金/CSDN 导出器**：Markdown 原生支持 + 标签映射 + 封面图生成
6. **图床管理系统**：七牛云/阿里云 OSS 集成 + CDN 加速 + 批量上传
7. **一键发布脚本**：自动化内容分发 + 平台 API 集成 + 发布状态追踪

### Phase 5: 高级功能和优化
1. **性能优化**：图片懒加载 + WebP 转换 + Bundle 分析 + 缓存策略
2. **数据可视化增强**：Observable Plot + Plotly.js + 自定义图表组件
3. **学术数据集成**：Google Scholar API + 论文信息同步 + 引用统计
4. **Vercel 部署支持**：多平台部署选项 + 环境变量管理 + 自动部署
5. **监控和分析**：访问统计 + 性能监控 + 用户行为分析
6. **SEO 优化完善**：结构化数据 + 站点地图优化 + 页面性能提升
7. **内容管理增强**：标签系统 + 分类管理 + 内容搜索优化
8. **交互功能**：评论系统 + 订阅功能 + 社交分享

## 当前实现状态

### ✅ 已完成功能
- **基础架构**：Astro 4.x + TypeScript + Tailwind CSS
- **内容系统**：Markdown 博客 + Jupyter Notebook 支持
- **数学公式**：KaTeX 完整集成，支持行内和块级公式
- **代码高亮**：Shiki 语法高亮 + 自定义复制功能
- **页面结构**：首页、博客列表/详情、Notebook 列表/详情、关于页面
- **响应式设计**：移动端适配和交互优化
- **SEO 基础**：Meta 标签、Open Graph、站点地图
- **部署配置**：GitHub Actions + GitHub Pages
- **WandB 集成**：API 客户端、数据同步脚本、可视化组件
- **GitHub 统计**：个人数据获取、项目统计、语言分析
- **搜索功能**：Pagefind 集成、备用搜索机制

### 📝 示例内容
- **博客文章**：
  - RLHF 算法详解（含复杂数学公式）
  - DPO vs RLHF 对比分析
  - 数学公式渲染测试（完整 LaTeX 支持验证）
  - 代码高亮测试（多语言支持验证）
- **Jupyter Notebook**：
  - RLHF 实验分析示例（完整交互式展示）

### 🎯 Phase 3 新增功能详细实现

#### WandB 集成系统
- **WandBClient** (`src/utils/wandb-client.ts`): 完整的 TypeScript API 客户端
  - 支持项目列表、实验运行、指标历史数据获取
  - 智能缓存机制（5分钟默认过期）+ 手动缓存清理
  - 错误处理和超时重试机制
- **WandBEmbed** (`src/components/wandb/WandBEmbed.astro`): iframe 嵌入组件
  - 支持项目概览、运行详情、图表展示等多种类型
  - 响应式设计 + 加载失败时的优雅降级
  - 自动生成 WandB 链接和嵌入参数
- **WandBStats** (`src/components/wandb/WandBStats.astro`): 统计展示组件
  - 项目概览、实验数量、运行状态统计
  - 最近实验列表 + 项目活跃度展示
- **数据同步脚本** (`src/scripts/sync-wandb.ts`): 自动化数据同步
  - 支持完整同步和增量同步模式
  - 本地缓存文件管理 + 同步报告生成
  - CLI 支持：`npm run sync:wandb` 和 `npm run sync:wandb:incremental`

#### GitHub 集成系统
- **GitHubClient** (`src/utils/github-client.ts`): GitHub API 客户端
  - REST API + GraphQL API 双重支持
  - 用户信息、仓库列表、语言统计、贡献图数据获取
  - 10分钟智能缓存 + API 限制避免机制
- **GitHubStats** (`src/components/about/GitHubStats.astro`): 统计展示组件
  - 编程语言使用分析（带颜色编码和百分比）
  - 热门仓库展示（Star/Fork 排序）
  - 贡献统计概览 + 响应式设计
  - 支持配置显示项：语言统计、仓库列表、贡献图

#### 搜索功能增强
- **Pagefind 集成优化**：解决构建兼容性问题
  - 构建时自动生成搜索索引：`npm run build:search`
  - 支持中文内容全文搜索（9个页面，1735个词）
  - 智能加载检测 + 优雅降级机制
- **搜索组件增强** (`src/components/search/SearchBox.astro`):
  - 动态加载检测 + 错误处理改进
  - 备用搜索机制（当 Pagefind 不可用时）
  - 键盘导航支持 + 搜索结果高亮

#### 环境配置和工具
- **环境变量模板** (`.env.example`): API 密钥配置指南
  - WandB: WANDB_ENTITY, WANDB_API_KEY
  - GitHub: GITHUB_USERNAME, GITHUB_TOKEN
  - 站点配置: SITE_URL, SITE_TITLE, SITE_DESCRIPTION
- **构建脚本优化** (`package.json`):
  - 集成 Pagefind 搜索索引生成到构建流程
  - 新增数据同步命令和类型检查

#### Astro v5 升级（2025-06-17）
- **成功升级到 Astro 5.9.4**：从 v4.16.18 无缝升级
  - 完整兼容性测试通过，无破坏性变更
  - 构建时间保持稳定（~12秒）
  - 开发体验提升，性能优化
- **依赖同步更新**：
  - @astrojs/mdx: 3.1.8 → 4.3.0
  - esbuild: 0.21.5 → 0.25.5
  - 解决了所有 Dependabot 安全警告
- **GitHub Pages 部署验证**：升级后部署流程正常

### 📊 构建统计
- **页面数量**：9 个静态页面
- **文章数量**：4 篇博客文章 + 1 个 Notebook
- **组件数量**：20+ 个自定义组件
- **构建时间**：~12 秒（静态生成 + 搜索索引）
- **搜索索引**：自动生成 Pagefind 全文搜索

## 技术栈总结
- **前端框架**：Astro 5.x + TypeScript
- **样式系统**：Tailwind CSS + @tailwindcss/typography
- **内容管理**：Astro Content Collections (Markdown + MDX)
- **公式渲染**：KaTeX + remark-math + rehype-katex
- **代码高亮**：Shiki (支持多主题)
- **搜索引擎**：Pagefind (本地搜索)
- **数据集成**：WandB API + GitHub API + 缓存机制
- **部署平台**：GitHub Pages + GitHub Actions
- **开发工具**：ESLint + TypeScript 严格模式
- **性能优化**：静态生成 + 组件懒加载

## 下一步开发重点

### 🎯 Phase 4 优先任务
1. **多平台导出工具**：知乎、微信公众号、Medium 等平台格式转换
2. **图床管理系统**：统一图片存储和CDN加速
3. **小红书多图生成**：文章自动切分为卡片式图片
4. **内容自动化脚本**：一键发布到各个平台

### 🔧 当前技术债务和优化项

#### 紧急修复项
1. **API 密钥配置**：设置真实的 WandB 和 GitHub API 密钥进行功能测试
2. **网络错误处理**：改进 API 超时和连接失败时的用户体验
3. **TypeScript 类型优化**：修复 API 客户端中的类型安全问题
4. **构建时 API 调用**：避免构建时调用外部 API，改为客户端渲染

#### 中等优先级优化
1. **组件代码重构**：
   - 简化 GitHubStats 和 WandBStats 组件的复杂逻辑
   - 提取共通的数据加载和错误处理逻辑
   - 统一组件 Props 接口设计
2. **样式系统改进**：
   - 创建统一的设计令牌（颜色、间距、字体）
   - 提取可复用的 CSS 类和组件样式
   - 改进响应式设计的断点管理
3. **缓存策略优化**：
   - 实现更智能的缓存失效机制
   - 添加缓存大小限制和清理策略
   - 支持缓存预热和后台更新

#### 长期性能优化
1. **图片处理系统**：
   - 实现 WebP 自动转换和多格式支持
   - 添加图片懒加载和渐进式加载
   - 集成图片压缩和 CDN 优化
2. **Bundle 优化**：
   - 分析和优化 JavaScript 包大小
   - 实现代码分割和按需加载
   - 移除未使用的依赖和死代码
3. **SEO 和可访问性**：
   - 完善结构化数据标记
   - 改进页面加载性能和 Core Web Vitals
   - 添加键盘导航和屏幕阅读器支持

### 📈 内容和功能完善

#### 内容丰富化
1. **博客文章扩展**：
   - 添加更多 RLHF、DPO 技术深度文章
   - 创建算法实现和实验分析系列
   - 增加行业观察和技术趋势分析
2. **Notebook 示例**：
   - 完整的 RLHF 训练流程演示
   - DPO vs RLHF 对比实验
   - 数据预处理和分析 Pipeline
3. **个人展示增强**：
   - 添加发表论文和专利信息
   - 创建技术演讲和会议参与记录
   - 完善职业发展时间轴

#### 交互功能增强
1. **搜索功能完善**：
   - 实现标签和分类筛选
   - 添加搜索历史和推荐
   - 支持高级搜索语法
2. **用户体验优化**：
   - 添加暗色主题支持
   - 实现阅读进度指示器
   - 优化移动端交互体验
3. **社交功能**：
   - 集成社交媒体分享
   - 添加文章评论系统（基于 GitHub Issues）
   - 实现 RSS 订阅功能

## 📋 待完成工作项清单

### 🔧 紧急修复项
- [ ] 配置真实 API 密钥（WandB_ENTITY, WANDB_API_KEY, GITHUB_USERNAME, GITHUB_TOKEN）
- [ ] 修复构建时 API 调用问题，改为客户端渲染
- [ ] 优化网络错误处理和超时机制
- [ ] 修复 TypeScript 类型安全问题

### 📝 Phase 4: 多平台导出工具
- [ ] **知乎导出器** (`src/scripts/export-zhihu.ts`)
  - [ ] Markdown → HTML 转换
  - [ ] LaTeX 公式转图片处理
  - [ ] 代码块格式化适配
  - [ ] 图片链接处理和上传
- [ ] **微信公众号导出器** (`src/scripts/export-wechat.ts`)
  - [ ] Markdown → 富文本转换
  - [ ] CSS 内联样式处理
  - [ ] 图片本地化和 CDN 处理
  - [ ] 排版格式优化
- [ ] **Medium 导出器** (`src/scripts/export-medium.ts`)
  - [ ] 保持 Markdown 格式
  - [ ] Meta 信息处理（标题、标签、描述）
  - [ ] 图片上传和链接替换
  - [ ] Medium API 集成
- [ ] **小红书多图生成器** (`src/scripts/export-xiaohongshu.ts`)
  - [ ] 文章内容切分算法
  - [ ] 1080x1350 卡片模板设计
  - [ ] 文字排版和图片生成
  - [ ] 封面图和标题图制作
- [ ] **掘金/CSDN 导出器** (`src/scripts/export-juejin.ts`)
  - [ ] Markdown 原生格式保持
  - [ ] 标签映射和分类处理
  - [ ] 封面图自动生成
  - [ ] 平台 API 集成

### 🖼️ 图床管理系统
- [ ] **通用图床客户端** (`src/utils/image-uploader.ts`)
  - [ ] 七牛云 SDK 集成
  - [ ] 阿里云 OSS SDK 集成
  - [ ] 图片格式转换（WebP, AVIF）
  - [ ] 批量上传和进度追踪
- [ ] **CDN 优化工具**
  - [ ] 图片压缩和优化
  - [ ] 多尺寸图片生成
  - [ ] 缓存策略配置
  - [ ] 图片链接管理

### 🔄 自动化发布系统
- [ ] **一键发布脚本** (`src/scripts/publish-all.ts`)
  - [ ] 多平台发布队列管理
  - [ ] 发布状态追踪和日志
  - [ ] 失败重试机制
  - [ ] 发布报告生成
- [ ] **平台 API 集成**
  - [ ] 知乎 API 接入
  - [ ] Medium API 集成
  - [ ] 掘金 API 集成
  - [ ] 微信公众号接口研究

### 📊 内容管理优化
- [ ] **格式转换核心** (`src/utils/format-converter.ts`)
  - [ ] Markdown 解析器增强
  - [ ] HTML 清理和标准化
  - [ ] 公式渲染引擎优化
  - [ ] 代码块语法高亮适配
- [ ] **模板系统**
  - [ ] 平台特定模板引擎
  - [ ] 可配置样式主题
  - [ ] 自定义 CSS 支持
  - [ ] 模板预览功能

### 🎨 用户体验提升
- [ ] **导出界面** (`src/pages/export.astro`)
  - [ ] 文章选择和预览
  - [ ] 平台选择和配置
  - [ ] 导出进度显示
  - [ ] 结果预览和下载
- [ ] **配置管理**
  - [ ] 平台账号配置界面
  - [ ] 导出模板自定义
  - [ ] 批量操作设置
  - [ ] 历史记录管理

### 🔍 质量保证
- [ ] **测试覆盖**
  - [ ] 单元测试（导出功能）
  - [ ] 集成测试（API 调用）
  - [ ] 端到端测试（用户流程）
  - [ ] 性能测试（大文件处理）
- [ ] **错误处理**
  - [ ] 网络异常处理
  - [ ] 文件格式验证
  - [ ] 用户输入校验
  - [ ] 优雅降级机制