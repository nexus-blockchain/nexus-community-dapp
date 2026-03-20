'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, LogOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWalletStore } from '@/stores/wallet-store';
import { useLocalWallet } from '@/hooks/use-local-wallet';
import { shortAddress } from '@/lib/utils/chain-helpers';

export function UnlockDialog() {
  const t = useTranslations('wallet');
  const { address, name, isConnected, source, isLocked, unlockWallet: storeUnlock, disconnect } = useWalletStore();
  const { unlockWallet } = useLocalWallet();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const open = isLocked && isConnected && source === 'local';

  const handleUnlock = async () => {
    if (!address || !password) return;
    setError('');
    setUnlocking(true);
    try {
      await unlockWallet(address, password);
      storeUnlock();
      setPassword('');
      setError('');
    } catch {
      setError(t('unlockFailed'));
    } finally {
      setUnlocking(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setPassword('');
    setError('');
  };

  if (!open) return null;

  return (
    <Dialog open onOpenChange={() => { /* no-op: cannot dismiss */ }}>
      <DialogContent
        className="max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-2">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle>{t('walletLocked')}</DialogTitle>
          <DialogDescription className="text-center">
            {name || shortAddress(address!)} — {shortAddress(address!)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Input
              type="password"
              placeholder={t('walletPasswordPlaceholder')}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button className="w-full" onClick={handleUnlock} disabled={unlocking || !password}>
            {unlocking ? t('unlocking') : t('unlock')}
          </Button>
          <button
            className="w-full text-center text-sm text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleDisconnect}
          >
            <LogOut className="inline h-3.5 w-3.5 mr-1" />
            {t('disconnectWallet')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
