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
        'sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-white/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/85',
        className
      )}
    >
      <div className="flex items-center gap-1">
        {showBack && (
          <button type="button" className="-ml-2 p-1 text-muted-foreground" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-base font-semibold">{title}</h1>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  );
}
