'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { MobileHeader } from '@/components/layout/mobile-header';
import { Card, CardContent } from '@/components/ui/card';

export default function CommunityDetailClient({ params }: { params: { id: string } }) {
  const t = useTranslations('community');
  const pathname = usePathname();
  // In Capacitor SPA fallback, params.id is statically "0" from build time.
  // Extract the real ID from the URL pathname instead.
  const communityId = pathname.split('/').filter(Boolean)[1] ?? params.id;

  return (
    <>
      <MobileHeader title={t('title', { id: communityId })} showBack />
      <PageContainer>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('comingSoon')}</p>
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
