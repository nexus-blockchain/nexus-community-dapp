# Commission Core — 提现记录链上存储方案（已实现）

## 现状

链上 `pallet-commission-core` 已有完整的提现记录存储（F20 审计修复）：

- `WithdrawalRecord<Balance, BlockNumber>` — 包含 total_amount, withdrawn, repurchased, bonus, block_number
- `MemberWithdrawalHistory<T>` — `StorageDoubleMap<entity_id, account, BoundedVec<WithdrawalRecord, MaxWithdrawalRecords>>`
- `MemberTokenWithdrawalHistory<T>` — Token 版本
- 在 `withdraw_commission` / `withdraw_token_commission` 成功后自动写入，满则丢弃最旧

**缺失的部分：** Runtime API 没有暴露查询接口，前端无法读取。

## 本次修改

### 1. Runtime API 新增方法

**文件：** `pallets/entity/commission/core/src/runtime_api.rs`

新增 `WithdrawalRecordView<Balance>` 结构体和 `get_member_withdrawal_records` 方法：

```rust
pub struct WithdrawalRecordView<Balance> {
    pub total_amount: Balance,
    pub withdrawn: Balance,
    pub repurchased: Balance,
    pub bonus: Balance,
    pub block_number: u64,
}

fn get_member_withdrawal_records(entity_id: u64, account: AccountId) -> Vec<WithdrawalRecordView<Balance>>;
```

### 2. Pallet 实现

**文件：** `pallets/entity/commission/core/src/lib.rs`

新增 `get_member_withdrawal_records` 方法，读取 `MemberWithdrawalHistory` 并转换为 `WithdrawalRecordView`。

### 3. Runtime 接入

**文件：** `runtime/src/apis.rs`

在 `CommissionDashboardApi` impl 块中添加代理方法。

### 4. 前端对接

- `runtime-defs.ts` — 新增 `WithdrawalRecordView` SCALE 类型 + API 调用定义
- `models.ts` — 新增 `WithdrawalRecordView` TypeScript 接口
- `use-commission-core.ts` — 新增 `useWithdrawalRecords` hook（优先 Runtime API，回退 Storage 直查）
- `earnings/page.tsx` — 用链上数据替代 localStorage，展示每笔提现的到手金额、回购金额、奖励、区块号
- `useWithdrawCommission` — invalidateKeys 增加 `['withdrawalRecords']`，提现后自动刷新
