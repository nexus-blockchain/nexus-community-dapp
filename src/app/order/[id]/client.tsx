'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Loader2, Check, AlertCircle, Package, Truck, CheckCircle2,
  XCircle, AlertTriangle, Clock,
} from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { ORDER_STATUS_VARIANT, ORDER_STATUS_ICON } from '@/lib/constants/order-status';
import { useOrder, useCancelOrder, useShipOrder, useConfirmReceipt, useRequestRefund, useApproveRefund, useRejectRefund, useSellerCancelOrder, useStartService, useCompleteService, useConfirmService, useWithdrawDispute, getOrderDisplayAmount, getOrderDisplayUnit, getOrderPaymentLabel } from '@/hooks/use-order';
import { useProduct } from '@/hooks/use-product';
import { useIpfsContent } from '@/hooks/use-ipfs-content';
import { useNexPrice } from '@/hooks/use-nex-price';
import { useWalletStore } from '@/stores';
import { formatBalance, formatUsdt, shortAddress, isTxBusy } from '@/lib/utils/chain-helpers';
import { TxStatusIndicator } from '@/components/ui/tx-status-indicator';

export default function OrderDetailClient({ params }: { params: { id: string } }) {
  const t = useTranslations('order');
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(Boolean);
  const pathId = pathSegments[pathSegments.length - 1];
  const orderId = Number(pathId ?? params.id);
  const { data: order, isLoading } = useOrder(orderId);
  const { data: orderProduct } = useProduct(order?.productId ?? null);
  const { data: orderProductName } = useIpfsContent(orderProduct?.nameCid);
  const { address } = useWalletStore();
  const { toUsdt } = useNexPrice();

  // Resolve CID fields to human-readable content
  const { data: trackingContent } = useIpfsContent(order?.trackingCid);
  const { data: shippingContent } = useIpfsContent(order?.shippingCid);
  const { data: noteContent } = useIpfsContent(order?.noteCid);
  const { data: refundReasonContent } = useIpfsContent(order?.refundReasonCid);

  const [trackingCid, setTrackingCid] = useState('');
  const [reasonCid, setReasonCid] = useState('');

  const cancelOrder = useCancelOrder();
  const shipOrder = useShipOrder();
  const confirmReceipt = useConfirmReceipt();
  const requestRefund = useRequestRefund();
  const approveRefund = useApproveRefund();
  const rejectRefund = useRejectRefund();
  const sellerCancel = useSellerCancelOrder();
  const startService = useStartService();
  const completeService = useCompleteService();
  const confirmService = useConfirmService();
  const withdrawDispute = useWithdrawDispute();

  const isBuyer = address && order?.buyer === address;
  const isSeller = address && order?.seller === address;
  const isService = order?.productCategory === 'Service';
  const activeTx = [cancelOrder, shipOrder, confirmReceipt, requestRefund, approveRefund, rejectRefund, sellerCancel, startService, completeService, confirmService, withdrawDispute].find(
    (m) => m.txState.status !== 'idle',
  );
  const isBusy = activeTx && isTxBusy(activeTx.txState);

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive'; icon: any }> = {
    Paid: { label: t('statusPaid'), variant: ORDER_STATUS_VARIANT.Paid, icon: ORDER_STATUS_ICON.Paid },
    Shipped: { label: t('statusShipped'), variant: ORDER_STATUS_VARIANT.Shipped, icon: ORDER_STATUS_ICON.Shipped },
    Completed: { label: t('statusCompleted'), variant: ORDER_STATUS_VARIANT.Completed, icon: ORDER_STATUS_ICON.Completed },
    Disputed: { label: t('statusDisputed'), variant: ORDER_STATUS_VARIANT.Disputed, icon: ORDER_STATUS_ICON.Disputed },
    Refunded: { label: t('statusRefunded'), variant: ORDER_STATUS_VARIANT.Refunded, icon: ORDER_STATUS_ICON.Refunded },
    Cancelled: { label: t('statusCancelled'), variant: ORDER_STATUS_VARIANT.Cancelled, icon: ORDER_STATUS_ICON.Cancelled },
  };

  const st = statusConfig[order?.status ?? ''] ?? { label: order?.status ?? '', variant: 'default' as const, icon: Clock };
  const StatusIcon = st.icon;
  const displayAmount = order ? getOrderDisplayAmount(order) : '0';
  const displayUnit = order ? getOrderDisplayUnit(order) : 'NEX';
  const paymentLabel = order ? getOrderPaymentLabel(order, displayUnit, t('shoppingBalanceNex')) : '';

  const unitPriceDisplay = order?.paymentAsset === 'EntityToken'
    ? { amount: formatBalance(order.tokenPaymentAmount), unit: displayUnit, usdt: null }
    : order
      ? { amount: formatBalance(order.unitPrice), unit: 'NEX', usdt: toUsdt(order.unitPrice) }
      : { amount: '0', unit: 'NEX', usdt: null };
  const platformFeeDisplay = order?.paymentAsset === 'EntityToken'
    ? { amount: formatBalance(order.platformFee), unit: displayUnit }
    : order
      ? { amount: formatBalance(order.platformFee), unit: 'NEX' }
      : { amount: '0', unit: 'NEX' };

  return (
    <>
      <MobileHeader title={t('title', { id: orderId })} showBack />
      <PageContainer>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !order ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('notFound')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Status */}
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  order.status === 'Completed' ? 'bg-success/20' :
                  order.status === 'Disputed' ? 'bg-destructive/20' :
                  'bg-primary/20'
                }`}>
                  <StatusIcon className={`h-6 w-6 ${
                    order.status === 'Completed' ? 'text-success' :
                    order.status === 'Disputed' ? 'text-destructive' :
                    'text-primary'
                  }`} />
                </div>
                <div>
                  <Badge variant={st.variant} className="text-sm">{st.label}</Badge>
                  {order.disputeDeadline && (
                    <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                      {t('disputeDeadline', { block: order.disputeDeadline })}
                      <HelpTip helpKey="order.disputeDeadline" iconSize={10} />
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Order info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('orderInfo')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('product')}</span>
                    <Link href={`/product/${order.productId}`} className="text-primary hover:underline">
                      {orderProductName || `#${order.productId}`}
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('unitPrice')}</span>
                    <div className="text-right">
                      <span>{unitPriceDisplay.amount} {unitPriceDisplay.unit}</span>
                      {unitPriceDisplay.unit === 'NEX' && unitPriceDisplay.usdt && (
                        <div className="text-xs text-muted-foreground">≈ ${formatUsdt(unitPriceDisplay.usdt)}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('quantity')}</span>
                    <span>{order.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">{t('totalAmount')} <HelpTip helpKey="order.totalAmount" iconSize={12} /></span>
                    <div className="text-right">
                      <span className="font-semibold text-primary">{formatBalance(displayAmount)} {displayUnit}</span>
                      {displayUnit === 'NEX' && (() => {
                        const usdtVal = toUsdt(displayAmount);
                        return usdtVal ? (
                          <div className="text-xs text-muted-foreground">≈ ${formatUsdt(usdtVal)}</div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">{t('platformFee')} <HelpTip helpKey="order.platformFee" iconSize={12} /></span>
                    <span>{platformFeeDisplay.amount} {platformFeeDisplay.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">{t('paymentMethod')} <HelpTip helpKey="order.paymentMethod" iconSize={12} /></span>
                    <span>{paymentLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('buyer')}</span>
                    <span className="font-mono text-xs">{shortAddress(order.buyer)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('seller')}</span>
                    <span className="font-mono text-xs">{shortAddress(order.seller)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('type')}</span>
                    <Badge variant="outline">{order.productCategory}</Badge>
                  </div>
                  {noteContent && (
                    <div className="border-t pt-2">
                      <span className="text-muted-foreground">{t('note')}</span>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{noteContent}</p>
                    </div>
                  )}
                  {shippingContent && (
                    <div className="border-t pt-2">
                      <span className="text-muted-foreground">{t('shippingInfo')}</span>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{shippingContent}</p>
                    </div>
                  )}
                  {trackingContent && (
                    <div className="border-t pt-2">
                      <span className="text-muted-foreground">{t('trackingInfo')}</span>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{trackingContent}</p>
                    </div>
                  )}
                  {refundReasonContent && (
                    <div className="border-t pt-2">
                      <span className="text-muted-foreground">{t('refundReasonInfo')}</span>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{refundReasonContent}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tx status */}
            {activeTx && <TxStatusIndicator txState={activeTx.txState} />}

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('actions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Paid status */}
                {order.status === 'Paid' && isBuyer && !isService && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={!!isBusy}
                    onClick={() => cancelOrder.mutate([orderId])}
                  >
                    {t('cancelOrder')}
                  </Button>
                )}
                {order.status === 'Paid' && isSeller && !isService && (
                  <div className="space-y-2">
                    <Input
                      placeholder={t('trackingCid')}
                      value={trackingCid}
                      onChange={(e) => setTrackingCid(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      disabled={!trackingCid || !!isBusy}
                      onClick={() => shipOrder.mutate([orderId, trackingCid])}
                    >
                      {t('confirmShip')}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={!!isBusy}
                      onClick={() => sellerCancel.mutate([orderId, 'seller-cancel'])}
                    >
                      {t('sellerCancel')}
                    </Button>
                  </div>
                )}
                {order.status === 'Paid' && isSeller && isService && (
                  <Button
                    className="w-full"
                    disabled={!!isBusy}
                    onClick={() => startService.mutate([orderId])}
                  >
                    {t('startService')}
                  </Button>
                )}

                {/* Shipped status */}
                {order.status === 'Shipped' && isBuyer && !isService && (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      disabled={!!isBusy}
                      onClick={() => confirmReceipt.mutate([orderId])}
                    >
                      {t('confirmReceipt')}
                    </Button>
                    <Input
                      placeholder={t('refundReason')}
                      value={reasonCid}
                      onChange={(e) => setReasonCid(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={!reasonCid || !!isBusy}
                      onClick={() => requestRefund.mutate([orderId, reasonCid])}
                    >
                      {t('requestRefund')}
                    </Button>
                  </div>
                )}
                {order.status === 'Shipped' && isSeller && isService && (
                  <Button
                    className="w-full"
                    disabled={!!isBusy}
                    onClick={() => completeService.mutate([orderId])}
                  >
                    {t('completeService')}
                  </Button>
                )}
                {order.status === 'Shipped' && isBuyer && isService && (
                  <Button
                    className="w-full"
                    disabled={!!isBusy}
                    onClick={() => confirmService.mutate([orderId])}
                  >
                    {t('confirmServiceDone')}
                  </Button>
                )}

                {/* Disputed status */}
                {order.status === 'Disputed' && isSeller && (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      disabled={!!isBusy}
                      onClick={() => approveRefund.mutate([orderId])}
                    >
                      {t('approveRefund')}
                    </Button>
                    <Input
                      placeholder={t('rejectReason')}
                      value={reasonCid}
                      onChange={(e) => setReasonCid(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={!reasonCid || !!isBusy}
                      onClick={() => rejectRefund.mutate([orderId, reasonCid])}
                    >
                      {t('rejectRefund')}
                    </Button>
                  </div>
                )}
                {order.status === 'Disputed' && isBuyer && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!!isBusy}
                    onClick={() => withdrawDispute.mutate([orderId])}
                  >
                    {t('withdrawDispute')}
                  </Button>
                )}

                {/* Terminal status */}
                {['Completed', 'Refunded', 'Cancelled'].includes(order.status) && (
                  <p className="text-center text-sm text-muted-foreground">{t('orderClosed')}</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </PageContainer>
    </>
  );
}
