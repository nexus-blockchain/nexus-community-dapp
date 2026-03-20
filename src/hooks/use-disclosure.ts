'use client';

import { useEntityQuery, hasPallet } from './use-entity-query';
import { STALE_TIMES } from '@/lib/chain/constants';
import { bytesToString } from '@/lib/utils/chain-helpers';
import type { AnnouncementRecord, DisclosureRecord } from '@/lib/types';

/** Parse on-chain announcement record to frontend type */
function parseAnnouncement(id: number, data: any): AnnouncementRecord {
  return {
    id,
    entityId: data.entityId ?? data.entity_id ?? 0,
    category: data.category ?? 'General',
    title: bytesToString(data.title),
    contentCid: bytesToString(data.contentCid ?? data.content_cid),
    publisher: data.publisher ?? '',
    publishedAt: data.publishedAt ?? data.published_at ?? 0,
    expiresAt: data.expiresAt ?? data.expires_at ?? null,
    status: data.status ?? 'Active',
    isPinned: data.isPinned ?? data.is_pinned ?? false,
  };
}

/** Parse on-chain disclosure record to frontend type */
function parseDisclosure(id: number, data: any): DisclosureRecord {
  return {
    id,
    entityId: data.entityId ?? data.entity_id ?? 0,
    disclosureType: data.disclosureType ?? data.disclosure_type ?? 'Other',
    contentCid: bytesToString(data.contentCid ?? data.content_cid),
    summaryCid: data.summaryCid ?? data.summary_cid
      ? bytesToString(data.summaryCid ?? data.summary_cid)
      : null,
    discloser: data.discloser ?? '',
    disclosedAt: data.disclosedAt ?? data.disclosed_at ?? 0,
    status: data.status ?? 'Published',
    previousId: data.previousId ?? data.previous_id ?? null,
  };
}

/** Query pinned announcements for an entity */
export function usePinnedAnnouncements(entityId: number | null) {
  return useEntityQuery<AnnouncementRecord[]>(
    ['pinnedAnnouncements', entityId],
    async (api) => {
      if (entityId == null) return [];
      if (!hasPallet(api, 'entityDisclosure')) return [];

      const pinnedIds = await (api.query as any).entityDisclosure.pinnedAnnouncements(entityId);
      const ids: number[] = pinnedIds.toJSON() ?? [];
      if (ids.length === 0) return [];

      const results = await Promise.all(
        ids.map(async (id) => {
          const raw = await (api.query as any).entityDisclosure.announcements(id);
          if (raw.isNone) return null;
          return parseAnnouncement(id, raw.unwrap().toJSON());
        }),
      );
      return results
        .filter((a): a is AnnouncementRecord => a !== null && a.status === 'Active')
        .sort((a, b) => b.publishedAt - a.publishedAt);
    },
    { staleTime: STALE_TIMES.disclosure, enabled: entityId != null },
  );
}

/** Query latest announcements for an entity */
export function useEntityAnnouncements(entityId: number | null, limit = 5) {
  return useEntityQuery<AnnouncementRecord[]>(
    ['entityAnnouncements', entityId, limit],
    async (api) => {
      if (entityId == null) return [];
      if (!hasPallet(api, 'entityDisclosure')) return [];

      const announcementIds = await (api.query as any).entityDisclosure.entityAnnouncements(entityId);
      const ids: number[] = announcementIds.toJSON() ?? [];
      if (ids.length === 0) return [];

      // Take the latest N IDs (they're stored in order)
      const recentIds = ids.slice(-limit).reverse();

      const results = await Promise.all(
        recentIds.map(async (id) => {
          const raw = await (api.query as any).entityDisclosure.announcements(id);
          if (raw.isNone) return null;
          return parseAnnouncement(id, raw.unwrap().toJSON());
        }),
      );
      return results
        .filter((a): a is AnnouncementRecord => a !== null && a.status === 'Active')
        .sort((a, b) => b.publishedAt - a.publishedAt);
    },
    { staleTime: STALE_TIMES.disclosure, enabled: entityId != null },
  );
}

/** Query latest disclosures for an entity */
export function useEntityDisclosures(entityId: number | null, limit = 3) {
  return useEntityQuery<DisclosureRecord[]>(
    ['entityDisclosures', entityId, limit],
    async (api) => {
      if (entityId == null) return [];
      if (!hasPallet(api, 'entityDisclosure')) return [];

      const disclosureIds = await (api.query as any).entityDisclosure.entityDisclosures(entityId);
      const ids: number[] = disclosureIds.toJSON() ?? [];
      if (ids.length === 0) return [];

      // Take the latest N IDs
      const recentIds = ids.slice(-limit).reverse();

      const results = await Promise.all(
        recentIds.map(async (id) => {
          const raw = await (api.query as any).entityDisclosure.disclosures(id);
          if (raw.isNone) return null;
          return parseDisclosure(id, raw.unwrap().toJSON());
        }),
      );
      return results
        .filter((d): d is DisclosureRecord => d !== null && d.status === 'Published')
        .sort((a, b) => b.disclosedAt - a.disclosedAt);
    },
    { staleTime: STALE_TIMES.disclosure, enabled: entityId != null },
  );
}
