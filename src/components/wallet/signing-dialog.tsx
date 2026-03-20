'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSigningStore } from '@/stores/signing-store';

export function SigningDialog() {
  const t = useTranslations('wallet');
  const { isOpen, submitPassword, cancel } = useSigningStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!password) {
      setError(t('enterPassword'));
      return;
    }
    setError('');
    setPassword('');
    submitPassword(password);
  };

  const handleCancel = () => {
    setError('');
    setPassword('');
    cancel();
  };

  if (!isOpen) return null;

  return (
    <Dialog open onOpenChange={() => handleCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-2">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle>{t('signTransactionTitle')}</DialogTitle>
          <DialogDescription className="text-center">
            {t('signTransactionDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Input
            type="password"
            placeholder={t('walletPasswordPlaceholder')}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleCancel}>
              {t('cancel')}
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={!password}>
              {t('confirmSign')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
