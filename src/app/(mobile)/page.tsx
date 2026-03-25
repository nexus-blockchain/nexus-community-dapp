'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/ui/product-card';
import {
  ShoppingBag, ShoppingCart, Coins, UserPlus, TrendingUp,
  Megaphone, FileText, Pin, AlertTriangle, Network, Package,
} from 'lucide-react';
import { useWalletStore, useEntityStore } from '@/stores';
import { useMember } from '@/hooks/use-member';
import { useBuyerOrders } from '@/hooks/use-order';
import { useEntityShops } from '@/hooks/use-shop';
import { useAllShopsProducts } from '@/hooks/use-product';
import { useNexPrice } from '@/hooks/use-nex-price';
import { usePinnedAnnouncements, useEntityAnnouncements, useEntityDisclosures } from '@/hooks/use-disclosure';
import { useIpfsContents } from '@/hooks/use-ipfs-content';
import { formatBalance, formatUsdt } from '@/lib/utils/chain-helpers';
import type { AnnouncementRecord } from '@/lib/types';

/** Map announcement category enum to i18n key */
function announcementCategoryKey(category: string): string {
  const map: Record<string, string> = {
    General: 'categoryGeneral',
    Promotion: 'categoryPromotion',
    SystemUpdate: 'categorySystemUpdate',
    ActivityNotice: 'categoryActivityNotice',
    RiskWarning: 'categoryRiskWarning',
    Product: 'categoryProduct',
    Other: 'categoryOther',
  };
  return map[category] ?? 'categoryOther';
}

/** Map disclosure type enum to i18n key */
function disclosureTypeKey(dtype: string): string {
  const map: Record<string, string> = {
    AnnualReport: 'typeAnnualReport',
    QuarterlyReport: 'typeQuarterlyReport',
    MonthlyReport: 'typeMonthlyReport',
    MaterialEvent: 'typeMaterialEvent',
    AffiliatedTransaction: 'typeAffiliatedTransaction',
    ChangesInShareholding: 'typeChangesInShareholding',
    Buyback: 'typeBuyback',
    Other: 'typeOther',
  };
  return map[dtype] ?? 'typeOther';
}

/** Badge color for announcement category */
function categoryBadgeColor(category: string): string {
  switch (category) {
    case 'RiskWarning': return 'text-destructive border-destructive/50';
    case 'Promotion': return 'text-success border-success/50';
    case 'SystemUpdate': return 'text-info border-info/50';
    case 'ActivityNotice': return 'text-warning border-warning/50';
    default: return '';
  }
}

export default function CommunityHomePage() {
  const t = useTranslations();
  const td = useTranslations('disclosure');
  const tShop = useTranslations('shop');
  const tProduct = useTranslations('product');
  const tMall = useTranslations('mall');
  const { address } = useWalletStore();
  const { currentEntityId, entityName } = useEntityStore();
  const { data: member } = useMember(currentEntityId, address);
  const { data: orders } = useBuyerOrders(address);
  const { data: pinnedAnnouncements } = usePinnedAnnouncements(currentEntityId);
  const { data: announcements } = useEntityAnnouncements(currentEntityId, 5);
  const { data: disclosures } = useEntityDisclosures(currentEntityId, 3);

  // Fetch products for homepage recommendation
  const { data: shops } = useEntityShops(currentEntityId);
  const { toNex } = useNexPrice();
  const activeShopIds = useMemo(
    () => (shops ?? []).filter((s) => s.status === 'Active').map((s) => s.id),
    [shops],
  );
  const { data: allProducts } = useAllShopsProducts(activeShopIds);
  const recommendedProducts = useMemo(
    () => (allProducts ?? []).filter((p) => p.status === 'OnSale').slice(0, 4),
    [allProducts],
  );
  const productNameCids = useMemo(
    () => recommendedProducts.map((p) => p.nameCid),
    [recommendedProducts],
  );
  const { contentMap: productNameMap } = useIpfsContents(productNameCids);

  const quickActions = [
    { key: 'viewShops', label: t('home.viewShops'), icon: ShoppingBag, href: '/mall', color: 'text-info' },
    { key: 'myOrders', label: t('home.myOrders'), icon: ShoppingCart, href: '/me', color: 'text-success' },
    { key: 'myEarnings', label: t('home.myEarnings'), icon: Coins, href: '/earnings', color: 'text-warning' },
    { key: 'inviteFriends', label: t('home.inviteFriends'), icon: UserPlus, href: '/member/invite', color: 'text-primary' },
    { key: 'tokenMarket', label: t('home.tokenMarket'), icon: TrendingUp, href: '/market', color: 'text-accent' },
    { key: 'referralNetwork', label: t('home.referralNetwork'), icon: Network, href: '/member/network', color: 'text-info' },
  ];

  const activeOrders = (orders ?? []).filter((o) => !['Completed', 'Refunded', 'Cancelled'].includes(o.status));

  // Merge pinned + regular announcements, deduplicate by id
  const allAnnouncements = useMemo(() => {
    const pinned = pinnedAnnouncements ?? [];
    const regular = announcements ?? [];
    const seen = new Set<number>();
    const merged: AnnouncementRecord[] = [];
    for (const a of [...pinned, ...regular]) {
      if (!seen.has(a.id)) {
        seen.add(a.id);
        merged.push(a);
      }
    }
    return merged.slice(0, 5);
  }, [pinnedAnnouncements, announcements]);

  // Resolve announcement contentCid → readable text
  const announcementCids = useMemo(
    () => allAnnouncements.map((a) => a.contentCid),
    [allAnnouncements],
  );
  const { contentMap: announcementContentMap } = useIpfsContents(announcementCids);

  // Resolve disclosure summaryCid (preferred) or contentCid → readable text
  const disclosureCids = useMemo(
    () => (disclosures ?? []).map((d) => d.summaryCid || d.contentCid),
    [disclosures],
  );
  const { contentMap: disclosureContentMap } = useIpfsContents(disclosureCids);

  const hasAnnouncements = allAnnouncements.length > 0;
  const hasDisclosures = (disclosures ?? []).length > 0;

  return (
    <>
      <PageContainer>
        <div className="space-y-4">
          {/* Welcome */}
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold">
                <span className="text-muted-foreground">{t('home.welcomePrefix')}</span>{' '}
                <span className="text-primary">{entityName || t('home.welcomeDefaultName')}</span>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('home.subtitle')}
              </p>
              {member && (
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="default">LV.{member.customLevelId}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {t('home.directReferrals', { count: member.directReferrals })} | {t('home.teamSize', { count: member.teamSize })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

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
                      <Badge variant="outline" className="text-xs">
                        {order.status === 'Paid' ? t('status.paid') :
                         order.status === 'Shipped' ? t('status.shipped') :
                         order.status === 'Disputed' ? t('status.disputed') : order.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('home.quickActions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {quickActions.map((action) => (
                  <Link key={action.key} href={action.href}>
                    <div className="flex flex-col items-center gap-2 rounded-lg bg-secondary p-3 transition-colors hover:bg-secondary/80">
                      <action.icon className={`h-6 w-6 ${action.color}`} />
                      <span className="text-xs">{action.label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Products */}
          {recommendedProducts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {t('home.recommendedProducts')}
                  </span>
                  <Link href="/mall" className="text-xs font-normal text-primary">
                    {t('home.viewAll')}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {recommendedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      name={productNameMap.get(product.nameCid)}
                      loadingText={tMall('loading')}
                      dynNex={toNex(product.usdtPrice)}
                      stockUnlimitedText={tShop('stockUnlimited')}
                      stockText={(n) => tShop('stock', { count: n })}
                      soldText={(n) => tShop('sold', { count: n })}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Announcements */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Megaphone className="h-4 w-4" />
                {td('announcements')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasAnnouncements ? (
                <p className="text-sm text-muted-foreground">{td('noAnnouncements')}</p>
              ) : (
                <div className="space-y-2">
                  {allAnnouncements.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg bg-secondary p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {a.isPinned && (
                            <Pin className="h-3 w-3 shrink-0 text-warning" />
                          )}
                          {a.category === 'RiskWarning' && (
                            <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />
                          )}
                          <span className="font-medium leading-tight">{a.title}</span>
                        </div>
                        <Badge variant="outline" className={`shrink-0 text-xs ${categoryBadgeColor(a.category)}`}>
                          {td(announcementCategoryKey(a.category))}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {td('publishedAt', { block: a.publishedAt })}
                      </p>
                      {announcementContentMap.get(a.contentCid) && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                          {announcementContentMap.get(a.contentCid)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latest Disclosures */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                {td('latest')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasDisclosures ? (
                <p className="text-sm text-muted-foreground">{td('noDisclosures')}</p>
              ) : (
                <div className="space-y-2">
                  {(disclosures ?? []).map((d) => (
                    <div
                      key={d.id}
                      className="rounded-lg bg-secondary p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{td(disclosureTypeKey(d.disclosureType))}</span>
                        <Badge variant="outline" className="text-xs">
                          {td('statusPublished')}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {td('publishedAt', { block: d.disclosedAt })}
                      </p>
                      {disclosureContentMap.get(d.summaryCid || d.contentCid) && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                          {disclosureContentMap.get(d.summaryCid || d.contentCid)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
