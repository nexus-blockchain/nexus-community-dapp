'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { useQueryClient } from '@tanstack/react-query';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Wallet, Award, Gift, Settings, ShoppingCart,
  Copy, Check, ChevronRight,
  Clock, RefreshCw, Network, Users, Info, Landmark,
} from 'lucide-react';
import { useWalletStore, useEntityStore } from '@/stores';
import { useNodeHealthStore, type NodeStatus } from '@/stores/node-health-store';
import { useApi } from '@/lib/chain';
import { useMember, useLevelSystem } from '@/hooks/use-member';
import { useMemberDashboard } from '@/hooks/use-member-team';
import { useBuyerOrders } from '@/hooks/use-order';
import { useNexBalance } from '@/hooks/use-nex-balance';
import { formatBalance, shortAddress, formatUsdt } from '@/lib/utils/chain-helpers';
import { useNexPrice } from '@/hooks/use-nex-price';
import { TreasuryCard } from '@/features/profile';
import { useIsEntityOwner } from '@/hooks/use-treasury';

// ─────────────────────────────────────────────
// Skeleton loading state
// ─────────────────────────────────────────────
function MePageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-primary/10" />
            <div className="h-3 w-24 rounded bg-primary/10" />
          </div>
        </div>
      </div>
      <div className="h-9 rounded-lg bg-secondary" />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3 space-y-2">
          <div className="h-3 w-20 mx-auto rounded bg-muted" />
          <div className="h-6 w-16 mx-auto rounded bg-muted" />
        </div>
        <div className="rounded-lg border p-3 space-y-2">
          <div className="h-3 w-20 mx-auto rounded bg-muted" />
          <div className="h-6 w-16 mx-auto rounded bg-muted" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Member Info + Referral Network Section
// ─────────────────────────────────────────────
function MemberNetworkSection() {
  const t = useTranslations('member');
  const tc = useTranslations('common');
  const { currentEntityId, entityName } = useEntityStore();
  const { address, isConnected } = useWalletStore();
  const { data: member } = useMember(currentEntityId, address);
  const { data: dashboard } = useMemberDashboard(currentEntityId, address);
  const { data: levelSystem } = useLevelSystem(currentEntityId);

  // Compute how much more spending is needed to reach the next level
  const totalSpent = dashboard?.totalSpent ?? '0';
  const nextLevelThreshold: number | null = (() => {
    if (!levelSystem || !dashboard) return null;
    const currentEffective = dashboard.effectiveLevelId;
    const sorted = [...levelSystem.levels].sort((a, b) => a.threshold - b.threshold);
    const next = sorted.find((l) => l.id > currentEffective && l.threshold > Number(totalSpent));
    return next ? next.threshold : null;
  })();
  const upgradeNeeded: number | null =
    nextLevelThreshold != null ? Math.max(0, nextLevelThreshold - Number(totalSpent)) : null;

  if (!isConnected || !currentEntityId) return null;

  return (
    <>
      {/* ── Member Info Card ── */}
      {member && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 space-y-3">
            {/* Entity + Level row */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{entityName}</span>
                  <Badge variant="default" className="shrink-0">LV.{dashboard?.effectiveLevelId ?? member.customLevelId}</Badge>
                </div>
                {dashboard && (
                  <div className="flex items-center gap-2 mt-0.5">
                    {dashboard.activated ? (
                      <Badge variant="default" className="text-[10px] h-4">{t('activated')}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-4">{t('notActivated')}</Badge>
                    )}
                  </div>
                )}
              </div>
              <Link href="/member/profile">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Link>
            </div>

            {/* Balances row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-background/60 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">{tc('totalConsumptionUsdt')}</p>
                <p className="text-sm font-bold text-primary">${formatUsdt(totalSpent)}</p>
              </div>
              <div className="rounded-lg bg-background/60 p-2 text-center">
                <p className="text-[10px] text-muted-foreground">{tc('upgradeConsumptionUsdt')}</p>
                {upgradeNeeded != null ? (
                  <p className="text-sm font-bold text-amber-500">${formatUsdt(upgradeNeeded)}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{tc('upgradeConsumptionMaxed')}</p>
                )}
              </div>
            </div>

            {/* Referral stats row */}
            <div className="grid grid-cols-3 gap-1 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground">{t('directReferrals')}</p>
                <p className="text-base font-bold text-primary">{member.directReferrals}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t('indirectReferrals')}</p>
                <p className="text-base font-bold">{member.indirectReferrals}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t('teamSize')}</p>
                <p className="text-base font-bold">{member.teamSize}</p>
              </div>
            </div>

            {/* Referrer */}
            {member.referrer && (
              <div className="flex items-center gap-2 rounded-lg bg-background/60 p-2 text-xs">
                <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-muted-foreground">{t('myReferrer')}</span>
                <span className="font-mono truncate">{shortAddress(member.referrer)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function MePage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const { address, isConnected, source } = useWalletStore();
  const { currentEntityId, entityName } = useEntityStore();
  const { activeEndpoint, connectionStatus, error: connectionError, reconnect } = useApi();
  const nodes = useNodeHealthStore((s) => s.nodes);
  const { data: member, isLoading: memberLoading } = useMember(currentEntityId, address);
  const { data: orders } = useBuyerOrders(address);
  const { data: nexBalance } = useNexBalance(address);
  const balance = nexBalance?.free ?? BigInt(0);
  const { toUsdt } = useNexPrice();
  const balanceUsdt = toUsdt(balance.toString());
  const isEntityOwner = useIsEntityOwner();

  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isLocal = source === 'local';

  // Find active node health info
  const activeNode = activeEndpoint ? nodes.find((n) => n.endpoint === activeEndpoint) : null;
  const nodeStatus: NodeStatus = activeNode?.status ?? 'unknown';
  const isChainConnecting = connectionStatus === 'connecting';
  const isChainUnavailable = connectionStatus === 'error' || connectionStatus === 'disconnected';
  const balanceLabel = isChainConnecting
    ? t('chainInfo.connecting')
    : isChainUnavailable
      ? t('chainInfo.notConnected')
      : `${formatBalance(balance.toString())} NEX`;
  const balanceSubLabel = isChainConnecting
    ? t('chainInfo.connecting')
    : isChainUnavailable
      ? (connectionError || t('chainInfo.notConnected'))
      : balanceUsdt != null
        ? `≈ $${formatUsdt(balanceUsdt)} USDT`
        : '≈ $0.00 USDT';

  const statusDotColor: Record<NodeStatus, string> = {
    healthy: 'bg-green-500',
    slow: 'bg-yellow-500',
    unhealthy: 'bg-red-500',
    unknown: 'bg-gray-400',
  };

  const statusLabel: Record<NodeStatus, string> = {
    healthy: t('chainInfo.healthy'),
    slow: t('chainInfo.slow'),
    unhealthy: t('chainInfo.unhealthy'),
    unknown: t('chainInfo.unknown'),
  };

  const truncateEndpoint = (ep: string) => {
    const stripped = ep.replace(/^wss?:\/\//, '');
    return stripped.length > 22 ? stripped.slice(0, 20) + '...' : stripped;
  };

  const menuItems = [
    { label: t('profile.txHistory'), icon: Clock, href: '/me/transactions' },
    { label: t('member.networkTitle'), icon: Network, href: '/member/network' },
    { label: t('profile.settings'), icon: Settings, href: '/settings' },
    { label: t('profile.aboutUs'), icon: Info, href: '/about' },
  ];

  const handleCopy = () => {
    if (!address) return;
    copyToClipboard(address);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isChainUnavailable) {
      reconnect();
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['nexBalance', address] }),
      queryClient.invalidateQueries({ queryKey: ['member'] }),
      queryClient.invalidateQueries({ queryKey: ['memberDashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['shoppingBalance'] }),
      queryClient.invalidateQueries({ queryKey: ['tokenShoppingBalance'] }),
      queryClient.invalidateQueries({ queryKey: ['treasury'] }),
      queryClient.invalidateQueries({ queryKey: ['referralTree'] }),
    ]);
    setTimeout(() => setRefreshing(false), 600);
  }, [queryClient, address, isChainUnavailable, reconnect]);

  const activeOrders = (orders ?? []).filter((o) => !['Completed', 'Refunded', 'Cancelled'].includes(o.status));

  const showSkeleton = isConnected && currentEntityId && memberLoading;

  return (
    <>
      <MobileHeader title={t('profile.title')} />
      <PageContainer>
        {showSkeleton ? (
          <MePageSkeleton />
        ) : (
        <div className="space-y-2">
          {/* Wallet card */}
          <Link href="/me/wallet">
            {isConnected ? (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-4 text-primary-foreground shadow-md transition-shadow hover:shadow-lg">
                <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
                <div className="absolute -bottom-3 -left-3 h-12 w-12 rounded-full bg-white/5" />

                <div className="relative flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm opacity-90">{shortAddress(address!)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${isLocal ? 'bg-white/20' : 'bg-white/10 border border-white/20'}`}>
                        {isLocal ? t('wallet.local') : source}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10" onClick={(e) => { e.preventDefault(); handleCopy(); }}>
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <p className="text-lg font-bold mt-0.5">
                      {balanceLabel} {!isChainConnecting && !isChainUnavailable && <span className="text-sm font-normal opacity-80">NEX</span>}
                    </p>
                    <p className="text-sm font-normal opacity-70 mt-0.5 truncate">{balanceSubLabel}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10"
                    onClick={(e) => { e.preventDefault(); handleRefresh(); }}>
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                  <ChevronRight className="h-4 w-4 opacity-60" />
                </div>
              </div>
            ) : (
              <Card className="transition-colors hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                      <Wallet className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t('profile.notConnected')}</p>
                      <p className="text-xs text-muted-foreground">{t('profile.notConnectedDesc')}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )}
          </Link>

          {/* Network Status Badge */}
          {isConnected && (
            <Link href="/chain">
              <div className="flex items-center gap-2 rounded-lg bg-secondary/50 border px-3 py-2 text-xs transition-colors hover:border-primary/30">
                <span className="text-muted-foreground">{t('chainInfo.currentNode')}</span>
                <span className={`h-2 w-2 rounded-full ${isChainConnecting || isChainUnavailable ? 'bg-gray-400' : statusDotColor[nodeStatus]}`} />
                <span className="font-mono text-muted-foreground truncate">
                  {activeEndpoint ? truncateEndpoint(activeEndpoint) : t(isChainConnecting ? 'chainInfo.connecting' : 'chainInfo.notConnected')}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className={
                  isChainConnecting
                    ? 'text-muted-foreground'
                    : isChainUnavailable
                      ? 'text-red-600'
                      : nodeStatus === 'healthy'
                        ? 'text-green-600'
                        : nodeStatus === 'slow'
                          ? 'text-yellow-600'
                          : nodeStatus === 'unhealthy'
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                }>
                  {isChainConnecting ? t('chainInfo.connecting') : isChainUnavailable ? t('chainInfo.notConnected') : statusLabel[nodeStatus]}
                </span>
                {!isChainConnecting && !isChainUnavailable && activeNode?.latencyMs != null && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{activeNode.latencyMs}ms</span>
                  </>
                )}
              </div>
            </Link>
          )}

          {isConnected && isChainUnavailable && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-destructive">{t('chainInfo.notConnected')}</p>
                {connectionError && (
                  <p className="truncate text-muted-foreground">{connectionError}</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={isChainConnecting}
                onClick={(e) => {
                  e.preventDefault();
                  reconnect();
                }}
              >
                {isChainConnecting ? t('chainInfo.connecting') : t('common.retry')}
              </Button>
            </div>
          )}

          {isConnected && isEntityOwner && currentEntityId != null && (
            <TreasuryCard entityId={currentEntityId} entityName={entityName ?? undefined} />
          )}

          {/* ══════ Member Info + Referral Network (merged) ══════ */}
          <MemberNetworkSection />

          {/* Active orders */}
          {activeOrders.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{t('home.activeOrders')}</span>
                  <Badge variant="secondary">{activeOrders.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeOrders.slice(0, 3).map((order) => (
                  <Link key={order.id} href={`/order/${order.id}`}>
                    <div className="flex items-center justify-between rounded-lg bg-secondary p-2 text-sm">
                      <span>{t('home.orderNumber', { id: order.id })}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {order.status === 'Paid' ? t('status.paid') :
                           order.status === 'Shipped' ? t('status.shipped') :
                           order.status === 'Disputed' ? t('status.disputed') : order.status}
                        </Badge>
                        <span className="text-xs text-primary">{formatBalance(order.totalAmount)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Menu */}
          <div className="space-y-2">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="transition-colors hover:border-primary/30">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
        )}
      </PageContainer>
    </>
  );
}
