'use client';

import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, ChevronUp, ChevronDown, Copy, Check } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { useEntityStore, useWalletStore } from '@/stores';
import { useSingleLineConfig, useSingleLineEnabled, useSingleLineIndex, useSingleLineStats, useSingleLineQueue } from '@/hooks/use-commission';
import { formatBalance, bpsToPercent, shortAddress } from '@/lib/utils/chain-helpers';
import { useMemo, useState, useCallback } from 'react';

function AddressCard({ address, index, isSelf }: { address: string; index: number; isSelf: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [address]);

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${
        isSelf ? 'border-primary bg-primary/10' : 'border-border bg-card'
      }`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        isSelf ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-mono text-sm ${isSelf ? 'font-semibold text-primary' : ''}`}>
          {shortAddress(address, 8)}
        </p>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export default function SingleLineEarningsPage() {
  const t = useTranslations('singleLine');
  const { currentEntityId } = useEntityStore();
  const { address } = useWalletStore();
  const { data: config, isLoading } = useSingleLineConfig(currentEntityId);
  const { data: enabled } = useSingleLineEnabled(currentEntityId);
  const { data: myIndex } = useSingleLineIndex(currentEntityId, address);
  const { data: stats } = useSingleLineStats(currentEntityId);
  const { data: queue, isLoading: queueLoading } = useSingleLineQueue(currentEntityId);

  // Normalize address for comparison: queue may return hex, wallet may be SS58
  const myPos = myIndex ?? null;

  const { uplines, downlines } = useMemo(() => {
    if (!queue || !queue.length) return { uplines: [] as { address: string; globalIndex: number }[], downlines: [] as { address: string; globalIndex: number }[] };
    if (myPos == null) {
      // User not in queue — show all as "uplines" (full queue)
      return {
        uplines: queue.map((addr, i) => ({ address: addr, globalIndex: i })),
        downlines: [] as { address: string; globalIndex: number }[],
      };
    }
    return {
      uplines: queue.slice(0, myPos).map((addr, i) => ({ address: addr, globalIndex: i })),
      downlines: queue.slice(myPos + 1).map((addr, i) => ({ address: addr, globalIndex: myPos + 1 + i })),
    };
  }, [queue, myPos]);

  return (
    <>
      <MobileHeader title={t('title')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant={enabled ? 'success' : 'warning'}>
              {enabled ? t('running') : t('paused')}
            </Badge>
            {queue && (
              <Badge variant="secondary">
                {t('queueLength', { count: queue.length })}
              </Badge>
            )}
          </div>

          {/* Upline addresses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ChevronUp className="h-4 w-4 text-green-500" />
                {myPos != null ? t('uplineAddresses') : t('allMembers')}
                <Badge variant="secondary" className="ml-auto text-xs">
                  {uplines.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : uplines.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('noUplines')}</p>
              ) : (
                <div className="space-y-2">
                  {uplines.map((item) => (
                    <AddressCard
                      key={item.globalIndex}
                      address={item.address}
                      index={item.globalIndex}
                      isSelf={false}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Downline addresses — only show when user is in the queue */}
          {myPos != null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ChevronDown className="h-4 w-4 text-blue-500" />
                  {t('downlineAddresses')}
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {downlines.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queueLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : downlines.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">{t('noDownlines')}</p>
                ) : (
                  <div className="space-y-2">
                    {downlines.map((item) => (
                      <AddressCard
                        key={item.globalIndex}
                        address={item.address}
                        index={item.globalIndex}
                        isSelf={false}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Config */}
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !config ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">{t('noConfig')}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowUpDown className="h-4 w-4" />
                  {t('config')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">{t('uplineRate')} <HelpTip helpKey="singleLine.uplineRate" iconSize={12} /></p>
                    <p className="font-semibold text-primary">{bpsToPercent(config.uplineRate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">{t('downlineRate')} <HelpTip helpKey="singleLine.downlineRate" iconSize={12} /></p>
                    <p className="font-semibold text-primary">{bpsToPercent(config.downlineRate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">{t('baseUplineLevels')} <HelpTip helpKey="singleLine.baseUplineLevels" iconSize={12} /></p>
                    <p className="font-semibold">{config.baseUplineLevels}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">{t('baseDownlineLevels')} <HelpTip helpKey="singleLine.baseDownlineLevels" iconSize={12} /></p>
                    <p className="font-semibold">{config.baseDownlineLevels}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">{t('maxUplineLevels')} <HelpTip helpKey="singleLine.maxUplineLevels" iconSize={12} /></p>
                    <p className="font-semibold">{config.maxUplineLevels}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">{t('maxDownlineLevels')} <HelpTip helpKey="singleLine.maxDownlineLevels" iconSize={12} /></p>
                    <p className="font-semibold">{config.maxDownlineLevels}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground flex items-center gap-1">{t('levelThreshold')} <HelpTip helpKey="singleLine.levelThreshold" iconSize={12} /></p>
                    <p className="font-semibold">{formatBalance(config.levelIncrementThreshold)} NEX</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entity stats */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('stats')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('totalOrders')}</p>
                    <p className="text-lg font-semibold">{stats.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('uplinePayouts')}</p>
                    <p className="text-lg font-semibold">{stats.totalUplinePayouts}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('downlinePayouts')}</p>
                    <p className="text-lg font-semibold">{stats.totalDownlinePayouts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    </>
  );
}
