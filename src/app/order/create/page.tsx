'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Check, AlertCircle, MapPin, UserPlus, Wallet } from 'lucide-react';
import { HelpTip } from '@/components/ui/help-tip';
import { useProduct } from '@/hooks/use-product';
import { useShop } from '@/hooks/use-shop';
import { useMember } from '@/hooks/use-member';
import { useIpfsContent } from '@/hooks/use-ipfs-content';
import { useEntityMutation } from '@/hooks/use-entity-mutation';
import { useShoppingBalance } from '@/hooks/use-loyalty';
import { useNexPrice } from '@/hooks/use-nex-price';
import { formatBalance, formatUsdt } from '@/lib/utils/chain-helpers';
import { useWalletStore, useEntityStore } from '@/stores';

async function isValidSS58(address: string): Promise<boolean> {
  try {
    const { cryptoWaitReady, decodeAddress } = require('@polkadot/util-crypto');
    await cryptoWaitReady();
    decodeAddress(address);
    return true;
  } catch {
    return false;
  }
}

function OrderCreateContent() {
  const t = useTranslations('order');
  const tTx = useTranslations('tx');
  const router = useRouter();
  const searchParams = useSearchParams();
  const productParam = searchParams.get('product');
  const productId = productParam != null ? Number(productParam) : null;
  const quantity = Number(searchParams.get('quantity') || 1);
  const { address } = useWalletStore();
  const { currentEntityId } = useEntityStore();
  const { data: product, isLoading } = useProduct(productId != null && !isNaN(productId) ? productId : null);
  const { data: shop } = useShop(product?.shopId ?? null);
  const shopEntityId = shop?.entityId ?? null;
  const { data: memberInfo } = useMember(shopEntityId, address);
  const isMembersOnly = product?.visibility === 'MembersOnly';
  const isMember = !!memberInfo;
  const memberBlocked = isMembersOnly && !isMember;
  const { data: productName } = useIpfsContent(product?.nameCid);
  const { data: shoppingBalanceRaw } = useShoppingBalance(currentEntityId, address);
  const { toNex, toUsdt } = useNexPrice();

  const [note, setNote] = useState('');
  const [paymentAsset, setPaymentAsset] = useState<'Native' | 'EntityToken'>('Native');
  const [shippingAddr, setShippingAddr] = useState('');
  const [referrer, setReferrer] = useState('');
  const [useShoppingBal, setUseShoppingBal] = useState(false);

  const [referrerError, setReferrerError] = useState('');
  useEffect(() => {
    if (!referrer) { setReferrerError(''); return; }
    let cancelled = false;
    isValidSS58(referrer).then((valid) => {
      if (!cancelled) setReferrerError(valid ? '' : t('invalidAddress'));
    });
    return () => { cancelled = true; };
  }, [referrer, t]);

  const isPhysical = product?.category === 'Physical';

  const { mutate, txState } = useEntityMutation('entityTransaction', 'placeOrder', {
    invalidateKeys: [['buyerOrders'], ['product'], ['shopProducts'], ['shoppingBalance']],
    onSuccess: () => {
      setTimeout(() => router.push('/me'), 2000);
    },
  });

  // Price calculation: if product has usdtPrice, dynamically compute NEX from market rate
  const hasUsdtPrice = product && product.usdtPrice > 0;
  const unitNexDynamic = hasUsdtPrice ? toNex(product.usdtPrice) : null;
  const totalNex = useMemo(() => {
    if (unitNexDynamic) {
      return BigInt(unitNexDynamic) * BigInt(quantity);
    }
    return product ? BigInt(product.price) * BigInt(quantity) : BigInt(0);
  }, [unitNexDynamic, product, quantity]);
  const totalUsdt = hasUsdtPrice ? product.usdtPrice * quantity : null;

  // Shopping balance to spend: capped at min(balance, totalNex - MIN_NATIVE).
  // Chain constraints for Digital products (auto-complete on creation):
  //  1. ensure!(!final_amount.is_zero()) — remaining must be > 0
  //  2. Escrow::lock_from needs final_amount >= ED for new escrow entry
  //  3. Escrow::transfer_from_escrow(seller_amount, KeepAlive) needs
  //     remaining platform_fee >= ED after seller transfer.
  //     platform_fee = final_amount * feeRate / 10000, so:
  //     final_amount >= ED * 10000 / feeRate  (ED=10^9, feeRate=100bps → 0.1 NEX)
  // We use a conservative constant that satisfies all three constraints.
  const MIN_NATIVE_RESERVE = BigInt('100000000000'); // 0.1 NEX — covers ED * 100 (1% fee)
  const shoppingBalSpend = useMemo(() => {
    if (!useShoppingBal || !shoppingBalanceRaw) return null;
    const bal = BigInt(shoppingBalanceRaw);
    if (bal <= BigInt(0) || totalNex <= MIN_NATIVE_RESERVE) return null;
    const maxDeduct = totalNex - MIN_NATIVE_RESERVE;
    const cap = maxDeduct < bal ? maxDeduct : bal;
    if (cap <= BigInt(0)) return null;
    return cap.toString();
  }, [useShoppingBal, shoppingBalanceRaw, totalNex]);

  const handleSubmit = async () => {
    if (!product || !address || memberBlocked) return;
    if (referrer && !(await isValidSS58(referrer))) return;
    await mutate([
      product.id,                          // product_id
      quantity,                            // quantity
      shippingAddr || null,                // shipping_cid
      paymentAsset === 'EntityToken'       // use_tokens: Option<Balance>
        ? totalNex.toString() : null,
      shoppingBalSpend,                    // use_shopping_balance: Option<Balance>
      null,                                // payment_asset
      note || null,                        // note_cid
      referrer || null,                    // referrer
      null,                                // max_nex_amount (no slippage limit)
      null,                                // max_token_amount (no slippage limit)
    ]);
  };

  const isBusy = txState.status === 'signing' || txState.status === 'broadcasting' || txState.status === 'inBlock';

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!product) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{t('notFound')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Product Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">{t('productInfo')} <HelpTip helpKey="order.productInfo" /></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('product')}</span>
              <span>{productName || `#${product.id}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('unitPrice')}</span>
              <div className="text-right">
                {hasUsdtPrice ? (
                  <>
                    <span>${formatUsdt(product.usdtPrice)}</span>
                    {unitNexDynamic ? (
                      <div className="text-xs text-muted-foreground">≈ {formatBalance(unitNexDynamic)} NEX</div>
                    ) : (
                      <div className="text-xs text-muted-foreground">{t('loadingPrice')}</div>
                    )}
                  </>
                ) : (
                  <>
                    <span>{formatBalance(product.price)} NEX</span>
                    {(() => {
                      const usdtVal = toUsdt(product.price);
                      return usdtVal ? (
                        <div className="text-xs text-muted-foreground">≈ ${formatUsdt(usdtVal)}</div>
                      ) : null;
                    })()}
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('quantity')}</span>
              <span>{quantity}</span>
            </div>
            <div className="border-t pt-2">
              {hasUsdtPrice ? (
                <>
                  <div className="flex justify-between font-semibold">
                    <span>{t('subtotal')}</span>
                    <span className="text-primary">${formatUsdt(totalUsdt!)}</span>
                  </div>
                  {unitNexDynamic ? (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span />
                      <span>≈ {formatBalance(totalNex.toString())} NEX</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span />
                      <span>{t('loadingPrice')}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between font-semibold">
                    <span>{t('subtotal')}</span>
                    <span className="text-primary">{formatBalance(totalNex.toString())} NEX</span>
                  </div>
                  {(() => {
                    const usdtVal = toUsdt(totalNex.toString());
                    return usdtVal ? (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span />
                        <span>≈ ${formatUsdt(usdtVal)}</span>
                      </div>
                    ) : null;
                  })()}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">{t('paymentType')} <HelpTip helpKey="order.paymentType" /></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={paymentAsset === 'Native' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaymentAsset('Native')}
            >
              {t('nativeToken')}
            </Button>
            <Button
              variant={paymentAsset === 'EntityToken' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPaymentAsset('EntityToken')}
            >
              {t('entityToken')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Address — only for Physical products */}
      {isPhysical && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              {t('shippingAddress')}
              <HelpTip helpKey="order.shippingAddress" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={t('shippingPlaceholder')}
              value={shippingAddr}
              onChange={(e) => setShippingAddr(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </CardContent>
        </Card>
      )}

      {/* Referrer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            {t('referrer')}
            <HelpTip helpKey="order.referrer" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder={t('referrerPlaceholder')}
            value={referrer}
            onChange={(e) => setReferrer(e.target.value)}
          />
          {referrerError && (
            <p className="mt-1 text-xs text-destructive">{referrerError}</p>
          )}
        </CardContent>
      </Card>

      {/* Shopping Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" />
            {t('useShoppingBalance')}
            <HelpTip helpKey="order.useShoppingBalance" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t('shoppingBalanceAvailable', {
                amount: formatBalance(shoppingBalanceRaw ?? '0'),
              })}
            </p>
            <Button
              variant={useShoppingBal ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUseShoppingBal(!useShoppingBal)}
            >
              {useShoppingBal ? t('useShoppingBalance') : t('useShoppingBalance')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Note */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">{t('note')} <HelpTip helpKey="order.note" /></CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder={t('notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Tx Status */}
      {txState.status !== 'idle' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {isBusy && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              {txState.status === 'finalized' && <Check className="h-5 w-5 text-success" />}
              {txState.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
              <div>
                <p className="text-sm font-medium">
                  {txState.status === 'signing' && tTx('signing')}
                  {txState.status === 'broadcasting' && tTx('broadcasting')}
                  {txState.status === 'inBlock' && tTx('inBlockWaiting')}
                  {txState.status === 'finalized' && t('orderSuccess')}
                  {txState.status === 'error' && t('orderFailed')}
                </p>
                {txState.error && (
                  <p className="mt-1 text-xs text-destructive">{txState.error}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {memberBlocked && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{t('membersOnlyHint')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={isBusy || !address || txState.status === 'finalized' || !!referrerError || memberBlocked}
      >
        {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {!address ? t('connectFirst') : memberBlocked ? t('membersOnlyHint') : isBusy ? t('processing') : t('confirmOrder')}
      </Button>
    </div>
  );
}

export default function OrderCreatePage() {
  const t = useTranslations('order');
  return (
    <>
      <MobileHeader title={t('createOrder')} showBack />
      <PageContainer>
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <OrderCreateContent />
        </Suspense>
      </PageContainer>
    </>
  );
}
