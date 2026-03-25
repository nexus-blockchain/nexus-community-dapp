/**
 * Custom runtime API definitions for polkadot.js.
 *
 * polkadot.js uses Metadata V14 by default, which does NOT include runtime API
 * definitions. Without explicit registration here, `api.call.commissionDashboardApi`
 * and `api.call.memberTeamApi` will be undefined, causing all runtime API queries
 * to silently return null.
 *
 * These definitions tell polkadot.js how to encode params and decode return values
 * for the custom runtime API calls so they appear on `api.call.*`.
 */
import type { DefinitionsCall } from '@polkadot/types/types';

// ============================================================================
// Custom SCALE type definitions (mirror of Rust structs)
// ============================================================================

export const customTypes: Record<string, any> = {
  // ----- Commission Dashboard API types -----
  NexCommissionStats: {
    total_earned: 'u128',
    pending: 'u128',
    withdrawn: 'u128',
    repurchased: 'u128',
    order_count: 'u32',
  },
  TokenCommissionStats: {
    total_earned: 'u128',
    pending: 'u128',
    withdrawn: 'u128',
    repurchased: 'u128',
    order_count: 'u32',
  },
  MultiLevelActivationInfo: {
    level: 'u16',
    activated: 'bool',
    directs_current: 'u32',
    directs_required: 'u32',
    team_current: 'u32',
    team_required: 'u32',
    spent_current: 'u128',
    spent_required: 'u128',
  },
  MultiLevelMemberStats: {
    total_earned: 'u128',
    total_orders: 'u32',
    last_commission_block: 'u32',
  },
  TeamTierInfo: {
    tier_index: 'u8',
    name: 'Bytes',
    rate: 'u16',
    total_earned: 'u128',
    next_threshold: 'Option<u128>',
    next_min_team_size: 'Option<u32>',
  },
  SingleLineSnapshot: {
    position: 'Option<u32>',
    upline_levels: 'Option<u8>',
    downline_levels: 'Option<u8>',
    is_enabled: 'bool',
    queue_length: 'u32',
  },
  PoolRewardSnapshot: {
    claimable_nex: 'u128',
    claimable_token: 'u128',
    is_paused: 'bool',
    current_round_id: 'u64',
  },
  ReferralSnapshot: {
    total_earned: 'u128',
    cap_max_per_order: 'Option<u128>',
    cap_max_total: 'Option<u128>',
  },
  MemberCommissionDashboard: {
    nex_stats: 'NexCommissionStats',
    token_stats: 'TokenCommissionStats',
    nex_shopping_balance: 'u128',
    token_shopping_balance: 'u128',
    multi_level_progress: 'Vec<MultiLevelActivationInfo>',
    multi_level_stats: 'Option<MultiLevelMemberStats>',
    team_tier: 'Option<TeamTierInfo>',
    single_line: 'SingleLineSnapshot',
    pool_reward: 'PoolRewardSnapshot',
    referral: 'ReferralSnapshot',
  },
  DirectReferralInfo: {
    referral_total_earned: 'u128',
    cap_max_per_order: 'Option<u128>',
    cap_max_total: 'Option<u128>',
    cap_remaining: 'Option<u128>',
  },
  TeamPerformanceInfo: {
    team_size: 'u32',
    direct_referrals: 'u32',
    total_spent: 'u128',
    current_tier: 'Option<TeamTierInfo>',
    is_enabled: 'bool',
    config_exists: 'bool',
  },
  EntityCommissionOverview: {
    enabled_modes: 'u16',
    commission_rate: 'u16',
    is_enabled: 'bool',
    pending_total_nex: 'u128',
    pending_total_token: 'u128',
    unallocated_pool_nex: 'u128',
    unallocated_pool_token: 'u128',
    shopping_total_nex: 'u128',
    shopping_total_token: 'u128',
    multi_level_paused: 'bool',
    single_line_enabled: 'bool',
    team_status: '(bool, bool)',
    pool_reward_paused: 'bool',
    withdrawal_paused: 'bool',
  },
  DirectReferralMember: {
    account: 'AccountId',
    level_id: 'u8',
    total_spent: 'u64',
    order_count: 'u32',
    joined_at: 'u64',
    last_active_at: 'u64',
    is_active: 'bool',
    team_size: 'u32',
    direct_referrals: 'u32',
    commission_contributed: 'u128',
  },
  DirectReferralDetails: {
    referrals: 'Vec<DirectReferralMember>',
    total_count: 'u32',
    total_commission_earned: 'u128',
    cap_max_total: 'Option<u128>',
    cap_remaining: 'Option<u128>',
  },
  WithdrawalRecordView: {
    total_amount: 'u128',
    withdrawn: 'u128',
    repurchased: 'u128',
    bonus: 'u128',
    block_number: 'u64',
  },

  // ----- Member Team API types -----
  UpgradeRecordInfo: {
    rule_id: 'u32',
    from_level_id: 'u8',
    to_level_id: 'u8',
    upgraded_at: 'u64',
    expires_at: 'Option<u64>',
  },
  MemberDashboardInfo: {
    referrer: 'Option<AccountId>',
    custom_level_id: 'u8',
    effective_level_id: 'u8',
    total_spent: 'u64',
    direct_referrals: 'u32',
    qualified_referrals: 'u32',
    indirect_referrals: 'u32',
    qualified_indirect_referrals: 'u32',
    team_size: 'u32',
    order_count: 'u32',
    joined_at: 'u64',
    last_active_at: 'u64',
    activated: 'bool',
    is_qualified_referral: 'bool',
    is_banned: 'bool',
    banned_at: 'Option<u64>',
    ban_reason: 'Option<Bytes>',
    level_expires_at: 'Option<u64>',
    upgrade_history: 'Vec<UpgradeRecordInfo>',
  },
  TeamMemberInfo: {
    account: 'AccountId',
    level_id: 'u8',
    total_spent: 'u64',
    direct_referrals: 'u32',
    team_size: 'u32',
    joined_at: 'u64',
    last_active_at: 'u64',
    is_banned: 'bool',
    children: 'Vec<TeamMemberInfo>',
  },
  EntityMemberOverview: {
    total_members: 'u32',
    level_distribution: 'Vec<(u8, u32)>',
    pending_count: 'u32',
    banned_count: 'u32',
  },
  PaginatedMemberInfo: {
    account: 'AccountId',
    level_id: 'u8',
    total_spent: 'u64',
    direct_referrals: 'u32',
    team_size: 'u32',
    joined_at: 'u64',
    is_banned: 'bool',
    ban_reason: 'Option<Bytes>',
  },
  PaginatedMembersResult: {
    members: 'Vec<PaginatedMemberInfo>',
    total: 'u32',
    has_more: 'bool',
  },
  UplineNode: {
    account: 'AccountId',
    level_id: 'u8',
    team_size: 'u32',
    joined_at: 'u64',
  },
  UplineChainResult: {
    chain: 'Vec<UplineNode>',
    truncated: 'bool',
    depth: 'u32',
  },
  ReferralTreeNode: {
    account: 'AccountId',
    level_id: 'u8',
    direct_referrals: 'u32',
    team_size: 'u32',
    total_spent: 'u64',
    joined_at: 'u64',
    is_banned: 'bool',
    children: 'Vec<ReferralTreeNode>',
    has_more_children: 'bool',
  },
  GenerationMemberInfo: {
    account: 'AccountId',
    level_id: 'u8',
    direct_referrals: 'u32',
    team_size: 'u32',
    total_spent: 'u64',
    joined_at: 'u64',
    is_banned: 'bool',
    referrer: 'AccountId',
  },
  PaginatedGenerationResult: {
    generation: 'u32',
    members: 'Vec<GenerationMemberInfo>',
    total_count: 'u32',
    page_size: 'u32',
    page_index: 'u32',
    has_more: 'bool',
  },

  // ----- Pool Reward Detail API types -----
  LevelProgressInfo: {
    level_id: 'u8',
    ratio_bps: 'u16',
    member_count: 'u32',
    claimed_count: 'u32',
    per_member_reward: 'u128',
  },
  ClaimRecordInfo: {
    round_id: 'u64',
    amount: 'u128',
    token_amount: 'u128',
    level_id: 'u8',
    claimed_at: 'u64',
  },
  PoolRewardMemberView: {
    round_duration: 'u64',
    token_pool_enabled: 'bool',
    level_ratios: 'Vec<(u8, u16)>',
    current_round_id: 'u64',
    round_start_block: 'u64',
    round_end_block: 'u64',
    pool_snapshot: 'u128',
    token_pool_snapshot: 'Option<u128>',
    effective_level: 'u8',
    claimable_nex: 'u128',
    claimable_token: 'u128',
    already_claimed: 'bool',
    round_expired: 'bool',
    last_claimed_round: 'u64',
    level_progress: 'Vec<LevelProgressInfo>',
    token_level_progress: 'Option<Vec<LevelProgressInfo>>',
    claim_history: 'Vec<ClaimRecordInfo>',
    is_paused: 'bool',
    has_pending_config: 'bool',
  },
};

// ============================================================================
// Runtime API call definitions
// ============================================================================

export const runtimeDefs: DefinitionsCall = {
  CommissionDashboardApi: [
    {
      methods: {
        get_member_commission_dashboard: {
          description: 'Member commission dashboard (aggregated)',
          params: [
            { name: 'entity_id', type: 'u64' },
            { name: 'account', type: 'AccountId' },
          ],
          type: 'Option<MemberCommissionDashboard>',
        },
        get_direct_referral_info: {
          description: 'Direct referral commission info',
          params: [
            { name: 'entity_id', type: 'u64' },
            { name: 'account', type: 'AccountId' },
          ],
          type: 'DirectReferralInfo',
        },
        get_team_performance_info: {
          description: 'Team performance info',
          params: [
            { name: 'entity_id', type: 'u64' },
            { name: 'account', type: 'AccountId' },
          ],
          type: 'TeamPerformanceInfo',
        },
        get_entity_commission_overview: {
          description: 'Entity commission overview (owner view)',
          params: [
            { name: 'entity_id', type: 'u64' },
          ],
          type: 'EntityCommissionOverview',
        },
        get_direct_referral_details: {
          description: 'Direct referral member details',
          params: [
            { name: 'entity_id', type: 'u64' },
            { name: 'account', type: 'AccountId' },
          ],
          type: 'DirectReferralDetails',
        },
        get_member_withdrawal_records: {
          description: 'Get member NEX withdrawal records',
          params: [
            { name: 'entity_id', type: 'u64' },
            { name: 'account', type: 'AccountId' },
          ],
          type: 'Vec<WithdrawalRecordView>',
        },
      },
      version: 1,
    },
  ],
  MemberTeamApi: [
    {
      methods: {
        get_member_info: {
          description: 'Get member dashboard info',
          params: [
            { name: 'entity_id', type: 'u64' },
            { name: 'account', type: 'AccountId' },
          ],
          type: 'Option<MemberDashboardInfo>',
        },
        get_referral_team: {
          description: 'Get referral team tree',
          params: [
            { name: 'entity_id', type: 'u64' },
            { name: 'account', type: 'AccountId' },
            { name: 'depth', type: 'u32' },
          ],
          type: 'Vec<TeamMemberInfo>',
        },
        get_entity_member_overview: {
          description: 'Get entity member overview',
          params: [
            { name: 'entity_id', type: 'u64' },
          ],
          type: 'EntityMemberOverview',
        },
        get_members_paginated: {
          description: 'Get paginated member list',
          params: [
            { name: 'entity_id', type: 'u64' },
            { name: 'page_size', type: 'u32' },
            { name: 'page_index', type: 'u32' },
          ],
          type: 'PaginatedMembersResult',
        },
        get_upline_chain: {
          description: 'Get upline referral chain',
          params: [
            { name: 'entity_id', type: 'u64' },
            { name: 'account', type: 'AccountId' },
            { name: 'max_depth', type: 'u32' },
          ],
          type: 'UplineChainResult',
        },
        get_referral_tree: {
          description: 'Get deep referral tree',
          params: [
            { name: 'entity_id', type: 'u64' },
            { name: 'account', type: 'AccountId' },
            { name: 'depth', type: 'u32' },
          ],
          type: 'ReferralTreeNode',
        },
        get_referrals_by_generation: {
          description: 'Get referrals by generation (paginated)',
          params: [
            { name: 'entity_id', type: 'u64' },
            { name: 'account', type: 'AccountId' },
            { name: 'generation', type: 'u32' },
            { name: 'page_size', type: 'u32' },
            { name: 'page_index', type: 'u32' },
          ],
          type: 'PaginatedGenerationResult',
        },
      },
      version: 1,
    },
  ],
  PoolRewardDetailApi: [
    {
      methods: {
        get_pool_reward_member_view: {
          description: 'Get comprehensive pool reward member view',
          params: [
            { name: 'entity_id', type: 'u64' },
            { name: 'account', type: 'AccountId' },
          ],
          type: 'Option<PoolRewardMemberView>',
        },
      },
      version: 1,
    },
  ],
};
