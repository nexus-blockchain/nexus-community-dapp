'use client';

import { useEntityQuery, hasPallet } from './use-entity-query';
import { useEntityStore } from '@/stores';
import { REFETCH_INTERVALS, STALE_TIMES } from '@/lib/chain/constants';
import { shortAddress } from '@/lib/utils/chain-helpers';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type GovernanceMode = 'None' | 'FullDAO' | 'MultiSig' | 'Council';

export type ProposalStatus =
  | 'Voting'
  | 'Passed'
  | 'Failed'
  | 'Executed'
  | 'ApprovedOffchain'
  | 'Cancelled'
  | 'Expired'
  | 'ExecutionFailed';

export type ProposalDomain =
  | 'Product' | 'Shop' | 'Token' | 'Treasury' | 'Governance'
  | 'Commission' | 'Member' | 'Disclosure' | 'Emergency' | 'Community'
  | 'Market' | 'SingleLine' | 'Kyc' | 'FundProtection';

export interface GovernanceConfig {
  mode: GovernanceMode;
  votingPeriod: number;
  executionDelay: number;
  quorumThreshold: number;
  passThreshold: number;
  proposalThreshold: number;
  adminVetoEnabled: boolean;
}

export interface GovernanceOverview {
  config: GovernanceConfig | null;
  locked: boolean;
  paused: boolean;
  palletAvailable: boolean;
}

export interface Proposal {
  id: number;
  entityId: number;
  proposer: string;
  title: string;
  descriptionCid: string | null;
  status: ProposalStatus;
  createdAt: number;
  votingStart: number;
  votingEnd: number;
  executionTime: number | null;
  yesVotes: string;
  noVotes: string;
  abstainVotes: string;
  voterCount: number;
  snapshotQuorum: number;
  snapshotPass: number;
  snapshotExecutionDelay: number;
  snapshotTotalSupply: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function parseGovernanceMode(raw: unknown): GovernanceMode {
  if (raw == null) return 'None';
  const s = typeof raw === 'string' ? raw : String(raw);
  if (s === 'FullDAO' || s === 'fullDao' || s === 'fullDAO') return 'FullDAO';
  if (s === 'MultiSig' || s === 'multiSig') return 'MultiSig';
  if (s === 'Council' || s === 'council') return 'Council';
  return 'None';
}

function parseProposalStatus(raw: unknown): ProposalStatus {
  if (raw == null) return 'Voting';
  const s = typeof raw === 'string' ? raw : String(raw);
  const map: Record<string, ProposalStatus> = {
    Voting: 'Voting', voting: 'Voting',
    Passed: 'Passed', passed: 'Passed',
    Failed: 'Failed', failed: 'Failed',
    Executed: 'Executed', executed: 'Executed',
    ApprovedOffchain: 'ApprovedOffchain', approvedOffchain: 'ApprovedOffchain',
    Cancelled: 'Cancelled', cancelled: 'Cancelled',
    Expired: 'Expired', expired: 'Expired',
    ExecutionFailed: 'ExecutionFailed', executionFailed: 'ExecutionFailed',
  };
  return map[s] ?? 'Voting';
}

function decodeTitle(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') {
    // hex string
    if (raw.startsWith('0x')) {
      try {
        const bytes = new Uint8Array(
          (raw.slice(2).match(/.{1,2}/g) ?? []).map((b) => parseInt(b, 16)),
        );
        return new TextDecoder().decode(bytes);
      } catch {
        return raw;
      }
    }
    return raw;
  }
  // BoundedVec<u8> may come as array of numbers
  if (Array.isArray(raw)) {
    try {
      return new TextDecoder().decode(new Uint8Array(raw));
    } catch {
      return String(raw);
    }
  }
  return String(raw);
}

// ─────────────────────────────────────────────
// Hook: query governance overview
// ─────────────────────────────────────────────

export function useGovernanceOverview(entityId: number | null) {
  return useEntityQuery<GovernanceOverview>(
    ['governanceOverview', entityId],
    async (api) => {
      if (entityId == null) {
        return { config: null, locked: false, paused: false, palletAvailable: false };
      }

      if (!hasPallet(api, 'entityGovernance')) {
        return { config: null, locked: false, paused: false, palletAvailable: false };
      }

      // GovernanceConfigs
      let config: GovernanceConfig | null = null;
      try {
        const raw = await (api.query as any).entityGovernance.governanceConfigs(entityId);
        if (raw && !raw.isNone) {
          const c = raw.unwrap().toJSON();
          config = {
            mode: parseGovernanceMode(c.mode),
            votingPeriod: Number(c.voting_period ?? c.votingPeriod ?? 0),
            executionDelay: Number(c.execution_delay ?? c.executionDelay ?? 0),
            quorumThreshold: Number(c.quorum_threshold ?? c.quorumThreshold ?? 0),
            passThreshold: Number(c.pass_threshold ?? c.passThreshold ?? 0),
            proposalThreshold: Number(c.proposal_threshold ?? c.proposalThreshold ?? 0),
            adminVetoEnabled: Boolean(c.admin_veto_enabled ?? c.adminVetoEnabled ?? false),
          };
        }
      } catch { /* not available */ }

      // GovernanceLocked
      let locked = false;
      try {
        const raw = await (api.query as any).entityGovernance.governanceLocked(entityId);
        locked = raw?.isTrue ?? raw?.toJSON() === true;
      } catch { /* not available */ }

      // GovernancePaused
      let paused = false;
      try {
        const raw = await (api.query as any).entityGovernance.governancePaused(entityId);
        paused = raw?.isTrue ?? raw?.toJSON() === true;
      } catch { /* not available */ }

      return { config, locked, paused, palletAvailable: true };
    },
    { staleTime: STALE_TIMES.proposals, enabled: entityId != null, refetchInterval: REFETCH_INTERVALS.listing },
  );
}

// ─────────────────────────────────────────────
// Hook: query entity active proposals
// ─────────────────────────────────────────────

export function useEntityProposals(entityId: number | null) {
  return useEntityQuery<Proposal[]>(
    ['entityProposals', entityId],
    async (api) => {
      if (entityId == null) return [];
      if (!hasPallet(api, 'entityGovernance')) return [];

      // Get active proposal IDs for this entity
      let proposalIds: number[] = [];
      try {
        const raw = await (api.query as any).entityGovernance.entityProposals(entityId);
        const arr = raw?.toJSON();
        if (Array.isArray(arr)) {
          proposalIds = arr.map(Number);
        }
      } catch {
        return [];
      }

      if (proposalIds.length === 0) return [];

      // Fetch each proposal
      const proposals: Proposal[] = [];
      for (const pid of proposalIds) {
        try {
          const raw = await (api.query as any).entityGovernance.proposals(pid);
          if (raw && !raw.isNone) {
            const p = raw.unwrap().toJSON();
            proposals.push({
              id: Number(p.id),
              entityId: Number(p.entity_id ?? p.entityId),
              proposer: String(p.proposer ?? ''),
              title: decodeTitle(p.title),
              descriptionCid: p.description_cid ?? p.descriptionCid ?? null,
              status: parseProposalStatus(p.status),
              createdAt: Number(p.created_at ?? p.createdAt ?? 0),
              votingStart: Number(p.voting_start ?? p.votingStart ?? 0),
              votingEnd: Number(p.voting_end ?? p.votingEnd ?? 0),
              executionTime: p.execution_time ?? p.executionTime ?? null,
              yesVotes: String(p.yes_votes ?? p.yesVotes ?? '0'),
              noVotes: String(p.no_votes ?? p.noVotes ?? '0'),
              abstainVotes: String(p.abstain_votes ?? p.abstainVotes ?? '0'),
              voterCount: Number(p.voter_count ?? p.voterCount ?? 0),
              snapshotQuorum: Number(p.snapshot_quorum ?? p.snapshotQuorum ?? 0),
              snapshotPass: Number(p.snapshot_pass ?? p.snapshotPass ?? 0),
              snapshotExecutionDelay: Number(p.snapshot_execution_delay ?? p.snapshotExecutionDelay ?? 0),
              snapshotTotalSupply: String(p.snapshot_total_supply ?? p.snapshotTotalSupply ?? '0'),
            });
          }
        } catch { /* skip unreadable proposals */ }
      }

      return proposals;
    },
    { staleTime: STALE_TIMES.proposals, enabled: entityId != null, refetchInterval: REFETCH_INTERVALS.listing },
  );
}
