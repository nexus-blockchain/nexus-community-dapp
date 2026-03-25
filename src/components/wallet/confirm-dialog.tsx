'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useConfirmStore } from '@/stores/confirm-store';

export function ConfirmDialog() {
  const t = useTranslations('wallet');
  const { isOpen, config, confirm, cancel } = useConfirmStore();

  if (!isOpen || !config) return null;

  return (
    <Dialog open onOpenChange={() => cancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mb-2">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription className="text-center">
            {config.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={cancel}>
            {config.cancelLabel || t('cancel')}
          </Button>
          <Button variant="destructive" className="flex-1" onClick={confirm}>
            {config.confirmLabel || t('confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
