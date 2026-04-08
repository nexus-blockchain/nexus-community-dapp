'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { UsePaginationResult } from '@/hooks/use-pagination';

/**
 * Compact pagination bar: [Prev] Page 1 / 3 (10 items) [Next]
 */
export function PaginationBar<T>({
  pagination,
}: {
  pagination: UsePaginationResult<T>;
}) {
  const t = useTranslations('common');
  const { page, totalPages, totalCount, hasPrev, hasNext, goPrev, goNext } = pagination;

  if (totalCount <= 0) return null;

  return (
    <div className="flex items-center justify-between pt-3">
      <button
        disabled={!hasPrev}
        onClick={goPrev}
        className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {t('prev')}
      </button>
      <span className="text-xs text-muted-foreground">
        {t('pageOf', { page, total: totalPages })}
        <span className="ml-1.5 opacity-60">({totalCount})</span>
      </span>
      <button
        disabled={!hasNext}
        onClick={goNext}
        className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
      >
        {t('next')}
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
