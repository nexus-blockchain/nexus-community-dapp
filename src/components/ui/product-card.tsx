'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductImage } from '@/components/ui/product-image';
import { formatBalance, formatUsdt, formatNexPrice } from '@/lib/utils/chain-helpers';
import type { Product } from '@/lib/types';

interface ProductCardProps {
  product: Product;
  /** Resolved product name (from IPFS) */
  name?: string;
  /** Fallback text when name is not yet loaded */
  loadingText?: string;
  /** Dynamic NEX equivalent of the USDT price (raw 12-decimal string), or null */
  dynNex?: string | null;
  /** NEX/USDT market rate for display (raw u64), shown as @$x.xx */
  marketRate?: string | number | null;
  /** Show status badge for non-OnSale products */
  showStatusBadge?: boolean;
  /** Status badge labels keyed by status */
  statusLabels?: Record<string, string>;
  /** Stock label functions */
  stockUnlimitedText?: string;
  stockText?: (remaining: number) => string;
  soldText?: (count: number) => string;
}

export function ProductCard({
  product,
  name,
  loadingText = '...',
  dynNex,
  marketRate,
  showStatusBadge = false,
  statusLabels,
  stockUnlimitedText,
  stockText,
  soldText,
}: ProductCardProps) {
  return (
    <Link href={`/product/${product.id}`}>
      <Card className="h-full transition-colors hover:border-primary/50">
        <CardContent className="p-3">
          <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
            <ProductImage cid={product.imagesCid} />
            {showStatusBadge && product.status !== 'OnSale' && statusLabels && (
              <Badge
                variant={product.status === 'Draft' ? 'outline' : 'secondary'}
                className="absolute right-1 top-1 text-[10px]"
              >
                {statusLabels[product.status]}
              </Badge>
            )}
          </div>
          <div className="mt-2">
            {product.nameCid && (
              <p className="truncate text-sm font-medium">
                {name || loadingText}
              </p>
            )}
            {product.usdtPrice > 0 && (
              <p className="text-sm font-semibold text-primary">
                ${formatUsdt(product.usdtPrice)} USDT
              </p>
            )}
            {dynNex ? (
              <p className="text-xs text-muted-foreground">
                ≈ {formatBalance(dynNex)} NEX
                {marketRate && (
                  <span className="ml-1 opacity-60">
                    @${formatNexPrice(marketRate)}
                  </span>
                )}
              </p>
            ) : product.usdtPrice <= 0 ? (
              <p className="text-sm font-semibold text-primary">
                {formatBalance(product.price, 12, 0)} NEX
              </p>
            ) : null}
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {product.stock === 0
                  ? (stockUnlimitedText ?? '∞')
                  : (stockText?.(product.stock - product.soldCount) ?? `${product.stock - product.soldCount}`)}
              </span>
              {product.soldCount > 0 && (
                <span>{soldText?.(product.soldCount) ?? `${product.soldCount} sold`}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
