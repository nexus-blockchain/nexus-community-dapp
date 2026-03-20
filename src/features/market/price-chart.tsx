'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TradeRecord } from '@/lib/types';

interface PriceChartProps {
  trades: TradeRecord[] | undefined;
}

export function PriceChart({ trades }: PriceChartProps) {
  const t = useTranslations('market');

  const chartData = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    // trades are already in reverse chronological order from hook, reverse for chart (oldest first)
    return [...trades].reverse().map((tr) => ({
      block: tr.blockNumber,
      price: Number(BigInt(tr.price)) / 1e12,
    }));
  }, [trades]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('priceChart')}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-32 items-center justify-center">
          <p className="text-xs text-muted-foreground">{t('noChartData')}</p>
        </CardContent>
      </Card>
    );
  }

  const prices = chartData.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const pad = (maxPrice - minPrice) * 0.1 || 0.0001;

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm">{t('priceChart')}</CardTitle>
      </CardHeader>
      <CardContent className="px-1 pb-2">
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="block"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[minPrice - pad, maxPrice + pad]}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={50}
              tickFormatter={(v: number) => v.toFixed(2)}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                fontSize: '12px',
                color: 'hsl(var(--foreground))',
              }}
              formatter={(v: number) => [v.toFixed(0), 'NEX']}
              labelFormatter={(label: number) => `Block #${label}`}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
