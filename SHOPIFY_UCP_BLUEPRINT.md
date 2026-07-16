# 启物 · Shopify Agentic (UCP) 一键上架 — 开发蓝图

> 交付对象:执行开发的 Agent
> 目标:产品在启物设计完成后,通过 MCP 协议一键上架到"我们的供应商 Shopify 店铺",并使商品符合 Shopify Universal Commerce Protocol (UCP) / Agentic Storefronts 标准,可被 ChatGPT、Google AI Mode、Gemini、Copilot 等 AI 购物渠道发现与购买。
> 技术栈:Next.js 16 (App Router) · React 19 · TypeScript · Drizzle ORM + Postgres · assistant-ui · zustand

---

## 0. 前置条件(开工前必须满足)

1. **工作目录静止**:开发前确认没有外部编辑器/同步进程正在写入仓库。排查时发现 `app/actions/studio.ts`、`components/studio/canvas-toolbar.tsx` 等文件出现过截断和空字节(`\0`),疑似实时同步导致的半截写入。
2. **基线可编译**:`npx tsc --noEmit` 必须零错误后再动手。若报错,先修复已损坏文件(重点检查 `canvas-toolbar.tsx` L284 附近的空字节、`artifact-panel.tsx` 未闭合标签、`chat/route.ts` L418)。
3. **数据库可用**:确认 Postgres 连接正常(`lib/db/index.ts`),否则流水线读写会失败。
4. **Shopify 凭证就绪**:供应商店铺已创建 Custom App 并生成 Admin API access token(`shpat_...`),且开启了 Agentic Storefronts。

---

## 1. 架构总览

```
[启物工作台]  设计完成(release-package 已批准)
      │
      ▼
[发布类型分叉]  publishType: "crowdfund" | "shopify"
      │
      ├── crowdfund ──▶ 现有 /campaign/[slug] 验证页(保持不变)
      │
      └── shopify ────▶ [MCP 上架层] ──▶ 供应商 Shopify 店铺(productCreate)
                              │
                              ▼
                        商品进入 Shopify Catalog
                              │
                              ▼
                     [UCP / Agentic Storefronts]
                     ChatGPT · Gemini · Copilot 可发现可购买
                              │
                              ▼
                   /shop/[slug] 托管商品页(UCP 兼容端点)
```

核心原则不变:**AI 负责生成和组织,人负责方向选择与阶段批准**。上架是 release-package 批准之后的"发布动作",不是自动执行。

---

## 2. 阶段一 · 数据层扩展

### 2.1 `lib/db/schema.ts`

`projects` 表新增字段:

```ts
publishType: text("publish_type").notNull().default("crowdfund"), // crowdfund | shopify
shopifyProductId: text("shopify_product_id"),   // 上架后回填的 Shopify GID,如 gid://shopify/Product/123
shopifyProductUrl: text("shopify_product_url"), // 商品在店铺的公开 URL
shopifyPublishedAt: timestamp("shopify_published_at", { withTimezone: true }),
```

### 2.2 迁移脚本 `scripts/002-shopify-publish.sql`

```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS publish_type text NOT NULL DEFAULT 'crowdfund';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS shopify_product_id text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS shopify_product_url text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS shopify_published_at timestamptz;
```

### 2.3 `lib/studio/types.ts` 新增内容类型

```ts
export interface ShopifyVariant {
  title: string          // 变体名,如 "Sage Green / 380ml"
  optionValues: { name: string; value: string }[] // [{name:"颜色",value:"Sage Green"}, ...]
  price: number          // 售价(单位:元或店铺币种最小单位,与后端统一)
  compareAtPrice?: number
  sku: string
  inventory: number
}

export interface ShopifyListingContent {
  title: string
  descriptionHtml: string       // 富文本商品描述(Shopify body_html)
  vendor: string                // 供应商/品牌名
  productType: string
  tags: string[]
  options: { name: string; values: string[] }[] // 如 [{name:"颜色",values:["Sage Green","Black"]}]
  variants: ShopifyVariant[]
  images: { src: string; alt: string }[]
  seo: { title: string; description: string }
  status: "DRAFT" | "ACTIVE"    // 上架初始状态,默认 DRAFT 供人工核对
}
```

- 把 `ShopifyListingContent` 加入 `ArtifactContent` 联合类型。
- `ArtifactType` 联合类型新增 `"shopify-listing"`。
- 说明:`shopify-listing` 与现有 `campaign`(众筹页)是**同层级的第 4 阶段产物**,按 `publishType` 二选一。

### 验收标准(阶段一)
- `npx tsc --noEmit` 零错误。
- 迁移脚本在本地库执行成功,`projects` 出现 4 个新列。
- 老项目 `publish_type` 默认 `crowdfund`,行为不变。

---

## 3. 阶段二 · 流水线分叉与产物生成

### 3.1 发布类型选择时机

**决策(已与产品方确认):众筹与 Shopify 走同一套流程**,因此在 onboarding 第一步选择发布渠道即可,下游流水线按 `publishType` 自动适配。

- `components/studio/project-onboarding.tsx`:新增"发布渠道"选择(众筹验证 / Shopify 上架)。
- `app/actions/studio.ts` → `createProject` / `initializeProjectPipeline`:接收并写入 `publishType`。

### 3.2 `lib/studio/artifact-pipeline.ts`

第 4 阶段(sequence 4)改为按 `publishType` 动态返回:

```ts
export function stage4For(publishType: string): PipelineStage {
  if (publishType === "shopify") {
    return {
      sequence: 4, type: "shopify-listing",
      title: "Shopify 商品", shortTitle: "商品",
      description: "生成商品标题、描述、变体、SEO 与图片,准备上架供应商店铺。",
      agentNote: "把已确认的策略与视觉转化为可上架的 Shopify 商品结构。",
      dependsOn: "visual-system",
    }
  }
  return { /* 现有 campaign 阶段定义 */ }
}
```

- `PIPELINE_STAGES` 需要能感知 `publishType`。建议改为 `getPipelineStages(publishType)` 函数,而非静态常量,或在 `seedPipeline` 时按类型选择 sequence 4 的 type。
- `RELEASE_STAGE`(sequence 6)依赖 `validation`(sequence 5),保持不变。
- `normalizeArtifactType`:保留 `visuals → visual-system` 兼容,新增对 `shopify-listing` 的透传。

### 3.3 产物生成内容

`app/actions/studio.ts` 的 `CONTENT_BY_TYPE` / `generateArtifactDraft`:
- Shopify 路径下,`shopify-listing` 的生成需从已批准的 `brief` + `visual-system` 派生:
  - `title` ← brief.productName
  - `descriptionHtml` ← brief.sellingPoints + painPoints 组织成富文本
  - `variants` ← visual-system 的配色项(colorways)映射为变体
  - `images` ← visual-system.items 的 src/alt
  - `seo` ← brief.tagline / audience
- 先提供一份 `DEMO_SHOPIFY_LISTING`(在 `lib/studio/demo-data.ts`)作为 seed,后续接入真实 LLM 生成。

### 3.4 `components/studio/artifact-panel.tsx`

- `contentSummary`:新增 `shopify-listing` 分支(显示 `content.title`)。
- 发布区按 `publishType` 分流:
  - crowdfund → 现有 `publishProject` → 打开 `/campaign/[slug]`
  - shopify → 新增 `publishToShopify`(见阶段三)→ 上架成功后展示店铺商品链接 + `/shop/[slug]`
- 上架按钮需有三态:未上架 / 上架中(loading)/ 已上架(显示店铺链接)。

### 验收标准(阶段二)
- 新建项目可选 Shopify 渠道,流水线第 4 步显示"Shopify 商品"而非"众筹页面"。
- `shopify-listing` 产物可生成、进入 review、批准、解锁 validation。
- 众筹项目行为完全不受影响(回归测试)。

---

## 4. 阶段三 · MCP 上架层(核心)

### 4.1 设计原则

- 通过 **MCP 协议**调用 Shopify Admin 能力创建商品(而非在前端裸调 GraphQL)。这符合"通过 MCP 协议一键上架"的需求。
- 上架 = 在**供应商 Shopify 店铺**执行 `productCreate` mutation。商品一旦进入店铺 Catalog 且店铺开启 Agentic Storefronts,即自动被 UCP 纳入,可被 AI 购物渠道发现——**这一步无需我们额外编码**,是 Shopify 平台能力。
- 所有 Shopify 调用在**服务端**完成(server action / route handler),Admin token 绝不下发到客户端。

### 4.2 凭证与环境变量

`.env`(不入库,加入 `.gitignore`):
```
SHOPIFY_STORE_DOMAIN=your-supplier-store.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxxx
SHOPIFY_API_VERSION=2026-01
# MCP 模式(二选一):
SHOPIFY_MCP_MODE=direct        # direct=服务端直连 Admin GraphQL;mcp=经 MCP server 中转
SHOPIFY_MCP_ENDPOINT=          # SHOPIFY_MCP_MODE=mcp 时填 MCP server 地址
```

### 4.3 上架模块 `lib/shopify/publish.ts`

对外暴露一个函数,内部按 `SHOPIFY_MCP_MODE` 分派:

```ts
export interface ShopifyPublishResult {
  ok: boolean
  productId?: string    // gid://shopify/Product/xxx
  productUrl?: string
  error?: string
}

export async function publishListingToShopify(
  listing: ShopifyListingContent,
): Promise<ShopifyPublishResult>
```

**direct 模式**(推荐先实现,依赖最少):
- 用 `fetch` 调 `https://{domain}/admin/api/{version}/graphql.json`,Header `X-Shopify-Access-Token`。
- 执行 `productCreate`(创建商品 + options),再用 `productVariantsBulkCreate` 建变体,`productCreateMedia` 传图。
- 返回 product GID 与 online store URL。

**mcp 模式**(满足"MCP 协议"表述):
- 作为 MCP client 连接 Shopify Admin MCP server(如官方 AI Toolkit 提供的 server,或社区 `shopify-admin-mcp`)。
- 通过 MCP tool call(如 `create_product` / `store execute`)完成同样操作。
- 参考:Shopify AI Toolkit / UCP CLI 的 store execute 能力。
- 建议先用 direct 模式打通闭环,再把 mcp 模式作为可切换实现,避免被 MCP server 可用性阻塞。

**降级/本地模式**:凭证缺失时返回 `{ ok:false, error:"未配置 Shopify 凭证" }`,前端提示,不崩溃(对齐现有"数据库不可用→本地模式"的容错风格)。

### 4.4 GraphQL 关键 mutation(direct 模式参考)

```graphql
mutation productCreate($input: ProductInput!) {
  productCreate(input: $input) {
    product { id handle onlineStoreUrl }
    userErrors { field message }
  }
}
```
- `input` 由 `ShopifyListingContent` 映射:title / descriptionHtml → bodyHtml / vendor / productType / tags / status。
- options 与 variants 用对应的 bulk mutation(注意 2024-10 起 variant 创建已从 productCreate 拆分为 `productVariantsBulkCreate`,以实际 API 版本文档为准)。

### 4.5 server action `publishToShopify(projectId)`(加入 `app/actions/studio.ts`)

流程:
1. 读 `getProjectState`,校验 `release-package` 状态为 `approved`,且 `publishType === "shopify"`。
2. 取已批准的 `shopify-listing` 当前 revision content。
3. 调 `publishListingToShopify(listing)`。
4. 成功:回填 `projects.shopifyProductId / shopifyProductUrl / shopifyPublishedAt`,`status = "published"`,`publishedAt = now`。
5. 失败:抛出可读错误,前端展示 `userErrors`。
6. `revalidatePath("/shop/{slug}")`,返回 `{ slug, productUrl }`。

### 验收标准(阶段三)
- 配置真实凭证后,批准 release-package → 点击上架 → 供应商店铺后台出现 DRAFT 商品(含正确变体/图片/SEO)。
- `projects` 回填 product id/url,前端展示店铺商品链接。
- 凭证缺失时优雅降级,不崩溃。
- Admin token 不出现在任何客户端 bundle / 网络响应中。

---

## 5. 阶段四 · `/shop/[slug]` 托管商品页(UCP 兼容端点)

参考现有众筹页实现:`app/campaign/[slug]/page.tsx` + `components/campaign/public-page.tsx`。

### 5.1 路由与数据

- `app/shop/[slug]/page.tsx`:`generateMetadata` 输出 SEO(title/description 来自 listing.seo)。
- `app/actions/campaign.ts` 新增 `getShopListingBySlug(slug)`:读 `publishType==="shopify"` 且 `status==="published"` 的项目及其 `shopify-listing` content + visual-system 图片。

### 5.2 组件 `components/shop/shopify-listing-page.tsx`

Shopify 风格商品详情页,包含:
- 图片 gallery(主图 + 缩略图切换)。
- 变体选择器(颜色/尺寸 pill,联动价格与 SKU)。
- 加入购物车 / 立即购买 CTA:
  - 若有 `shopifyProductUrl` → 跳转真实店铺商品页(走 Shopify checkout / Shop Pay)。
  - 否则记录 `intent` 验证信号(复用 `recordSignal(projectId, "add_to_cart_intent")`)。
- 商品描述(渲染 descriptionHtml)、规格、SEO 友好结构。
- **UCP 友好**:输出 `application/ld+json` 的 `Product` 结构化数据(schema.org Product + Offer),提升被 AI 渠道解析的能力。

### 5.3 验证信号扩展

- `getSignalCounts` 已支持任意 type 聚合,前端 `workspace.tsx` 状态栏在 shopify 项目下展示:访问 / 加购意向 / 跳转店铺次数。

### 验收标准(阶段四)
- 发布后 `/shop/[slug]` 可访问,变体切换正确,CTA 行为正确。
- 页面含合法 schema.org Product JSON-LD。
- 访问与加购意向被记入 `validation_signals`。

---

## 6. 交付顺序与里程碑

| 里程碑 | 内容 | 依赖 |
|---|---|---|
| M1 | 修复基线编译错误 + 阶段一数据层 | 前置条件 |
| M2 | 阶段二:onboarding 渠道选择 + 流水线分叉 + shopify-listing 生成(seed) | M1 |
| M3 | 阶段三:MCP 上架层(先 direct 模式打通) | M2 |
| M4 | 阶段四:/shop/[slug] 托管页 + UCP JSON-LD | M2(可与 M3 并行) |
| M5 | mcp 模式实现 + LLM 真实生成 shopify-listing 内容 | M3 |

---

## 7. 回归与安全清单

- [ ] 众筹路径(publishType=crowdfund)全流程无变化。
- [ ] `npx tsc --noEmit` 与 `next build` 均通过。
- [ ] Admin token 仅存于服务端,不进客户端 bundle。
- [ ] Shopify 凭证缺失时全链路优雅降级。
- [ ] 上架初始状态为 DRAFT,由人工在店铺后台确认后再转 ACTIVE(避免误上架)。
- [ ] `productCreate` 的 `userErrors` 有展示,不静默失败。
- [ ] 新增依赖锁定版本;若引入 MCP client SDK,确认包名可信(防 typosquatting)。

---

## 8. 关键外部参考

- Shopify Agentic Commerce 文档:https://shopify.dev/docs/agents
- Shopify AI Toolkit:https://shopify.dev/docs/apps/build/ai-toolkit
- Checkout MCP server:https://shopify.dev/docs/agents/checkout/mcp
- Storefront Catalog MCP:https://shopify.dev/docs/agents/catalog/storefront-mcp
- Universal Commerce Protocol:https://www.shopify.com/ucp
- Admin custom app access token:https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin

> 注:shopify.dev 在当前网络环境被限制抓取,以上链接需开发 Agent 在可访问环境按最新 API 版本核对 mutation 签名(尤其 variant 创建方式随 API 版本变化)。

