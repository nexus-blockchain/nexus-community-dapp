'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, ArrowRightLeft, HandCoins } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useWalletStore } from '@/stores';
import {
  useNexPlaceBuyOrder, useNexPlaceSellOrder,
  useNexAcceptBuyOrder, useNexReserveSellOrder,
  useNexOrderBook,
} from '@/hooks/use-nex-global-market';
import { nexToRaw, usdtToRaw, formatNexPrice, isTxBusy } from '@/lib/utils/chain-helpers';
import type { NexMarketOrder } from '@/lib/types';

function isBusy(m: { txState: { status: string } }): boolean {
  return isTxBusy(m.txState);
}

function TxStatus({ mutation }: { mutation: { txState: { status: string; error: string | null } } }) {
  const tTx = useTranslations('tx');
  const { status, error } = mutation.txState;
  if (status === 'idle') return null;
  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      {isBusy(mutation) && <Loader2 className="h-4 w-4 animate-spin" />}
      <span className={
        status === 'error' ? 'text-destructive'
          : status === 'finalized' ? 'text-success'
            : 'text-muted-foreground'
      }>
        {status === 'signing' && tTx('signing')}
        {status === 'broadcasting' && tTx('broadcasting')}
        {status === 'inBlock' && tTx('inBlockWaiting')}
        {status === 'finalized' && tTx('success')}
        {status === 'error' && (error || tTx('operationFailed'))}
      </span>
    </div>
  );
}

export interface OrderActionPrefill {
  target: 'acceptBuy' | 'reserveSell';
  orderId: string;
  amount: string;
  tron: string;
}

interface NexTradeFormProps {
  prefill?: OrderActionPrefill | null;
  onPrefillUsed?: () => void;
}

export function NexTradeForm({ prefill, onPrefillUsed }: NexTradeFormProps) {
  const t = useTranslations('market');
  const tn = useTranslations('market.nexMarket');
  const { address } = useWalletStore();

  const [tab, setTab] = useState<'limit' | 'workflow'>('limit');

  // Auto-switch to workflow tab when prefill arrives
  useEffect(() => {
    if (prefill) {
      setTab('workflow');
    }
  }, [prefill]);

  return (
    <Card>
      <CardContent className="p-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'limit' | 'workflow')}>
          <TabsList className="mb-3 w-full">
            <TabsTrigger value="limit" className="flex-1">{tn('limitOrder')}</TabsTrigger>
            <TabsTrigger value="workflow" className="flex-1">{tn('tradeWorkflow')}</TabsTrigger>
          </TabsList>

          <TabsContent value="limit">
            <LimitOrderForm address={address} />
          </TabsContent>

          <TabsContent value="workflow">
            <TradeWorkflowForm address={address} prefill={prefill} onPrefillUsed={onPrefillUsed} />
          </TabsContent>
        </Tabs>

        {!address && (
          <p className="mt-3 text-center text-xs text-muted-foreground">{t('connectWallet')}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Limit Order sub-form
// ---------------------------------------------------------------------------

function LimitOrderForm({ address }: { address: string | null }) {
  const t = useTranslations('market');
  const tn = useTranslations('market.nexMarket');

  const [side, setSide] = useState<'Buy' | 'Sell'>('Buy');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [tronAddr, setTronAddr] = useState('');
  const [minFill, setMinFill] = useState('');

  const placeBuy = useNexPlaceBuyOrder();
  const placeSell = useNexPlaceSellOrder();
  const activeMutation = side === 'Buy' ? placeBuy : placeSell;
  const busy = isBusy(activeMutation);

  const handleSubmit = async () => {
    if (!price || !amount || !tronAddr) return;
    const priceRaw = usdtToRaw(price);
    const amountRaw = nexToRaw(amount).toString();

    if (side === 'Buy') {
      await placeBuy.mutate([amountRaw, priceRaw, tronAddr]);
    } else {
      const minFillRaw = minFill ? nexToRaw(minFill).toString() : null;
      await placeSell.mutate([amountRaw, priceRaw, tronAddr, minFillRaw]);
    }
    setPrice('');
    setAmount('');
    setMinFill('');
  };

  const estimatedUsdt = price && amount
    ? (parseFloat(price) * parseFloat(amount)).toFixed(2)
    : null;

  return (
    <div className="space-y-3">
      {/* Buy/Sell toggle */}
      <div className="flex gap-2">
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

      <div>
        <label className="mb-1 block text-xs text-muted-foreground flex items-center gap-1">{tn('usdtPrice')} <HelpTip helpKey="nexMarket.usdtPrice" iconSize={12} /></label>
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground flex items-center gap-1">{tn('nexAmount')} <HelpTip helpKey="nexMarket.nexAmount" iconSize={12} /></label>
        <Input
          inputMode="decimal"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground flex items-center gap-1">{tn('tronAddress')} <HelpTip helpKey="nexMarket.tronAddress" iconSize={12} /></label>
        <Input
          placeholder={tn('tronPlaceholder')}
          value={tronAddr}
          onChange={(e) => setTronAddr(e.target.value)}
        />
      </div>

      {side === 'Sell' && (
        <div>
          <label className="mb-1 block text-xs text-muted-foreground flex items-center gap-1">{tn('minFillAmount')} <HelpTip helpKey="nexMarket.minFillAmount" iconSize={12} /></label>
          <Input
            inputMode="decimal"
            placeholder={tn('minFillPlaceholder')}
            value={minFill}
            onChange={(e) => setMinFill(e.target.value)}
          />
        </div>
      )}

      {estimatedUsdt && (
        <div className="rounded-lg bg-secondary px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t('estimatedTotal')}: </span>
          <span className="font-semibold tabular-nums">${estimatedUsdt}</span>
        </div>
      )}

      <Button
        className={`w-full ${side === 'Buy' ? 'bg-success hover:bg-success/90 text-success-foreground' : 'bg-destructive hover:bg-destructive/90'}`}
        disabled={!price || !amount || !tronAddr || !address || busy}
        onClick={handleSubmit}
      >
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {side === 'Buy' ? tn('placeBuyOrder') : tn('placeSellOrder')}
      </Button>

      <TxStatus mutation={activeMutation} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trade Workflow sub-form (4 action cards)
// ---------------------------------------------------------------------------

function TradeWorkflowForm({ address, prefill, onPrefillUsed }: {
  address: string | null;
  prefill?: OrderActionPrefill | null;
  onPrefillUsed?: () => void;
}) {
  const tn = useTranslations('market.nexMarket');
  const { data: orderBook } = useNexOrderBook();

  const allOrders = useMemo(() => {
    if (!orderBook) return [];
    return [...(orderBook.buyOrders ?? []), ...(orderBook.sellOrders ?? [])];
  }, [orderBook]);

  const acceptBuyPrefill = prefill?.target === 'acceptBuy' ? prefill : undefined;
  const reserveSellPrefill = prefill?.target === 'reserveSell' ? prefill : undefined;

  return (
    <div className="space-y-3">
      <WorkflowAction
        icon={<HandCoins className="h-4 w-4" />}
        label={tn('acceptBuyOrder')}
        helpKey="acceptBuyOrder"
        fields={['orderId', 'amount', 'tron']}
        useMutation={useNexAcceptBuyOrder}
        buildParams={(orderId, amount, tronAddr) => [Number(orderId), amount ? nexToRaw(amount).toString() : null, tronAddr]}
        disabled={!address}
        initialValues={acceptBuyPrefill ? { ...acceptBuyPrefill } : undefined}
        onInitialValuesUsed={onPrefillUsed}
        allOrders={allOrders}
      />
      <WorkflowAction
        icon={<ArrowRightLeft className="h-4 w-4" />}
        label={tn('reserveSellOrder')}
        helpKey="reserveSellOrder"
        fields={['orderId', 'amount', 'tron']}
        useMutation={useNexReserveSellOrder}
        buildParams={(orderId, amount, tronAddr) => [Number(orderId), amount ? nexToRaw(amount).toString() : null, tronAddr]}
        disabled={!address}
        initialValues={reserveSellPrefill ? { ...reserveSellPrefill } : undefined}
        onInitialValuesUsed={onPrefillUsed}
        allOrders={allOrders}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic workflow action card
// ---------------------------------------------------------------------------

type FieldType = 'orderId' | 'tradeId' | 'amount' | 'tron';

interface WorkflowActionProps {
  icon: React.ReactNode;
  label: string;
  helpKey: string;
  fields: FieldType[];
  useMutation: () => ReturnType<typeof useNexAcceptBuyOrder>;
  buildParams: (...args: string[]) => unknown[];
  disabled?: boolean;
  initialValues?: Record<string, string>;
  onInitialValuesUsed?: () => void;
  allOrders?: NexMarketOrder[];
}

function WorkflowAction({ icon, label, helpKey, fields, useMutation: useMut, buildParams, disabled, initialValues, onInitialValuesUsed, allOrders }: WorkflowActionProps) {
  const t = useTranslations('market');
  const tn = useTranslations('market.nexMarket');
  const [values, setValues] = useState<Record<string, string>>({});
  const mutation = useMut();
  const busy = isBusy(mutation);

  // Apply initial values when they arrive
  useEffect(() => {
    if (initialValues) {
      setValues(initialValues);
      onInitialValuesUsed?.();
    }
  }, [initialValues]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field: string, val: string) => setValues((prev) => ({ ...prev, [field]: val }));

  // Look up matched order price when orderId is entered
  const matchedOrder = useMemo(() => {
    const idStr = values.orderId?.trim();
    if (!idStr || !allOrders?.length) return null;
    const id = Number(idStr);
    if (isNaN(id)) return null;
    return allOrders.find((o) => o.id === id) ?? null;
  }, [values.orderId, allOrders]);

  // Compute USDT estimate: NEX amount * order price
  const estimatedUsdt = useMemo(() => {
    if (!matchedOrder) return null;
    const amountStr = values.amount?.trim();
    if (!amountStr) return null;
    const nexAmount = parseFloat(amountStr);
    if (isNaN(nexAmount) || nexAmount <= 0) return null;
    // order.price is raw u64 with 6 decimals
    const priceUsdt = Number(matchedOrder.price) / 1e6;
    if (priceUsdt <= 0) return null;
    return (nexAmount * priceUsdt).toFixed(2);
  }, [matchedOrder, values.amount]);

  const fieldConfig: Record<FieldType, { label: string; placeholder: string; inputMode?: 'decimal' | 'numeric' }> = {
    orderId: { label: tn('orderId'), placeholder: tn('orderIdPlaceholder'), inputMode: 'numeric' },
    tradeId: { label: tn('tradeId'), placeholder: tn('tradeIdPlaceholder'), inputMode: 'numeric' },
    amount: { label: tn('amountOptional'), placeholder: tn('amountOptionalPlaceholder'), inputMode: 'decimal' },
    tron: { label: tn('tronAddress'), placeholder: tn('tronPlaceholder') },
  };

  const requiredFields = fields.filter((f) => f !== 'amount');
  const canSubmit = requiredFields.every((f) => values[f]?.trim()) && !disabled && !busy;

  const handleSubmit = async () => {
    const args = fields.map((f) => values[f] ?? '');
    await mutation.mutate(buildParams(...args));
    setValues({});
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
        <HelpTip helpKey={`nexMarket.${helpKey}`} iconSize={13} />
      </div>
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f}>
            <label className="mb-0.5 block text-[10px] text-muted-foreground">{fieldConfig[f].label}</label>
            <Input
              inputMode={fieldConfig[f].inputMode}
              placeholder={fieldConfig[f].placeholder}
              value={values[f] ?? ''}
              onChange={(e) => set(f, e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        ))}
        {matchedOrder && (
          <div className="rounded-md bg-secondary/60 px-2.5 py-1.5 text-xs">
            <span className="text-muted-foreground">{tn('usdtPrice')}: </span>
            <span className="font-semibold tabular-nums">${formatNexPrice(matchedOrder.price)}</span>
            {estimatedUsdt && (
              <>
                <span className="mx-1.5 text-muted-foreground">|</span>
                <span className="text-muted-foreground">{t('estimatedTotal')}: </span>
                <span className="font-semibold tabular-nums text-primary">${estimatedUsdt}</span>
              </>
            )}
          </div>
        )}
        <Button
          size="sm"
          className="w-full"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {busy && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          {label}
        </Button>
        <TxStatus mutation={mutation} />
      </div>
    </div>
  );
}
