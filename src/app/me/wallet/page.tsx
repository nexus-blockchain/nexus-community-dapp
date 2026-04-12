'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { useToast } from '@/components/ui/use-toast';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Wallet, Copy, Check, LogOut, Plus, Download,
  ArrowRightLeft, Eye, EyeOff, Send, RefreshCw,
  QrCode, Key, ShieldAlert, Trash2, Lock, Coins, Loader2, ScanLine,
} from 'lucide-react';
import { useWalletStore } from '@/stores';
import { useLocalAccountsStore } from '@/stores/local-accounts-store';
import { useEntityStore } from '@/stores/entity-store';
import { useWallet } from '@/hooks/use-wallet';
import { useLocalWallet } from '@/hooks/use-local-wallet';
import { useNexBalance } from '@/hooks/use-nex-balance';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useQueryClient } from '@tanstack/react-query';
import { formatBalance, shortAddress, formatUsdt } from '@/lib/utils/chain-helpers';
import { validatePassword } from '@/lib/utils/password-validation';
import { TransferDialog, ReceiveDialog } from '@/components/wallet/wallet-dialogs';
import { useTokenBalance, useTokenMetadata, useTokenConfig } from '@/hooks/use-token';
import { useNexPrice } from '@/hooks/use-nex-price';
import { useShoppingBalance } from '@/hooks/use-loyalty';

// ─────────────────────────────────────────────
// Create Wallet Dialog
// ─────────────────────────────────────────────
function CreateWalletDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (address: string) => void;
}) {
  const t = useTranslations('wallet');
  const { createWallet } = useLocalWallet();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [walletName, setWalletName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [address, setAddress] = useState('');
  const [mnemonicCopied, setMnemonicCopied] = useState(false);
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [verifySelections, setVerifySelections] = useState<string[]>(['', '', '']);
  const [candidateWords, setCandidateWords] = useState<string[][]>([]);
  const [verifyError, setVerifyError] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const resetState = () => {
    setStep(1); setWalletName(''); setPassword(''); setConfirmPwd('');
    setShowPwd(false); setMnemonic(''); setAddress('');
    setMnemonicCopied(false); setVerifyIndices([]); setVerifySelections(['', '', '']);
    setCandidateWords([]); setVerifyError(false); setError(''); setCreating(false);
  };

  const handleOpenChange = (v: boolean) => { if (!v && creating) return; if (!v) resetState(); onOpenChange(v); };

  const handleCopyMnemonic = async () => {
    const ok = await copyToClipboard(mnemonic);
    if (ok) {
      // Clear clipboard after 30s for security
      setTimeout(() => { copyToClipboard('').catch(() => {}); }, 30_000);
    }
    setMnemonicCopied(true);
    setTimeout(() => setMnemonicCopied(false), 2000);
  };

  const handleGoToStep3 = () => {
    const words = mnemonic.split(' ');
    const indices: number[] = [];
    while (indices.length < 3) {
      const idx = Math.floor(Math.random() * words.length);
      if (!indices.includes(idx)) indices.push(idx);
    }
    indices.sort((a, b) => a - b);

    // Generate candidate word grids: 1 correct + 5 decoys from remaining mnemonic words
    const candidates = indices.map((correctIdx) => {
      const correctWord = words[correctIdx];
      const others = words.filter((_, i) => i !== correctIdx);
      // Shuffle and pick 5 decoys
      const shuffled = [...others].sort(() => Math.random() - 0.5);
      const decoys = shuffled.slice(0, 5);
      // Combine and shuffle
      return [correctWord, ...decoys].sort(() => Math.random() - 0.5);
    });

    setVerifyIndices(indices);
    setCandidateWords(candidates);
    setVerifySelections(['', '', '']);
    setVerifyError(false);
    setStep(3);
  };

  const handleVerifyAndFinish = () => {
    const words = mnemonic.split(' ');
    const allCorrect = verifyIndices.every((idx, i) => verifySelections[i] === words[idx]);
    if (!allCorrect) {
      setVerifyError(true);
      return;
    }
    onCreated(address);
    handleOpenChange(false);
  };

  const handleStep1 = async () => {
    if (!walletName.trim()) { setError(t('enterName')); return; }
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) { setError(t(pwdCheck.errorKey!)); return; }
    if (password !== confirmPwd) { setError(t('passwordMismatch')); return; }
    setError(''); setCreating(true);
    // Yield to the event loop so the spinner renders before heavy crypto work
    await new Promise((r) => setTimeout(r, 50));
    try {
      const result = await createWallet(walletName.trim(), password);
      setMnemonic(result.mnemonic); setAddress(result.address); setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('createFailed'));
    } finally { setCreating(false); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createWallet')}</DialogTitle>
          <DialogDescription>
            {step === 1 && t('setNameAndPassword')}
            {step === 2 && t('saveMnemonic')}
            {step === 3 && t('confirmMnemonic')}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 relative">
            {creating && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/80 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{t('creatingWalletHint')}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">{t('walletName')}</label>
              <Input placeholder={t('walletNamePlaceholder')} value={walletName}
                onChange={(e) => setWalletName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{t('password')}</label>
              <div className="relative mt-1">
                <Input type={showPwd ? 'text' : 'password'} autoComplete="off" placeholder={t('passwordMin8')}
                  value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPwd(!showPwd)}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t('confirmPassword')}</label>
              <Input type="password" autoComplete="off" placeholder={t('confirmPasswordPlaceholder')} value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)} className="mt-1" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={handleStep1} disabled={creating}>
              {creating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('creating')}</>
              ) : t('nextStep')}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-warning/50 bg-warning/10 p-3">
              <p className="text-xs text-warning mb-2">{t('mnemonicWarning')}</p>
              <div className="grid grid-cols-3 gap-2">
                {mnemonic.split(' ').map((word, i) => (
                  <div key={i} className="rounded bg-background px-2 py-1 text-center text-sm font-mono">
                    <span className="text-muted-foreground mr-1">{i + 1}.</span>{word}
                  </div>
                ))}
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleCopyMnemonic}>
              {mnemonicCopied ? <Check className="h-4 w-4 mr-2 text-success" /> : <Copy className="h-4 w-4 mr-2" />}
              {mnemonicCopied ? t('copiedMnemonic') : t('copyMnemonic')}
            </Button>
            <Button className="w-full" onClick={handleGoToStep3}>{t('mnemonicSaved')}</Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary p-3 text-center">
              <p className="text-sm text-muted-foreground mb-1">{t('walletAddress')}</p>
              <p className="font-mono text-xs break-all">{address}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">{t('verifyMnemonic')}</p>
              <p className="text-xs text-muted-foreground mb-3">{t('verifyMnemonicDesc')}</p>
              <div className="space-y-4">
                {verifyIndices.map((idx, i) => (
                  <div key={idx}>
                    <label className="text-sm text-muted-foreground mb-2 block">{t('wordN', { n: idx + 1 })}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(candidateWords[i] || []).map((word) => {
                        const isSelected = verifySelections[i] === word;
                        return (
                          <button
                            key={word}
                            type="button"
                            className={`rounded-lg border px-3 py-2 text-sm font-mono transition-colors ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-secondary hover:bg-secondary/80 border-transparent'
                            }`}
                            onClick={() => {
                              const next = [...verifySelections];
                              next[i] = isSelected ? '' : word;
                              setVerifySelections(next);
                              setVerifyError(false);
                            }}
                          >
                            {word}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {verifyError && <p className="text-sm text-destructive">{t('verifyFailed')}</p>}
            <Button className="w-full" onClick={handleVerifyAndFinish}>
              {t('done')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Import Wallet Dialog
// ─────────────────────────────────────────────
function ImportWalletDialog({
  open, onOpenChange, onImported,
}: {
  open: boolean; onOpenChange: (open: boolean) => void; onImported: (address: string) => void;
}) {
  const t = useTranslations('wallet');
  const { importWallet } = useLocalWallet();
  const [mnemonic, setMnemonic] = useState('');
  const [walletName, setWalletName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  const resetState = () => { setMnemonic(''); setWalletName(''); setPassword(''); setConfirmPwd(''); setError(''); setImporting(false); };
  const handleOpenChange = (v: boolean) => { if (!v && importing) return; if (!v) resetState(); onOpenChange(v); };

  const handleImport = async () => {
    if (!mnemonic.trim()) { setError(t('enterMnemonic')); return; }
    const wordCount = mnemonic.trim().split(/\s+/).length;
    if (wordCount !== 12 && wordCount !== 24) { setError(t('mnemonicWordCount')); return; }
    if (!walletName.trim()) { setError(t('enterName')); return; }
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) { setError(t(pwdCheck.errorKey!)); return; }
    if (password !== confirmPwd) { setError(t('passwordMismatch')); return; }
    setError(''); setImporting(true);
    // Yield to the event loop so the spinner renders before heavy crypto work
    await new Promise((r) => setTimeout(r, 50));
    try {
      const result = await importWallet(mnemonic.trim(), walletName.trim(), password);
      onImported(result.address); handleOpenChange(false);
    } catch (e) {
      console.error('[wallet-import] failed:', e);
      setError(t('importFailed'));
    } finally { setImporting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('importWallet')}</DialogTitle>
          <DialogDescription>{t('importDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 relative">
          {importing && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/80 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t('importingWalletHint')}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">{t('mnemonic')}</label>
            <textarea className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-none"
              placeholder={t('mnemonicPlaceholder')} value={mnemonic} onChange={(e) => setMnemonic(e.target.value)}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
          </div>
          <div>
            <label className="text-sm font-medium">{t('walletName')}</label>
            <Input placeholder={t('importedNamePlaceholder')} value={walletName}
              onChange={(e) => setWalletName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">{t('password')}</label>
            <Input type="password" autoComplete="off" placeholder={t('passwordMin8')} value={password}
              onChange={(e) => setPassword(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">{t('confirmPassword')}</label>
            <Input type="password" autoComplete="off" placeholder={t('confirmPasswordPlaceholder')} value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)} className="mt-1" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleImport} disabled={importing}>
            {importing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('importing')}</>
            ) : t('importBtn')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Export Mnemonic Dialog
// ─────────────────────────────────────────────
function ExportMnemonicDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('wallet');
  const { address } = useWalletStore();
  const { exportMnemonic } = useLocalWallet();
  const [password, setPassword] = useState('');
  const [mnemonicWords, setMnemonicWords] = useState<string[]>([]);
  const [notStored, setNotStored] = useState(false);
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [copied, setCopied] = useState(false);

  const resetState = () => { setPassword(''); setMnemonicWords([]); setNotStored(false); setError(''); setUnlocking(false); setCopied(false); };
  const handleOpenChange = (v: boolean) => { if (!v) resetState(); onOpenChange(v); };

  const handleUnlock = async () => {
    if (!address || !password) return;
    setError(''); setUnlocking(true);
    try {
      const mnemonic = await exportMnemonic(address, password);
      setMnemonicWords(mnemonic.split(' '));
    } catch (e) {
      if (e instanceof Error && e.message === 'MNEMONIC_NOT_STORED') {
        setNotStored(true);
      } else if (e instanceof Error && e.message.startsWith('ACCOUNT_LOCKED:')) {
        setError(t('accountLockedOut', { seconds: e.message.split(':')[1] }));
      } else if (e instanceof Error && e.message.startsWith('TOO_MANY_ATTEMPTS:')) {
        setError(t('tooManyAttempts', { seconds: e.message.split(':')[1] }));
      } else {
        setError(t('unlockFailed'));
      }
    } finally { setUnlocking(false); }
  };

  const handleCopy = async () => {
    await copyToClipboard(mnemonicWords.join(' '));
    setTimeout(() => { copyToClipboard('').catch(() => {}); }, 30_000);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('exportMnemonic')}</DialogTitle>
          <DialogDescription>{t('exportMnemonicDesc')}</DialogDescription>
        </DialogHeader>

        {notStored ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{t('mnemonicNotStored')}</p>
              </div>
            </div>
            <Button className="w-full" onClick={() => handleOpenChange(false)}>{t('done')}</Button>
          </div>
        ) : mnemonicWords.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive">{t('exportMnemonicWarning')}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">{t('mnemonicLabel')}</p>
              <div className="grid grid-cols-3 gap-2">
                {mnemonicWords.map((word, i) => (
                  <div key={i} className="rounded bg-secondary px-2 py-1 text-center text-sm font-mono">
                    <span className="text-muted-foreground mr-1">{i + 1}.</span>{word}
                  </div>
                ))}
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 mr-2 text-success" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? t('copiedMnemonic') : t('copyMnemonic')}
            </Button>
            <Button className="w-full" onClick={() => handleOpenChange(false)}>{t('done')}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('walletPassword')}</label>
              <Input type="password" placeholder={t('walletPasswordPlaceholder')} value={password}
                onChange={(e) => setPassword(e.target.value)} className="mt-1"
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={handleUnlock} disabled={unlocking || !password}>
              {unlocking ? t('unlocking') : t('unlock')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Wallet Management Page (ENHANCED)
// ─────────────────────────────────────────────
export default function WalletPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const { address, isConnected, name, isLocked, lockWallet, autoLockMinutes, setAutoLockMinutes } = useWalletStore();
  const { connect, disconnect } = useWallet();
  const localAccounts = useLocalAccountsStore((s) => s.accounts);
  const removeAccount = useLocalAccountsStore((s) => s.removeAccount);
  const currentAccount = localAccounts.find((acct) => acct.address === address) ?? null;
  const canExportMnemonic = !!currentAccount;
  const currentEntityId = useEntityStore((s) => s.currentEntityId);
  const queryClient = useQueryClient();

  const { data: nexBalance } = useNexBalance(address);
  const freeBalance = nexBalance?.free ?? BigInt(0);
  const reservedBalance = nexBalance?.reserved ?? BigInt(0);
  const totalBalance = freeBalance + reservedBalance;

  const { toUsdt } = useNexPrice();
  const totalUsdt = totalBalance > BigInt(0) ? toUsdt(totalBalance) : null;

  const { data: shoppingBalance } = useShoppingBalance(currentEntityId, address);

  // Entity token queries
  const { data: tokenConfig } = useTokenConfig(currentEntityId);
  const { data: tokenMeta } = useTokenMetadata(currentEntityId);
  const { data: tokenBalance } = useTokenBalance(currentEntityId, address);
  const hasToken = !!tokenConfig?.enabled && !!tokenMeta;

  const [copied, setCopied] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const handleScanQr = useCallback(() => {
    toast({ title: t('wallet.scanNotSupported'), variant: 'destructive' });
  }, [toast, t]);

  const handleRefreshBalance = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['nexBalance', address] }),
      queryClient.invalidateQueries({ queryKey: ['tokenBalance', currentEntityId, address] }),
    ]);
  }, [queryClient, address, currentEntityId]);

  const { containerRef, pullState, pullDistance } = usePullToRefresh({
    onRefresh: handleRefreshBalance,
    disabled: !isConnected,
  });

  const handleCreated = async (createdAddress: string) => {
    const accounts = useLocalAccountsStore.getState().accounts;
    const acct = accounts.find((a) => a.address === createdAddress);
    if (acct) await connect({ address: acct.address, name: acct.name, source: 'local' });
  };

  const handleImported = async (importedAddress: string) => {
    const accounts = useLocalAccountsStore.getState().accounts;
    const acct = accounts.find((a) => a.address === importedAddress);
    if (acct) await connect({ address: acct.address, name: acct.name, source: 'local' });
  };

  const handleCopy = async () => {
    if (!address) return;
    await copyToClipboard(address);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <MobileHeader title={t('profile.walletManagement')} showBack />
      <PageContainer ref={containerRef}>
        {/* Pull-to-refresh indicator */}
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200 ease-out"
          style={{ height: pullDistance > 0 ? pullDistance : 0 }}
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className={`h-4 w-4 transition-transform ${
              pullState === 'refreshing' ? 'animate-spin' :
              pullState === 'ready' ? 'rotate-180' : ''
            }`} />
            <span>
              {pullState === 'refreshing' ? t('wallet.refreshing') :
               pullState === 'ready' ? t('wallet.releaseToRefresh') :
               t('wallet.pullToRefresh')}
            </span>
          </div>
        </div>
        <div className="space-y-4">
          {isConnected ? (
            <>
              {/* Gradient wallet card (borrowed from Stardust) */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-5 text-primary-foreground shadow-lg">
                {/* Decorative circles */}
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/5" />

                {/* Wallet name + source badge */}
                <div className="relative flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium opacity-90">{name || shortAddress(address!)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20">
                    {t('wallet.local')}
                  </span>
                </div>

                {/* Balance */}
                <div className="relative mt-2 mb-4 space-y-1">
                  <p className="text-2xl font-bold tracking-tight">
                    {formatBalance(totalBalance.toString())} <span className="text-base font-normal opacity-80">NEX</span>
                    {totalUsdt && <span className="text-sm font-normal opacity-70 ml-2">≈ ${formatUsdt(totalUsdt)} USDT</span>}
                  </p>
                  <div className="flex items-center gap-4 text-xs opacity-80">
                    <span>{t('wallet.freeBalance')}: {formatBalance(freeBalance.toString())}</span>
                    <span>{t('wallet.reservedBalance')}: {formatBalance(reservedBalance.toString())}</span>
                    <span>{t('wallet.shoppingBalance')}: {formatBalance(shoppingBalance ?? '0')}</span>
                  </div>
                </div>

                {/* Address row */}
                <div className="relative flex items-center gap-2">
                  <span className="font-mono text-xs opacity-70 break-all">{address}</span>
                  <button className="opacity-70 hover:opacity-100 transition-opacity" onClick={handleCopy}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Quick action buttons */}
              <div className="grid gap-2 grid-cols-5">
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => setShowTransfer(true)}>
                  <Send className="h-5 w-5 text-primary" />
                  <span className="text-[11px]">{t('wallet.transfer')}</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => setShowReceive(true)}>
                  <QrCode className="h-5 w-5 text-green-600" />
                  <span className="text-[11px]">{t('wallet.receive')}</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={handleScanQr}>
                  <ScanLine className="h-5 w-5 text-purple-600" />
                  <span className="text-[11px]">{t('wallet.scanQr')}</span>
                </Button>
                {canExportMnemonic && (
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => setShowExport(true)}>
                    <Key className="h-5 w-5 text-amber-600" />
                    <span className="text-[11px]">{t('wallet.exportMnemonic')}</span>
                  </Button>
                )}
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={lockWallet}>
                  <Lock className="h-5 w-5 text-red-600" />
                  <span className="text-[11px]">{t('wallet.lockWallet')}</span>
                </Button>
              </div>

              {/* Add wallet */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium">{t('wallet.addWallet')}</p>
                  <div className="grid gap-2 grid-cols-2">
                    <Button variant="default" size="sm" className="w-full" onClick={() => setShowCreate(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />{t('wallet.create')}
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setShowImport(true)}>
                      <Download className="h-3.5 w-3.5 mr-1" />{t('wallet.import')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet management */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{t('wallet.cachedWallets')}</span>
                  </div>
                  {localAccounts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">{t('wallet.noCachedWallets')}</p>
                  ) : (
                    <div className="space-y-2">
                      {localAccounts.map((acct) => {
                        const isCurrent = acct.address === address;
                        return (
                          <div
                            key={acct.address}
                            className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${isCurrent ? 'bg-primary/10 border border-primary/30' : 'bg-secondary'}`}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                              {acct.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">{acct.name}</span>
                                {isCurrent && (
                                  <Badge variant="default" className="text-[10px] px-1.5 py-0">{t('wallet.currentlyConnected')}</Badge>
                                )}
                              </div>
                              <p className="font-mono text-xs text-muted-foreground">{shortAddress(acct.address)}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!isCurrent && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0 text-xs"
                                  onClick={() => connect({ address: acct.address, name: acct.name, source: 'local' })}
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {!isCurrent && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    if (confirm(t('wallet.deleteConfirm'))) {
                                      removeAccount(acct.address);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {isCurrent && <Check className="h-4 w-4 text-primary" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Entity Token Holdings */}
              {hasToken && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Coins className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">{t('wallet.tokenHoldings')}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 font-bold text-sm">
                          {tokenMeta!.symbol.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tokenMeta!.name}</p>
                          <p className="text-xs text-muted-foreground">{tokenMeta!.symbol}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatBalance(tokenBalance ?? '0', tokenMeta!.decimals || 12)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Auto-lock setting */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{t('wallet.autoLock')}</span>
                    </div>
                    <select
                      className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                      value={autoLockMinutes}
                      onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                    >
                      <option value={1}>{t('wallet.autoLock1Min')}</option>
                      <option value={5}>{t('wallet.autoLock5Min')}</option>
                      <option value={15}>{t('wallet.autoLock15Min')}</option>
                      <option value={30}>{t('wallet.autoLock30Min')}</option>
                      <option value={0}>{t('wallet.autoLockNever')}</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Disconnect */}
              <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={disconnect}>
                <LogOut className="h-4 w-4 mr-2" />{t('wallet.disconnect')}
              </Button>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                    <Wallet className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm font-medium">{t('profile.notConnected')}</p>
                  <p className="text-xs text-muted-foreground text-center">{t('profile.notConnectedDesc')}</p>
                </div>
                <div className="grid gap-2 grid-cols-2">
                  <Button variant="default" size="sm" className="w-full" onClick={() => setShowCreate(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />{t('wallet.create')}
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setShowImport(true)}>
                    <Download className="h-3.5 w-3.5 mr-1" />{t('wallet.import')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>

      <CreateWalletDialog open={showCreate} onOpenChange={setShowCreate} onCreated={handleCreated} />
      <ImportWalletDialog open={showImport} onOpenChange={setShowImport} onImported={handleImported} />
      <TransferDialog open={showTransfer} onOpenChange={setShowTransfer} />
      <ReceiveDialog open={showReceive} onOpenChange={setShowReceive} />
      <ExportMnemonicDialog open={showExport} onOpenChange={setShowExport} />
    </>
  );
}
