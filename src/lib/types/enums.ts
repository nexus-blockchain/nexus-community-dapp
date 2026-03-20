/** Transaction lifecycle status */
export enum TxStatus {
  Idle = 'idle',
  Signing = 'signing',
  Broadcasting = 'broadcasting',
  InBlock = 'inBlock',
  Finalized = 'finalized',
  Error = 'error',
}

/** Member level within an entity */
export enum MemberLevel {
  Normal = 0,
  Bronze = 1,
  Silver = 2,
  Gold = 3,
  Diamond = 4,
}

/** Shop operating status (maps to chain ShopOperatingStatus) */
export enum ShopStatus {
  Active = 'Active',
  Paused = 'Paused',
  Closing = 'Closing',
  Closed = 'Closed',
  FundDepleted = 'FundDepleted',
  Banned = 'Banned',
}

/** Product status (maps to chain ProductStatus) */
export enum ProductStatus {
  Draft = 'Draft',
  OnSale = 'OnSale',
  OffShelf = 'OffShelf',
  Delisted = 'Delisted',
}

/** Product category */
export enum ProductCategory {
  Physical = 'Physical',
  Digital = 'Digital',
  Service = 'Service',
  Subscription = 'Subscription',
  Bundle = 'Bundle',
}

/** Product visibility */
export enum ProductVisibility {
  Public = 'Public',
  MembersOnly = 'MembersOnly',
  LevelGated = 'LevelGated',
}

/** Order status (maps to chain OrderStatus) */
export enum OrderStatus {
  Paid = 'Paid',
  Shipped = 'Shipped',
  Completed = 'Completed',
  Disputed = 'Disputed',
  Refunded = 'Refunded',
  Cancelled = 'Cancelled',
}

/** Payment asset type */
export enum PaymentAsset {
  Native = 'Native',
  EntityToken = 'EntityToken',
}

/** Market order side */
export enum OrderSide {
  Buy = 'Buy',
  Sell = 'Sell',
}

/** Market order type */
export enum MarketOrderType {
  Limit = 'Limit',
  Market = 'Market',
  ImmediateOrCancel = 'ImmediateOrCancel',
  FillOrKill = 'FillOrKill',
  PostOnly = 'PostOnly',
}

/** Market order status */
export enum MarketOrderStatus {
  Open = 'Open',
  PartiallyFilled = 'PartiallyFilled',
  Filled = 'Filled',
  Cancelled = 'Cancelled',
  Expired = 'Expired',
}

/** Member registration status */
export enum MemberStatus {
  None = 'none',
  Active = 'active',
  Pending = 'pending',
  Banned = 'banned',
}

/** Level upgrade mode */
export enum LevelUpgradeMode {
  AutoUpgrade = 'AutoUpgrade',
  ManualUpgrade = 'ManualUpgrade',
}
