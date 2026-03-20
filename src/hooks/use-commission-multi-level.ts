'use client';

import { useEntityQuery } from './use-entity-query';
import { STALE_TIMES } from '@/lib/chain/constants';
import type {
  MultiLevelConfig,
  MultiLevelPendingConfig,
  MultiLevelConfigChangeLog,
  MultiLevelEntityOverview,
} from '@/lib/types';

// Re-export existing multi-level hooks for convenience
export {
  useMultiLevelConfig,
  useMultiLevelPaused,
  useMultiLevelMemberStats,
  useMultiLevelEntityStats,
} from './use-commission';

// ======================== Pending Config ========================

export function useMultiLevelPendingConfig(entityId: number | null) {
  return useEntityQuery<MultiLevelPendingConfig | null>(
    ['multiLevelPendingConfig', entityId],
    async (api) => {
      if (entityId == null) return null;
      const raw = await (api.query as any).commissionMultiLevel.pendingConfigs(entityId);
      if (raw.isNone) return null;
      const data = raw.unwrap().toJSON();
      return {
        config: parseConfig(data.config),
        effectiveAt: data.effectiveAt ?? data.effective_at ?? 0,
        scheduledBy: data.scheduledBy ?? data.scheduled_by ?? '',
      };
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null },
  );
}

// ======================== Change Logs ========================

export function useMultiLevelChangeLogs(entityId: number | null, limit = 20) {
  return useEntityQuery<MultiLevelConfigChangeLog[]>(
    ['multiLevelChangeLogs', entityId, limit],
    async (api) => {
      if (entityId == null) return [];
      const rawCount = await (api.query as any).commissionMultiLevel.configChangeLogCount(entityId);
      const totalCount = Number(rawCount.toJSON() ?? 0);
      if (totalCount === 0) return [];

      const maxLogs = 1000;
      const effectiveCount = Math.min(totalCount, maxLogs);
      const fetchCount = Math.min(limit, effectiveCount);

      const queries: Promise<any>[] = [];
      for (let i = 0; i < fetchCount; i++) {
        const idx = totalCount - 1 - i;
        const slot = idx % maxLogs;
        queries.push(
          (api.query as any).commissionMultiLevel.configChangeLogs(entityId, slot),
        );
      }

      const results = await Promise.all(queries);
      const logs: MultiLevelConfigChangeLog[] = [];
      for (const raw of results) {
        if (raw.isNone) continue;
        const data = raw.unwrap().toJSON();
        logs.push({
          who: data.who ?? '',
          blockNumber: data.blockNumber ?? data.block_number ?? 0,
          changeType: parseChangeType(data.changeType ?? data.change_type),
        });
      }
      return logs;
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null },
  );
}

// ======================== Entity Overview (aggregated) ========================

export function useMultiLevelEntityOverview(entityId: number | null) {
  return useEntityQuery<MultiLevelEntityOverview | null>(
    ['multiLevelEntityOverview', entityId],
    async (api) => {
      if (entityId == null) return null;

      const [rawConfig, rawPaused, rawStats, rawPending] = await Promise.all([
        (api.query as any).commissionMultiLevel.multiLevelConfigs(entityId),
        (api.query as any).commissionMultiLevel.globalPaused(entityId),
        (api.query as any).commissionMultiLevel.entityMultiLevelStats(entityId),
        (api.query as any).commissionMultiLevel.pendingConfigs(entityId),
      ]);

      const config = rawConfig.isNone ? null : parseConfig(rawConfig.unwrap().toJSON());
      const isPaused: boolean = rawPaused.toJSON() ?? false;
      const stats = rawStats.toJSON();
      let pendingConfig: MultiLevelPendingConfig | null = null;
      if (!rawPending.isNone) {
        const pd = rawPending.unwrap().toJSON();
        pendingConfig = {
          config: parseConfig(pd.config),
          effectiveAt: pd.effectiveAt ?? pd.effective_at ?? 0,
          scheduledBy: pd.scheduledBy ?? pd.scheduled_by ?? '',
        };
      }

      return {
        config,
        isPaused,
        totalDistributed: String(stats?.totalDistributed ?? stats?.total_distributed ?? '0'),
        totalOrders: stats?.totalOrders ?? stats?.total_orders ?? 0,
        totalDistributionEntries: stats?.totalDistributionEntries ?? stats?.total_distribution_entries ?? 0,
        pendingConfig,
      };
    },
    { staleTime: STALE_TIMES.commission, enabled: entityId != null },
  );
}

// ======================== Helpers ========================

function parseConfig(data: any): MultiLevelConfig {
  return {
    levels: (data?.levels ?? []).map((t: any) => ({
      rate: t.rate ?? 0,
      requiredDirects: t.requiredDirects ?? t.required_directs ?? 0,
      requiredTeamSize: t.requiredTeamSize ?? t.required_team_size ?? 0,
      requiredSpent: String(t.requiredSpent ?? t.required_spent ?? '0'),
      requiredLevelId: t.requiredLevelId ?? t.required_level_id ?? 0,
    })),
    maxTotalRate: data?.maxTotalRate ?? data?.max_total_rate ?? 1500,
  };
}

function parseChangeType(ct: any): string {
  if (typeof ct === 'string') return ct;
  if (ct && typeof ct === 'object') {
    // Enum variant with data, e.g. { addTier: { index: 2 } }
    const key = Object.keys(ct)[0];
    if (key) {
      const val = ct[key];
      if (val && typeof val === 'object') {
        const detail = Object.entries(val).map(([k, v]) => `${k}=${v}`).join(',');
        return `${key}(${detail})`;
      }
      return key;
    }
  }
  return String(ct ?? 'Unknown');
}
