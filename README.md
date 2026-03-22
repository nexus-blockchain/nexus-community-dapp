# Nexus Community dApp

去中心化社区商业平台 — 基于 Nexus 区块链（Substrate）构建的社区 + 金融 + 商业一体化 dApp。

A decentralized community commerce platform built on the Nexus blockchain (Substrate-based), integrating community, finance, and commerce into one unified dApp.

## 功能概览 / Features

### 社区 / Community
- 社区总览与成员统计
- 公告与信息披露
- 邀请与推荐网络

### 商城 / Mall
- 商品浏览与分类筛选
- 商品详情与 IPFS 图片加载
- 下单、支付、确认收货全流程
- 店铺管理与商品上架

### 市场 / Market
- NEX 代币交易（买入/卖出挂单）
- 实时订单簿与深度图
- K 线图与多时间周期切换
- 24 小时行情数据

### 佣金 / Earnings
- 单线佣金（Single-Line）
- 多级佣金（Multi-Level）— 层级激活与进度追踪
- 资金池奖励（Pool Reward）— 轮次分配与快照
- 佣金提取

### 积分 / Loyalty
- 积分余额查询
- 积分兑换与转账
- 兑换记录追踪

### 全球市场 / Global NEX Market
- NEX ↔ USDT 点对点交易
- TRON 地址集成
- 交易状态追踪（付款、验证、争议）

### 钱包 / Wallet
- NEX 余额显示与转账
- 收款二维码生成
- 交易历史记录
- 本地密钥安全存储
- Polkadot 浏览器钱包扩展集成

### 会员 / Member
- 注册与推荐人绑定
- 多层级等级系统
- 团队网络可视化
- 直接/间接推荐追踪

## 技术栈 / Tech Stack

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 14 (App Router) + React 18 + TypeScript 5.7 |
| **区块链** | Polkadot.js API — WebSocket 连接 Nexus 链 (Substrate) |
| **状态管理** | Zustand 5 (客户端) + TanStack React Query 5 (服务端缓存) |
| **UI 组件** | Radix UI + Tailwind CSS 3 + Lucide Icons |
| **表单验证** | React Hook Form + Zod |
| **国际化** | next-intl (中文 / English) |
| **图表** | Recharts |
| **测试** | Vitest + Testing Library |
| **部署** | PM2 |

## 链上 Pallet 集成 / On-chain Pallets

本 dApp 与以下 Nexus 链 Pallet 交互：

| Pallet | 功能 |
|--------|------|
| `member` | 会员注册、推荐网络、等级系统 |
| `shop` | 店铺管理与浏览 |
| `product` | 商品目录与元数据 |
| `order` | 订单全生命周期管理 |
| `loyalty` | 积分/奖励系统 |
| `nex-market` | 社区内 NEX 交易 |
| `single-line` | 单线佣金 |
| `multi-level` | 多级佣金 |
| `pool-reward` | 资金池奖励分配 |
| `commission-core` | 佣金提取与核心逻辑 |
| `review` | 订单评价与评分 |
| `disclosure` | 公告与财务披露 |
| `global-nex-market` | 全球 NEX ↔ USDT P2P 交易 |

## 项目结构 / Project Structure

```
src/
├── app/                    # Next.js 路由页面
│   ├── (mobile)/           # 移动端 Tab 布局（首页、商城、市场、收益、我的）
│   ├── member/             # 会员（个人资料、网络、邀请）
│   ├── product/[id]/       # 商品详情
│   ├── order/              # 订单创建与详情
│   ├── shop/[id]/          # 店铺详情
│   ├── loyalty/            # 积分页面
│   ├── community/[id]/     # 社区详情
│   ├── earnings/           # 佣金详情（单线、多级、资金池）
│   ├── chain/              # 链状态
│   └── settings/           # 设置
├── components/
│   ├── ui/                 # 基础 UI 组件（Button、Card、Dialog 等）
│   ├── layout/             # 布局组件（Header、BottomTabs、PageContainer）
│   └── wallet/             # 钱包弹窗（解锁、签名）
├── features/               # 业务功能模块（14 个领域）
│   ├── home/               # 首页
│   ├── community/          # 社区
│   ├── member/             # 会员
│   ├── shop/               # 店铺
│   ├── product/            # 商品
│   ├── order/              # 订单
│   ├── market/             # 市场
│   ├── commission/         # 佣金
│   ├── loyalty/            # 积分
│   ├── referral/           # 推荐
│   ├── profile/            # 个人资料
│   └── admin/              # 管理
├── hooks/                  # 自定义 React Hooks（30+）
├── stores/                 # Zustand 状态仓库
├── lib/
│   ├── chain/              # 链连接、类型定义、节点发现
│   ├── types/              # TypeScript 类型与枚举
│   └── utils/              # 工具函数
├── i18n/                   # 国际化配置
└── styles/                 # 全局样式
```

## 快速开始 / Getting Started

### 前置要求 / Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- 运行中的 **Nexus 链节点**（或可访问的远程节点）

### 安装 / Installation

```bash
# 克隆仓库
git clone <repository-url>
cd nexus-community-dapp

# 安装依赖
npm install
```

### 环境配置 / Configuration

复制环境变量模板并按需修改：

```bash
cp .env.example .env
```

```env
# Substrate 节点 WebSocket 端点
NEXT_PUBLIC_WS_ENDPOINT=ws://127.0.0.1:9944

# IPFS 网关地址
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs

# Pinata API 密钥（用于 IPFS 上传）
PINATA_API_KEY=your_pinata_api_key_here
PINATA_SECRET_KEY=your_pinata_secret_key_here
```

### 启动开发服务器 / Development

```bash
npm run dev
```

访问 [http://localhost:3001](http://localhost:3001) 查看应用。

### 构建与生产部署 / Build & Production

```bash
# 构建
npm run build

# 启动生产服务器
npm run start
```

### 测试 / Testing

```bash
# 运行测试
npm test

# 监听模式
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

## 链连接与节点管理 / Chain Connection

- 通过 WebSocket 连接 Nexus 节点
- 支持多节点配置与自动故障切换
- 内置节点健康监测（延迟 + 区块高度）
- 自动发现对等节点并缓存至 localStorage
- React Query 分级缓存策略：
  - 高频数据（订单簿、价格）：2–5 秒
  - 中频数据（订单、佣金）：15–30 秒
  - 低频数据（会员资料、商品配置）：60–120 秒

## 国际化 / i18n

支持中文和英文，翻译文件位于 `messages/` 目录：

- `messages/zh.json` — 中文
- `messages/en.json` — English

## PWA 支持

应用支持 PWA（渐进式 Web 应用），可添加到移动设备主屏幕：

- 独立窗口模式运行
- 192x192 / 512x512 应用图标
- 主题色：`#B2955D`

## 许可证 / License

Private — 未经授权不得分发。
