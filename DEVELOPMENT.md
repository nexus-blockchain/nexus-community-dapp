# Nexus Community dApp — 开发设计文档

> 移动优先的社区商业 dApp，连接 Nexus 链上 9 大 Pallet，打造「社区 + 金融 + 商业」三位一体的移动端体验。

---

## 一、技术栈选型

### 核心决策：React Native (Expo) + Polkadot.js

| 层级 | 技术选择 | 选型理由 |
|------|---------|---------|
| **框架** | React Native 0.76 + Expo SDK 52 | 真原生体验；Nexus 团队已有 React/TS 技术栈积累（nexus-entity-dapp），迁移成本最低 |
| **路由** | Expo Router v4 (文件系统路由) | 类 Next.js App Router，与 entity-dapp 开发模式一致 |
| **状态管理** | Zustand 5 + TanStack React Query 5 | entity-dapp 已验证该组合，链上查询缓存 + 本地状态分离 |
| **UI 组件** | React Native Paper 5 + 自定义 Design System | Material Design 3 适配金融场景；配合自定义社区主题色 |
| **样式** | NativeWind 4 (Tailwind CSS for RN) | 与 entity-dapp 的 Tailwind 体系统一，开发者零学习成本 |
| **链交互** | @polkadot/api 12.x + @polkadot/api-contract | 与 entity-dapp 同源，共用 TypeScript 类型定义 |
| **钱包** | WalletConnect v2 + 内置 Keyring | 移动端标准方案；内置 sr25519 密钥对管理 |
| **表单** | react-hook-form 7 + zod 3 | 与 entity-dapp 一致 |
| **图表** | react-native-gifted-charts | 纯原生渲染，K线/柱状图/饼图，适合金融数据展示 |
| **动画** | react-native-reanimated 3 | 60fps 原生动画，卡片翻转/数字滚动/手势交互 |
| **国际化** | i18next + react-i18next | React Native 生态标准；支持 EN/ZH |
| **存储** | MMKV (react-native-mmkv) | 高性能本地 KV 存储，替代 AsyncStorage |
| **推送** | Expo Notifications | 链上事件 → 本地推送（订单状态、佣金到账等） |
| **生物识别** | expo-local-authentication | 指纹/Face ID 解锁钱包 |

### 为什么不选 Next.js + Capacitor？

| 对比维度 | React Native (Expo) | Next.js + Capacitor |
|---------|--------------------|--------------------|
| 性能 | 原生渲染，丝滑 60fps | WebView 渲染，列表卡顿 |
| 手势交互 | 原生手势系统 | 有 300ms 延迟 |
| 金融图表 | 原生 Canvas 渲染 | Canvas polyfill 性能差 |
| 钱包安全 | Keychain/Keystore 原生加密 | localStorage 不安全 |
| 包体积 | 按需打包 ~15MB | WebView + JS Bundle ~40MB |
| 热更新 | Expo Updates OTA | 需重新提交商店 |
| 团队迁移成本 | 低（React + TS 同源） | 最低（零迁移） |

**结论**：金融属性 + 社区交互密集型 App，原生渲染体验不可替代。Expo 生态的成熟度已消除 RN 历史痛点。

---

## 二、Pallet → 页面映射

### 9 个 Pallet 的用户端功能域

```
┌──────────────────────────────────────────────────────────────────┐
│                    nexus-community-dapp                          │
├──────────────┬──────────────┬──────────────┬─────────────────────┤
│   社区广场    │    商业引擎   │   金融中心    │     个人中心        │
│              │              │              │                     │
│ member       │ shop         │ nex-market   │ member (我的)       │
│ loyalty      │ product      │ single-line  │ loyalty (我的)      │
│              │ order        │ multi-level  │ order (我的)        │
│              │              │ pool-reward  │ commission (我的)   │
└──────────────┴──────────────┴──────────────┴─────────────────────┘
```

### 核心页面清单

| # | 页面 | 路由 | 对应 Pallet | 核心功能 |
|---|------|------|------------|---------|
| 1 | 社区首页 | `/(tabs)/community` | member, loyalty | 社区概览、成员排行、积分动态 |
| 2 | 商城 | `/(tabs)/shop` | shop, product | 商品浏览、分类筛选、搜索 |
| 3 | 交易所 | `/(tabs)/market` | nex-market | 买卖 NEX、订单簿、K线 |
| 4 | 收益 | `/(tabs)/earnings` | single-line, multi-level, pool-reward | 佣金总览、团队网络、分红 |
| 5 | 我的 | `/(tabs)/profile` | member, loyalty, order | 个人资料、订单、资产 |
| 6 | 商品详情 | `/product/[id]` | product | 规格、评价、加购 |
| 7 | 下单 | `/order/create` | order | 地址、支付方式、确认 |
| 8 | 订单详情 | `/order/[id]` | order | 状态跟踪、退款、确认收货 |
| 9 | 店铺主页 | `/shop/[id]` | shop, product | 店铺信息、商品列表 |
| 10 | 会员等级 | `/member/levels` | member | 等级体系、升级条件、进度 |
| 11 | 邀请裂变 | `/member/invite` | member, single-line | 邀请码、海报生成、推荐关系 |
| 12 | 积分中心 | `/loyalty/points` | loyalty | 积分余额、兑换、转赠、记录 |
| 13 | 单线排位 | `/earnings/single-line` | single-line | 排位图、上下线佣金明细 |
| 14 | 多级佣金 | `/earnings/multi-level` | multi-level | 层级树、激活进度、收益 |
| 15 | 分红池 | `/earnings/pool-reward` | pool-reward | 当轮快照、可领取额、历史 |
| 16 | 交易详情 | `/market/trade/[id]` | nex-market | 付款、确认、争议 |
| 17 | 钱包 | `/wallet` | - | 余额、转账、收款二维码 |
| 18 | 设置 | `/settings` | - | 语言、安全、节点切换 |

---

## 三、UI 设计体系

### 3.1 设计语言

**关键词**：`科技金融` · `社区温度` · `信任感`

```
色彩体系 (Dark Mode First)
─────────────────────────────────────────
背景层    #0A0E1A → #111827    深邃太空蓝
卡片层    #1A1F35 → #1F2937    微透明毛玻璃
主色      #6C5CE7              Nexus 紫 (品牌色)
辅色      #00D2FF              科技蓝 (金融数据)
成功      #00E676              涨/成功
警告      #FFB74D              中性提示
危险      #FF5252              跌/错误
文字      #F8FAFC / #94A3B8    主/次文字

字体
─────────────────────────────────────────
数字/金额  SF Mono / JetBrains Mono (等宽)
正文       SF Pro / PingFang SC
标题       SF Pro Display / Bold Weight
```

### 3.2 核心组件设计

#### 社区首页 — 让人感受到「这是一个活跃的组织」

```
┌─────────────────────────────────────┐
│  ▓▓ Nexus Community        [钱包]  │  ← 顶栏：社区名 + 钱包快捷入口
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │  🏠 欢迎回来, 0x7a3f...         │ │  ← 个人卡片（毛玻璃）
│ │  Lv.3 高级会员  ★★★☆☆          │ │     等级 + 星级
│ │  ┌────────┐ ┌────────┐          │ │
│ │  │ 💰 NEX │ │ 🎯积分 │          │ │     资产速览标签
│ │  │ 12,450 │ │ 3,200  │          │ │
│ │  └────────┘ └────────┘          │ │
│ └─────────────────────────────────┘ │
│                                     │
│  📊 社区数据                   更多> │  ← 实时链上数据面板
│  ┌────────┬────────┬────────┐      │
│  │ 成员数  │ 今日订单│ 佣金池 │      │
│  │ 2,847  │  156   │ ¥45.2K │      │
│  │ +12 ↑  │ +23%   │ 待分配  │      │
│  └────────┴────────┴────────┘      │
│                                     │
│  🔥 热门商品               查看全部> │  ← 横向卡片轮播
│  ┌────────┐ ┌────────┐ ┌────┐      │
│  │ 商品图  │ │ 商品图  │ │ .. │      │
│  │ ¥299   │ │ ¥199   │ │    │      │
│  │ 🔥223件│ │ 🔥156件│ │    │      │
│  └────────┘ └────────┘ └────┘      │
│                                     │
│  📢 社区动态                        │  ← 实时 Event 流
│  ├─ 🎉 Alice 升级为 Lv.4     2分前 │
│  ├─ 💸 Bob 领取佣金 ¥320     5分前 │
│  ├─ 🛒 Carol 下单 #10234    12分前 │
│  └─ 👋 Dave 加入社区         15分前 │
│                                     │
├─────────────────────────────────────┤
│  🏠     🛒     📈     💰     👤   │  ← Bottom Tabs
│  社区   商城    交易   收益    我的  │
└─────────────────────────────────────┘
```

#### 交易所 — 专业金融感

```
┌─────────────────────────────────────┐
│  NEX / USDT          [切换交易对]   │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │         K 线 / 深度图            ││  ← 可切换 K线 / 深度图 / TWAP
│  │     ╱\                          ││
│  │   ╱   \    ╱╲                   ││
│  │ ╱      \╱╱   \                  ││
│  │  1H  4H  1D  1W   TWAP ●       ││
│  └─────────────────────────────────┘│
│                                     │
│  ¥ 0.0832  ▲ +2.4%         24H Vol │  ← 实时价格 + 涨跌色
│                          ¥1.2M     │
│                                     │
│ ┌───────────────┬───────────────┐   │
│ │   卖出 (Ask)   │   买入 (Bid)  │   │  ← 订单簿 (红绿色阶)
│ │ 0.0845  1,200 │   850  0.0820│   │
│ │ 0.0842    800 │ 1,500  0.0818│   │
│ │ 0.0840  2,100 │ 3,200  0.0815│   │
│ │ 0.0838    450 │   700  0.0812│   │
│ │ 0.0835  1,800 │ 2,000  0.0810│   │
│ └───────────────┴───────────────┘   │
│                                     │
│ ┌────────────────────────────────┐  │
│ │ [  买入  ]     [  卖出  ]      │  │  ← 交易操作区
│ │ 价格:  [  0.0832  ]           │  │
│ │ 数量:  [          ]  [MAX]    │  │
│ │ 总额:  0.00 USDT              │  │
│ │                                │  │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 75%      │  │  ← 比例滑块
│ │                                │  │
│ │ [     买入 NEX     ]           │  │  ← 主操作按钮（渐变色）
│ └────────────────────────────────┘  │
├─────────────────────────────────────┤
│  🏠     🛒     📈     💰     👤   │
└─────────────────────────────────────┘
```

#### 收益中心 — 清晰的金融回报感

```
┌─────────────────────────────────────┐
│  💰 我的收益                  本月 ▼│
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │      总收益 (NEX)               ││  ← 大字体数字 + 闪烁效果
│  │     ¥ 12,680.50                 ││
│  │     +¥ 1,230 本月    ▲ 12.8%   ││
│  │                                 ││
│  │  ┌──────────────────────────┐   ││  ← 迷你折线图（30天趋势）
│  │  │    ╱╲   ╱╲               │   ││
│  │  │  ╱   ╲╱   ╲  ╱          │   ││
│  │  │╱            ╲╱           │   ││
│  │  └──────────────────────────┘   ││
│  └─────────────────────────────────┘│
│                                     │
│  收益构成                           │
│  ┌────────────────────────────────┐ │
│  │ 🔗 单线佣金                    │ │  ← 可展开卡片
│  │    ¥ 5,200    上线:3 下线:12   │ │
│  │    排位: #47 / 2847            │ │
│  ├────────────────────────────────┤ │
│  │ 🌳 多级佣金                    │ │
│  │    ¥ 4,180    已激活: 5/8 层   │ │
│  │    团队: 156人  本月: +23人    │ │
│  ├────────────────────────────────┤ │
│  │ 🎱 分红池                      │ │
│  │    ¥ 3,300    第 12 轮         │ │
│  │    可领取: ¥ 280  [立即领取]   │ │  ← 一键领取（高亮CTA）
│  └────────────────────────────────┘ │
│                                     │
│  最近到账                     更多> │
│  ├─ +¥320 单线佣金 #ORD-10234  2h │
│  ├─ +¥180 多级佣金 L3→L1      4h │
│  └─ +¥280 分红池 R12 领取     1d  │
├─────────────────────────────────────┤
│  🏠     🛒     📈     💰     👤   │
└─────────────────────────────────────┘
```

#### 商城 — 社区专属购物感

```
┌─────────────────────────────────────┐
│  🛒 社区商城          [🔍] [筛选]  │
├─────────────────────────────────────┤
│  [全部] [热销] [新品] [积分可换]    │  ← 横向筛选标签
│                                     │
│  ┌────────────┐  ┌────────────┐    │  ← 双列瀑布流
│  │   ┌──────┐ │  │   ┌──────┐ │    │
│  │   │ 商品 │ │  │   │ 商品 │ │    │
│  │   │ 图片 │ │  │   │ 图片 │ │    │
│  │   └──────┘ │  │   └──────┘ │    │
│  │ 精选好物A  │  │ 精品好物B  │    │
│  │ ¥299      │  │ ¥199      │    │
│  │ 🏷 返佣¥30 │  │ 🏷 返佣¥20 │    │  ← 佣金预览标签
│  │ 已售 223   │  │ 已售 156   │    │
│  └────────────┘  └────────────┘    │
│  ┌────────────┐  ┌────────────┐    │
│  │   ┌──────┐ │  │   ┌──────┐ │    │
│  │   │ 商品 │ │  │   │ 商品 │ │    │
│  │   │ 图片 │ │  │   │ 图片 │ │    │
│  │   └──────┘ │  │   └──────┘ │    │
│  │ 好物C      │  │ 好物D      │    │
│  │ ¥599      │  │ 200积分    │    │  ← 支持积分标价
│  │ 🏷 返佣¥60 │  │ 🎯积分兑换 │    │
│  │ 已售 89    │  │ 已售 412   │    │
│  └────────────┘  └────────────┘    │
│           ↕ 下拉加载更多            │
├─────────────────────────────────────┤
│  🏠     🛒     📈     💰     👤   │
└─────────────────────────────────────┘
```

### 3.3 交互动效规范

| 场景 | 动效 | 技术 |
|------|------|------|
| 佣金到账 | 数字从0滚动到实际值 + 金币粒子 | Reanimated SharedValue |
| 领取分红 | 按钮按下 → 脉冲扩散 → 成功对勾 | Reanimated + Lottie |
| 社区动态 | 新消息从顶部滑入 + 淡入 | LayoutAnimation |
| 商品卡片 | 按下缩放0.96 + 弹起 | Pressable + Reanimated |
| 订单状态 | 步骤条流光动画 | SVG Animated Dash |
| K线图 | 手指长按显示十字光标 | GestureHandler + Canvas |
| 页面切换 | 共享元素过渡（商品图） | SharedTransition |
| 下拉刷新 | 弹性阻尼 + 链上区块高度刷新 | Custom RefreshControl |

---

## 四、项目架构

### 4.1 目录结构

```
nexus-community-dapp/
├── app/                                # Expo Router 文件系统路由
│   ├── _layout.tsx                     # 根 Layout（Provider 包裹）
│   ├── index.tsx                       # 启动页 / 引导页
│   ├── (auth)/                         # 认证流程
│   │   ├── welcome.tsx                 # 欢迎页
│   │   ├── import-wallet.tsx           # 导入助记词/私钥
│   │   └── create-wallet.tsx           # 创建钱包
│   ├── (tabs)/                         # 主 Tab 导航
│   │   ├── _layout.tsx                 # Tab Bar 配置
│   │   ├── community.tsx               # 社区首页
│   │   ├── shop.tsx                    # 商城
│   │   ├── market.tsx                  # 交易所
│   │   ├── earnings.tsx                # 收益中心
│   │   └── profile.tsx                 # 个人中心
│   ├── product/
│   │   └── [id].tsx                    # 商品详情
│   ├── order/
│   │   ├── create.tsx                  # 创建订单
│   │   └── [id].tsx                    # 订单详情
│   ├── shop/
│   │   └── [id].tsx                    # 店铺主页
│   ├── member/
│   │   ├── levels.tsx                  # 等级体系
│   │   └── invite.tsx                  # 邀请裂变
│   ├── loyalty/
│   │   └── points.tsx                  # 积分中心
│   ├── earnings/
│   │   ├── single-line.tsx             # 单线排位
│   │   ├── multi-level.tsx             # 多级佣金
│   │   └── pool-reward.tsx             # 分红池
│   ├── market/
│   │   └── trade/[id].tsx              # 交易详情
│   ├── wallet/
│   │   ├── index.tsx                   # 钱包主页
│   │   ├── send.tsx                    # 转账
│   │   └── receive.tsx                 # 收款
│   └── settings/
│       └── index.tsx                   # 设置页
│
├── src/
│   ├── components/                     # 组件库
│   │   ├── ui/                         # 基础 UI 组件
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx                # 毛玻璃卡片
│   │   │   ├── GlassCard.tsx           # 社区专用毛玻璃卡片
│   │   │   ├── AnimatedNumber.tsx      # 数字滚动动画
│   │   │   ├── Badge.tsx
│   │   │   ├── BottomSheet.tsx         # 底部弹出面板
│   │   │   ├── Skeleton.tsx            # 骨架屏
│   │   │   ├── PullToRefresh.tsx       # 下拉刷新
│   │   │   └── Toast.tsx
│   │   ├── community/                  # 社区组件
│   │   │   ├── MemberRankCard.tsx      # 成员排行卡片
│   │   │   ├── ActivityFeed.tsx        # 社区动态流
│   │   │   ├── StatsPanel.tsx          # 数据面板
│   │   │   └── LevelBadge.tsx          # 等级徽章
│   │   ├── shop/                       # 商城组件
│   │   │   ├── ProductCard.tsx         # 商品卡片
│   │   │   ├── ProductGrid.tsx         # 瀑布流网格
│   │   │   ├── CartSheet.tsx           # 购物车面板
│   │   │   └── CommissionTag.tsx       # 佣金标签
│   │   ├── market/                     # 交易组件
│   │   │   ├── PriceDisplay.tsx        # 实时价格
│   │   │   ├── OrderBook.tsx           # 订单簿
│   │   │   ├── KLineChart.tsx          # K线图
│   │   │   ├── TradeForm.tsx           # 交易表单
│   │   │   └── DepthChart.tsx          # 深度图
│   │   ├── earnings/                   # 收益组件
│   │   │   ├── EarningsSummary.tsx     # 收益总览
│   │   │   ├── SingleLineTree.tsx      # 单线排位图
│   │   │   ├── MultiLevelTree.tsx      # 多级层级树
│   │   │   ├── PoolRewardCard.tsx      # 分红池卡片
│   │   │   └── ActivationProgress.tsx  # 激活进度环
│   │   ├── order/                      # 订单组件
│   │   │   ├── OrderStatusBar.tsx      # 状态进度条
│   │   │   ├── OrderCard.tsx           # 订单卡片
│   │   │   └── RefundSheet.tsx         # 退款面板
│   │   └── wallet/                     # 钱包组件
│   │       ├── BalanceCard.tsx         # 余额卡片
│   │       ├── QRCode.tsx              # 收款码
│   │       └── TxHistory.tsx           # 交易记录
│   │
│   ├── hooks/                          # React Hooks
│   │   ├── chain/                      # 链上查询 Hooks
│   │   │   ├── useChainApi.ts          # API 连接管理
│   │   │   ├── useMember.ts            # member pallet 查询
│   │   │   ├── useShop.ts              # shop pallet 查询
│   │   │   ├── useProduct.ts           # product pallet 查询
│   │   │   ├── useOrder.ts             # order pallet 查询
│   │   │   ├── useLoyalty.ts           # loyalty pallet 查询
│   │   │   ├── useMarket.ts            # nex-market 查询
│   │   │   ├── useSingleLine.ts        # single-line 查询
│   │   │   ├── useMultiLevel.ts        # multi-level 查询
│   │   │   ├── usePoolReward.ts        # pool-reward 查询
│   │   │   └── useSubscription.ts      # 事件订阅
│   │   ├── mutations/                  # 链上交易 Hooks
│   │   │   ├── useTx.ts               # 通用交易提交
│   │   │   ├── useOrderMutations.ts    # 订单交易
│   │   │   ├── useMarketMutations.ts   # 交易所交易
│   │   │   └── useClaimReward.ts       # 领取佣金/分红
│   │   ├── useWallet.ts               # 钱包状态
│   │   ├── useBiometric.ts            # 生物识别
│   │   └── useNotification.ts         # 推送通知
│   │
│   ├── stores/                         # Zustand 状态管理
│   │   ├── walletStore.ts             # 钱包状态（地址、余额、签名器）
│   │   ├── chainStore.ts             # 链连接状态（节点、区块高度）
│   │   ├── entityStore.ts            # 当前社区/实体上下文
│   │   └── uiStore.ts               # UI 状态（主题、语言）
│   │
│   ├── lib/                            # 工具库
│   │   ├── chain/
│   │   │   ├── api.ts                 # Polkadot.js API 初始化
│   │   │   ├── constants.ts           # 链常量（SS58、decimals）
│   │   │   ├── endpoints.ts           # RPC 节点列表
│   │   │   └── types.ts              # 链上类型 TypeScript 定义
│   │   ├── wallet/
│   │   │   ├── keyring.ts            # sr25519 密钥管理
│   │   │   ├── secure-store.ts       # 安全存储（Keychain/Keystore）
│   │   │   └── walletconnect.ts      # WalletConnect v2 适配
│   │   ├── format/
│   │   │   ├── balance.ts            # 金额格式化
│   │   │   ├── address.ts            # 地址缩写
│   │   │   └── time.ts              # 时间/区块转换
│   │   └── ipfs/
│   │       └── gateway.ts            # IPFS 图片/数据网关
│   │
│   ├── theme/                          # 设计主题
│   │   ├── colors.ts                  # 色彩系统
│   │   ├── typography.ts             # 字体系统
│   │   ├── spacing.ts               # 间距规范
│   │   └── shadows.ts               # 阴影 & 毛玻璃
│   │
│   └── i18n/                           # 国际化
│       ├── config.ts
│       ├── en.json
│       └── zh.json
│
├── assets/                             # 静态资源
│   ├── images/
│   ├── lottie/                        # Lottie 动画文件
│   └── fonts/
│
├── app.json                            # Expo 配置
├── babel.config.js
├── metro.config.js                     # Metro bundler 配置（polyfill）
├── tailwind.config.js                  # NativeWind 配置
├── tsconfig.json
├── package.json
└── eas.json                            # EAS Build 云构建配置
```

### 4.2 数据流架构

```
                    ┌──────────────┐
                    │  Nexus Chain │
                    │  (Substrate) │
                    └──────┬───────┘
                           │ WebSocket (wss://)
                           ▼
              ┌────────────────────────┐
              │   @polkadot/api        │
              │   ApiProvider Context  │
              └────────────┬───────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌─────────────┐ ┌──────────────┐ ┌───────────┐
   │ React Query │ │ Subscription │ │   Tx      │
   │ (查询缓存)   │ │ (事件监听)    │ │ (交易提交) │
   │             │ │              │ │           │
   │ staleTime:  │ │ system.events│ │ signAndSend│
   │  5s~60s     │ │ → 分发到对应  │ │ → 状态追踪 │
   │  按模块配置  │ │   Query 刷新  │ │ → 错误解析 │
   └──────┬──────┘ └──────┬───────┘ └─────┬─────┘
          │               │               │
          └───────┬───────┘               │
                  ▼                       ▼
          ┌──────────────┐        ┌──────────────┐
          │  Zustand     │        │ Mutation      │
          │  Stores      │        │ + Toast 反馈  │
          │ (本地状态)    │        │ + Query 刷新  │
          └──────┬───────┘        └──────────────┘
                 │
                 ▼
          ┌──────────────┐
          │  React       │
          │  Components  │
          │  (UI 渲染)   │
          └──────────────┘
```

### 4.3 React Query 缓存策略

```typescript
// 按模块配置 staleTime，金融数据刷新更快
const QUERY_CONFIG = {
  // 高频：金融数据
  market: {
    orderBook:      { staleTime: 3_000 },   // 3s — 订单簿高频变动
    lastPrice:      { staleTime: 2_000 },   // 2s — 实时价格
    twap:           { staleTime: 10_000 },  // 10s — TWAP 计算
    userOrders:     { staleTime: 5_000 },   // 5s — 用户挂单
    trades:         { staleTime: 5_000 },   // 5s — 成交记录
  },
  // 中频：业务数据
  order: {
    list:           { staleTime: 15_000 },  // 15s
    detail:         { staleTime: 10_000 },  // 10s
  },
  earnings: {
    singleLine:     { staleTime: 30_000 },  // 30s
    multiLevel:     { staleTime: 30_000 },  // 30s
    poolReward:     { staleTime: 15_000 },  // 15s — 分红池可能有轮次变化
    claimable:      { staleTime: 10_000 },  // 10s — 可领取金额
  },
  // 低频：配置数据
  member: {
    profile:        { staleTime: 60_000 },  // 60s
    levels:         { staleTime: 120_000 }, // 2min
  },
  product: {
    list:           { staleTime: 30_000 },  // 30s
    detail:         { staleTime: 30_000 },  // 30s
  },
  loyalty: {
    points:         { staleTime: 30_000 },  // 30s
    config:         { staleTime: 120_000 }, // 2min
  },
};
```

---

## 五、Pallet 接口映射

### 5.1 member pallet → 社区 & 邀请

| 用户操作 | Extrinsic | 页面 |
|---------|-----------|------|
| 加入社区 | `register_member(entity_id, referrer)` | 邀请页/社区首页 |
| 绑定推荐人 | `bind_referrer(entity_id, referrer)` | 邀请页 |
| 查看我的等级 | Storage: `EntityMembers` | 个人中心 |
| 查看等级体系 | Storage: `EntityLevelSystems` | 等级页 |
| 查看推荐网络 | Storage: `DirectReferrals` | 邀请页 |
| 查看升级进度 | Storage: `EntityUpgradeRules` + 成员数据 | 等级页 |

### 5.2 shop pallet → 店铺浏览

| 用户操作 | 数据来源 | 页面 |
|---------|---------|------|
| 浏览店铺列表 | Storage: `Shops` (按 entity 过滤) | 商城 |
| 查看店铺详情 | Storage: `Shops[shop_id]` | 店铺页 |
| 查看店铺状态 | `ShopOperatingStatus` | 店铺页 |

### 5.3 product pallet → 商品浏览

| 用户操作 | 数据来源 | 页面 |
|---------|---------|------|
| 商品列表 | Storage: `ShopProducts[shop_id]` → `Products[id]` | 商城 |
| 商品详情 | Storage: `Products[product_id]` | 商品详情 |
| 搜索/筛选 | 客户端过滤 + IPFS metadata | 商城 |

### 5.4 order pallet → 订单全流程

| 用户操作 | Extrinsic | 页面 |
|---------|-----------|------|
| 下单 | `place_order(shop_id, items, payment, address)` | 下单页 |
| 取消订单 | `cancel_order(order_id)` | 订单详情 |
| 确认收货 | `confirm_receipt(order_id)` | 订单详情 |
| 申请退款 | `request_refund(order_id, reason)` | 订单详情 |
| 更新地址 | `update_shipping_address(order_id, addr)` | 订单详情 |
| 延长确认期 | `extend_confirm_timeout(order_id)` | 订单详情 |
| 查看我的订单 | Storage: `BuyerOrders[account]` → `Orders[id]` | 我的订单 |

### 5.5 loyalty pallet → 积分系统

| 用户操作 | Extrinsic / Storage | 页面 |
|---------|---------------------|------|
| 查看积分余额 | Storage: `ShopPointsBalances[shop_id, account]` | 积分中心 |
| 转赠积分 | `transfer_points(shop_id, to, amount)` | 积分中心 |
| 兑换积分 | `redeem_points(shop_id, amount)` | 积分中心 |
| 查看 NEX 余额 | Storage: `MemberShoppingBalance[entity_id, account]` | 个人中心 |
| 查看 Token 余额 | Storage: `MemberTokenShoppingBalance[entity_id, account]` | 个人中心 |
| 积分配置 | Storage: `ShopPointsConfigs[shop_id]` | 积分中心 |

### 5.6 nex-market pallet → 交易所

| 用户操作 | Extrinsic | 页面 |
|---------|-----------|------|
| 挂卖单 | `place_sell_order(amount, price)` | 交易所 |
| 挂买单 | `place_buy_order(amount, price)` | 交易所 |
| 取消挂单 | `cancel_order(order_id)` | 交易所/我的挂单 |
| 预留卖单 | `reserve_sell_order(order_id)` | 交易所 |
| 接受买单 | `accept_buy_order(order_id)` | 交易所 |
| 确认付款 | `confirm_payment(trade_id, tx_hash)` | 交易详情 |
| 查看订单簿 | Storage: `SellOrders` + `BuyOrders` | 交易所 |
| 查看 K 线 | Storage: `TwapAccumulatorStore` + `LastTradePrice` | 交易所 |
| 我的挂单 | Storage: `UserOrders[account]` | 交易所 |
| 我的成交 | Storage: `UserTrades[account]` | 交易所 |
| 行情数据 | Storage: `MarketStatsStore`, `BestAsk`, `BestBid` | 交易所 |

### 5.7 single-line pallet → 单线排位

| 用户操作 | 数据来源 | 页面 |
|---------|---------|------|
| 查看我的排位 | Storage: `SingleLineIndex[entity_id, account]` | 单线排位 |
| 查看排位图 | Storage: `SingleLineSegments` (分页) | 单线排位 |
| 查看配置 | Storage: `SingleLineConfigs[entity_id]` | 单线排位 |
| 上下线佣金统计 | Storage: `EntitySingleLineStats[entity_id]` | 收益中心 |
| 查看暂停状态 | Storage: `SingleLineEnabled[entity_id]` | 单线排位 |

### 5.8 multi-level pallet → 多级佣金

| 用户操作 | 数据来源 | 页面 |
|---------|---------|------|
| 查看层级配置 | Storage: `MultiLevelConfigs[entity_id]` | 多级佣金 |
| 我的收益统计 | Storage: `MemberMultiLevelStats[entity_id, account]` | 多级佣金 |
| 激活进度 | Helper: `get_activation_progress(entity_id, account)` | 多级佣金 |
| 佣金预览 | Helper: `preview_commission(entity_id, account, amount)` | 下单页 |
| 实体统计 | Storage: `EntityMultiLevelStats[entity_id]` | 收益中心 |

### 5.9 pool-reward pallet → 分红池

| 用户操作 | Extrinsic / Storage | 页面 |
|---------|---------------------|------|
| 查看可领取 | RuntimeAPI: `get_claimable(entity_id, account)` | 分红池/收益 |
| 领取分红 | `claim_pool_reward(entity_id)` | 分红池 |
| 当轮快照 | Storage: `CurrentRound[entity_id]` | 分红池 |
| 历史轮次 | Storage: `RoundHistory[entity_id]` | 分红池 |
| 领取记录 | Storage: `ClaimRecords[entity_id, account]` | 分红池 |
| 分配统计 | Storage: `DistributionStatistics[entity_id]` | 分红池 |
| 我的等级份额 | RuntimeAPI: `get_pool_reward_member_view(...)` | 分红池 |

---

## 六、开发里程碑

### Phase 0 — 项目初始化（第 1 周）

| 任务 | 产出 |
|------|------|
| Expo 项目搭建 | app.json, metro.config.js, polyfill 配置 |
| NativeWind + 主题系统 | tailwind.config.js, theme/ 色彩/字体 |
| Polkadot.js 集成 | chain/api.ts + ApiProvider + 节点连接 |
| 钱包基础 | 创建/导入/Keychain 加密存储 + 生物识别解锁 |
| 路由骨架 | 所有页面空壳 + Tab 导航 + 页面跳转 |
| 基础组件 | Button, Card, GlassCard, Toast, Skeleton |

### Phase 1 — 社区 & 会员（第 2-3 周）

| 任务 | 对应 Pallet |
|------|------------|
| 社区首页（数据面板 + 动态流） | member |
| 会员注册 + 绑定推荐人 | member |
| 等级体系展示 + 升级进度 | member |
| 邀请裂变（邀请码 + 海报 + 推荐关系树） | member |
| 积分中心（余额、转赠、兑换） | loyalty |

### Phase 2 — 商城 & 订单（第 4-5 周）

| 任务 | 对应 Pallet |
|------|------------|
| 商品列表（瀑布流 + 筛选 + 搜索） | product, shop |
| 商品详情（规格、库存、佣金预览） | product |
| 下单流程（地址、支付方式选择、NEX/Token） | order |
| 订单列表 + 详情（状态跟踪、确认收货） | order |
| 退款流程（申请、等待、结果） | order |
| 店铺主页 | shop |

### Phase 3 — 交易所（第 6-7 周）

| 任务 | 对应 Pallet |
|------|------------|
| 行情页（价格、涨跌、24H数据） | nex-market |
| 订单簿（红绿色阶深度） | nex-market |
| K 线图（分时、日线、TWAP 覆盖） | nex-market |
| 买卖挂单（限价单表单 + 比例滑块） | nex-market |
| 交易流程（付款 → 确认 → 完成） | nex-market |
| 我的挂单 + 成交历史 | nex-market |

### Phase 4 — 收益体系（第 8-9 周）

| 任务 | 对应 Pallet |
|------|------------|
| 收益总览（汇总 3 类佣金 + 趋势图） | 全部 commission |
| 单线排位（排位可视化 + 上下线明细） | single-line |
| 多级佣金（层级树 + 激活进度环 + 条件达成） | multi-level |
| 分红池（当轮/历史、份额计算、一键领取） | pool-reward |
| 到账推送通知 | 全部 commission |

### Phase 5 — 钱包 & 完善（第 10-11 周）

| 任务 | 说明 |
|------|------|
| 钱包首页（NEX + Token 余额） | 多资产展示 |
| 转账 + 收款二维码 | sr25519 签名 |
| WalletConnect v2 | 外部钱包连接 |
| 设置页（语言/节点/安全/关于） | 系统配置 |
| 链上事件推送 → 本地通知 | 订单、佣金、分红事件 |
| 性能优化（列表虚拟化、图片缓存） | FlatList / FlashList |

### Phase 6 — 测试 & 发布（第 12 周）

| 任务 | 说明 |
|------|------|
| E2E 测试（Detox） | 核心流程覆盖 |
| 性能测试 | Flipper / Perf Monitor |
| EAS Build + 云构建 | iOS TestFlight + Android APK |
| App Store / Google Play 提交 | 首发版本 |

---

## 七、依赖清单

```jsonc
{
  "dependencies": {
    // === 框架 ===
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "react": "18.3.1",
    "react-native": "0.76.x",

    // === 链交互 ===
    "@polkadot/api": "^12.4.2",
    "@polkadot/keyring": "^13.2.3",
    "@polkadot/util": "^13.2.3",
    "@polkadot/util-crypto": "^13.2.3",

    // === 状态管理 ===
    "zustand": "^5.0.0",
    "@tanstack/react-query": "^5.62.0",

    // === UI ===
    "react-native-paper": "^5.12.0",
    "nativewind": "^4.1.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-svg": "^15.8.0",
    "react-native-gifted-charts": "^1.4.0",
    "lottie-react-native": "^7.1.0",
    "@gorhom/bottom-sheet": "^5.0.0",
    "@shopify/flash-list": "^1.7.0",
    "react-native-fast-image": "^8.6.3",

    // === 表单 ===
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^5.2.2",
    "zod": "^3.24.0",

    // === 钱包 ===
    "@walletconnect/modal-react-native": "^1.3.0",
    "expo-secure-store": "~14.0.0",
    "expo-local-authentication": "~15.0.0",

    // === 工具 ===
    "react-native-mmkv": "^3.1.0",
    "expo-notifications": "~0.29.0",
    "react-native-qrcode-svg": "^6.3.0",
    "i18next": "^24.0.0",
    "react-i18next": "^15.1.0",
    "dayjs": "^1.11.13"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/react": "~18.3.0",
    "tailwindcss": "^3.4.16",
    "prettier": "^3.4.0",
    "eslint": "^8.57.0",
    "detox": "^20.0.0"
  }
}
```

---

## 八、Polkadot.js 移动端适配要点

### 8.1 WebSocket + Crypto Polyfill

React Native 不内置 WebSocket 的 `TextEncoder` 和 Node.js crypto，需在 `metro.config.js` 中配置：

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  crypto: require.resolve('react-native-quick-crypto'),
  stream: require.resolve('readable-stream'),
  buffer: require.resolve('@craftzdog/react-native-buffer'),
};

module.exports = config;
```

### 8.2 sr25519 WASM 兼容

`@polkadot/wasm-crypto` 在 RN 中需使用 ASM.js fallback：

```typescript
// 在 app/_layout.tsx 最顶部
import { cryptoWaitReady } from '@polkadot/util-crypto';

// 应用启动时初始化
await cryptoWaitReady();
```

### 8.3 安全密钥存储

```typescript
// lib/wallet/secure-store.ts
import * as SecureStore from 'expo-secure-store';
import * as LocalAuth from 'expo-local-authentication';

export async function saveMnemonic(mnemonic: string, password: string) {
  const encrypted = encrypt(mnemonic, password); // AES-256
  await SecureStore.setItemAsync('wallet_mnemonic', encrypted, {
    requireAuthentication: true,        // 需生物识别
    authenticationPrompt: '解锁钱包',
  });
}

export async function unlockWallet(): Promise<Keyring | null> {
  const result = await LocalAuth.authenticateAsync({
    promptMessage: '验证身份以访问钱包',
    disableDeviceFallback: false,
  });
  if (!result.success) return null;
  // ... 解密并构建 Keyring
}
```

---

## 九、关键设计原则

### 9.1 社区感

- **实时动态流**：链上事件（注册、下单、佣金到账）实时推送到社区首页
- **成员可见性**：排行榜、等级徽章、团队规模 — 让每个成员感受到「我是社区的一部分」
- **邀请裂变**：生成带个人邀请码的分享海报，一键分享到社交平台
- **等级进度**：游戏化的升级体验，用进度环和动画展示「距离下一级还差 XX」

### 9.2 金融属性感

- **数字精度**：金额永远使用等宽字体，大数字用数字滚动动画
- **红绿对比**：涨跌用强烈的颜色对比（#00E676 / #FF5252），不依赖文字
- **实时刷新**：价格数据 2-3 秒刷新，订单簿用渐变色表达深度
- **收益可视化**：折线图展示收益趋势，饼图展示收益构成，一目了然
- **操作确认**：涉及资金的操作必须二次确认 + 生物识别

### 9.3 性能底线

| 指标 | 目标 |
|------|------|
| 冷启动 | < 2s（骨架屏 → 数据填充） |
| 列表滚动 | 60fps（FlashList + 图片缓存） |
| 交易提交 | < 500ms 签名 + 即时 Toast 反馈 |
| 内存 | < 200MB（避免全量存储查询） |
| 包体积 | < 25MB (Android APK) |

---

## 十、文件命名与代码规范

```
文件命名：kebab-case
  app/earnings/single-line.tsx
  src/hooks/chain/use-market.ts

组件命名：PascalCase
  EarningsSummary.tsx → export function EarningsSummary()

Hook 命名：camelCase + use 前缀
  use-market.ts → export function useMarketOrders()

Store 命名：camelCase + Store 后缀
  walletStore.ts → export const useWalletStore = create(...)

类型命名：PascalCase + 无 I 前缀
  OrderStatus, MemberLevel, PoolRewardRound

常量命名：SCREAMING_SNAKE_CASE
  MAX_RETRY_COUNT, DEFAULT_STALE_TIME
```

---

> **本文档覆盖 9 个 Pallet 的全部用户端接口映射，18 个核心页面，6 个开发阶段。**
> **技术栈基于 Nexus 团队现有 React/TypeScript 经验，选择 Expo + React Native 实现真原生移动体验。**
