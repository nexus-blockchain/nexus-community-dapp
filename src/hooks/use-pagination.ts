import { useMemo, useState, useCallback } from 'react';

const DEFAULT_PAGE_SIZE = 10;

export interface UsePaginationResult<T> {
  /** Current page items */
  pageItems: T[];
  /** Current page (1-based) */
  page: number;
  /** Total pages */
  totalPages: number;
  /** Total item count */
  totalCount: number;
  /** Whether there is a previous page */
  hasPrev: boolean;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Go to previous page */
  goPrev: () => void;
  /** Go to next page */
  goNext: () => void;
  /** Go to a specific page (1-based) */
  goTo: (page: number) => void;
  /** Reset to first page */
  reset: () => void;
}

/**
 * Client-side pagination for a sorted array.
 * Automatically resets to page 1 when items change.
 */
export function usePagination<T>(
  items: T[],
  pageSize: number = DEFAULT_PAGE_SIZE,
): UsePaginationResult<T> {
  const [page, setPage] = useState(1);

  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Clamp page if items shrink
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const hasPrev = safePage > 1;
  const hasNext = safePage < totalPages;

  const goPrev = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const goNext = useCallback(() => {
    setPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const goTo = useCallback(
    (target: number) => {
      setPage(Math.max(1, Math.min(target, totalPages)));
    },
    [totalPages],
  );

  const reset = useCallback(() => {
    setPage(1);
  }, []);

  return {
    pageItems,
    page: safePage,
    totalPages,
    totalCount,
    hasPrev,
    hasNext,
    goPrev,
    goNext,
    goTo,
    reset,
  };
}
