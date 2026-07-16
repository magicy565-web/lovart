# 启物 · 灵感发现(Explore)与协作 — 前端设计蓝图

> 交付对象:执行开发的 Agent
> 目标:一个社区化的"灵感发现"板块,让用户 (1) 浏览其他开发者/供应商**正在推进或已发布**的产品设计,(2) 加入他人企划**多人共创**,(3) 从优秀作品中获得产品灵感并一键 fork 成自己的项目。
> 技术栈:Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · 现有设计 token(见 §2)

---

## 1. 功能定义:三件事,一条主线

参考图是 Lovart/Pinterest 式瀑布流,但**启物的差异化不在"图好看",而在"这些产品是活的、正在被推进的"**。因此本板块不是静态灵感墙,而是"产品孵化现场"。

| 用户目标 | 对应能力 |
|---|---|
| 看别人在做什么 | 瀑布流信息流 + 分类筛选 + 阶段筛选(推进中 / 已发布) |
| 一起做 | 加入企划成为协作者、评论、共创画布 |
| 获得灵感做自己的 | Fork 为新项目、收藏、关注创作者 |

主线:**发现 → 深入某个企划 → 收藏/Fork/加入协作 → 回到自己的工作台**。

---

## 2. 设计方向(前端核心)

### 2.1 复用现有 token(不要另起一套)

来自 `app/globals.css`,直接沿用:
- 底色 `--background` oklch(0.19 …) 深暖中性;卡片 `--card` oklch(0.23 …)
- 强调色 `--flame` oklch(0.64 0.17 34) 朱砂 —— **仅用于"进度/活跃"信号**,不滥用
- 字体:`--font-sans` Noto Sans(正文/UI)、`--font-serif` Noto Serif(标题/创作者名)、`--font-mono`(数据/计数)
- 圆角 `--radius` 0.625rem 起,卡片用 `rounded-2xl`

### 2.2 签名元素(本页被记住的那一个东西)

**"工序进度脉络"(Pipeline Pulse)**:每张作品卡片底部有一条极细的分段进度轨,对应启物流水线五阶段(Brief · 研究 · 视觉 · 页面/商品 · 发布)。已完成段为实色,当前段用朱砂 `--flame` 呼吸微光,未开始段为暗灰。

- 这是竞品灵感墙**没有**的东西,把"正在推进"这个差异点视觉化。
- 已发布的作品:进度轨满格 + 一枚"已上架"徽标。
- 推进中的作品:进度轨停在当前阶段,朱砂点脉动,传达"活的现场"。

> 设计克制:整页只有进度脉络和"活跃"信号使用朱砂,其余保持深色安静,让签名元素成为唯一记忆点。

### 2.3 布局概念(ASCII 草图)

```
┌──────────────────────────────────────────────────────────┐
│  灵感发现                              [搜索]  [+ 分享企划] │  ← 顶部,serif 标题
│  ┌全部┐ 品牌 海报 插画 UI 角色 影片 产品 建筑              │  ← 分类 tab(横向可滚动)
│  推进中 · 已发布 · 关注中          排序: 最新 / 最热         │  ← 次级筛选(状态+排序)
├──────────────────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │
│  │ img │ │ img │ │ img │ │ img │ │ img │   瀑布流          │
│  │     │ │─────│ │     │ │     │ │─────│   (CSS columns   │
│  │─────│ │ img │ │─────│ │─────│ │ img │    响应式列数)     │
│  │@user│ │     │ │@user│ │@user│ │     │                   │
│  │▓▓▓░░│ │─────│ │▓▓▓▓▓│ │▓▓░░░│ │─────│  ← 进度脉络       │
│  └─────┘ │@user│ └─────┘ └─────┘ │@user│                   │
│          │▓▓▓▓▓│                 │▓▓▓░░│                   │
│          └─────┘                 └─────┘                   │
└──────────────────────────────────────────────────────────┘
```

卡片信息层级:封面图 → hover 浮现标题与操作(收藏/Fork)→ 底部创作者头像+名 + 浏览/点赞计数(mono 字体)+ 进度脉络。

### 2.4 一处大胆之处(可辩护的风险)

卡片 hover 时,封面轻微下沉、浮出一层半透明"企划名片":显示当前阶段中文名(如"正在做视觉系统")、协作者头像堆叠、"加入/Fork"按钮。把静态图片变成"可进入的活企划"入口——强化差异化,且只在 hover 触发,默认态保持瀑布流的安静。尊重 `prefers-reduced-motion`。

---

## 3. 信息架构与路由

| 路由 | 内容 |
|---|---|
| `/explore` | 灵感发现主页(瀑布流 + 筛选) |
| `/explore/[projectId]` | 企划详情(封面画布快照、阶段时间线、协作者、评论、Fork/加入) |
| `/explore?category=product&status=wip` | 筛选状态编码进 query(可分享、可 SSR) |

导航:`components/landing/navbar.tsx` 顶部新增"灵感发现"入口(在"工作流""功能"之间)。工作台 `studio.tsx` 顶栏也加一个返回 Explore 的入口。

---

## 4. 组件清单(前端交付物)

```
components/explore/
  explore-page.tsx        # 主页容器:筛选状态管理 + 数据获取(SWR)
  category-tabs.tsx       # 分类 tab(全部/品牌/海报/插画/UI/角色/影片/产品/建筑),横向滚动
  status-filter.tsx       # 推进中 / 已发布 / 关注中 + 排序(最新/最热)
  masonry-grid.tsx        # 瀑布流布局(CSS columns 或 JS 分列),响应式 2/3/4/5 列
  project-card.tsx        # 作品卡片:封面 + hover 名片 + 创作者 + 计数 + 进度脉络
  pipeline-pulse.tsx      # 签名元素:五段进度轨(§2.2)
  creator-chip.tsx        # 头像+名,点击进创作者主页(可后置)
  collaborator-stack.tsx  # 协作者头像堆叠(+N)
  card-actions.tsx        # 收藏 / Fork / 加入 按钮组
  share-project-dialog.tsx# "+ 分享企划":把自己的项目发布到 Explore
components/explore/detail/
  project-detail.tsx      # 详情页容器
  stage-timeline.tsx      # 五阶段时间线(复用 artifact-pipeline 的 stage 定义)
  comment-thread.tsx      # 评论区
  join-collab-panel.tsx   # 加入协作 / 权限展示
```

### 交互与状态要点
- **加载态**:瀑布流用骨架卡(高度随机,呼应参考图的错落感),避免 layout shift。
- **空态**:分类无内容时给"这个方向还没有人分享,成为第一个"+ 分享按钮(空态是行动邀请,不是道歉)。
- **无限滚动**:IntersectionObserver 触底加载下一页;保留 URL query 便于分享。
- **可访问性**:卡片可键盘聚焦,hover 名片的操作在 focus 时也可达;进度脉络有 `aria-label`(如"进度:视觉系统阶段,第 3/5 步")。

---

## 5. 数据模型扩展(前端所需,后端配合)

> 前端可先用 mock 数据(仿参考图)开发,以下为联调所需的后端契约。

### 5.1 `projects` 表新增(发布到社区所需)
```ts
visibility: text("visibility").notNull().default("private"), // private | public
category: text("category"),           // 品牌/海报/插画/UI/角色/影片/产品/建筑
coverImage: text("cover_image"),      // Explore 封面(取画布快照或主图)
likeCount: integer("like_count").notNull().default(0),
viewCount: integer("view_count").notNull().default(0),
forkedFrom: uuid("forked_from"),      // Fork 来源项目 id
```

### 5.2 协作与社交(新表)
```ts
// 协作者
collaborators: { id, projectId, userId, role: "owner"|"editor"|"viewer", joinedAt }
// 点赞
likes: { id, projectId, userId, createdAt }   // (projectId,userId) 唯一
// 收藏
saves: { id, projectId, userId, createdAt }
// 关注
follows: { id, followerId, creatorId, createdAt }
// 评论
comments: { id, projectId, userId, body, createdAt }
```

### 5.3 前端数据契约(Explore 卡片)
```ts
interface ExploreCard {
  projectId: string
  title: string
  coverImage: string
  category: string
  status: "wip" | "published"        // 推进中 / 已发布
  currentStage: 1 | 2 | 3 | 4 | 5    // 供进度脉络渲染
  creator: { id: string; name: string; avatar: string }
  collaborators: { id: string; avatar: string }[]
  likeCount: number
  viewCount: number
  isLiked: boolean
  isSaved: boolean
}
```

> 认证与真实 userId 依赖账号体系。若当前无登录系统,先用匿名 handle(如参考图中的 `Sophie_Bakes12`)占位,并在蓝图 §7 标注为依赖项。

---

## 6. 多人共创(Collaboration)

### 6.1 三种角色
- **Owner**:企划发起人,可增删协作者、改可见性、发布。
- **Editor**:可编辑画布、生成/批准产物、评论。
- **Viewer**:只读浏览 + 评论 + 收藏/Fork。

### 6.2 加入方式
- 从 Explore 详情页点"加入协作"→ 若企划开放加入,直接成为 Editor;若需审批,发起申请 Owner 确认。
- Fork:不改动原企划,复制一份成为自己的新项目(记录 `forkedFrom`),用于"借灵感做自己的"。

### 6.3 实时协作(分期)
- **一期(本蓝图重点)**:异步协作。多人可先后进入同一企划编辑,画布持久化到 RDS(依赖已修复的持久化)。用"最后保存者+时间戳"提示,暂不做实时冲突合并。
- **二期(后置)**:基于画布 store 的实时同步(如 Yjs / WebSocket),多人光标、实时图层。本蓝图仅预留接口,不实现。

> 明确边界:先交付"可发现 + 可 Fork + 异步多人编辑",实时协同作为独立里程碑,避免一期范围膨胀。

---

## 7. 交付顺序与里程碑

| 里程碑 | 内容 | 依赖 |
|---|---|---|
| E1 | Explore 主页前端(瀑布流 + 分类/状态筛选 + 卡片 + 进度脉络),用 mock 数据 | 无(纯前端可先做) |
| E2 | 数据层:projects 可见性/分类/封面 + likes/saves 表 + `/explore` 真实数据接入 | E1 + 后端 |
| E3 | 企划详情页 `/explore/[id]`:阶段时间线 + 评论 + Fork | E2 |
| E4 | 多人协作(异步):collaborators 表 + 角色权限 + 加入流程 | E3 + 账号体系 |
| E5 | 关注/创作者主页 + 实时协作(二期) | E4 |

---

## 8. 依赖与风险清单

- [ ] **账号体系**:点赞/收藏/协作/关注都需要真实 userId。当前项目会话主要在 localStorage,**Explore 的社交能力强依赖登录系统**——需先确认账号方案(自建 / 第三方 OAuth),否则只能做匿名浏览版。
- [ ] **封面来源**:coverImage 建议取画布快照(项目已用 `html-to-image` 的 `toPng`,可复用)或产品主图。
- [ ] **内容审核**:公开社区需要基本的举报/下架能力,一期可先做 Owner 自主设为 private。
- [ ] **性能**:瀑布流大量图片需懒加载 + `next/image` 尺寸优化 + 分页,避免首屏拉满。
- [ ] **工作目录稳定性**:开工前确认仓库无外部实时写入、`npx tsc --noEmit` 干净(排查 Shopify 蓝图时发现过文件半截写入)。

---

## 9. 一个需要产品方拍板的决策

**Explore 的作品默认可见性是什么?**
- A. 默认 private,创作者手动"分享到发现"才公开(隐私优先,内容质量高但冷启动慢)。
- B. 默认 public,创作者可手动设为 private(内容丰富、冷启动快,但需要更强审核与隐私提示)。

蓝图当前按 **A(默认 private + 主动分享)** 编写(见 §5.1 default "private")。若要走 B,只需改默认值与 onboarding 提示文案。

---

## 附:与参考图的对应
- 顶部"灵感发现"+ 分类 tab(全部/品牌设计/海报与广告/插画/UI设计/角色设计/影片与分镜/产品设计/建筑设计)→ §2.3 + `category-tabs.tsx`,分类值直接沿用。
- 瀑布流错落卡片 + 创作者头像 + 播放量/点赞数图标 → `masonry-grid.tsx` + `project-card.tsx` + `creator-chip.tsx`。
- 参考图**没有但我们要加**的:进度脉络(§2.2)、hover 活企划名片(§2.4)、状态筛选"推进中/已发布"——这三点是启物区别于通用灵感墙的核心。
