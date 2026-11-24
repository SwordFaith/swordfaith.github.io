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
- **框架**：Astro 7.x + TypeScript（`tsconfig.json` 继承非 strict 的 `astro/tsconfigs/base`）
- **样式**：Tailwind CSS + @tailwindcss/typography + AstroWind 风格设计系统（见下方「设计系统」）
- **字体**：Inter Variable + JetBrains Mono Variable，@fontsource-variable 自托管（不依赖 Google Fonts），中文回落到系统字体
- **部署**：GitHub Pages（主）+ Vercel（预留）
- **CI/CD**：GitHub Actions 自动部署（push 到 `main`、手动、每周定时）；向 `main` 的 PR 只运行 lint、typecheck、测试和构建，不部署
- **开发环境**：Node 版本以 `.nvmrc` 为准（Node 24，CI 同样读取）；ESLint + `astro check` + Vitest（`npm test`，`tests/`）

### 2. 内容处理
- **公式渲染**：remark-math + rehype-katex，构建时渲染为 HTML，KaTeX CSS 全局打包（已实现）
- **代码高亮**：Astro 内置 Shiki，亮/暗双主题（已实现；Notebook 代码单元支持复制，但没有语法着色，见「已知问题」）
- **Notebook 解析**：自定义 TypeScript 解析器 + 显示组件 + 输出 HTML 清洗（已实现）
- **图表可视化**：Observable Plot + Plotly.js（待实现）

### 3. 数据集成
- **WandB**：文章 frontmatter `wandb.projectId` / `wandb.runId` → 文章页 iframe 嵌入（已实现，无 API 调用）
- **GitHub**：同步脚本调用 REST API 生成 `src/data/github-stats.json`，构建时静态渲染（已实现，流程见「GitHub 统计」）
- **学术数据**：Google Scholar API（论文信息同步，待实现；关于页引用数目前手写）

### 4. 多平台转载工具
- **格式转换器**：Markdown → 各平台特定格式
- **图片处理**：统一图床管理（七牛云/阿里云OSS）
- **公式转换**：LaTeX → 图片（知乎/微信）/ MathML（Medium）
- **多图生成**：文章自动切分为小红书卡片图片
- **自动化脚本**：一键导出各平台内容

### 5. 性能优化
- **静态生成**：纯静态输出，不使用前端框架 island（无 `client:*` 指令），交互由少量内联脚本实现（已实现）
- **图片优化**：关于页头像经 `astro:assets` 输出 WebP；列表/卡片中的封面和 Notebook 输出图片已设 `loading="lazy"`；frontmatter `cover` 是字符串、以普通 `<img>` 输出，不经 `astro:assets`，封面的 WebP 转换和尺寸优化待实现
- **搜索功能**：Pagefind 本地搜索引擎（已启用，`npm run build` 时生成索引）
- **SEO 优化**：Meta、Open Graph、Twitter Card、文章页 BlogPosting JSON-LD、站点地图、RSS（已实现）

## 项目结构
```
.
├── astro.config.mjs             # Astro 配置（Markdown/KaTeX/Shiki/集成）
├── tailwind.config.js           # Tailwind 配置
├── postcss.config.mjs           # PostCSS 配置
├── eslint.config.mjs            # ESLint 配置
├── tsconfig.json                # TypeScript 配置（`@/*` 路径别名）
├── .nvmrc                       # Node 版本（24），本地与 CI 共用
├── .env.example                 # 环境变量配置模板（仅 GitHub 统计同步脚本使用）
├── .github/workflows/
│   ├── deploy.yml               # push/手动：检查 + 刷新 GitHub 统计 + 构建 + 部署；PR：只检查和构建
│   ├── scheduled-deploy.yml     # 每周一 03:23 UTC 调用 deploy.yml 重新构建部署
│   └── sync-data.yml            # 手动触发：同步 GitHub 统计数据并提交快照
├── tests/                       # Vitest 单元测试（tags / notebook HTML 清洗）
├── public/
│   ├── notebooks/               # 原始 .ipynb 文件（Notebook 页面数据源）
│   └── favicon.svg / og-image.* / robots.txt
└── src/
    ├── content.config.ts        # 内容集合配置（blog / notebooks）
    ├── navigation.ts            # 导航配置
    ├── config/site.ts           # 站点元数据（标题、描述、URL 等，astro.config.mjs 也读取）
    ├── env.d.ts
    ├── pages/
    │   ├── index.astro          # 首页
    │   ├── 404.astro            # 404 页面
    │   ├── about.astro          # 关于我页面
    │   ├── archive.astro        # 归档
    │   ├── search.astro         # 搜索
    │   ├── rss.xml.ts           # RSS
    │   ├── blog/                # 博客列表 + [...slug] 详情
    │   ├── notebooks/           # Notebook 列表 + [...slug] 详情
    │   └── tags/                # 标签索引 + [tag] 列表（URL 为标签派生的 slug，见 utils/tags.ts：去掉 / \ ? # % 和控制字符，空白变 -，如 RLHF → /tags/RLHF、reward model → /tags/reward-model、C# → /tags/C）
    ├── components/
    │   ├── layout/              # BaseLayout / Layout / PageLayout / Metadata / BasicScripts
    │   ├── ui/                  # AstroWind 风格 UI：Button / Headline / WidgetWrapper
    │   ├── widgets/             # Header / Footer / Hero / Features / BlogLatestPosts / Logo / Toggle*
    │   ├── blog/                # SinglePost / List / Grid / TableOfContents / PostTags 等
    │   ├── notebook/            # NotebookViewer / SimpleNotebookViewer
    │   ├── search/SearchBox.astro
    │   └── about/GitHubStats.astro  # 读取 src/data/github-stats.json 静态渲染
    ├── content/
    │   ├── blog/                # 博客文章 Markdown（`draft: true` 不进入生产构建）
    │   └── notebooks/           # Notebook 元数据（指向 public/notebooks/*.ipynb）
    ├── data/
    │   ├── github-stats.json    # 已提交的 GitHub 统计快照（PR 检查和部署刷新失败时的兜底）
    │   └── github-stats-default.json # 数据缺失时的兜底
    ├── scripts/
    │   ├── sync-github-daily.ts # GitHub 统计同步脚本（npm run sync:github:daily）
    │   └── intersection-observer.ts
    ├── utils/
    │   ├── notebook-parser.ts   # Notebook 解析器
    │   ├── number-formatter.ts
    │   ├── site-config.ts
    │   └── tags.ts
    └── assets/
        ├── images/avatar.jpg
        └── styles/astrowind.css # AstroWind 主题样式 + 自托管字体 @font-face
```
（Phase 4 规划中的导出脚本、图床工具等尚未创建，见下方待办清单。）

## 开发计划

### ✅ Phase 1–3（已完成）
基础框架与 GitHub Pages 部署、Markdown 博客 + 公式 + 代码高亮 + Notebook 展示、WandB 嵌入 + GitHub 统计 + 关于页 + 搜索。现状见「当前实现状态」。

### Phase 4: 多平台内容分发工具
1. **知乎导出器**：HTML 格式 + LaTeX 公式转图片 + 代码块格式化
2. **微信公众号导出器**：Markdown → 富文本 + CSS 内联样式 + 图片处理
3. **Medium 导出器**：保持 Markdown 格式 + 图片上传 + Meta 信息处理
4. **小红书多图生成器**：文章切分 → 1080x1350 卡片图片 + 统一设计模板
5. **掘金/CSDN 导出器**：Markdown 原生支持 + 标签映射 + 封面图生成
6. **图床管理系统**：七牛云/阿里云 OSS 集成 + CDN 加速 + 批量上传
7. **一键发布脚本**：自动化内容分发 + 平台 API 集成 + 发布状态追踪

### Phase 5: 高级功能和优化
1. **性能优化**：文章封面 WebP 转换 + Bundle 分析 + 缓存策略
2. **数据可视化增强**：Observable Plot + Plotly.js + 自定义图表组件
3. **学术数据集成**：Google Scholar API + 论文信息同步 + 引用统计
4. **Vercel 部署支持**：多平台部署选项 + 环境变量管理 + 自动部署
5. **监控和分析**：访问统计 + 性能监控 + 用户行为分析
6. **SEO 优化完善**：扩展结构化数据（目前仅文章页输出 BlogPosting）+ 站点地图优化 + 页面性能提升
7. **内容管理增强**：分类管理 + 内容搜索优化
8. **交互功能**：评论系统 + 社交分享

## 当前实现状态

### ✅ 已完成功能
- **内容系统**：Markdown 博客 + Jupyter Notebook 展示（静态渲染）
- **页面结构**：首页、博客列表/详情、Notebook 列表/详情、关于页面、归档、标签、搜索、404
- **响应式设计**：移动端适配，亮/暗主题切换
- **草稿**：`draft: true` 的文章不进入生产构建，`astro dev` 下可通过直接 URL 访问
- **测试**：Vitest，2 个测试文件、113 个用例；PR 检查和部署前都会运行

### 📝 示例内容
- **博客文章**：
  - RLHF 算法详解（含复杂数学公式）
  - DPO vs RLHF 对比分析
  - 数学公式渲染测试（完整 LaTeX 支持验证；草稿，仅 `astro dev` 下可直接访问）
  - 代码高亮测试（多语言支持验证；草稿，仅 `astro dev` 下可直接访问）
- **Jupyter Notebook**：
  - RLHF 实验分析示例

### 🎯 关键实现细节

#### WandB 集成
- 文章 frontmatter 中的 `wandb.projectId` / `wandb.runId`（schema 见 `src/content.config.ts`）由 `src/components/blog/SinglePost.astro` 渲染为文末 iframe
- 不调用 WandB API，无需密钥

#### GitHub 统计
- **同步脚本** (`src/scripts/sync-github-daily.ts`): 调用 GitHub REST API 获取用户、仓库、语言统计，写入 `src/data/github-stats.json`
  - 部署时刷新：`deploy.yml` 在非 PR 运行中、构建前尽力执行 `npm run sync:github:daily`（需要仓库 Secret `_GITHUB_TOKEN`，120 秒超时），结果只用于本次构建、不提交；Secret 缺失、同步失败、超时或数据结构无效时回退到已提交的 JSON，并输出 warning annotation
  - 每周重新构建：`scheduled-deploy.yml`（每周一 03:23 UTC）调用 `deploy.yml`，让关于页定期拿到新数据
  - 更新仓库内快照：在 GitHub Actions 中手动运行 "Sync GitHub Stats Data"（`.github/workflows/sync-data.yml`，仅 `workflow_dispatch`，同步后提交数据文件；该提交不会自动触发部署），或本地运行 `GITHUB_TOKEN=... npm run sync:github:daily`（Node 原生 TypeScript 类型擦除直接运行）
  - 数据无实质变化时不改写文件
- **GitHubStats** (`src/components/about/GitHubStats.astro`): 构建时读取静态 JSON，浏览时不调用 API
  - 编程语言使用分析（带颜色编码和百分比）
  - 精选仓库：名称、描述、标签、角色和一组 Star/Fork 数写在组件内；同步数据 `pinnedRepositoriesData` 中有同名 `full_name` 的条目时改用其 Star/Fork 数，否则显示写死的数字。已提交的快照只有 `OpenBMB/MiniCPM`、没有 `verl-project/verl`，所以本地构建、PR 构建和刷新失败回退快照的部署中 veRL 显示写死的数字（同步脚本自身的仓库列表另写在 `sync-github-daily.ts` 中，任一仓库获取失败即整体失败）
  - 贡献活动概览（今年估算提交数、月均、周均）
  - Props 控制显示项：语言统计、仓库列表、贡献活动、仓库数量上限

#### 搜索
- `npm run build` 在 Astro 构建后运行 `pagefind --site dist` 生成索引
- 只索引带 `data-pagefind-body` 的博客文章和 Notebook 详情页（当前 3 个页面，663 个词）
- `src/components/search/SearchBox.astro`：动态加载 Pagefind，不可用时显示错误提示和重试按钮；方向键导航；摘要中高亮匹配词

#### 环境配置
- **环境变量模板** (`.env.example`)：只有 GitHub 同步脚本使用 GITHUB_USERNAME、GITHUB_TOKEN（CI 中来自仓库 Secret `_GITHUB_TOKEN` / Variable `_GITHUB_USERNAME`）
- 站点配置不使用环境变量或仓库 Variables，标题、描述和 URL 写在 `src/config/site.ts`

#### 设计系统（AstroWind 风格）
- 颜色系统：主色调（蓝色）、辅助色（紫色），`darkMode: 'class'` 驱动的亮/暗主题切换
- 自定义 CSS 变量与主题样式在 `src/assets/styles/astrowind.css`，Typography 插件支持暗色模式
- UI 组件：Button（primary / secondary / tertiary / link 变体）、Headline、WidgetWrapper

### 📊 构建统计
- **页面数量**：17 个静态页面（含标签页和 404 页）
- **文章数量**：4 篇博客文章（其中 2 篇渲染测试为草稿，生产构建只发布 2 篇）+ 1 个 Notebook
- **组件数量**：28 个 `.astro` 组件
- **构建时间**：数秒（Astro 7 静态生成 + Pagefind 索引）

## 下一步开发重点

### 🎯 Phase 4 优先任务
多平台导出工具、图床管理、小红书多图生成和一键发布脚本，条目见「开发计划」，细项见「待完成工作项清单」。

### 🔧 当前技术债务和优化项

#### 已知问题
1. **Notebook 语法着色**：代码单元以纯文本输出；Markdown 单元里的代码块虽经 highlight.js 标记，但项目没有引入 highlight.js 主题 CSS，两者都没有语法颜色
2. **表格溢出**：文章中的表格是 `w-full`，没有横向滚动容器或断词规则，含长的不可断文本时会在窄屏撑出页面
3. **站内链接末尾斜杠**：`getPermalink` 和手写链接（如 `/tags`、`/notebooks`）都不带末尾斜杠，而构建输出是目录形式，GitHub Pages 会对这类链接做重定向；没有 `trailingSlash` 配置或检查来统一约束
4. **`getPermalink` 缺少单元测试**：Vitest 没有配置 `@/` 别名，`src/utils/site-config.ts` 无法在测试中导入
5. **关于页手写数据**：论文引用数和引用统计、精选仓库的描述和标签都写死在代码中，不随数据同步更新

#### 中等优先级优化
1. **组件代码重构**：
   - GitHubStats：用明确的数据类型替换 `any`，删除固定仓库非空时不会执行的热门仓库分支
   - 统一组件 Props 接口设计
2. **UI 组件库完善**：
   - 扩展 AstroWind UI 组件库（Card、Modal、Dropdown 等）
   - 创建组件文档和使用示例
   - 实现组件主题定制能力

#### 长期性能优化
1. **图片处理系统**：
   - 实现 WebP 自动转换和多格式支持
   - 添加图片渐进式加载
   - 集成图片压缩和 CDN 优化
2. **Bundle 优化**：
   - 分析和优化 JavaScript 包大小
   - 实现代码分割和按需加载
   - 移除未使用的依赖和死代码
3. **SEO 和可访问性**：
   - 完善结构化数据标记
   - 改进页面加载性能和 Core Web Vitals
   - 完善键盘导航和屏幕阅读器支持

### 📈 内容和功能完善

#### 内容丰富化
1. **博客文章扩展**：
   - 目前生产构建只有 2 篇文章，另外 2 篇是 `draft: true` 的渲染测试，需要正式内容
   - 添加更多 RLHF、DPO 技术深度文章
   - 创建算法实现和实验分析系列
   - 增加行业观察和技术趋势分析
2. **Notebook 示例**：
   - 完整的 RLHF 训练流程演示
   - DPO vs RLHF 对比实验
   - 数据预处理和分析 Pipeline
3. **个人展示增强**：
   - 添加专利信息
   - 创建技术演讲和会议参与记录
   - 完善职业发展时间轴

#### 交互功能增强
1. **搜索功能完善**：
   - 搜索结果按标签和分类筛选
   - 添加搜索历史和推荐
   - 支持高级搜索语法
2. **用户体验优化**：
   - 实现阅读进度指示器
   - 优化移动端交互体验
3. **社交功能**：
   - 集成社交媒体分享
   - 添加文章评论系统（基于 GitHub Issues）

## 📋 待完成工作项清单

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

### 🔍 质量保证（导出工具）
- [ ] **测试覆盖**
  - [ ] 单元测试（导出功能）
  - [ ] 集成测试（平台 API 调用）
  - [ ] 端到端测试（用户流程）
  - [ ] 性能测试（大文件处理）
- [ ] **错误处理**
  - [ ] 网络异常处理
  - [ ] 文件格式验证
  - [ ] 用户输入校验
  - [ ] 优雅降级机制
