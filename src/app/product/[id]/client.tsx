'use client';

import { useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Minus, Plus, Loader2 } from 'lucide-react';
import { ProductImage } from '@/components/ui/product-image';
import { useProduct } from '@/hooks/use-product';
import { useIpfsContent } from '@/hooks/use-ipfs-content';
import { useNexPrice } from '@/hooks/use-nex-price';
import { useShoppingBalance } from '@/hooks/use-loyalty';
import { useShop } from '@/hooks/use-shop';
import { formatBalance, formatUsdt } from '@/lib/utils/chain-helpers';
import { PaymentAsset } from '@/lib/types';
import { useWalletStore } from '@/stores';

export default function ProductDetailClient({ params }: { params: { id: string } }) {
  const t = useTranslations('product');
  const router = useRouter();
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(Boolean);
  const pathId = pathSegments[pathSegments.length - 1];
  const productId = Number(pathId ?? params.id);
  const { data: product, isLoading } = useProduct(productId);
  const { data: productName } = useIpfsContent(product?.nameCid);
  const { toNex } = useNexPrice();
  const { address } = useWalletStore();
  const { data: shop } = useShop(product?.shopId ?? null);
  const { data: shoppingBalanceRaw } = useShoppingBalance(shop?.entityId ?? null, address);
  const [quantity, setQuantity] = useState(1);
  const [paymentAsset, setPaymentAsset] = useState<PaymentAsset>(PaymentAsset.Native);

  const minQty = product?.minOrderQuantity || 1;
  const maxQty = product?.maxOrderQuantity || 999;
  const stockLimit = product?.stock === 0 ? maxQty : Math.min(product?.stock ?? 1, maxQty);

  const dynNex = product ? toNex(product.usdtPrice) : null;
  const canUseShoppingBalance = useMemo(() => {
    if (!shoppingBalanceRaw) return false;
    return BigInt(shoppingBalanceRaw) > BigInt(0);
  }, [shoppingBalanceRaw]);

  const handleBuy = () => {
    const params = new URLSearchParams({
      product: String(productId),
      quantity: String(quantity),
      payment: paymentAsset,
    });
    router.push(`/order/create?${params.toString()}`);
  };

  return (
    <>
      <MobileHeader title={t('title', { id: productId })} showBack />
      <PageContainer>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !product ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('notFound')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Product image */}
            <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-xl bg-secondary">
              <ProductImage cid={product.imagesCid} iconSize="h-16 w-16" />
            </div>

            {/* Info */}
            <Card>
              <CardContent className="p-4">
                <div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {productName || t('title', { id: product.id })}
                    </h2>
                  </div>
                </div>

                {/* Price section — USDT primary, dynamic NEX secondary */}
                <div className="mt-4">
                  {product.usdtPrice > 0 && (
                    <p className="text-2xl font-bold text-primary">
                      ${formatUsdt(product.usdtPrice)} USDT
                    </p>
                  )}
                  {dynNex ? (
                    <p className="text-sm text-muted-foreground">
                      ≈ {formatBalance(dynNex)} NEX
                    </p>
                  ) : product.usdtPrice <= 0 ? (
                    <p className="text-2xl font-bold text-primary">
                      {formatBalance(product.price, 12, 0)} NEX
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('noMarketPrice')}
                    </p>
                  )}
                </div>

              </CardContent>
            </Card>

            {/* Quantity selector + Buy */}
            {product.status === 'OnSale' && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <p className="mb-3 text-sm font-medium">{t('quantity')}</p>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity((q) => Math.max(minQty, q - 1))}
                        disabled={quantity <= minQty}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[3rem] text-center text-lg font-semibold">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity((q) => Math.min(stockLimit, q + 1))}
                        disabled={quantity >= stockLimit}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {(product.minOrderQuantity > 0 || product.maxOrderQuantity > 0) && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {product.minOrderQuantity > 0 && t('minQty', { count: product.minOrderQuantity })}
                        {product.minOrderQuantity > 0 && product.maxOrderQuantity > 0 && ' / '}
                        {product.maxOrderQuantity > 0 && t('maxQty', { count: product.maxOrderQuantity })}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-medium">{t('paymentType')}</p>
                    <div className="space-y-3">
                      <button
                        type="button"
                        className={`w-full rounded-lg border p-4 text-left transition-colors ${paymentAsset === PaymentAsset.Native ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
                        onClick={() => setPaymentAsset(PaymentAsset.Native)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{t('paymentNative')}</div>
                            <div className="text-xs text-muted-foreground">{t('paymentNativeDesc')}</div>
                          </div>
                          <div className={`h-4 w-4 rounded-full border ${paymentAsset === PaymentAsset.Native ? 'border-primary' : 'border-muted-foreground/40'} flex items-center justify-center`}>
                            {paymentAsset === PaymentAsset.Native ? <div className="h-2 w-2 rounded-full bg-primary" /> : null}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={`w-full rounded-lg border p-4 text-left transition-colors ${paymentAsset === PaymentAsset.ShoppingBalance ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
                        onClick={() => setPaymentAsset(PaymentAsset.ShoppingBalance)}
                        disabled={!canUseShoppingBalance}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{t('shoppingBalanceNex')}</div>
                            <div className="text-xs text-muted-foreground">{t('shoppingBalanceAvailable', { amount: formatBalance(shoppingBalanceRaw ?? '0') })}</div>
                          </div>
                          <div className={`h-4 w-4 rounded-full border ${paymentAsset === PaymentAsset.ShoppingBalance ? 'border-primary' : 'border-muted-foreground/40'} flex items-center justify-center`}>
                            {paymentAsset === PaymentAsset.ShoppingBalance ? <div className="h-2 w-2 rounded-full bg-primary" /> : null}
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <Button className="w-full" size="lg" onClick={handleBuy}>
                    {t('buyNow')}
                  </Button>
                </CardContent>
              </Card>
            )}

          </div>
        )}
      </PageContainer>
    </>
  );
}
