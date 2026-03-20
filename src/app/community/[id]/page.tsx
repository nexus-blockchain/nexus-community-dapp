'use client';

import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout/page-container';
import { MobileHeader } from '@/components/layout/mobile-header';
import { Card, CardContent } from '@/components/ui/card';

export default function CommunityDetailPage({ params }: { params: { id: string } }) {
  const t = useTranslations('community');

  return (
    <>
      <MobileHeader title={t('title', { id: params.id })} showBack />
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
