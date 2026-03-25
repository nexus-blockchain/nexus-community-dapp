'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, ArrowRightLeft, Coins, Loader2, Check, AlertCircle } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { useEntityStore, useWalletStore } from '@/stores';
import { usePointsConfig, usePointsBalance, useShoppingBalance, useTokenShoppingBalance, useTransferPoints, useRedeemPoints } from '@/hooks/use-loyalty';
import { formatBalance, bpsToPercent, isTxBusy, nexToRaw } from '@/lib/utils/chain-helpers';

export default function LoyaltyPointsPage() {
  const t = useTranslations('loyalty');
  const { currentEntityId } = useEntityStore();
  const { address } = useWalletStore();

  // For demo, use shop 1. In production this would come from context/route.
  const shopId = 1;

  const { data: pointsConfig, isLoading } = usePointsConfig(shopId);
  const { data: pointsBalance } = usePointsBalance(shopId, address);
  const { data: shoppingBalance } = useShoppingBalance(currentEntityId, address);
  const { data: tokenShoppingBalance } = useTokenShoppingBalance(currentEntityId, address);

  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'balance' | 'transfer' | 'redeem'>('balance');

  const transferPoints = useTransferPoints();
  const redeemPoints = useRedeemPoints();

  const isBusy = (m: any) => isTxBusy(m.txState);

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount) return;
    const raw = nexToRaw(transferAmount);
    await transferPoints.mutate([shopId, transferTo, raw]);
    setTransferTo('');
    setTransferAmount('');
  };

  const handleRedeem = async () => {
    if (!redeemAmount) return;
    const raw = nexToRaw(redeemAmount);
    await redeemPoints.mutate([shopId, raw]);
    setRedeemAmount('');
  };

  return (
    <>
      <MobileHeader title={t('title')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* Balance overview */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <Gift className="mx-auto h-6 w-6 text-primary" />
                  <p className="mt-1 text-xs text-muted-foreground">{t('shopPoints')}</p>
                  <p className="text-lg font-bold">{formatBalance(pointsBalance ?? '0')}</p>
                </div>
                <div>
                  <Coins className="mx-auto h-6 w-6 text-warning" />
                  <p className="mt-1 text-xs text-muted-foreground">{t('nexShoppingBalance')}</p>
                  <p className="text-lg font-bold">{formatBalance(shoppingBalance ?? '0')}</p>
                </div>
                <div>
                  <Coins className="mx-auto h-6 w-6 text-info" />
                  <p className="mt-1 text-xs text-muted-foreground">{t('tokenBalance')}</p>
                  <p className="text-lg font-bold">{formatBalance(tokenShoppingBalance ?? '0')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Points config */}
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : pointsConfig ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {pointsConfig.name} ({pointsConfig.symbol})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-sm text-center">
                  <div>
                    <p className="text-muted-foreground flex items-center justify-center gap-1">{t('rewardRate')} <HelpTip helpKey="loyalty.rewardRate" iconSize={12} /></p>
                    <p className="font-semibold">{bpsToPercent(pointsConfig.rewardRate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center justify-center gap-1">{t('exchangeRate')} <HelpTip helpKey="loyalty.exchangeRate" iconSize={12} /></p>
                    <p className="font-semibold">{bpsToPercent(pointsConfig.exchangeRate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center justify-center gap-1">{t('transferable')} <HelpTip helpKey="loyalty.transferable" iconSize={12} /></p>
                    <Badge variant={pointsConfig.transferable ? 'success' : 'secondary'}>
                      {pointsConfig.transferable ? t('yes') : t('no')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">{t('notEnabled')}</p>
              </CardContent>
            </Card>
          )}

          {/* Tab buttons */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'balance' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setActiveTab('balance')}
            >
              {t('balance')}
            </Button>
            <Button
              variant={activeTab === 'transfer' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setActiveTab('transfer')}
            >
              {t('transferTab')}
            </Button>
            <Button
              variant={activeTab === 'redeem' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setActiveTab('redeem')}
            >
              {t('redeemTab')}
            </Button>
          </div>

          {/* Transfer */}
          {activeTab === 'transfer' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowRightLeft className="h-4 w-4" />
                  {t('transferPoints')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!pointsConfig?.transferable ? (
                  <p className="text-sm text-muted-foreground">{t('notTransferable')}</p>
                ) : (
                  <>
                    <Input
                      placeholder={t('recipientAddress')}
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder={t('transferAmount')}
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      disabled={!transferTo || !transferAmount || isBusy(transferPoints)}
                      onClick={handleTransfer}
                    >
                      {isBusy(transferPoints) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t('confirmTransfer')}
                    </Button>
                    {transferPoints.txState.status === 'finalized' && (
                      <div className="flex items-center gap-2 text-sm text-success">
                        <Check className="h-4 w-4" /> {t('transferSuccess')}
                      </div>
                    )}
                    {transferPoints.txState.status === 'error' && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" /> {transferPoints.txState.error}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Redeem */}
          {activeTab === 'redeem' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gift className="h-4 w-4" />
                  {t('redeemPoints')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="number"
                  placeholder={t('redeemAmount')}
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                />
                <Button
                  className="w-full"
                  disabled={!redeemAmount || isBusy(redeemPoints)}
                  onClick={handleRedeem}
                >
                  {isBusy(redeemPoints) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('confirmRedeem')}
                </Button>
                {redeemPoints.txState.status === 'finalized' && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <Check className="h-4 w-4" /> {t('redeemSuccess')}
                  </div>
                )}
                {redeemPoints.txState.status === 'error' && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" /> {redeemPoints.txState.error}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    </>
  );
}
