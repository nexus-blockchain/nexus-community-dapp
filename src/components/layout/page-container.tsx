import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer = forwardRef<HTMLElement, PageContainerProps>(
  function PageContainer({ children, className }, ref) {
    return (
      <main ref={ref} className={cn('flex-1 overflow-y-auto px-4 py-4', className)}>
        {children}
      </main>
    );
  },
);
