'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSigningStore } from '@/stores/signing-store';
import { useWalletStore } from '@/stores/wallet-store';
import {
  checkAttemptAllowed,
  recordFailure,
} from '@/lib/utils/brute-force-protection';

export function SigningDialog() {
  const t = useTranslations('wallet');
  const { isOpen, submitPassword, cancel } = useSigningStore();
  const address = useWalletStore((s) => s.address);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Check on open
  useEffect(() => {
    if (isOpen && address) {
      const check = checkAttemptAllowed(address);
      if (!check.allowed || check.waitSeconds > 0) {
        setCooldown(check.waitSeconds);
        if (check.errorKey) setError(t(check.errorKey, { seconds: check.waitSeconds }));
      }
    }
  }, [isOpen, address, t]);

  const handleSubmit = () => {
    if (!password) {
      setError(t('enterPassword'));
      return;
    }

    if (address) {
      const check = checkAttemptAllowed(address);
      if (!check.allowed) {
        setCooldown(check.waitSeconds);
        setError(t(check.errorKey!, { seconds: check.waitSeconds }));
        return;
      }
    }

    setError('');
    const pwd = password;
    setPassword('');
    submitPassword(pwd);
  };

  const handleCancel = () => {
    setError('');
    setPassword('');
    setCooldown(0);
    cancel();
  };

  if (!isOpen) return null;

  const isDisabled = !password || cooldown > 0;

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
            autoComplete="off"
            placeholder={t('walletPasswordPlaceholder')}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && !isDisabled && handleSubmit()}
            autoFocus
            disabled={cooldown > 0}
          />
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleCancel}>
              {t('cancel')}
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={isDisabled}>
              {cooldown > 0 ? `${t('confirmSign')} (${cooldown}s)` : t('confirmSign')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
