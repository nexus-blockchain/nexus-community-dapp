'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Package } from 'lucide-react';
import { ipfsUrl } from '@/lib/utils/chain-helpers';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  cid: string | null;
  className?: string;
  iconSize?: string;
}

export function ProductImage({ cid, className, iconSize = 'h-10 w-10' }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const src = ipfsUrl(cid);

  if (!src || failed) {
    return <Package className={cn(iconSize, 'text-primary/50')} />;
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      unoptimized
      className={cn('rounded-lg object-cover', className)}
      onError={() => setFailed(true)}
    />
  );
}
