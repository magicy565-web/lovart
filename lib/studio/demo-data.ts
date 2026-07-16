import type {
  BriefContent,
  CampaignContent,
  ResearchContent,
  TaskPlanItem,
  ValidationContent,
  VisualSystemContent,
  VisualsContent,
} from "./types"

// MODU COMMUTE 01 — 固定 Demo 产品数据(与 UI 组件分离)

export const DEMO_PRODUCT_NAME = "MODU COMMUTE 01"
export const DEMO_SLUG_BASE = "modu-commute-01"

export const TASK_PLAN: TaskPlanItem[] = [
  { type: "brief", title: "1. 产品 Brief", agentNote: "整理产品定位、目标用户、核心卖点、价格与风险。", durationMs: 2500 },
  { type: "research", title: "2. 市场与受众洞察", agentNote: "基于已批准 Brief 分析市场、竞品、趋势与机会。", durationMs: 3000 },
  { type: "campaign-foundation", title: "3. 众筹立项与产品定案", agentNote: "比较三条路线，锁定产品、用户、故事、Offer、证据和交付边界。", durationMs: 3000 },
  { type: "visual-system", title: "4. 视觉系统", agentNote: "依据已批准的产品定案建立视觉系统与核心资产。", durationMs: 4000 },
  { type: "campaign", title: "5. 众筹页面", agentNote: "组合 Hero、产品故事、功能、档位、时间线与 FAQ。", durationMs: 3500 },
  { type: "validation", title: "6. 验证与发布计划", agentNote: "定义验证方式、发布节奏和上线检查清单。", durationMs: 2000 },
]

export const DEMO_BRIEF: BriefContent = {
  productName: DEMO_PRODUCT_NAME,
  tagline: "为城市通勤者设计的模块化防雨背包",
  audience: "每日携带笔记本电脑、充电设备、水杯和个人物品的城市通勤人群",
  painPoints: ["物品杂乱难找,通勤途中翻包尴尬", "突遇降雨,电子设备缺乏可靠保护", "通勤与短途出行需要两个包,切换成本高"],
  sellingPoints: ["可拆卸模块收纳,场景自由组合", "独立防雨电子设备仓,暴雨也安心", "通勤与短途旅行快速切换"],
  form: "26L 模块化双肩背包,主仓 + 3 个可拆卸模块",
  retailPrice: 699,
  earlyBirdPrice: 499,
  risks: ["模块接口的耐用性需要量产验证", "防雨性能依赖拉链供应商品控", "首批产能预计 45 天,存在交付周期风险"],
}

export const DEMO_RESEARCH: ResearchContent = {
  summary: "城市通勤装备正在从单一收纳转向模块化、设备保护与跨场景切换。核心受众愿意为可靠防雨和更高效率支付溢价。",
  marketSize: "目标细分市场约 18–25 亿元人民币，核心购买人群集中在一二线城市的 25–40 岁知识工作者。",
  competitors: [
    { name: "Peak Design Everyday", price: "¥1,899", note: "摄影收纳强，但价格高且通勤体积偏大" },
    { name: "Aer City Pack", price: "¥1,299", note: "都市风格成熟，但模块化能力有限" },
    { name: "小米通勤背包", price: "¥249", note: "价格友好，但设备防护和差异化不足" },
  ],
  trends: ["模块化随身装备", "电子设备独立防护", "通勤与短途旅行融合", "克制的都市机能美学"],
  opportunity: "以中端价格提供高端通勤包的结构体验，用可拆卸模块和独立防雨仓形成清晰差异。",
  sources: [
    { title: "城市通勤装备趋势观察", url: "https://example.com/commuter-gear" },
    { title: "模块化背包竞品样本", url: "https://example.com/modular-bags" },
  ],
}

export const DEMO_VISUALS: VisualsContent = {
  style: "克制的都市风格,炭灰主色 + 橙色点缀",
  items: [
    { key: "hero", label: "产品主图", src: "/images/product-backpack.png", alt: "MODU COMMUTE 01 炭灰色模块背包产品主图" },
    { key: "scene", label: "使用场景", src: "/images/modu-scene.png", alt: "城市通勤者在雨天背着 MODU COMMUTE 01 走向地铁站" },
    { key: "explode", label: "功能拆解", src: "/images/modu-explode.png", alt: "MODU COMMUTE 01 模块化结构拆解图" },
    { key: "colorways", label: "配色套系", src: "/images/modu-colorways.png", alt: "MODU COMMUTE 01 三种配色:炭灰、鼠尾草绿、纯黑" },
  ],
}

export const DEMO_VISUAL_SYSTEM: VisualSystemContent = {
  ...DEMO_VISUALS,
  palette: [
    { name: "炭灰", hex: "#252624" },
    { name: "暖白", hex: "#F4F1EA" },
    { name: "信号橙", hex: "#F36A2E" },
    { name: "鼠尾草", hex: "#8C9984" },
  ],
  keywords: ["都市", "克制", "模块化", "可靠", "机能"],
}

export const DEMO_CAMPAIGN: CampaignContent = {
  currency: "CNY",
  heroTitle: "MODU COMMUTE 01",
  heroSubtitle: "为城市通勤者设计的模块化防雨背包。收纳有序,暴雨无忧,一只包完成通勤与出行。",
  problem: "每天通勤,你的背包里是缠绕的数据线、翻不到的钥匙和被雨水威胁的笔记本电脑。市面上的通勤包要么好看不好用,要么全能但笨重。",
  solution: "MODU COMMUTE 01 用模块化重新定义通勤收纳:三个可拆卸模块按需组合,独立防雨电子仓保护你的设备,通勤和周末出行只需一秒切换。",
  features: [
    { title: "可拆卸模块收纳", description: "数据线模块、洗漱模块、相机内胆按需取放,收纳逻辑由你定义。" },
    { title: "独立防雨电子仓", description: "TPU 防水拉链 + 高频热压接缝,笔记本和平板拥有独立防护空间。" },
    { title: "快速切换背负", description: "隐藏式肩带收纳和侧提手,通勤背包到出差手提包只要 3 秒。" },
  ],
  specs: [
    { label: "容量", value: "26L(主仓 18L + 模块 8L)" },
    { label: "自重", value: "1.2 kg" },
    { label: "面料", value: "500D 防泼水尼龙 + TPU 涂层" },
    { label: "电脑仓", value: "最大支持 16 英寸" },
    { label: "颜色", value: "炭灰 / 鼠尾草绿 / 纯黑" },
  ],
  tiers: [
    { name: "超级早鸟", price: 499, description: "前 100 名支持者专享,含全部三个标准模块", limit: 100 },
    { name: "早鸟价", price: 549, description: "含全部三个标准模块", limit: 300 },
    { name: "众筹价", price: 599, description: "含数据线模块与洗漱模块", limit: 0 },
  ],
  timeline: [
    { date: "2026 年 8 月", event: "众筹结束,锁定订单" },
    { date: "2026 年 9 月", event: "首批量产与品控" },
    { date: "2026 年 10 月", event: "国内订单陆续发货" },
  ],
  faq: [
    { q: "防雨等级如何?", a: "整包 IPX4 防泼水,电子仓达到 IPX6,可抵御暴雨级降水 30 分钟。" },
    { q: "模块可以单独购买吗?", a: "量产后模块将单独发售,众筹档位中已包含标准模块组合。" },
    { q: "支持退款吗?", a: "众筹结束前可无理由全额退款,发货前 7 天仍可申请取消订单。" },
  ],
  goalAmount: 100000,
}

export const DEMO_VALIDATION: ValidationContent = {
  methods: [
    { key: "email", label: "收集邮箱", enabled: true },
    { key: "earlybird", label: "预约早鸟", enabled: true },
    { key: "deposit", label: "支付可退订金", enabled: false },
    { key: "kickstarter", label: "跳转 Kickstarter", enabled: false },
  ],
  launchPlan: [
    { date: "T-21 天", event: "开放预热页与邮箱留资" },
    { date: "T-7 天", event: "发布设计故事与核心功能内容" },
    { date: "T 日", event: "众筹上线并启动早鸟转化" },
    { date: "T+7 天", event: "复盘转化数据并调整素材" },
  ],
  checklist: ["价格与档位已确认", "视觉素材版权已核验", "FAQ 与交付周期已复核", "邮箱与早鸟转化埋点已开启"],
}

export const SUGGESTED_PROMPTS = [
  "为城市骑行用户设计一款防雨通勤包",
  "把这张产品图制作成 Kickstarter 项目",
  "我有一个宠物饮水器想验证市场",
]
