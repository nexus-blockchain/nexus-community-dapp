'use client';

import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Blocks, Coins, Globe, Cpu, Activity, Radio, Landmark, BarChart3, Server,
} from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { useApi } from '@/lib/chain';
import { useChainInfo } from '@/hooks/use-chain-info';
import { useGlobalPools, type PoolInfo } from '@/hooks/use-global-pools';
import { useNodeHealthStore, type NodeStatus } from '@/stores/node-health-store';
import { formatBalance, shortAddress } from '@/lib/utils/chain-helpers';

function StatusBadge({ status }: { status: NodeStatus }) {
  const t = useTranslations('chainInfo');
  const variantMap: Record<NodeStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    healthy: 'success',
    slow: 'warning',
    unhealthy: 'destructive',
    unknown: 'secondary',
  };
  return <Badge variant={variantMap[status]}>{t(status)}</Badge>;
}

function PoolRow({ pool, decimals, symbol, t }: {
  pool: PoolInfo;
  decimals: number;
  symbol: string;
  t: ReturnType<typeof useTranslations<'chainInfo'>>;
}) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{t(pool.nameKey as any)}</p>
          <p className="text-[10px] text-muted-foreground">{t(`${pool.nameKey}Desc` as any)}</p>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">{pool.palletId}</Badge>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">{shortAddress(pool.address, 8)}</span>
        <span className="text-sm font-bold text-primary">
          {formatBalance(pool.free, decimals, 2)} {symbol}
        </span>
      </div>
      {pool.reserved > BigInt(0) && (
        <div className="mt-0.5 flex items-baseline justify-between">
          <span className="text-[10px] text-muted-foreground">{t('poolReserved')}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {formatBalance(pool.reserved, decimals, 2)} {symbol}
          </span>
        </div>
      )}
    </div>
  );
}

function PoolGroupCard({ title, icon, pools, decimals, symbol, t }: {
  title: string;
  icon: React.ReactNode;
  pools: PoolInfo[];
  decimals: number;
  symbol: string;
  t: ReturnType<typeof useTranslations<'chainInfo'>>;
}) {
  const totalFree = pools.reduce((sum, p) => sum + p.free, BigInt(0));
  return (
    <Card className="col-span-2">
      <CardHeader className="px-3 pb-2 pt-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5">
            {icon}
            {title}
          </span>
          <span className="font-mono text-xs font-normal text-muted-foreground">
            {t('poolTotal')}: {formatBalance(totalFree, decimals, 2)} {symbol}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        {pools.map((pool) => (
          <PoolRow key={pool.palletId} pool={pool} decimals={decimals} symbol={symbol} t={t} />
        ))}
      </CardContent>
    </Card>
  );
}

export default function ChainInfoPage() {
  const t = useTranslations('chainInfo');
  const { connectionStatus, activeEndpoint } = useApi();
  const { data: chain, isLoading } = useChainInfo();
  const { data: pools, isLoading: poolsLoading } = useGlobalPools();
  const nodes = useNodeHealthStore((s) => s.nodes);

  const isConnecting = connectionStatus === 'connecting';
  const healthyCount = nodes.filter((n) => n.status === 'healthy').length;

  const decimals = chain?.tokenDecimals ?? 12;
  const symbol = chain?.tokenSymbol ?? 'NEX';

  return (
    <>
      <MobileHeader title={t('title')} showBack />
      <PageContainer>
        {isConnecting ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="mx-auto mb-3 h-8 w-8 animate-pulse text-primary" />
              <p className="text-muted-foreground">{t('connecting')}</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !chain ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('notConnected')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Chain overview — full width */}
            <Card className="col-span-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
              <CardHeader className="px-3 pb-2 pt-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Blocks className="h-4 w-4" />
                  {t('overview')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 px-3 pb-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t('chainName')}</p>
                  <p className="text-sm font-semibold">{chain.chainName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">{t('bestBlock')} <HelpTip helpKey="chainInfo.bestBlock" iconSize={10} /></p>
                  <p className="font-mono text-sm font-bold text-primary">
                    #{chain.bestBlock.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">{t('finalizedBlock')} <HelpTip helpKey="chainInfo.finalizedBlock" iconSize={10} /></p>
                  <p className="font-mono text-sm font-semibold">
                    #{chain.finalizedBlock.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('syncing')}</p>
                  <Badge variant={chain.isSyncing ? 'warning' : 'success'} className="mt-0.5">
                    {chain.isSyncing ? t('syncing') : t('synced')}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Left column: Token info + Runtime */}
            <div className="space-y-3">
              <Card>
                <CardHeader className="px-3 pb-2 pt-3">
                  <CardTitle className="flex items-center gap-1.5 text-sm">
                    <Coins className="h-3.5 w-3.5" />
                    {t('tokenInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-3 pb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('tokenSymbol')}</p>
                    <Badge variant="outline" className="mt-0.5 font-mono text-xs">{chain.tokenSymbol}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('tokenDecimals')}</p>
                    <p className="font-mono text-sm">{chain.tokenDecimals}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">{t('totalIssuance')} <HelpTip helpKey="chainInfo.totalIssuance" iconSize={10} /></p>
                    <p className="text-sm font-semibold text-primary break-all">
                      {formatBalance(chain.totalIssuance, chain.tokenDecimals, 2)} {chain.tokenSymbol}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="px-3 pb-2 pt-3">
                  <CardTitle className="flex items-center gap-1.5 text-sm">
                    <Cpu className="h-3.5 w-3.5" />
                    {t('runtime')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-2 gap-y-2 px-3 pb-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">{t('specName')}</p>
                    <p className="text-sm font-semibold">{chain.specName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">{t('specVersion')} <HelpTip helpKey="chainInfo.specVersion" iconSize={10} /></p>
                    <p className="text-sm font-semibold">{chain.specVersion}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('implVersion')}</p>
                    <p className="text-sm font-semibold">{chain.implVersion}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">{t('ss58Format')} <HelpTip helpKey="chainInfo.ss58Format" iconSize={10} /></p>
                    <p className="text-sm font-semibold">{chain.ss58Format}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column: Network + Node Distribution */}
            <div className="space-y-3">
              <Card>
                <CardHeader className="px-3 pb-2 pt-3">
                  <CardTitle className="flex items-center gap-1.5 text-sm">
                    <Globe className="h-3.5 w-3.5" />
                    {t('network')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-3 pb-3">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">{t('peerCount')} <HelpTip helpKey="chainInfo.peerCount" iconSize={10} /></p>
                    <p className="text-sm font-bold">{chain.peerCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('activeNode')}</p>
                    <p className="truncate font-mono text-xs">{activeEndpoint ?? '--'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('nodeName')}</p>
                    <p className="text-sm font-medium truncate">{chain.nodeName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('nodeVersion')}</p>
                    <p className="font-mono text-xs truncate">{chain.nodeVersion}</p>
                  </div>
                </CardContent>
              </Card>

              {nodes.length > 0 && (
                <Card>
                  <CardHeader className="px-3 pb-2 pt-3">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <Radio className="h-3.5 w-3.5" />
                        {t('nodeHealth')}
                      </span>
                      <Badge variant="secondary" className="text-xs">{healthyCount}/{nodes.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 px-3 pb-3">
                    {nodes.map((node) => (
                      <div
                        key={node.endpoint}
                        className={`rounded-lg border p-2 ${
                          node.endpoint === activeEndpoint
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="min-w-0 flex-1 truncate font-mono text-[10px]">
                            {node.endpoint}
                          </span>
                          <StatusBadge status={node.status} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                          {node.latencyMs != null && (
                            <span>{node.latencyMs}ms</span>
                          )}
                          {node.blockHeight != null && (
                            <span>#{node.blockHeight.toLocaleString()}</span>
                          )}
                          <span>
                            {node.source === 'seed' && t('seed')}
                            {node.source === 'discovered' && t('discovered')}
                            {node.source === 'manual' && t('manual')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Global Fund Pools */}
            {poolsLoading ? (
              <div className="col-span-2 space-y-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : pools && (
              <>
                <PoolGroupCard
                  title={t('coreAccounts')}
                  icon={<Landmark className="h-3.5 w-3.5" />}
                  pools={pools.core}
                  decimals={decimals}
                  symbol={symbol}
                  t={t}
                />
                <PoolGroupCard
                  title={t('marketAccounts')}
                  icon={<BarChart3 className="h-3.5 w-3.5" />}
                  pools={pools.market}
                  decimals={decimals}
                  symbol={symbol}
                  t={t}
                />
                <PoolGroupCard
                  title={t('infraAccounts')}
                  icon={<Server className="h-3.5 w-3.5" />}
                  pools={pools.infra}
                  decimals={decimals}
                  symbol={symbol}
                  t={t}
                />
              </>
            )}
          </div>
        )}
      </PageContainer>
    </>
  );
}
