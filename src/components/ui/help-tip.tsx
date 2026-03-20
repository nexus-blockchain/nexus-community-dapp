'use client';

import { useTranslations } from 'next-intl';
import { HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface HelpTipProps {
  /** i18n key under the "help" namespace, e.g. "poolReward.roundId" */
  helpKey: string;
  /** Override dialog title (defaults to help.{helpKey}.title) */
  title?: string;
  /** Icon size in px, default 14 */
  iconSize?: number;
  className?: string;
}

export function HelpTip({ helpKey, title, iconSize = 14, className }: HelpTipProps) {
  const t = useTranslations('help');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground/60 hover:text-muted-foreground transition-colors ${className ?? ''}`}
          onClick={(e) => e.stopPropagation()}
          aria-label="Help"
        >
          <HelpCircle style={{ width: iconSize, height: iconSize }} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {title ?? t(`${helpKey}.title`)}
          </DialogTitle>
          <DialogDescription className="whitespace-pre-line text-sm leading-relaxed">
            {t(`${helpKey}.body`)}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
