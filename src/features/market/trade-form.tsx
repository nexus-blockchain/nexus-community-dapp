'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useWalletStore } from '@/stores';
import {
  usePlaceBuyOrder, usePlaceSellOrder,
  useMarketBuy, useMarketSell,
} from '@/hooks/use-market';
import { nexToRaw, isTxBusy } from '@/lib/utils/chain-helpers';

interface TradeFormProps {
  entityId: number | null;
  /** Prefilled price from order book click */
  prefilledPrice: string;
  onPrefilledPriceUsed: () => void;
}

function isBusy(m: { txState: { status: string } }): boolean {
  return isTxBusy(m.txState);
}

export function TradeForm({ entityId, prefilledPrice, onPrefilledPriceUsed }: TradeFormProps) {
  const t = useTranslations('market');
  const tTx = useTranslations('tx');
  const { address } = useWalletStore();

  const [side, setSide] = useState<'Buy' | 'Sell'>('Buy');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');

  // Limit order fields
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');

  // Market order fields
  const [marketAmount, setMarketAmount] = useState('');
  const [maxCost, setMaxCost] = useState('');
  const [minReceive, setMinReceive] = useState('');

  // Apply prefilled price from order book click
  useEffect(() => {
    if (prefilledPrice) {
      setPrice(prefilledPrice);
      setOrderType('limit');
      onPrefilledPriceUsed();
    }
  }, [prefilledPrice, onPrefilledPriceUsed]);

  const placeBuy = usePlaceBuyOrder();
  const placeSell = usePlaceSellOrder();
  const marketBuyMut = useMarketBuy();
  const marketSellMut = useMarketSell();

  const limitMutation = side === 'Buy' ? placeBuy : placeSell;
  const marketMutation = side === 'Buy' ? marketBuyMut : marketSellMut;
  const activeMutation = orderType === 'limit' ? limitMutation : marketMutation;
  const busy = isBusy(activeMutation);

  const handleLimitOrder = async () => {
    if (!price || !amount || entityId == null) return;
    const priceRaw = nexToRaw(price).toString();
    const amountRaw = nexToRaw(amount).toString();
    if (side === 'Buy') {
      await placeBuy.mutate([entityId, amountRaw, priceRaw, null]);
    } else {
      await placeSell.mutate([entityId, amountRaw, priceRaw, null]);
    }
    setPrice('');
    setAmount('');
  };

  const handleMarketOrder = async () => {
    if (!marketAmount || entityId == null) return;
    const amountRaw = nexToRaw(marketAmount).toString();
    if (side === 'Buy') {
      const costRaw = maxCost ? nexToRaw(maxCost).toString() : nexToRaw('999999999').toString();
      await marketBuyMut.mutate([entityId, amountRaw, costRaw]);
    } else {
      const receiveRaw = minReceive ? nexToRaw(minReceive).toString() : '0';
      await marketSellMut.mutate([entityId, amountRaw, receiveRaw]);
    }
    setMarketAmount('');
    setMaxCost('');
    setMinReceive('');
  };

  const estimatedTotal = price && amount
    ? (parseFloat(price) * parseFloat(amount)).toFixed(0)
    : null;

  return (
    <Card>
      <CardContent className="p-4">
        {/* Buy / Sell toggle */}
        <div className="mb-3 flex gap-2">
          <Button
            variant={side === 'Buy' ? 'default' : 'outline'}
            className={`flex-1 ${side === 'Buy' ? 'bg-success hover:bg-success/90 text-success-foreground' : ''}`}
            size="sm"
            onClick={() => setSide('Buy')}
          >
            {t('buy')}
          </Button>
          <Button
            variant={side === 'Sell' ? 'default' : 'outline'}
            className={`flex-1 ${side === 'Sell' ? 'bg-destructive hover:bg-destructive/90' : ''}`}
            size="sm"
            onClick={() => setSide('Sell')}
          >
            {t('sell')}
          </Button>
        </div>

        {/* Order type tabs */}
        <Tabs value={orderType} onValueChange={(v) => setOrderType(v as 'limit' | 'market')}>
          <TabsList className="mb-3 w-full">
            <TabsTrigger value="limit" className="flex-1">{t('limitOrder')}</TabsTrigger>
            <TabsTrigger value="market" className="flex-1">{t('marketOrder')}</TabsTrigger>
          </TabsList>

          {/* Limit order form */}
          <TabsContent value="limit" className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground flex items-center gap-1">{t('priceLabel')} <HelpTip helpKey="market.priceLabel" iconSize={12} /></label>
              <Input
                inputMode="decimal"
                placeholder={t('pricePlaceholder')}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground flex items-center gap-1">{t('amountLabel')} <HelpTip helpKey="market.amountLabel" iconSize={12} /></label>
              <Input
                inputMode="decimal"
                placeholder={t('amountPlaceholder')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {estimatedTotal && (
              <div className="rounded-lg bg-secondary px-3 py-2 text-sm">
                <span className="text-muted-foreground">{t('estimatedTotal')}: </span>
                <span className="font-semibold tabular-nums">{estimatedTotal} NEX</span>
              </div>
            )}
            <Button
              className={`w-full ${side === 'Buy' ? 'bg-success hover:bg-success/90 text-success-foreground' : 'bg-destructive hover:bg-destructive/90'}`}
              disabled={!price || !amount || !address || busy}
              onClick={handleLimitOrder}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {side === 'Buy' ? t('confirmBuy') : t('confirmSell')}
            </Button>
          </TabsContent>

          {/* Market order form */}
          <TabsContent value="market" className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground flex items-center gap-1">{t('amountLabel')} <HelpTip helpKey="market.amountLabel" iconSize={12} /></label>
              <Input
                inputMode="decimal"
                placeholder={t('amountPlaceholder')}
                value={marketAmount}
                onChange={(e) => setMarketAmount(e.target.value)}
              />
            </div>
            {side === 'Buy' ? (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground flex items-center gap-1">{t('maxCost')} <HelpTip helpKey="market.maxCost" iconSize={12} /></label>
                <Input
                  inputMode="decimal"
                  placeholder={t('maxCostPlaceholder')}
                  value={maxCost}
                  onChange={(e) => setMaxCost(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground flex items-center gap-1">{t('minReceive')} <HelpTip helpKey="market.minReceive" iconSize={12} /></label>
                <Input
                  inputMode="decimal"
                  placeholder={t('minReceivePlaceholder')}
                  value={minReceive}
                  onChange={(e) => setMinReceive(e.target.value)}
                />
              </div>
            )}
            <Button
              className={`w-full ${side === 'Buy' ? 'bg-success hover:bg-success/90 text-success-foreground' : 'bg-destructive hover:bg-destructive/90'}`}
              disabled={!marketAmount || !address || busy}
              onClick={handleMarketOrder}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {side === 'Buy' ? t('confirmBuy') : t('confirmSell')}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Tx status */}
        {activeMutation.txState.status !== 'idle' && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <span
              className={
                activeMutation.txState.status === 'error'
                  ? 'text-destructive'
                  : activeMutation.txState.status === 'finalized'
                    ? 'text-success'
                    : 'text-muted-foreground'
              }
            >
              {activeMutation.txState.status === 'signing' && tTx('signing')}
              {activeMutation.txState.status === 'broadcasting' && tTx('broadcasting')}
              {activeMutation.txState.status === 'inBlock' && tTx('inBlockWaiting')}
              {activeMutation.txState.status === 'finalized' && tTx('success')}
              {activeMutation.txState.status === 'error' && (activeMutation.txState.error || tTx('operationFailed'))}
            </span>
          </div>
        )}

        {!address && (
          <p className="mt-3 text-center text-xs text-muted-foreground">{t('connectWallet')}</p>
        )}
      </CardContent>
    </Card>
  );
}
