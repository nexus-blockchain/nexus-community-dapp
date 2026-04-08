'use client';

import { useTranslations } from 'next-intl';
import { PageContainer } from '@/components/layout/page-container';
import { MobileHeader } from '@/components/layout/mobile-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Blocks, Users, ShoppingBag, Coins, Shield, ExternalLink,
} from 'lucide-react';

const APP_VERSION = '0.1.0';

const FEATURES = [
  { key: 'Decentralized', icon: Blocks },
  { key: 'Community', icon: Users },
  { key: 'Commerce', icon: ShoppingBag },
  { key: 'Token', icon: Coins },
] as const;

export default function AboutPage() {
  const t = useTranslations('about');

  return (
    <>
      <MobileHeader title={t('title')} showBack />
      <PageContainer>
        <div className="space-y-4">
          {/* Hero */}
          <div className="flex flex-col items-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 mb-3">
              <Blocks className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold">{t('projectName')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('slogan')}</p>
            <Badge variant="secondary" className="mt-3">v{APP_VERSION}</Badge>
          </div>

          {/* Description */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t('description')}
              </p>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('features')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {FEATURES.map(({ key, icon: Icon }) => (
                <div key={key} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t(`feature${key}`)}</p>
                    <p className="text-xs text-muted-foreground">{t(`feature${key}Desc`)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                {t('disclaimer')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('disclaimerText')}
              </p>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
