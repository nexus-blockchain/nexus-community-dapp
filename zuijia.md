# Nexus Community dApp — 最佳融合方案

> 融合 `设计开发.md`（Web/PWA 快速落地）与 `DEVELOPMENT.md`（原生体验与安全）的全部优势，
> 形成一份可直接指导开发的完整技术设计文档。

---

## 一、总体策略

### 核心结论

**不是二选一，而是分阶段递进：**

| 阶段 | 交付形态 | 核心目标 |
|------|---------|---------|
| **V1** | Next.js 14 + PWA（移动优先） | 最快跑通业务闭环，支撑邀请裂变与社群传播 |
| **V1.5** | TWA / Capacitor 临时壳（可选） | 快速上架 Android 市场、提供桌面图标入口 |
| **V2** | React Native + Expo 原生 App | 钱包安全、推送通知、高频交易、生物识别 |
| **长期** | Monorepo 共享业务内核 | Web / Native 共用 domain / chain-sdk / wallet-bridge |

### 选择理由

| 维度 | V1 选 Next.js PWA 的理由 | V2 选 React Native 的理由 |
|------|------------------------|-------------------------|
| 复用 | 与 nexus-entity-dapp 技术栈完全一致，代码/组件/hooks 直接复用 | 金融图表、手势动画需要原生渲染 |
| 速度 | 团队零迁移成本，浏览器直开，部署即发布 | Expo OTA 热更新，无需重新提交商店 |
| 传播 | H5 链接适合邀请裂变、社群分享 | 原生推送通知（佣金到账、订单状态） |
| 安全 | 浏览器扩展钱包 + WalletConnect 足够 MVP | Keychain/Keystore + 生物识别才是生产级 |
| 性能 | 社区/商城/收益页面 Web 体验足够 | 交易所 K 线/深度图/订单簿需原生 60fps |

---

## 二、产品定位与目标用户

### 产品关键词

- **社区感**：邀请关系、会员成长、社群身份、等级荣誉、团队可视化
- **金融感**：资产面板、收益流水、奖池领取、积分/购物金/Token 余额、NEX 市场
- **交易感**：商品浏览、下单支付、履约售后、订单托管、交易状态清晰
- **信任感**：链上记录、可追溯、可验证、状态透明、风控提示明确

### 目标用户

1. **普通用户 / 会员**：加入社区、购买商品、赚取积分/购物金/返佣
2. **团长 / 推广者**：查看推荐链路、多级收益、奖池奖励、团队成长
3. **店主 / 店铺管理员**：管理店铺、商品、订单、会员、返佣策略
4. **平台运营 / 风控**：市场异常处理、争议处理、封禁、配置开关

---

## 三、技术栈选型

### V1 主栈（Next.js PWA）

| 层级 | 技术选择 | 选型理由 |
|------|---------|---------|
| **框架** | Next.js 14 (App Router) | 与 entity-dapp 一致，SSR/SSG 支持 |
| **语言** | TypeScript | 全栈类型安全 |
| **UI 组件** | Radix UI + 自定义 Design System | 无障碍、无样式锁定、与 entity-dapp 统一 |
| **样式** | Tailwind CSS | 与 entity-dapp 统一，utility-first |
| **状态管理** | Zustand 5 + TanStack React Query 5 | 链上查询缓存 + 本地状态分离 |
| **表单** | React Hook Form 7 + Zod 3 | 与 entity-dapp 一致 |
| **链交互** | @polkadot/api 12.x | Web 端最成熟，entity-dapp 已验证 |
| **图表** | Recharts | 轻量、React 原生、够用 |
| **国际化** | next-intl | 与 entity-dapp 一致 |
| **钱包** | @polkadot/extension-dapp + WalletConnect | 浏览器扩展 + 移动钱包深链 |
| **发布** | PWA (Service Worker + Manifest) | 移动 Web 直开、可安装到桌面 |

### V2 增强栈（React Native Expo）

| 层级 | 技术选择 | 选型理由 |
|------|---------|---------|
| **框架** | React Native 0.76 + Expo SDK 52 | 真原生渲染，60fps |
| **路由** | Expo Router v4 (文件系统路由) | 类 Next.js App Router |
| **UI 组件** | React Native Paper 5 + 自定义 Design System | Material Design 3 |
| **样式** | NativeWind 4 (Tailwind for RN) | 与 Web 端 Tailwind 体系统一 |
| **图表** | react-native-gifted-charts | 原生 Canvas 渲染，K 线/深度图 |
| **动画** | react-native-reanimated 3 | 原生 60fps 动画 |
| **钱包** | WalletConnect v2 + 内置 Keyring | 移动端标准方案 |
| **安全存储** | expo-secure-store + expo-local-authentication | Keychain/Keystore + 生物识别 |
| **本地存储** | MMKV (react-native-mmkv) | 高性能 KV，替代 AsyncStorage |
| **推送** | Expo Notifications | 链上事件 → 本地推送 |
| **构建** | EAS Build | iOS TestFlight + Android APK |

### 共享层（Monorepo packages）

```text
packages/
  domain/          # 业务模型、Zod schema、use cases、常量
  chain-sdk/       # @polkadot/api 封装、Runtime API、事件解析、Tx Builder
  wallet-bridge/   # Extension / WalletConnect / Embedded Signer 统一抽象
  ui-tokens/       # 色彩、间距、字号、图标语义 (Design Tokens)
  query-keys/      # TanStack Query key 工厂 + 缓存策略配置
  format/          # 金额/地址/时间/区块 格式化工具
```

---

## 四、信息架构

### 底部导航（5 Tab）

1. **社区**（兼首页）
2. **商城**
3. **市场**
4. **收益**
5. **我的**

> 市场必须一级入口（金融属性核心）；社区兼任首页（减少层级）。

### 页面结构

#### A. 社区（首页）

- 顶部沉浸式资产卡（总资产估值 / 今日新增 / 待领取）
- 社区成长卡（等级 / 升级进度 / 团队人数 / 直推人数）
- 热门商品横向轮播
- NEX 市场行情摘要（Best Ask / Best Bid / Last Price）
- 社区实时动态流（链上事件：注册、下单、佣金到账）
- 快捷入口（加入社区 / 去赚奖励 / 去逛商城 / 去交易市场）
- 今日任务卡（邀请 1 人 / 完成 1 单 / 领取奖池）

#### B. 商城

- 店铺列表 / 分类筛选 / 搜索
- 商品瀑布流（双列）
- 会员价 / 购物金可抵扣标签 / 佣金预览标签
- 商品详情（规格、库存、评分、抵扣选择、下单栏）
- 店铺主页
- 订单列表（待支付 / 待发货 / 待收货 / 售后中 / 已完成）
- 订单详情（商品信息 / 支付资产 / 托管状态 / 物流 / 退款入口）

#### C. 市场（NEX 交易所）

- 实时价格 + 涨跌色 + 24H 数据
- K 线 / 深度图（可切换 1H / 4H / 1D / 1W / TWAP）
- 订单簿（红绿色阶深度）
- 买卖挂单表单（限价单 + 比例滑块）
- 我的挂单 / 成交历史
- 交易详情（付款 → 确认 → 完成 / 争议）
- USDT 支付凭证上传 / 争议证据上传

#### D. 收益

- 总收益卡（大数字 + 迷你趋势图）
- 收益构成（单线佣金 / 多级佣金 / 分红池 — 可展开卡片）
- 积分余额 / NEX 购物金 / Token 购物金
- 收益明细流水 Tabs
- 奖池页（当前轮次 / 快照 / 可领取 / 历史 / 领取记录）
- 提示：哪些收益可立即使用，哪些需要领取

#### E. 我的

- 钱包连接 / 账户切换 / 余额卡片
- 个人资料 / 会员身份 / 等级进度
- 我的订单 / 我的团队 / 邀请裂变（海报 / 邀请码 / 分享）
- 推荐关系图（直推列表 / 上级链路 / 团队树 1~3 层展开）
- 安全设置 / 语言 / 节点切换
- 若为管理员：进入运营工作台

### 管理端（移动轻运营 + 桌面完整版）

移动端仅保留高频轻操作：
- 店铺管理、商品管理、订单管理
- 会员审批、返佣策略轻配置
- 风控状态查看

复杂治理配置、批量运营、长表单策略编辑 → 保留在桌面 Web 运营台。

### 核心页面路由清单

| # | 页面 | Web 路由 | Native 路由 | 对应 Pallet |
|---|------|---------|------------|------------|
| 1 | 社区首页 | `/(mobile)/` | `/(tabs)/community` | member, loyalty |
| 2 | 商城 | `/(mobile)/mall` | `/(tabs)/shop` | shop, product |
| 3 | 交易所 | `/(mobile)/market` | `/(tabs)/market` | nex-market |
| 4 | 收益中心 | `/(mobile)/earnings` | `/(tabs)/earnings` | commission-* |
| 5 | 我的 | `/(mobile)/me` | `/(tabs)/profile` | member, loyalty, order |
| 6 | 社区详情 | `/community/[id]` | `/community/[id]` | member |
| 7 | 会员等级 | `/member/levels` | `/member/levels` | member |
| 8 | 邀请裂变 | `/member/invite` | `/member/invite` | member, single-line |
| 9 | 商品详情 | `/product/[id]` | `/product/[id]` | product |
| 10 | 下单 | `/order/create` | `/order/create` | order |
| 11 | 订单详情 | `/order/[id]` | `/order/[id]` | order |
| 12 | 店铺主页 | `/shop/[id]` | `/shop/[id]` | shop, product |
| 13 | 积分中心 | `/loyalty/points` | `/loyalty/points` | loyalty |
| 14 | 单线排位 | `/earnings/single-line` | `/earnings/single-line` | single-line |
| 15 | 多级佣金 | `/earnings/multi-level` | `/earnings/multi-level` | multi-level |
| 16 | 分红池 | `/earnings/pool-reward` | `/earnings/pool-reward` | pool-reward |
| 17 | 交易详情 | `/market/trade/[id]` | `/market/trade/[id]` | nex-market |
| 18 | 钱包 | `/wallet` | `/wallet` | - |
| 19 | 设置 | `/settings` | `/settings` | - |

---

## 五、UI 设计体系

### 5.1 设计语言

**关键词**：`科技金融` · `社区温度` · `信任感` · `轻奢资产感`

### 5.2 色彩系统（Dark Mode First）

| 用途 | 色值 | 说明 |
|------|------|------|
| 主背景 | `#0A0E1A` → `#07111F` | 深邃太空蓝 |
| 卡片背景 | `#1A1F35` / `rgba(255,255,255,0.06)` | 微透明毛玻璃 |
| 主色 | `#6C5CE7` / `#6D5EF8` | Nexus 紫（品牌色） |
| 辅色 | `#00D2FF` / `#35C2FF` | 科技蓝（金融数据） |
| 成功/涨 | `#00E676` / `#17C784` | 收益、增长 |
| 警告 | `#FFB74D` / `#FF9F43` | 中性提示 |
| 危险/跌 | `#FF5252` | 错误、下跌 |
| 尊贵金 | `#F4C95D` | 等级、会员、荣誉 |
| 文字主色 | `#F8FAFC` / `#F5F7FB` | 主文字 |
| 文字次级 | `#94A3B8` / `#98A2B3` | 次文字 |

### 5.3 字体规范

| 场景 | 字体 | 说明 |
|------|------|------|
| 数字/金额 | SF Mono / JetBrains Mono | 等宽，金融盘面风格 |
| 正文 | SF Pro / PingFang SC | 标准阅读 |
| 标题 | SF Pro Display / Bold | 层级区分 |

### 5.4 组件风格

- 卡片：圆角 `20~24px`、毛玻璃效果
- 按钮：主按钮渐变填充，次按钮描边玻璃态
- 图表：细线、发光点、柔和面积阴影
- 会员等级：徽章化 + 金属色层级
- 收益数值：金融盘面风格大数字
- 骨架屏：所有数据加载前先展示 Skeleton

### 5.5 社区感设计表达

- 社区头像墙 / 推荐关系树
- 会员勋章、身份铭牌、等级成就
- 邀请海报与裂变分享卡
- 实时动态流（链上事件推送到首页）
- "社区活跃中""本轮奖池进行中"等状态灯

### 5.6 金融属性设计表达

- 数字精度：金额永远使用等宽字体，大数字用数字滚动动画
- 红绿对比：涨跌用强烈颜色对比，不依赖文字
- 实时刷新：价格 2-3 秒刷新，订单簿渐变色表达深度
- 收益可视化：折线图趋势 + 饼图构成
- 操作确认：涉及资金的操作必须二次确认（V2 增加生物识别）

### 5.7 交互动效规范（V2 原生增强）

| 场景 | 动效 | 技术 |
|------|------|------|
| 佣金到账 | 数字从 0 滚动到实际值 + 金币粒子 | Reanimated SharedValue |
| 领取分红 | 按钮按下 → 脉冲扩散 → 成功对勾 | Reanimated + Lottie |
| 社区动态 | 新消息从顶部滑入 + 淡入 | LayoutAnimation |
| 商品卡片 | 按下缩放 0.96 + 弹起 | Pressable + Reanimated |
| 订单状态 | 步骤条流光动画 | SVG Animated Dash |
| K 线图 | 手指长按显示十字光标 | GestureHandler + Canvas |
| 页面切换 | 共享元素过渡（商品图） | SharedTransition |
| 下拉刷新 | 弹性阻尼 + 链上区块高度刷新 | Custom RefreshControl |

### 5.8 核心页面 Mockup

#### 社区首页

```
┌─────────────────────────────────────┐
│  ▓▓ Nexus Community        [钱包]  │  ← 顶栏
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │  欢迎回来, 0x7a3f...            │ │  ← 个人卡片（毛玻璃）
│ │  Lv.3 高级会员                  │ │
│ │  ┌────────┐ ┌────────┐         │ │
│ │  │  NEX   │ │  积分   │         │ │     资产速览
│ │  │ 12,450 │ │ 3,200  │         │ │
│ │  └────────┘ └────────┘         │ │
│ └─────────────────────────────────┘ │
│                                     │
│  社区数据                     更多> │  ← 实时链上数据
│  ┌────────┬────────┬────────┐      │
│  │ 成员数  │ 今日订单│ 佣金池 │      │
│  │ 2,847  │  156   │ ¥45.2K │      │
│  │ +12    │ +23%   │ 待分配  │      │
│  └────────┴────────┴────────┘      │
│                                     │
│  热门商品                 查看全部> │  ← 横向卡片轮播
│  ┌────────┐ ┌────────┐ ┌────┐      │
│  │ 商品图  │ │ 商品图  │ │ .. │      │
│  │ ¥299   │ │ ¥199   │ │    │      │
│  └────────┘ └────────┘ └────┘      │
│                                     │
│  社区动态                           │  ← Event 流
│  ├─ Alice 升级为 Lv.4       2分前  │
│  ├─ Bob 领取佣金 ¥320       5分前  │
│  └─ Carol 下单 #10234      12分前  │
│                                     │
├─────────────────────────────────────┤
│  社区    商城    市场    收益    我的 │
└─────────────────────────────────────┘
```

#### 交易所

```
┌─────────────────────────────────────┐
│  NEX / USDT          [切换交易对]   │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │         K 线 / 深度图            ││
│  │     ╱\                          ││
│  │   ╱   \    ╱╲                   ││
│  │ ╱      \╱╱   \                  ││
│  │  1H  4H  1D  1W   TWAP         ││
│  └─────────────────────────────────┘│
│                                     │
│  ¥ 0.0832  ▲ +2.4%       24H Vol  │
│                          ¥1.2M     │
│                                     │
│ ┌───────────────┬───────────────┐   │
│ │   卖出 (Ask)   │   买入 (Bid)  │   │
│ │ 0.0845  1,200 │   850  0.0820│   │
│ │ 0.0842    800 │ 1,500  0.0818│   │
│ │ 0.0840  2,100 │ 3,200  0.0815│   │
│ └───────────────┴───────────────┘   │
│                                     │
│ ┌────────────────────────────────┐  │
│ │ [  买入  ]     [  卖出  ]      │  │
│ │ 价格:  [  0.0832  ]           │  │
│ │ 数量:  [          ]  [MAX]    │  │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 75%      │  │
│ │ [     买入 NEX     ]           │  │
│ └────────────────────────────────┘  │
├─────────────────────────────────────┤
│  社区    商城    市场    收益    我的 │
└─────────────────────────────────────┘
```

#### 收益中心

```
┌─────────────────────────────────────┐
│  我的收益                    本月 ▼ │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │      总收益 (NEX)               ││
│  │     ¥ 12,680.50                 ││
│  │     +¥ 1,230 本月    ▲ 12.8%   ││
│  │  ┌──────────────────────────┐   ││
│  │  │    ╱╲   ╱╲               │   ││  ← 30天趋势
│  │  │  ╱   ╲╱   ╲  ╱          │   ││
│  │  │╱            ╲╱           │   ││
│  │  └──────────────────────────┘   ││
│  └─────────────────────────────────┘│
│                                     │
│  收益构成                           │
│  ┌────────────────────────────────┐ │
│  │ 单线佣金                       │ │
│  │    ¥ 5,200    上线:3 下线:12   │ │
│  ├────────────────────────────────┤ │
│  │ 多级佣金                       │ │
│  │    ¥ 4,180    已激活: 5/8 层   │ │
│  ├────────────────────────────────┤ │
│  │ 分红池                         │ │
│  │    ¥ 3,300    第 12 轮         │ │
│  │    可领取: ¥ 280  [立即领取]   │ │
│  └────────────────────────────────┘ │
│                                     │
│  最近到账                     更多> │
│  ├─ +¥320 单线佣金 #ORD-10234  2h │
│  ├─ +¥180 多级佣金 L3→L1      4h │
│  └─ +¥280 分红池 R12 领取     1d  │
├─────────────────────────────────────┤
│  社区    商城    市场    收益    我的 │
└─────────────────────────────────────┘
```

#### 商城

```
┌─────────────────────────────────────┐
│  社区商城                [搜索] [筛选]│
├─────────────────────────────────────┤
│  [全部] [热销] [新品] [积分可换]    │
│                                     │
│  ┌────────────┐  ┌────────────┐    │  ← 双列瀑布流
│  │   ┌──────┐ │  │   ┌──────┐ │    │
│  │   │ 商品 │ │  │   │ 商品 │ │    │
│  │   │ 图片 │ │  │   │ 图片 │ │    │
│  │   └──────┘ │  │   └──────┘ │    │
│  │ 精选好物A  │  │ 精品好物B  │    │
│  │ ¥299      │  │ ¥199      │    │
│  │ 返佣¥30   │  │ 返佣¥20   │    │  ← 佣金预览标签
│  │ 已售 223   │  │ 已售 156   │    │
│  └────────────┘  └────────────┘    │
│  ┌────────────┐  ┌────────────┐    │
│  │ 好物C      │  │ 好物D      │    │
│  │ ¥599      │  │ 200积分    │    │  ← 支持积分标价
│  │ 返佣¥60   │  │ 积分兑换   │    │
│  └────────────┘  └────────────┘    │
│           ↕ 下拉加载更多            │
├─────────────────────────────────────┤
│  社区    商城    市场    收益    我的 │
└─────────────────────────────────────┘
```

---

## 六、项目架构

### 6.1 Monorepo 目录结构

```text
nexus-community-dapp/
├── apps/
│   ├── web/                             # V1: Next.js PWA 主用户端
│   │   ├── app/
│   │   │   ├── (mobile)/                # 移动优先布局
│   │   │   │   ├── page.tsx             # 社区首页
│   │   │   │   ├── community/
│   │   │   │   ├── mall/
│   │   │   │   ├── earnings/
│   │   │   │   ├── market/
│   │   │   │   └── me/
│   │   │   ├── product/[id]/
│   │   │   ├── order/
│   │   │   ├── shop/[id]/
│   │   │   ├── member/
│   │   │   ├── loyalty/
│   │   │   ├── wallet/
│   │   │   └── settings/
│   │   ├── features/                    # 按业务域组织
│   │   │   ├── home/
│   │   │   ├── community/
│   │   │   ├── member/
│   │   │   ├── referral/
│   │   │   ├── commission/
│   │   │   ├── loyalty/
│   │   │   ├── shop/
│   │   │   ├── product/
│   │   │   ├── order/
│   │   │   ├── market/
│   │   │   ├── profile/
│   │   │   └── admin/
│   │   └── shared/
│   │       ├── ui/                      # Web 专用 UI 组件 (Radix)
│   │       ├── layout/
│   │       └── theme/
│   │
│   ├── admin/                           # 桌面运营台 (Next.js)
│   │
│   └── mobile/                          # V2: React Native Expo App
│       ├── app/                         # Expo Router 文件系统路由
│       │   ├── _layout.tsx
│       │   ├── (auth)/
│       │   ├── (tabs)/
│       │   │   ├── community.tsx
│       │   │   ├── shop.tsx
│       │   │   ├── market.tsx
│       │   │   ├── earnings.tsx
│       │   │   └── profile.tsx
│       │   ├── product/[id].tsx
│       │   ├── order/
│       │   ├── shop/[id].tsx
│       │   ├── member/
│       │   ├── loyalty/
│       │   ├── earnings/
│       │   ├── market/trade/[id].tsx
│       │   ├── wallet/
│       │   └── settings/
│       └── src/
│           ├── components/              # RN 专用组件
│           │   ├── ui/                  # GlassCard, AnimatedNumber, Skeleton...
│           │   ├── community/
│           │   ├── shop/
│           │   ├── market/              # OrderBook, KLineChart, DepthChart...
│           │   ├── earnings/
│           │   ├── order/
│           │   └── wallet/
│           ├── hooks/
│           │   ├── chain/               # 链上查询 Hooks (引用 packages/chain-sdk)
│           │   ├── mutations/           # 链上交易 Hooks
│           │   ├── useWallet.ts
│           │   ├── useBiometric.ts
│           │   └── useNotification.ts
│           ├── stores/                  # Zustand (引用 packages/domain)
│           ├── theme/
│           └── i18n/
│
├── packages/
│   ├── domain/                          # 业务模型（Web + Native 共享）
│   │   ├── models/                      # OrderStatus, MemberLevel...
│   │   ├── schemas/                     # Zod validation schemas
│   │   ├── constants/                   # 业务常量
│   │   └── use-cases/                   # 纯业务逻辑
│   │
│   ├── chain-sdk/                       # 链交互封装（Web + Native 共享）
│   │   ├── api.ts                       # @polkadot/api 初始化
│   │   ├── constants.ts                 # SS58, decimals
│   │   ├── endpoints.ts                 # RPC 节点列表
│   │   ├── types.ts                     # 链上类型定义
│   │   ├── queries/                     # 按 pallet 组织的读取函数
│   │   ├── mutations/                   # 按 pallet 组织的交易函数
│   │   ├── runtime-api/                 # Runtime API 调用封装
│   │   ├── subscriptions/               # 事件订阅
│   │   └── parsers/                     # 链上数据 → 前端模型 转换
│   │
│   ├── wallet-bridge/                   # 钱包抽象（Web + Native 共享）
│   │   ├── interface.ts                 # 统一 WalletBridge 接口
│   │   ├── web-extension.ts             # 浏览器扩展钱包适配器
│   │   ├── walletconnect.ts             # WalletConnect 适配器
│   │   ├── deeplink.ts                  # 移动钱包深链适配器
│   │   └── embedded.ts                  # V2 内置 Keyring 适配器
│   │
│   ├── ui-tokens/                       # Design Tokens（Web + Native 共享）
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── shadows.ts
│   │
│   ├── query-keys/                      # TanStack Query key + 缓存策略
│   │   └── index.ts
│   │
│   └── format/                          # 格式化工具
│       ├── balance.ts                   # 金额格式化 (NEX / USDT / 积分 / Token)
│       ├── address.ts                   # 地址缩写
│       └── time.ts                      # 时间 / 区块转换
│
└── services/
    ├── bff/                             # 聚合接口
    └── indexer/                         # 排行榜、订单聚合、收益汇总、市场摘要
```

### 6.2 数据流架构

```text
                    ┌──────────────┐
                    │  Nexus Chain │
                    │  (Substrate) │
                    └──────┬───────┘
                           │ WebSocket (wss://)
                           ▼
              ┌────────────────────────┐
              │   packages/chain-sdk   │
              │   @polkadot/api        │
              └────────────┬───────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌─────────────┐ ┌──────────────┐ ┌───────────┐
   │ React Query │ │ Subscription │ │   Tx      │
   │ (查询缓存)   │ │ (事件监听)    │ │ (交易提交) │
   │             │ │              │ │           │
   │ staleTime   │ │ system.events│ │ signAndSend│
   │ 按模块配置   │ │ → 分发到对应  │ │ → 状态追踪 │
   │             │ │   Query 刷新  │ │ → 错误解析 │
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

### 6.3 React Query 缓存策略

```typescript
const QUERY_CONFIG = {
  // 高频：金融数据
  market: {
    orderBook:      { staleTime: 3_000 },   // 3s
    lastPrice:      { staleTime: 2_000 },   // 2s
    twap:           { staleTime: 10_000 },  // 10s
    userOrders:     { staleTime: 5_000 },   // 5s
    trades:         { staleTime: 5_000 },   // 5s
  },
  // 中频：业务数据
  order: {
    list:           { staleTime: 15_000 },  // 15s
    detail:         { staleTime: 10_000 },  // 10s
  },
  earnings: {
    singleLine:     { staleTime: 30_000 },  // 30s
    multiLevel:     { staleTime: 30_000 },  // 30s
    poolReward:     { staleTime: 15_000 },  // 15s
    claimable:      { staleTime: 10_000 },  // 10s
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

### 6.4 数据访问分层原则

| 数据来源 | 负责场景 | 适用模块 |
|---------|---------|---------|
| **链直连 (Runtime API)** | 会员仪表盘、推荐树、分页查询、市场行情 | member, nex-market |
| **链直连 (Storage)** | 用户关键状态读取、交易提交、签名 | shop, product, order, loyalty, commission-* |
| **BFF / Indexer** | 首页推荐流、排行榜、订单聚合、收益总览、搜索、K 线聚合 | 所有模块的聚合视图 |

> 对移动端来说，首页推荐流、排行榜、收益总览、订单聚合都更适合通过 Indexer / BFF 提供，而不是直接遍历链上存储。

---

## 七、9 大 Pallet 接口完整映射

### 7.1 member pallet → 社区 & 会员 & 邀请

**读取**
| 用户操作 | 数据来源 | 页面 |
|---------|---------|------|
| 查看我的信息 | RuntimeAPI: `get_member_info` | 个人中心 |
| 查看推荐网络 | RuntimeAPI: `get_referral_team` / `get_referral_tree` | 邀请页 |
| 查看上级链路 | RuntimeAPI: `get_upline_chain` | 邀请页 |
| 按代查推荐 | RuntimeAPI: `get_referrals_by_generation` | 邀请页 |
| 查看等级体系 | Storage: `EntityLevelSystems` | 等级页 |
| 查看升级进度 | Storage: `EntityUpgradeRules` + 成员数据 | 等级页 |

**写入**
| 用户操作 | Extrinsic | 页面 |
|---------|-----------|------|
| 加入社区 | `register_member(entity_id, referrer)` | 社区首页/邀请页 |
| 绑定推荐人 | `bind_referrer(entity_id, referrer)` | 邀请页 |
| 审批会员 | `approve_member` / `reject_member` | 审批中心 |
| 激活/停用 | `activate_member` / `deactivate_member` | 管理台 |
| 离开社区 | `leave_entity` | 个人中心 |

### 7.2 shop pallet → 店铺

**读取**
| 用户操作 | 数据来源 | 页面 |
|---------|---------|------|
| 店铺列表 | Storage: `Shops` (按 entity 过滤) | 商城 |
| 店铺详情 | Storage: `Shops[shop_id]` | 店铺页 |
| 店铺状态 | `ShopOperatingStatus` | 店铺页 |

**写入（管理员）**
| 操作 | Extrinsic |
|------|-----------|
| 创建店铺 | `create_shop` |
| 更新店铺 | `update_shop` |
| 注入资金 | `fund_operating` |
| 暂停/恢复 | `pause_shop` / `resume_shop` |
| 关闭店铺 | `close_shop` |
| 设置位置 | `set_location` |

### 7.3 product pallet → 商品

**读取**
| 用户操作 | 数据来源 | 页面 |
|---------|---------|------|
| 商品列表 | Storage: `ShopProducts[shop_id]` → `Products[id]` | 商城 |
| 商品详情 | Storage: `Products[product_id]` | 商品详情 |
| 搜索/筛选 | 客户端过滤 + IPFS metadata（二期走 Indexer） | 商城 |

**写入（管理员）**
| 操作 | Extrinsic |
|------|-----------|
| 创建商品 | `create_product` |
| 更新商品 | `update_product` |
| 上/下架 | `publish_product` / `unpublish_product` |
| 删除商品 | `delete_product` |

### 7.4 order pallet → 订单全流程

| 用户操作 | Extrinsic | 页面 |
|---------|-----------|------|
| 下单 | `place_order(shop_id, items, payment, address)` | 下单页 |
| 代下单 | `place_order_for` | 管理台 |
| 取消订单 | `cancel_order(order_id)` | 订单详情 |
| 确认收货 | `confirm_receipt(order_id)` | 订单详情 |
| 申请退款 | `request_refund(order_id, reason)` | 订单详情 |
| 审批退款 | `approve_refund` / `reject_refund` | 管理台 |
| 发货 | `ship_order` | 管理台 |
| 更新物流 | `update_tracking` | 管理台 |
| 延长确认期 | `extend_confirm_timeout(order_id)` | 订单详情 |
| 查看我的订单 | Storage: `BuyerOrders[account]` → `Orders[id]` | 我的订单 |

### 7.5 loyalty pallet → 积分 & 购物金

**读取**
| 用户操作 | Storage | 页面 |
|---------|---------|------|
| 积分余额 | `ShopPointsBalances[shop_id, account]` | 积分中心 |
| 积分总量 | `ShopPointsTotalSupply` | 积分中心 |
| 积分配置 | `ShopPointsConfigs[shop_id]` | 积分中心 |
| NEX 购物金 | `MemberShoppingBalance[entity_id, account]` | 个人中心 |
| Token 购物金 | `MemberTokenShoppingBalance[entity_id, account]` | 个人中心 |

**写入**
| 操作 | Extrinsic | 页面 |
|------|-----------|------|
| 转赠积分 | `transfer_points(shop_id, to, amount)` | 积分中心 |
| 兑换积分 | `redeem_points(shop_id, amount)` | 积分中心 |
| 启用积分 | `enable_points` | 管理台 |
| 更新配置 | `update_points_config` | 管理台 |
| 发放/销毁 | `issue_points` / `burn_points` | 管理台 |

### 7.6 nex-market pallet → 交易所

**读取 (Runtime API)**
| 用户操作 | API | 页面 |
|---------|-----|------|
| 卖单列表 | `get_sell_orders` | 交易所 |
| 买单列表 | `get_buy_orders` | 交易所 |
| 我的挂单 | `get_user_orders` | 交易所 |
| 我的成交 | `get_user_trades` | 交易所 |
| 活跃交易 | `get_active_trades` | 交易所 |
| 深度数据 | `get_order_depth` | 交易所 |
| 最佳价格 | `get_best_prices` | 交易所 |
| 市场摘要 | `get_market_summary` | 交易所 |

**读取 (Storage)**
| 数据 | Storage |
|------|---------|
| K 线 | `TwapAccumulatorStore` + `LastTradePrice` |
| 行情 | `MarketStatsStore`, `BestAsk`, `BestBid` |

**写入**
| 用户操作 | Extrinsic | 页面 |
|---------|-----------|------|
| 挂卖单 | `place_sell_order(amount, price)` | 交易所 |
| 挂买单 | `place_buy_order(amount, price)` | 交易所 |
| 取消挂单 | `cancel_order(order_id)` | 我的挂单 |
| 预留卖单 | `reserve_sell_order(order_id)` | 交易所 |
| 接受买单 | `accept_buy_order(order_id)` | 交易所 |
| 确认付款 | `confirm_payment(trade_id, tx_hash)` | 交易详情 |
| 发起争议 | `dispute_trade` | 交易详情 |
| 提交反证 | `submit_counter_evidence` | 争议页 |
| 裁决争议 | `resolve_dispute` | 管理台 |

### 7.7 single-line pallet → 单线排位

**读取**
| 用户操作 | Storage | 页面 |
|---------|---------|------|
| 我的排位 | `SingleLineIndex[entity_id, account]` | 单线排位 |
| 排位图 | `SingleLineSegments` (分页) | 单线排位 |
| 配置 | `SingleLineConfigs[entity_id]` | 单线排位 |
| 统计 | `EntitySingleLineStats[entity_id]` | 收益中心 |
| 暂停状态 | `SingleLineEnabled[entity_id]` | 单线排位 |

**写入（管理员）**
| 操作 | Extrinsic |
|------|-----------|
| 设置配置 | `set_single_line_config` / `update_single_line_params` |
| 暂停/恢复 | `pause_single_line` / `resume_single_line` |
| 预览佣金 | `preview_single_line_commission` |

### 7.8 multi-level pallet → 多级佣金

**读取**
| 用户操作 | 数据来源 | 页面 |
|---------|---------|------|
| 层级配置 | Storage: `MultiLevelConfigs[entity_id]` | 多级佣金 |
| 我的收益 | Storage: `MemberMultiLevelStats[entity_id, account]` | 多级佣金 |
| 激活进度 | Helper: `get_activation_progress(entity_id, account)` | 多级佣金 |
| 佣金预览 | Helper: `preview_commission(entity_id, account, amount)` | 下单页 |
| 实体统计 | Storage: `EntityMultiLevelStats[entity_id]` | 收益中心 |

**写入（管理员）**
| 操作 | Extrinsic |
|------|-----------|
| 设置配置 | `set_multi_level_config` |
| 增删层级 | `add_tier` / `remove_tier` |

### 7.9 pool-reward pallet → 分红池

**读取**
| 用户操作 | 数据来源 | 页面 |
|---------|---------|------|
| 可领取额 | RuntimeAPI: `get_claimable(entity_id, account)` | 分红池/收益 |
| 当轮快照 | Storage: `CurrentRound[entity_id]` | 分红池 |
| 历史轮次 | Storage: `RoundHistory[entity_id]` | 分红池 |
| 领取记录 | Storage: `ClaimRecords[entity_id, account]` | 分红池 |
| 分配统计 | Storage: `DistributionStatistics[entity_id]` | 分红池 |
| 我的份额 | RuntimeAPI: `get_pool_reward_member_view(...)` | 分红池 |
| 轮次统计 | RuntimeAPI: `get_round_statistics` | 分红池 |

**写入**
| 操作 | Extrinsic | 角色 |
|------|-----------|------|
| 领取分红 | `claim_pool_reward(entity_id)` | 用户 |
| 配置 | `set_pool_reward_config` | 管理员 |
| 新轮次 | `start_new_round` | 管理员 |

---

## 八、钱包与安全策略

### V1（Web / PWA）

- 只读浏览 + 登录后交易
- 优先支持：
  - `@polkadot/extension-dapp`（浏览器扩展钱包）
  - WalletConnect / DeepLink（移动钱包唤起）
- **不在 Web 中内置助记词钱包**

### V2（Native）

- 增加 Embedded Signer（内置 sr25519 密钥对管理）
- 私钥/助记词存储到 Keychain / Keystore（AES-256 加密）
- 生物识别解锁（指纹 / Face ID）
- 本地通知与深链唤醒

```typescript
// V2: lib/wallet/secure-store.ts (React Native)
import * as SecureStore from 'expo-secure-store';
import * as LocalAuth from 'expo-local-authentication';

export async function saveMnemonic(mnemonic: string, password: string) {
  const encrypted = encrypt(mnemonic, password); // AES-256
  await SecureStore.setItemAsync('wallet_mnemonic', encrypted, {
    requireAuthentication: true,
    authenticationPrompt: '解锁钱包',
  });
}

export async function unlockWallet(): Promise<Keyring | null> {
  const result = await LocalAuth.authenticateAsync({
    promptMessage: '验证身份以访问钱包',
    disableDeviceFallback: false,
  });
  if (!result.success) return null;
  // 解密并构建 Keyring...
}
```

### 统一 WalletBridge 接口

```typescript
// packages/wallet-bridge/interface.ts
interface WalletBridge {
  connect(): Promise<Account>;
  disconnect(): Promise<void>;
  getAccounts(): Promise<Account[]>;
  sign(payload: SignerPayloadRaw): Promise<SignerResult>;
  signAndSend(tx: SubmittableExtrinsic): Promise<TxResult>;
}

// 适配器
// - WebExtensionSigner: 桌面浏览器插件钱包
// - WalletConnectSigner: WalletConnect v2
// - DeepLinkSigner: 移动钱包深链唤起
// - EmbeddedSigner: V2 原生壳内安全签名器
```

---

## 九、状态管理

### Zustand Stores

| Store | 职责 | 范围 |
|-------|------|------|
| `walletStore` | 钱包地址、余额、签名器、连接状态 | 全局 |
| `chainStore` | 链连接状态、节点、区块高度 | 全局 |
| `entityStore` | 当前社区/实体上下文 | 全局 |
| `uiStore` | 主题、语言、浮层状态 | 全局 |

### TanStack Query

- 所有链上数据读取走 Query（缓存、重试、失效控制）
- 链上事件订阅 → invalidate 对应 Query key

### 表单

- React Hook Form + Zod：下单、挂单、配置表单

---

## 十、配套能力建设

### 10.1 Indexer / BFF 聚合层

| 聚合需求 | 说明 |
|---------|------|
| 首页推荐流 | 热门商品、热门店铺 |
| 排行榜 | 会员等级、团队规模、收益排名 |
| 订单聚合 | 按状态筛选、分页、搜索 |
| 收益流水聚合 | 三类佣金历史汇总 |
| 搜索 | 商品、店铺全文搜索 |
| 市场摘要 | K 线聚合、成交量统计 |

### 10.2 统一交易反馈中心

交易状态全流程：提交中 → 上链成功 → 事件确认 → 失败原因解释

链上失败提示可理解：不仅显示错误码，还要转成人话。

### 10.3 统一资产单位格式化

| 资产 | 精度 | 显示规范 |
|------|------|---------|
| NEX | chain decimals | 等宽字体、千分位 |
| USDT | 10^6 | 等宽字体、千分位 |
| 积分 | 整数 | 千分位 |
| Token 购物金 | token decimals | 等宽字体 |

### 10.4 统一权限门禁

| 角色 | 可见范围 |
|------|---------|
| 游客 | 浏览社区、商品、市场行情 |
| 会员 | 下单、查看收益、领取奖池、邀请 |
| 店铺管理员 | 店铺管理、商品管理、订单管理 |
| Entity Owner | 返佣策略、会员审批、奖池配置 |
| Root / 平台运营 | 全部运营功能、争议裁决、封禁 |

---

## 十一、性能预算

| 指标 | V1 (PWA) 目标 | V2 (Native) 目标 |
|------|-------------|-----------------|
| 首屏加载 | < 3s (骨架屏 → 数据) | < 2s |
| 列表滚动 | 流畅 (虚拟列表) | 60fps (FlashList) |
| 交易提交 | < 1s 签名 + Toast | < 500ms 签名 + Toast |
| 内存 | - | < 200MB |
| 包体积 | - | < 25MB (Android APK) |

---

## 十二、开发里程碑

### P0 — 基础设施（第 1~2 周）

| 任务 | 产出 |
|------|------|
| Monorepo 初始化 | apps/web + packages/* |
| 主题系统 / Design Tokens | ui-tokens/ + Tailwind config |
| 钱包桥接抽象 | wallet-bridge/ (Extension + WalletConnect) |
| chain-sdk 封装 | 节点连接、健康检查、多节点探测 |
| Query / Mutation 基础封装 | query-keys/ + 通用 useTx hook |
| 国际化与移动适配 | next-intl + 响应式布局 |
| 基础组件库 | Button, Card, GlassCard, Toast, Skeleton, BottomSheet |

### P1 — 社区 & 会员 & 积分（第 3~4 周）

| 任务 | 对应 Pallet |
|------|------------|
| 社区首页（资产卡 + 数据面板 + 动态流） | member, loyalty |
| 会员注册 + 绑定推荐人 | member |
| 等级体系展示 + 升级进度 | member |
| 邀请裂变（邀请码 + 海报 + 推荐关系树） | member |
| 积分中心（余额、转赠、兑换） | loyalty |

### P2 — 商城 & 订单（第 5~6 周）

| 任务 | 对应 Pallet |
|------|------------|
| 商品列表（瀑布流 + 筛选） | product, shop |
| 商品详情（规格、库存、佣金预览） | product |
| 下单流程（地址、支付方式、NEX/Token/积分抵扣） | order |
| 订单列表 + 详情（状态跟踪、确认收货） | order |
| 退款流程（申请、等待、结果） | order |
| 店铺主页 | shop |

### P3 — 收益体系（第 7~8 周）

| 任务 | 对应 Pallet |
|------|------------|
| 收益总览（汇总 3 类佣金 + 趋势图） | 全部 commission |
| 单线排位（排位可视化 + 上下线明细） | single-line |
| 多级佣金（层级树 + 激活进度 + 条件达成） | multi-level |
| 分红池（当轮/历史、份额计算、一键领取） | pool-reward |
| 积分 / 购物金钱包 | loyalty |

### P4 — 市场 & BFF（第 9~10 周）

| 任务 | 对应 Pallet |
|------|------------|
| NEX 市场首页（价格、深度、订单簿） | nex-market |
| 挂单/吃单（限价单表单 + 比例滑块） | nex-market |
| 交易详情（付款 → 确认 → 争议） | nex-market |
| 支付凭证上传 | nex-market |
| Indexer / BFF 上线（排行榜、订单聚合、收益汇总） | 聚合层 |

### P5 — 管理端 & 完善（第 11~12 周）

| 任务 | 说明 |
|------|------|
| 移动轻运营台 | 店铺/商品/订单管理 + 会员审批 |
| 桌面运营台 | 返佣策略配置 + 奖池配置 + 争议裁决 |
| 国际化完善 | EN / ZH 全量翻译 |
| 性能优化 | 虚拟列表、图片懒加载、Query 预取 |
| E2E 测试 | 核心流程覆盖 |

### P6（评估后启动）— React Native 原生 App

| 触发条件 | 说明 |
|---------|------|
| 钱包安全需升级 | 内置密钥 + 生物识别 |
| 高频交易用户增长 | K 线/深度图需原生渲染 |
| 推送需求强烈 | 佣金到账、订单状态推送 |
| 市场成为高频入口 | 原生手势/动画体验 |

---

## 十三、代码规范

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

类型命名：PascalCase，无 I 前缀
  OrderStatus, MemberLevel, PoolRewardRound

常量命名：SCREAMING_SNAKE_CASE
  MAX_RETRY_COUNT, DEFAULT_STALE_TIME
```

---

## 十四、关键体验原则

1. **移动优先，不做后台搬运式页面**
2. **高频功能前置**：加入、下单、领取、邀请、查看收益
3. **资产状态可视化**：金额、等级、进度、风险都要明显
4. **交易状态强提示**：支付中、待发货、待确认、争议中要极清晰
5. **复杂运营轻量化**：移动只保留高频操作，复杂配置留桌面
6. **链上失败提示可理解**：不仅显示错误码，还要转成人话
7. **数字精度**：金额永远使用等宽字体，涨跌用红绿色对比
8. **涉及资金操作必须二次确认**（V2 增加生物识别）

---

## 十五、一句话结论

> **短期选 Web/PWA，是为了最快落地、最大复用、最低成本验证业务闭环；中期引入 Expo Native，是为了高频交易、钱包安全与原生推送体验；长期用共享 Monorepo 业务内核，避免双端重复建设。**
