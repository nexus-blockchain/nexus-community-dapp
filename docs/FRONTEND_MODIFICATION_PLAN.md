# ERNV 社区 dApp 前端调整方案

> 基于设计稿截图分析，本文档列出所有需要修改的页面、组件和 i18n 项。
> 每一条修改标注：**页面** / **组件文件** / **修改类型** / **具体内容**。

---

## 目录

1. [底部导航栏](#1-底部导航栏)
2. [首页](#2-首页)
3. [商品详情页](#3-商品详情页)
4. [创建订单页](#4-创建订单页)
5. [市场页](#5-市场页)
6. [收益页](#6-收益页)
7. [多级收益详情页](#7-多级收益详情页)
8. [排位奖详情页](#8-排位奖详情页)
9. [奖池平分详情页](#9-奖池平分详情页)
10. [我的页](#10-我的页)
11. [钱包管理页](#11-钱包管理页)
12. [推荐关系树 - 按代数查看 / 推荐好友](#12-推荐关系树)
13. [品牌 / 图标资源](#13-品牌--图标资源)
14. [i18n 变更汇总](#14-i18n-变更汇总)
15. [实施优先级](#15-实施优先级)

---

## 1. 底部导航栏

**文件:** `src/components/layout/bottom-tabs.tsx`

| # | 修改 | 说明 |
|---|------|------|
| 1.1 | Tab 数量从 5 → 5（保持），但标签文案调整 | 设计稿显示 5 个 Tab：**首页 / 市场 / 收益 / 钱包 / 我的** |
| 1.2 | 移除"商铺"(Mall/Shops) Tab | 当前代码有 `nav.mall` 对应 `/mall` 路由，设计稿中底部导航无此 Tab |
| 1.3 | 新增"钱包" Tab | 新增钱包 Tab，图标使用钱包类 icon，路由指向 `/me/wallet`（或新建专门路由） |
| 1.4 | Tab 顺序 | 首页(`/`) → 市场(`/market`) → 收益(`/earnings`) → 钱包(`/me/wallet`) → 我的(`/me`) |

**i18n 变更:**
- 新增 key: `nav.wallet` = "Wallet" / "钱包"
- 移除 Tab 对应: `nav.mall` 从导航中去掉（key 保留，仅不在 Tab 中使用）

---

## 2. 首页

**文件:** `src/app/(mobile)/page.tsx`

| # | 修改 | 当前 | 目标 |
|---|------|------|------|
| 2.1 | 欢迎 Banner 标题文案 | "Welcome to NEXUS Community" | **"欢迎来到 ERNV社区平台"** |
| 2.2 | 欢迎 Banner 副标题 | 当前 subtitle | **"用区块链技术和NEX共同构建美好未来!"** |
| 2.3 | 移除"快捷操作"板块 | 首页有 Quick Actions 6 宫格 | 设计稿中无此板块，改为将语言选择放在此处（原在设置页） |
| 2.4 | 语言选择器移至首页 | 之前在【设置】页面 | 首页显示语言切换区域，带"中文 / English"等按钮 |
| 2.5 | "推荐商品"改为"权限兑换" | `home.recommendedProducts` | 标题改为 **"权限兑换"** |
| 2.6 | "查看全部"可展开覆盖 | 产品列表旁的"查看全部"链接 | 点击"查看全部"展开下方覆盖显示完整列表（而非跳转到 `/mall`） |

**i18n 变更:**
- `home.welcomeDefaultName`: "NEXUS Community" → "ERNV社区平台" / "ERNV Community Platform"
- `home.subtitle`: 当前值 → "用区块链技术和NEX共同构建美好未来!" / "Building a better future with blockchain and NEX!"
- `home.recommendedProducts`: "Recommended" → "权限兑换" / "Membership Exchange"
- 新增 `home.viewAll`: "查看全部" / "View All"

---

## 3. 商品详情页

**文件:** `src/app/product/[id]/client.tsx`

| # | 修改 | 当前 | 目标 |
|---|------|------|------|
| 3.1 | 页面标题 | "商品 #0" / `product.title` | 删除编号标识，或改为 **"数字商品"** |
| 3.2 | 删除分类/可见性标签 | 显示"数字商品"、"仅会员"等标签 | 删除红色划线标出的标签（`数字商品`、`仅会员`） |
| 3.3 | 删除状态标签 | 右上角"在售"绿色标签 | 删除 |
| 3.4 | "购买数量"改为"兑换数量" | `product.quantity` = "购买数量" | **"兑换数量"** |
| 3.5 | "立即购买"改为"立即兑换" | `product.buyNow` = "立即购买" | **"立即兑换"** |
| 3.6 | 删除购物车图标 | 购买按钮前的购物车图标 | 移除 |
| 3.7 | 删除"商品详情"区块 | 底部商品详情描述区域 | 移除整个 product detail card |

**i18n 变更:**
- `product.title`: 修改格式，去掉 `{id}` 或改为"数字商品" / "Digital Item"
- `product.quantity`: "购买数量" → "兑换数量" / "Exchange Quantity"
- `product.buyNow`: "立即购买" → "立即兑换" / "Exchange Now"

---

## 4. 创建订单页

**文件:** `src/app/order/create/page.tsx`

| # | 修改 | 当前 | 目标 |
|---|------|------|------|
| 4.1 | "商品信息"改为"详情信息" | `order.productInfo` | **"详情信息"** |
| 4.2 | "商品"改为"权益" | `order.product` | **"权益"** |
| 4.3 | "支付方式"改为"兑换方式" | `order.paymentType` | **"兑换方式"** |
| 4.4 | 删除"实体代币"支付选项 | 有两个选项：NEX原生代币 / 实体代币 | 仅保留 **NEX 原生代币**，删除实体代币选项 |
| 4.5 | "推荐人"改为"邀请人" | `order.referrer` | **"邀请人"** |
| 4.6 | "使用购物余额"改为"使用余额兑换" | `order.useShoppingBalance` | **"使用余额兑换"** |
| 4.7 | 底部按钮"使用购物余额"改为"使用余额兑换" | 按钮文案 | **"使用余额兑换"** |
| 4.8 | 删除"备注"区块 | 备注输入区域 | 可选删除（设计稿标注"备注这个板块可以不要"） |
| 4.9 | "确认下单"改为"确认兑换" | `order.confirmOrder` | **"确认兑换"** |

**i18n 变更:**
- `order.productInfo`: → "详情信息" / "Details"
- `order.product`: → "权益" / "Membership"
- `order.paymentType`: → "兑换方式" / "Exchange Method"
- `order.referrer`: → "邀请人" / "Inviter"
- `order.useShoppingBalance`: → "使用余额兑换" / "Use Balance to Exchange"
- `order.confirmOrder`: → "确认兑换" / "Confirm Exchange"

---

## 5. 市场页

**文件:** `src/app/(mobile)/market/page.tsx`

| # | 修改 | 当前 | 目标 |
|---|------|------|------|
| 5.1 | 删除"实体代币"Tab | 顶部有 `NEX/USDT` 和 `实体代币` 两个 Tab | 仅保留 **NEX/USDT** Tab，删除实体代币 Tab 入口 |

**i18n 变更:**
- `market.entityTab` 保留 key 但不再在市场页顶部显示

---

## 6. 收益页

**文件:** `src/app/(mobile)/earnings/page.tsx`

| # | 修改 | 当前 | 目标 |
|---|------|------|------|
| 6.1 | 删除"在售中的通过佣金合约创建的订单"说明文字 | 累计收益卡片中有此说明 | 删除该文字（红色划线标注） |
| 6.2 | 隐藏"实体资金概览"卡片 | 有 Entity Fund Overview 卡片 | 不显示 |
| 6.3 | 隐藏"购物余额有效期"卡片 | 有余额过期信息卡片 | 可选隐藏（设计稿标注"已经实现自动复购的话这个板块可以不要"） |
| 6.4 | 删除"已启用插件"标题 | 插件卡片上方的"已启用插件"文字 | 删除该文字 |
| 6.5 | "多级分销"改为"助力奖励 (NEX)" | 插件卡片名称 | **"助力奖励 (NEX)"** |
| 6.6 | "排位奖"改为"共赢奖励 (NEX)" | 插件卡片名称 | **"共赢奖励 (NEX)"** |
| 6.7 | "奖池平分"改为"奖池领取 (NEX)" | 插件卡片名称 | **"奖池领取 (NEX)"** |
| 6.8 | 隐藏"Owner 奖励"卡片 | Owner Reward 插件卡片 | 前端不显示 |
| 6.9 | 隐藏"提现概况"卡片 | 提现概况区域 | 前端不显示 |
| 6.10 | 插件区域布局调整 | 当前 2 列卡片网格 | 改为紧凑列表布局（参考 7-3 收益设计稿：单列折叠式，每项显示图标+名称+数额+展开箭头） |
| 6.11 | "提现记录"默认收起 | 提现记录列表默认展开 | 默认不展开，点右边箭头可展开；做翻页处理 |
| 6.12 | 删除"链上累计提现"大字显示 | 提现记录顶部显示累计数额 | 不显示 |

**i18n 变更:**
- `earnings.multiLevel`: → "助力奖励 (NEX)" / "Boost Reward (NEX)"
- `earnings.teamPerformance`: → "共赢奖励 (NEX)" / "Win-Win Reward (NEX)"
- `earnings.poolReward`: → "奖池领取 (NEX)" / "Pool Claim (NEX)"

---

## 7. 多级收益详情页

**文件:** `src/app/(mobile)/earnings/multi-level/page.tsx` (或对应子路由)

| # | 修改 | 说明 |
|---|------|------|
| 7.1 | 页面标题改为"助力奖励" | 对应 6.5 的改名 |
| 7.2 | 布局保持，底部增加"实时统计"区块 | 设计稿显示有按代数的统计表格（L1-L7），显示各代累计分佣、人数等 |
| 7.3 | 底部增加"互助统计"小卡片 | 显示 S5(代数)、S5(星级)、243(人数) 等统计 |

---

## 8. 排位奖详情页

**文件:** `src/app/(mobile)/earnings/team-performance/page.tsx` (或对应子路由)

| # | 修改 | 说明 |
|---|------|------|
| 8.1 | 页面标题改为"共赢奖励" | 对应 6.6 的改名 |
| 8.2 | 增加"极差计算"区域 | 设计稿显示有上线/下线匹配详情，以及逐笔匹配记录 |
| 8.3 | 增加"互助统计"区块 | 类似 7.3 的小卡片 |

---

## 9. 奖池平分详情页

**文件:** `src/app/(mobile)/earnings/pool-reward/page.tsx` (或对应子路由)

| # | 修改 | 说明 |
|---|------|------|
| 9.1 | 页面标题改为"奖池领取" | 对应 6.7 的改名 |
| 9.2 | 增加"奖池信息"区域 | 设计稿显示有奖池余额、分配规则、参与人数、配额/已配额等详情 |
| 9.3 | 增加"上奖池记录"区域 | 逐笔记录的时间线 |
| 9.4 | 增加"奖池分配记录"区域 | 分配历史 |
| 9.5 | 增加"互助统计"区块 | 类似 7.3 的小卡片 |

---

## 10. 我的页

**文件:** `src/app/(mobile)/me/page.tsx`

| # | 修改 | 当前 | 目标 |
|---|------|------|------|
| 10.1 | 钱包卡片直接展开显示 | 有折叠箭头 `>` | 直接展开显示完整余额信息，无需点击跳转 |
| 10.2 | "链上详情"按钮改为扫码功能 | 快捷操作中有"链上详情" | 可改为"扫码"入口 |
| 10.3 | "直推"改为"直属" | `member.directReferrals` 附近 | **"直属"** |
| 10.4 | "间推"改为"间邀" | `member.indirectReferrals` 附近 | **"间邀"** |
| 10.5 | "团队"改为"总数" | `member.teamSize` 附近 | **"总数"** |
| 10.6 | "推荐网络"改为"关系网络" | 菜单项 `member.networkTitle` | **"关系网络"** |
| 10.7 | 更换"关系网络"菜单图标 | 当前图标 | 可换一个更合适的图标 |
| 10.8 | 隐藏"钱包管理"菜单 | 菜单有"钱包管理"入口 | 不显示（已有底部钱包 Tab） |
| 10.9 | 隐藏"我的订单"菜单 | 菜单有"我的订单"入口 | 不显示（设计稿标注"已经有交易记录就可以烧了"） |
| 10.10 | 隐藏"积分管理"菜单 | 菜单有"积分管理"入口 | 不显示 |
| 10.11 | 隐藏"我的收益"菜单 | 菜单有"我的收益"入口 | 不显示 |
| 10.12 | 隐藏"代币交易"菜单 | 菜单有"代币交易"入口 | 不显示 |
| 10.13 | 隐藏"共识治理"菜单 | 菜单有"共识治理"入口 | 不显示 |
| 10.14 | 隐藏"链上详情"菜单 | 菜单有"链上详情"入口 | 不显示 |

**i18n 变更:**
- `member.directReferrals` 显示文案: → "直属" / "Direct"
- `member.indirectReferrals` 显示文案: → "间邀" / "Indirect"
- `member.teamSize` 显示文案: → "总数" / "Total"
- `member.networkTitle`: → "关系网络" / "Relationship Network"

---

## 11. 钱包管理页

**文件:** `src/app/me/wallet/page.tsx`

| # | 修改 | 说明 |
|---|------|------|
| 11.1 | 增加扫码功能入口 | 设计稿标注"扫码放这个页面 看放什么地方好" |

**实现建议:** 在钱包管理页面的快捷操作区域中增加"扫码"按钮，使用 Capacitor BarcodeScanner 插件（移动端）或 Web API（桌面端）。

---

## 12. 推荐关系树

**文件:** `src/app/member/network/page.tsx`

### 12.1 通用修改（页面级）

| # | 修改 | 当前 | 目标 |
|---|------|------|------|
| 12.1.1 | 页面标题 | "推荐网络" | **"关系网络"** |
| 12.1.2 | "团队概览"卡片隐藏边框 | 有边框包裹 | 不显示边框 |
| 12.1.3 | "直推"改为"直属" | 统计中"直推" | **"直属"** |
| 12.1.4 | "间推"改为"间邀" | 统计中"间推" | **"间邀"** |
| 12.1.5 | "团队"改为"总数" | 统计中"团队" | **"总数"** |

### 12.2 Tab 名称修改

| Tab | 当前 | 目标 |
|-----|------|------|
| 推荐关系树 | "推荐关系树" | **"邀请链"** |
| 按代数查看 | "按代数查看" | **"下层链"**（对应下层链数据，不显示推荐代数） |
| 上线链 | "上线链" | **"上层链"** |
| 推荐好友 | "推荐好友" | **"邀请"** |

### 12.3 按代数查看 Tab

| # | 修改 | 说明 |
|---|------|------|
| 12.3.1 | 不显示"推荐代数"标签 | 设计稿标注"不显示推荐代数" |
| 12.3.2 | 隐藏右侧框线（金额列） | 设计稿标注右侧 `$` 金额区域"框起来的不显示" |
| 12.3.3 | "直推"改为"直属"，"团队"改为"总数" | 列表中每个成员的统计标签 |
| 12.3.4 | `$` 图标不显示 | 每行右侧美元图标 | 移除 |

### 12.4 推荐好友 Tab（改名"邀请"）

| # | 修改 | 当前 | 目标 |
|---|------|------|------|
| 12.4.1 | "绑定推荐人"改为"绑定关系" | `member.bindReferrer` | **"绑定关系"** |
| 12.4.2 | "推荐人地址"改为"邀请地址" | `member.referrerAddress` | **"邀请地址"** |
| 12.4.3 | "我的推荐"改为"我的邀请" | 区域标题 | **"我的邀请"** |
| 12.4.4 | "直推"改为"直属"，"团队"改为"总数" | 统计标签 | 同上 |
| 12.4.5 | "直推成员"隐藏边框 | 成员列表有边框 | 不显示边框 |

**i18n 变更:**
- `member.bindReferrer`: → "绑定关系" / "Bind Relationship"
- `member.referrerAddress`: → "邀请地址" / "Inviter Address"
- `member.myReferrals`: → "我的邀请" / "My Invitations"
- Tab keys 对应调整

---

## 13. 品牌 / 图标资源

| # | 修改 | 说明 |
|---|------|------|
| 13.1 | 更新 Logo | 使用 ERNV.png 作为新 Logo（六边形蓝紫渐变，内含节点网络图案） |
| 13.2 | 品牌名称 | 全局将 "NEXUS Community" 替换为 "ERNV社区平台" |
| 13.3 | Logo 资源路径 | 将 ERNV.png 放入 `public/` 或 `src/assets/` 目录，更新引用 |

---

## 14. i18n 变更汇总

以下是所有需要修改的 i18n key 的完整清单：

### 中文 (`messages/zh.json`)

| Key | 当前值 | 新值 |
|-----|--------|------|
| `nav.wallet` | *(新增)* | "钱包" |
| `home.welcomeDefaultName` | "NEXUS社区" | "ERNV社区平台" |
| `home.subtitle` | (当前值) | "用区块链技术和NEX共同构建美好未来!" |
| `home.recommendedProducts` | "推荐商品" | "权限兑换" |
| `product.quantity` | "购买数量" | "兑换数量" |
| `product.buyNow` | "立即购买" | "立即兑换" |
| `order.productInfo` | "商品信息" | "详情信息" |
| `order.product` | "商品" | "权益" |
| `order.paymentType` | "支付方式" | "兑换方式" |
| `order.referrer` | "推荐人" | "邀请人" |
| `order.useShoppingBalance` | "使用购物余额" | "使用余额兑换" |
| `order.confirmOrder` | "确认下单" | "确认兑换" |
| `earnings.multiLevel` | "多级分销" | "助力奖励 (NEX)" |
| `earnings.teamPerformance` | "排位奖" | "共赢奖励 (NEX)" |
| `earnings.poolReward` | "奖池平分" | "奖池领取 (NEX)" |
| `member.directReferrals` | "直推" | "直属" |
| `member.indirectReferrals` | "间推" | "间邀" |
| `member.teamSize` | "团队" | "总数" |
| `member.networkTitle` | "推荐网络" | "关系网络" |
| `member.bindReferrer` | "绑定推荐人" | "绑定关系" |
| `member.referrerAddress` | "推荐人地址" | "邀请地址" |
| `member.myReferrals` | "我的推荐" | "我的邀请" |

### 英文 (`messages/en.json`)

| Key | 当前值 | 新值 |
|-----|--------|------|
| `nav.wallet` | *(新增)* | "Wallet" |
| `home.welcomeDefaultName` | "NEXUS Community" | "ERNV Community Platform" |
| `home.subtitle` | (当前值) | "Building a better future with blockchain and NEX!" |
| `home.recommendedProducts` | "Recommended" | "Membership Exchange" |
| `product.quantity` | "Quantity" | "Exchange Quantity" |
| `product.buyNow` | "Buy Now" | "Exchange Now" |
| `order.productInfo` | "Product Info" | "Details" |
| `order.product` | "Product" | "Membership" |
| `order.paymentType` | "Payment Type" | "Exchange Method" |
| `order.referrer` | "Referrer" | "Inviter" |
| `order.useShoppingBalance` | "Use Shopping Balance" | "Use Balance to Exchange" |
| `order.confirmOrder` | "Confirm Order" | "Confirm Exchange" |
| `earnings.multiLevel` | "Multi-Level" | "Boost Reward (NEX)" |
| `earnings.teamPerformance` | "Team Performance" | "Win-Win Reward (NEX)" |
| `earnings.poolReward` | "Pool Reward" | "Pool Claim (NEX)" |
| `member.directReferrals` | "Direct" | "Direct" |
| `member.indirectReferrals` | "Indirect" | "Indirect" |
| `member.teamSize` | "Team" | "Total" |
| `member.networkTitle` | "Referral Network" | "Relationship Network" |
| `member.bindReferrer` | "Bind Referrer" | "Bind Relationship" |
| `member.referrerAddress` | "Referrer Address" | "Inviter Address" |
| `member.myReferrals` | "My Referrals" | "My Invitations" |

---

## 15. 实施优先级

### P0 - 高优先（品牌 / 核心流程文案）
1. **品牌更新**: Logo 替换为 ERNV.png，全局品牌名改为 "ERNV社区平台"
2. **底部导航栏**: 调整 Tab（去 Mall，加钱包）
3. **首页**: 欢迎文案、语言选择器位置、"权限兑换"改名
4. **i18n 文案批量更新**: 上述所有 key 的中英文同步修改

### P1 - 中优先（页面内容裁剪与改名）
5. **商品详情页**: 删除标签、改购买→兑换文案、删除详情区块
6. **创建订单页**: 文案替换、删除实体代币选项、删除备注区块
7. **市场页**: 删除实体代币 Tab
8. **收益页**: 隐藏不需要的卡片、插件改名、布局改为折叠列表
9. **我的页**: 隐藏多个菜单项、文案替换

### P2 - 低优先（详情页增强与新功能）
10. **收益子页面**: 多级/排位/奖池详情页增加统计区块
11. **推荐关系树**: Tab 改名、隐藏边框、文案替换
12. **钱包管理**: 增加扫码功能
13. **首页查看全部**: 展开覆盖式产品列表

---

## 涉及文件清单

| 文件 | 修改类型 |
|------|----------|
| `src/components/layout/bottom-tabs.tsx` | Tab 结构重组 |
| `src/app/(mobile)/page.tsx` | 首页内容调整 |
| `src/app/product/[id]/client.tsx` | 商品详情裁剪 |
| `src/app/order/create/page.tsx` | 订单页文案+区块裁剪 |
| `src/app/(mobile)/market/page.tsx` | 市场页 Tab 裁剪 |
| `src/app/(mobile)/earnings/page.tsx` | 收益页大幅调整 |
| `src/app/(mobile)/earnings/multi-level/page.tsx` | 多级收益增强 |
| `src/app/(mobile)/earnings/team-performance/page.tsx` | 排位奖增强 |
| `src/app/(mobile)/earnings/pool-reward/page.tsx` | 奖池平分增强 |
| `src/app/(mobile)/me/page.tsx` | 我的页菜单裁剪+文案 |
| `src/app/me/wallet/page.tsx` | 钱包页扫码功能 |
| `src/app/member/network/page.tsx` | 推荐网络全面调整 |
| `messages/zh.json` | 中文翻译更新 |
| `messages/en.json` | 英文翻译更新 |
| `messages/ja.json` | 日文翻译更新(如有) |
| `messages/ko.json` | 韩文翻译更新(如有) |
| `messages/es.json` | 西文翻译更新(如有) |
| `public/` 或 `src/assets/` | ERNV Logo 资源 |
