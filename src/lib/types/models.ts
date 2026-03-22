/** Parsed chain dispatch error */
export interface ChainError {
  module: string;
  name: string;
  message: string;
}

/** Confirmation dialog configuration */
export interface ConfirmDialogConfig {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

/** Transaction state tracked by useEntityMutation */
export interface TxState {
  status: 'idle' | 'signing' | 'broadcasting' | 'inBlock' | 'finalized' | 'error';
  hash: string | null;
  error: string | null;
  blockNumber: number | null;
}

// ---------------------------------------------------------------------------
// Entity
// ---------------------------------------------------------------------------
export interface EntityInfo {
  id: number;
  owner: string;
  name: string;
  entityType: string;
  status: string;
  verified: boolean;
  memberCount?: number;
  primaryShopId: number;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------
export interface Shop {
  id: number;
  entityId: number;
  name: string;
  logoCid: string | null;
  descriptionCid: string | null;
  shopType: string;
  status: string;
  managers: string[];
  productCount: number;
  totalSales: string;
  totalOrders: number;
  rating: number;
  ratingCount: number;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------
export interface Product {
  id: number;
  shopId: number;
  nameCid: string;
  imagesCid: string;
  detailCid: string;
  price: string;
  usdtPrice: number;
  stock: number;
  soldCount: number;
  status: string;
  category: string;
  sortWeight: number;
  minOrderQuantity: number;
  maxOrderQuantity: number;
  visibility: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------
export interface Order {
  id: number;
  entityId: number;
  shopId: number;
  productId: number;
  buyer: string;
  seller: string;
  payer: string | null;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  platformFee: string;
  productCategory: string;
  shippingCid: string | null;
  trackingCid: string | null;
  status: string;
  createdAt: number;
  shippedAt: number | null;
  completedAt: number | null;
  paymentAsset: string;
  tokenPaymentAmount: string;
  confirmExtended: boolean;
  disputeRejected: boolean;
  disputeDeadline: number | null;
  noteCid: string | null;
  refundReasonCid: string | null;
}

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------
export interface EntityMember {
  referrer: string | null;
  directReferrals: number;
  qualifiedReferrals: number;
  indirectReferrals: number;
  teamSize: number;
  totalSpent: number;
  customLevelId: number;
  joinedAt: number;
  lastActiveAt: number;
  activated: boolean;
  bannedAt: number | null;
}

export interface CustomLevel {
  id: number;
  name: string;
  threshold: number;
  discountRate: number;
  commissionBonus: number;
}

export interface EntityLevelSystem {
  levels: CustomLevel[];
  useCustom: boolean;
  upgradeMode: string;
}

// ---------------------------------------------------------------------------
// Loyalty
// ---------------------------------------------------------------------------
export interface PointsConfig {
  name: string;
  symbol: string;
  rewardRate: number;
  exchangeRate: number;
  transferable: boolean;
}

// ---------------------------------------------------------------------------
// Commission - Single Line
// ---------------------------------------------------------------------------
export interface SingleLineConfig {
  uplineRate: number;
  downlineRate: number;
  baseUplineLevels: number;
  baseDownlineLevels: number;
  levelIncrementThreshold: string;
  maxUplineLevels: number;
  maxDownlineLevels: number;
}

// ---------------------------------------------------------------------------
// Commission - Multi Level
// ---------------------------------------------------------------------------
export interface MultiLevelTier {
  rate: number;
  requiredDirects: number;
  requiredTeamSize: number;
  requiredSpent: string;
  requiredLevelId: number;
}

export interface MultiLevelConfig {
  levels: MultiLevelTier[];
  maxTotalRate: number;
}

export interface ActivationProgress {
  level: number;
  activated: boolean;
  directsCurrent: number;
  directsRequired: number;
  teamCurrent: number;
  teamRequired: number;
  spentCurrent: string;
  spentRequired: string;
}

export interface MultiLevelPendingConfig {
  config: MultiLevelConfig;
  effectiveAt: number;
  scheduledBy: string;
}

export interface MultiLevelConfigChangeLog {
  who: string;
  blockNumber: number;
  changeType: string;
}

export interface MultiLevelEntityOverview {
  config: MultiLevelConfig | null;
  isPaused: boolean;
  totalDistributed: string;
  totalOrders: number;
  totalDistributionEntries: number;
  pendingConfig: MultiLevelPendingConfig | null;
}

// ---------------------------------------------------------------------------
// Commission - Pool Reward
// ---------------------------------------------------------------------------
export interface LevelSnapshot {
  levelId: number;
  memberCount: number;
  perMemberReward: string;
  claimedCount: number;
}

export interface RoundInfo {
  roundId: number;
  startBlock: number;
  poolSnapshot: string;
  levelSnapshots: LevelSnapshot[];
  tokenPoolSnapshot: string | null;
  tokenLevelSnapshots: LevelSnapshot[] | null;
}

export interface ClaimRecord {
  roundId: number;
  amount: string;
  levelId: number;
  claimedAt: number;
  tokenAmount: string;
}

export interface PoolRewardConfig {
  levelRatios: [number, number][];
  roundDuration: number;
  tokenPoolEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Market (NEX Market)
// ---------------------------------------------------------------------------
export interface TradeOrder {
  orderId: number;
  entityId: number;
  maker: string;
  side: string;
  orderType: string;
  tokenAmount: string;
  filledAmount: string;
  price: string;
  status: string;
  createdAt: number;
  expiresAt: number;
  depositWaived: boolean;
}

export interface PriceLevel {
  price: string;
  totalAmount: string;
  orderCount: number;
}

export interface OrderBookDepth {
  entityId: number;
  asks: PriceLevel[];
  bids: PriceLevel[];
  bestAsk: string | null;
  bestBid: string | null;
  spread: string | null;
}

export interface TradeRecord {
  tradeId: number;
  orderId: number;
  entityId: number;
  maker: string;
  taker: string;
  side: string;
  tokenAmount: string;
  price: string;
  nexAmount: string;
  blockNumber: number;
}

export interface MarketStats {
  totalOrders: number;
  totalTrades: number;
  totalVolumeNex: string;
}

// ---------------------------------------------------------------------------
// NEX Global Market (NEX ↔ USDT P2P)
// ---------------------------------------------------------------------------
export interface NexMarketOrder {
  id: number;
  trader: string;
  side: 'Buy' | 'Sell';
  price: string;          // USDT price (raw, 6 decimals)
  amount: string;         // NEX amount (raw, 12 decimals)
  filled: string;         // filled amount (raw, 12 decimals)
  minFillAmount: string;  // minimum fill amount (raw)
  tronAddress: string;
  createdAt: number;
  depositWaived: boolean;
  deposit: string;        // buyer_deposit (NEX, raw 12 decimals) — sell orders lock NEX directly
}

export interface NexMarketTrade {
  tradeId: number;
  orderId: number;
  buyer: string;
  seller: string;
  nexAmount: string;
  usdtAmount: string;
  sellerTronAddress: string;
  buyerTronAddress: string;
  status: string;         // AwaitingPayment | AwaitingVerification | UnderpaidPending | Completed | Refunded | Cancelled | Disputed
  paymentConfirmed: boolean;
  createdAt: number;
  buyerDeposit: string;   // buyer_deposit (NEX, raw 12 decimals)
  depositStatus: 'None' | 'Locked' | 'Released' | 'Forfeited' | 'PartiallyForfeited';
}

export interface NexMarketStats {
  twapLastPrice: string;  // last_price field from TwapAccumulator (raw, 6 decimals)
  lastPrice: string;      // last trade price from LastTradePrice storage (raw, 6 decimals)
  totalOrders: number;
  totalTrades: number;
  totalVolumeUsdt: string; // total USDT volume (raw, 6 decimals)
}

export interface NexPriceProtection {
  minPrice: string;
  maxPrice: string;
  circuitBreakerActive: boolean;
}

// ---------------------------------------------------------------------------
// Disclosure & Announcements
// ---------------------------------------------------------------------------
export interface AnnouncementRecord {
  id: number;
  entityId: number;
  category: string;       // General | Promotion | SystemUpdate | ActivityNotice | RiskWarning | Product | Other
  title: string;
  contentCid: string;
  publisher: string;
  publishedAt: number;
  expiresAt: number | null;
  status: string;         // Active | Withdrawn | Expired
  isPinned: boolean;
}

export interface DisclosureRecord {
  id: number;
  entityId: number;
  disclosureType: string; // AnnualReport | QuarterlyReport | MonthlyReport | MaterialEvent | AffiliatedTransaction | ChangesInShareholding | Buyback | Other
  contentCid: string;
  summaryCid: string | null;
  discloser: string;
  disclosedAt: number;
  status: string;         // Draft | Published | Withdrawn | Corrected
  previousId: number | null;
}

export interface DisclosureConfig {
  level: string;
  insiderTradingControl: boolean;
  blackoutPeriodAfter: number;
  nextRequiredDisclosure: number;
  lastDisclosure: number;
  violationCount: number;
}

/** Community member info (legacy) */
export interface CommunityMember {
  address: string;
  entityId: number;
  level: number;
  referrer: string | null;
  joinedAt: number;
}

/** Commission earnings summary */
export interface EarningsSummary {
  totalEarned: bigint;
  pendingWithdraw: bigint;
  lastSettlementBlock: number;
}

// ---------------------------------------------------------------------------
// Commission Core — Withdraw
// ---------------------------------------------------------------------------
export interface NexCommissionMemberStats {
  totalEarned: string;
  pending: string;
  withdrawn: string;
  repurchased: string;
  orderCount: number;
}

export interface TokenCommissionMemberStats {
  totalEarned: string;
  pending: string;
  withdrawn: string;
  repurchased: string;
  orderCount: number;
}

export interface WithdrawalTierConfig {
  minAmount: string;
  maxAmount: string;
  cooldownBlocks: number;
  feeRate: number;
}

export interface WithdrawalConfig {
  mode: string;
  defaultTier: WithdrawalTierConfig;
  levelOverrides: [number, WithdrawalTierConfig][];
  voluntaryBonusRate: number;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Commission Dashboard API
// ---------------------------------------------------------------------------
export interface NexCommissionStats {
  totalEarned: string;
  pending: string;
  withdrawn: string;
  repurchased: string;
  orderCount: number;
}

export interface TokenCommissionStats {
  totalEarned: string;
  pending: string;
  withdrawn: string;
  repurchased: string;
  orderCount: number;
}

export interface MultiLevelActivationInfo {
  level: number;
  activated: boolean;
  directsCurrent: number;
  directsRequired: number;
  teamCurrent: number;
  teamRequired: number;
  spentCurrent: string;
  spentRequired: string;
}

export interface MultiLevelMemberStats {
  totalEarned: string;
  totalOrders: number;
  lastCommissionBlock: number;
}

export interface TeamTierInfo {
  tierIndex: number;
  name: string;
  rate: number;
  totalEarned: string;
}

export interface SingleLineSnapshot {
  position: number | null;
  uplineLevels: number | null;
  downlineLevels: number | null;
  isEnabled: boolean;
  queueLength: number;
}

export interface PoolRewardSnapshot {
  claimableNex: string;
  claimableToken: string;
  isPaused: boolean;
  currentRoundId: number;
}

export interface ReferralSnapshot {
  totalEarned: string;
  capMaxPerOrder: string | null;
  capMaxTotal: string | null;
}

export interface MemberCommissionDashboard {
  nexStats: NexCommissionStats;
  tokenStats: TokenCommissionStats;
  nexShoppingBalance: string;
  tokenShoppingBalance: string;
  multiLevelProgress: MultiLevelActivationInfo[];
  multiLevelStats: MultiLevelMemberStats | null;
  teamTier: TeamTierInfo | null;
  singleLine: SingleLineSnapshot;
  poolReward: PoolRewardSnapshot;
  referral: ReferralSnapshot;
}

export interface DirectReferralInfo {
  referralTotalEarned: string;
  capMaxPerOrder: string | null;
  capMaxTotal: string | null;
  capRemaining: string | null;
}

export interface TeamPerformanceInfo {
  teamSize: number;
  directReferrals: number;
  totalSpent: string;
  currentTier: TeamTierInfo | null;
  isEnabled: boolean;
  configExists: boolean;
}

export interface EntityCommissionOverview {
  enabledModes: number;
  commissionRate: number;
  isEnabled: boolean;
  pendingTotalNex: string;
  pendingTotalToken: string;
  unallocatedPoolNex: string;
  unallocatedPoolToken: string;
  shoppingTotalNex: string;
  shoppingTotalToken: string;
  multiLevelPaused: boolean;
  singleLineEnabled: boolean;
  teamStatus: [boolean, boolean];
  poolRewardPaused: boolean;
  withdrawalPaused: boolean;
}

export interface DirectReferralMember {
  account: string;
  levelId: number;
  totalSpent: string;
  orderCount: number;
  joinedAt: number;
  lastActiveAt: number;
  isActive: boolean;
  teamSize: number;
  directReferrals: number;
  commissionContributed: string;
}

export interface DirectReferralDetails {
  referrals: DirectReferralMember[];
  totalCount: number;
  totalCommissionEarned: string;
  capMaxTotal: string | null;
  capRemaining: string | null;
}

// ---------------------------------------------------------------------------
// Entity Token
// ---------------------------------------------------------------------------
export interface EntityTokenConfig {
  enabled: boolean;
  rewardRate: number;
  exchangeRate: number;
  minRedeem: string;
  maxRedeemPerOrder: string;
  transferable: boolean;
  createdAt: number;
  tokenType: string;
  maxSupply: string;
  transferRestriction: string;
  minReceiverKyc: number;
}

export interface EntityTokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

// ---------------------------------------------------------------------------
// Entity Review
// ---------------------------------------------------------------------------
export interface MallReview {
  orderId: number;
  reviewer: string;
  rating: number;
  contentCid: string | null;
  createdAt: number;
  productId: number | null;
  edited: boolean;
}

export interface ReviewReply {
  replier: string;
  contentCid: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Member Team API
// ---------------------------------------------------------------------------
export interface UpgradeRecordInfo {
  ruleId: number;
  fromLevelId: number;
  toLevelId: number;
  upgradedAt: number;
  expiresAt: number | null;
}

export interface MemberDashboardInfo {
  referrer: string | null;
  customLevelId: number;
  effectiveLevelId: number;
  totalSpent: string;
  directReferrals: number;
  qualifiedReferrals: number;
  indirectReferrals: number;
  qualifiedIndirectReferrals: number;
  teamSize: number;
  orderCount: number;
  joinedAt: number;
  lastActiveAt: number;
  activated: boolean;
  isQualifiedReferral: boolean;
  isBanned: boolean;
  bannedAt: number | null;
  banReason: string | null;
  levelExpiresAt: number | null;
  upgradeHistory: UpgradeRecordInfo[];
}

export interface TeamMemberInfo {
  account: string;
  levelId: number;
  totalSpent: string;
  directReferrals: number;
  teamSize: number;
  joinedAt: number;
  lastActiveAt: number;
  isBanned: boolean;
  children: TeamMemberInfo[];
}

export interface EntityMemberOverview {
  totalMembers: number;
  levelDistribution: [number, number][];
  pendingCount: number;
  bannedCount: number;
}

export interface PaginatedMemberInfo {
  account: string;
  levelId: number;
  totalSpent: string;
  directReferrals: number;
  teamSize: number;
  joinedAt: number;
  isBanned: boolean;
  banReason: string | null;
}

export interface PaginatedMembersResult {
  members: PaginatedMemberInfo[];
  total: number;
  hasMore: boolean;
}

export interface UplineNode {
  account: string;
  levelId: number;
  teamSize: number;
  joinedAt: number;
}

export interface UplineChainResult {
  chain: UplineNode[];
  truncated: boolean;
  depth: number;
}

export interface ReferralTreeNode {
  account: string;
  levelId: number;
  directReferrals: number;
  teamSize: number;
  totalSpent: string;
  joinedAt: number;
  isBanned: boolean;
  children: ReferralTreeNode[];
  hasMoreChildren: boolean;
}

export interface GenerationMemberInfo {
  account: string;
  levelId: number;
  directReferrals: number;
  teamSize: number;
  totalSpent: string;
  joinedAt: number;
  isBanned: boolean;
  referrer: string;
}

export interface PaginatedGenerationResult {
  generation: number;
  members: GenerationMemberInfo[];
  totalCount: number;
  pageSize: number;
  pageIndex: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Commission Preview — Core Config & Plugin Configs
// ---------------------------------------------------------------------------
export interface PluginBudgetCaps {
  referral: number;
  multiLevel: number;
  levelDiff: number;
  singleLine: number;
  team: number;
}

export interface CoreCommissionConfig {
  maxCommissionRate: number;
  creatorRewardRate: number;
  pluginCaps: PluginBudgetCaps;
  enabledModes: number;
}

export interface ReferralCaps {
  maxPerOrder: string | null;
  maxTotal: string | null;
}

export interface ReferralConfig {
  directRewardRate: number;
  firstOrderRate: number;
  firstOrderAmount: string;
  repeatPurchaseRate: number;
  fixedAmountAmount: string;
  caps: ReferralCaps;
}

export interface LevelDiffConfig {
  levelRates: number[];
  maxDepth: number;
}

export interface TeamPerformanceTier {
  salesThreshold: string;
  minTeamSize: number;
  rate: number;
}

export interface TeamPerformanceConfig {
  tiers: TeamPerformanceTier[];
  maxDepth: number;
  allowStacking: boolean;
}
