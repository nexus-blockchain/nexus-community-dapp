'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface MobileHeaderProps {
  title: string;
  className?: string;
  right?: React.ReactNode;
  showBack?: boolean;
}

export function MobileHeader({ title, className, right, showBack }: MobileHeaderProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/85',
        className
      )}
    >
      <div className="flex items-center gap-1">
        {showBack && (
          <button type="button" className="-ml-2 p-2.5 text-muted-foreground" onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push('/');
          }}>
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-base font-semibold">{title}</h1>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  );
}
