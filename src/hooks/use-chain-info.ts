'use client';

import { useEntityQuery } from './use-entity-query';
import { useCurrentBlock } from './use-current-block';
import { STALE_TIMES } from '@/lib/chain/constants';

export interface ChainInfo {
  chainName: string;
  nodeName: string;
  nodeVersion: string;
  specName: string;
  specVersion: number;
  implVersion: number;
  ss58Format: number;
  tokenSymbol: string;
  tokenDecimals: number;
  totalIssuance: string;
  peerCount: number;
  isSyncing: boolean;
  bestBlock: number;
  finalizedBlock: number;
}

/** Query static chain metadata + runtime info (refreshes every 30s) */
export function useChainInfo() {
  const currentBlock = useCurrentBlock();

  const query = useEntityQuery<ChainInfo | null>(
    ['chainInfo'],
    async (api) => {
      const [
        chainName,
        nodeName,
        nodeVersion,
        health,
        finalizedHead,
        totalIssuanceRaw,
      ] = await Promise.all([
        api.rpc.system.chain(),
        api.rpc.system.name(),
        api.rpc.system.version(),
        api.rpc.system.health(),
        api.rpc.chain.getFinalizedHead().then((hash) => api.rpc.chain.getHeader(hash)),
        (api.query as any).balances?.totalIssuance?.()
          ?? Promise.resolve(null),
      ]);

      const runtime = api.runtimeVersion;
      const props = api.registry.getChainProperties();
      const ss58 = props?.ss58Format?.unwrapOr(null)?.toNumber() ?? 42;
      const symbols = props?.tokenSymbol?.unwrapOr(null);
      const decimals = props?.tokenDecimals?.unwrapOr(null);
      const symbolJson = symbols ? symbols.toJSON() : null;
      const decimalJson = decimals ? decimals.toJSON() : null;
      const symbol = Array.isArray(symbolJson) ? (symbolJson[0] as string) ?? 'NEX' : 'NEX';
      const decimal = Array.isArray(decimalJson) ? (decimalJson[0] as number) ?? 12 : 12;

      return {
        chainName: chainName.toString(),
        nodeName: nodeName.toString(),
        nodeVersion: nodeVersion.toString(),
        specName: runtime.specName.toString(),
        specVersion: runtime.specVersion.toNumber(),
        implVersion: runtime.implVersion.toNumber(),
        ss58Format: ss58,
        tokenSymbol: symbol as string,
        tokenDecimals: decimal,
        totalIssuance: totalIssuanceRaw ? totalIssuanceRaw.toString() : '0',
        peerCount: health.peers.toNumber(),
        isSyncing: health.isSyncing.isTrue,
        bestBlock: 0, // will be overridden by real-time subscription
        finalizedBlock: finalizedHead.number.toNumber(),
      };
    },
    { staleTime: STALE_TIMES.entity, refetchInterval: 30_000 },
  );

  // Merge real-time block number into the static data
  const data = query.data
    ? { ...query.data, bestBlock: currentBlock ?? query.data.bestBlock }
    : null;

  return { ...query, data };
}
