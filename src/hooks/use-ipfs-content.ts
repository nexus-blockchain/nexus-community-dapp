'use client';

import { useQuery, useQueries } from '@tanstack/react-query';
import { ipfsUrl } from '@/lib/utils/chain-helpers';
import { RETRY_CONFIG } from '@/lib/chain/constants';

/**
 * Fetch text content from IPFS by CID.
 * Returns the resolved text (product name, description, etc.).
 */
async function fetchIpfsText(cid: string): Promise<string> {
  const url = ipfsUrl(cid);
  if (!url) throw new Error('Invalid CID');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);
  return res.text();
}

/** Fetch and cache a single CID's text content */
export function useIpfsContent(cid: string | null | undefined) {
  return useQuery<string>({
    queryKey: ['ipfs', cid],
    queryFn: () => fetchIpfsText(cid!),
    enabled: !!cid,
    staleTime: 5 * 60_000, // IPFS content is immutable, cache 5 min
    gcTime: 30 * 60_000,   // keep in garbage-collection cache 30 min
    retry: RETRY_CONFIG.ipfsContent.retry,
    retryDelay: RETRY_CONFIG.ipfsContent.retryDelay,
  });
}

/**
 * Batch-fetch text content for multiple CIDs.
 * Returns a Map<cid, resolvedText> for easy lookup.
 */
export function useIpfsContents(cids: (string | null | undefined)[]) {
  const uniqueCids = Array.from(new Set(cids.filter((c): c is string => !!c)));

  const results = useQueries({
    queries: uniqueCids.map((cid) => ({
      queryKey: ['ipfs', cid],
      queryFn: () => fetchIpfsText(cid),
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: RETRY_CONFIG.ipfsContent.retry,
      retryDelay: RETRY_CONFIG.ipfsContent.retryDelay,
    })),
  });

  const map = new Map<string, string>();
  uniqueCids.forEach((cid, i) => {
    const result = results[i];
    if (result.data) {
      map.set(cid, result.data);
    }
  });

  const isLoading = results.some((r) => r.isLoading);

  return { contentMap: map, isLoading };
}
