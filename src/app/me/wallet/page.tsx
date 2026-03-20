'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
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
  QrCode, Key, Pencil, ShieldAlert, Trash2, Lock,
} from 'lucide-react';
import { useWalletStore } from '@/stores';
import { useLocalAccountsStore } from '@/stores/local-accounts-store';
import { useWallet, type UnifiedAccount } from '@/hooks/use-wallet';
import { useLocalWallet } from '@/hooks/use-local-wallet';
import { useNexBalance } from '@/hooks/use-nex-balance';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useQueryClient } from '@tanstack/react-query';
import { formatBalance, shortAddress } from '@/lib/utils/chain-helpers';
import { TransferDialog, ReceiveDialog } from '@/components/wallet/wallet-dialogs';

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
  const [verifyInputs, setVerifyInputs] = useState<string[]>(['', '', '']);
  const [verifyError, setVerifyError] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const resetState = () => {
    setStep(1); setWalletName(''); setPassword(''); setConfirmPwd('');
    setShowPwd(false); setMnemonic(''); setAddress('');
    setMnemonicCopied(false); setVerifyIndices([]); setVerifyInputs(['', '', '']);
    setVerifyError(false); setError(''); setCreating(false);
  };

  const handleOpenChange = (v: boolean) => { if (!v) resetState(); onOpenChange(v); };

  const handleCopyMnemonic = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(mnemonic);
    } else {
      const ta = Object.assign(document.createElement('textarea'), { value: mnemonic, style: 'position:fixed;opacity:0' });
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
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
    setVerifyIndices(indices);
    setVerifyInputs(['', '', '']);
    setVerifyError(false);
    setStep(3);
  };

  const handleVerifyAndFinish = () => {
    const words = mnemonic.split(' ');
    const allCorrect = verifyIndices.every((idx, i) => verifyInputs[i].trim().toLowerCase() === words[idx].toLowerCase());
    if (!allCorrect) {
      setVerifyError(true);
      return;
    }
    onCreated(address);
    handleOpenChange(false);
  };

  const handleStep1 = async () => {
    if (!walletName.trim()) { setError(t('enterName')); return; }
    if (password.length < 6) { setError(t('passwordTooShort')); return; }
    if (password !== confirmPwd) { setError(t('passwordMismatch')); return; }
    setError(''); setCreating(true);
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
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('walletName')}</label>
              <Input placeholder={t('walletNamePlaceholder')} value={walletName}
                onChange={(e) => setWalletName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">{t('password')}</label>
              <div className="relative mt-1">
                <Input type={showPwd ? 'text' : 'password'} placeholder={t('passwordMin6')}
                  value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPwd(!showPwd)}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t('confirmPassword')}</label>
              <Input type="password" placeholder={t('confirmPasswordPlaceholder')} value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)} className="mt-1" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={handleStep1} disabled={creating}>
              {creating ? t('creating') : t('nextStep')}
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
              <div className="space-y-3">
                {verifyIndices.map((idx, i) => (
                  <div key={idx}>
                    <label className="text-sm text-muted-foreground">{t('wordN', { n: idx + 1 })}</label>
                    <Input
                      className="mt-1"
                      placeholder={t('wordN', { n: idx + 1 })}
                      value={verifyInputs[i]}
                      onChange={(e) => {
                        const next = [...verifyInputs];
                        next[i] = e.target.value;
                        setVerifyInputs(next);
                        setVerifyError(false);
                      }}
                    />
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
  const handleOpenChange = (v: boolean) => { if (!v) resetState(); onOpenChange(v); };

  const handleImport = async () => {
    if (!mnemonic.trim()) { setError(t('enterMnemonic')); return; }
    const wordCount = mnemonic.trim().split(/\s+/).length;
    if (wordCount !== 12 && wordCount !== 24) { setError(t('mnemonicWordCount')); return; }
    if (!walletName.trim()) { setError(t('enterName')); return; }
    if (password.length < 6) { setError(t('passwordTooShort')); return; }
    if (password !== confirmPwd) { setError(t('passwordMismatch')); return; }
    setError(''); setImporting(true);
    try {
      const result = await importWallet(mnemonic.trim(), walletName.trim(), password);
      onImported(result.address); handleOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('importFailed'));
    } finally { setImporting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('importWallet')}</DialogTitle>
          <DialogDescription>{t('importDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t('mnemonic')}</label>
            <textarea className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-none"
              placeholder={t('mnemonicPlaceholder')} value={mnemonic} onChange={(e) => setMnemonic(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">{t('walletName')}</label>
            <Input placeholder={t('importedNamePlaceholder')} value={walletName}
              onChange={(e) => setWalletName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">{t('password')}</label>
            <Input type="password" placeholder={t('passwordMin6')} value={password}
              onChange={(e) => setPassword(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">{t('confirmPassword')}</label>
            <Input type="password" placeholder={t('confirmPasswordPlaceholder')} value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)} className="mt-1" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleImport} disabled={importing}>
            {importing ? t('importing') : t('importBtn')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Switch Account Dialog (with rename support)
// ─────────────────────────────────────────────
function SwitchAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('wallet');
  const { address: activeAddress, connect, getAccounts } = useWallet();
  const renameAccount = useLocalAccountsStore((s) => s.renameAccount);
  const removeAccount = useLocalAccountsStore((s) => s.removeAccount);
  const [accounts, setAccounts] = useState<UnifiedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [renamingAddress, setRenamingAddress] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingAddress, setDeletingAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getAccounts().then(setAccounts).finally(() => setLoading(false));
  }, [open, getAccounts]);

  const handleSwitch = async (account: UnifiedAccount) => {
    setSwitching(account.address);
    try { await connect(account); onOpenChange(false); } catch (e) { console.error('Switch failed:', e); }
    finally { setSwitching(null); }
  };

  const handleRenameStart = (account: UnifiedAccount) => {
    setRenamingAddress(account.address);
    setRenameValue(account.name);
  };

  const handleRenameConfirm = () => {
    if (!renamingAddress || !renameValue.trim()) return;
    renameAccount(renamingAddress, renameValue.trim());
    // Update account in local list
    setAccounts((prev) =>
      prev.map((a) => a.address === renamingAddress ? { ...a, name: renameValue.trim() } : a)
    );
    // If the renamed account is currently connected, update the wallet store
    if (renamingAddress === activeAddress) {
      useWalletStore.getState().setWallet(renamingAddress, renameValue.trim(), 'local');
    }
    setRenamingAddress(null);
    setRenameValue('');
  };

  const handleDeleteConfirm = (address: string) => {
    removeAccount(address);
    setAccounts((prev) => prev.filter((a) => a.address !== address));
    setDeletingAddress(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('switchAccountTitle')}</DialogTitle>
          <DialogDescription>{t('switchAccountDesc')}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t('loading')}</div>
          ) : accounts.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t('noAccounts')}</div>
          ) : (
            accounts.map((account) => {
              const isActive = account.address === activeAddress;
              const isRenaming = renamingAddress === account.address;
              return (
                <div key={`${account.source}-${account.address}`}
                  className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${isActive ? 'bg-primary/10 border border-primary/30' : 'bg-secondary'}`}>
                  <button
                    className="flex flex-1 items-center gap-3 text-left min-w-0"
                    onClick={() => !isActive && handleSwitch(account)}
                    disabled={isActive || switching === account.address}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                      {account.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <div className="flex items-center gap-1">
                          <Input
                            className="h-7 text-sm"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleRenameConfirm}>
                            <Check className="h-3.5 w-3.5 text-success" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{account.name}</span>
                            <Badge variant={account.source === 'local' ? 'default' : 'outline'} className="text-[10px] px-1.5 py-0">
                              {account.source === 'local' ? t('local') : account.source}
                            </Badge>
                          </div>
                          <p className="font-mono text-xs text-muted-foreground">{shortAddress(account.address)}</p>
                        </>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {deletingAddress === account.address ? (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingAddress(null)}>
                          <span className="text-xs">{t('cancel')}</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteConfirm(account.address)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        {account.source === 'local' && !isRenaming && (
                          <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => handleRenameStart(account)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {account.source === 'local' && !isActive && !isRenaming && (
                          <button className="p-1 text-muted-foreground hover:text-destructive" onClick={() => setDeletingAddress(account.address)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isActive && <Check className="h-4 w-4 text-primary" />}
                        {switching === account.address && <RefreshCw className="h-4 w-4 animate-spin" />}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Export Mnemonic Dialog (NEW - borrowed from Stardust)
// ─────────────────────────────────────────────
function ExportMnemonicDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('wallet');
  const { address, source } = useWalletStore();
  const { unlockWallet } = useLocalWallet();
  const [password, setPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [mnemonicCopied, setMnemonicCopied] = useState(false);
  const isLocal = source === 'local';

  const resetState = () => { setPassword(''); setMnemonic(''); setError(''); setUnlocking(false); setMnemonicCopied(false); };
  const handleOpenChange = (v: boolean) => { if (!v) resetState(); onOpenChange(v); };

  const handleUnlock = async () => {
    if (!address || !password) return;
    setError(''); setUnlocking(true);
    try {
      const pair = await unlockWallet(address, password);
      const json = pair.toJson(password);
      setMnemonic(JSON.stringify(json, null, 2));
    } catch {
      setError(t('unlockFailed'));
    } finally { setUnlocking(false); }
  };

  const handleCopyMnemonic = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(mnemonic);
    } else {
      const ta = Object.assign(document.createElement('textarea'), { value: mnemonic, style: 'position:fixed;opacity:0' });
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setMnemonicCopied(true);
    setTimeout(() => setMnemonicCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('exportMnemonic')}</DialogTitle>
          <DialogDescription>{t('exportMnemonicDesc')}</DialogDescription>
        </DialogHeader>

        {!isLocal ? (
          <div className="py-6 text-center">
            <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">{t('exportNotLocal')}</p>
          </div>
        ) : mnemonic ? (
          <div className="space-y-4">
            {/* Warning */}
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive">{t('exportWarning')}</p>
              </div>
            </div>
            {/* JSON backup data */}
            <div>
              <p className="text-sm font-medium mb-2">{t('mnemonicLabel')}</p>
              <div className="rounded-lg border bg-secondary/50 p-3 max-h-[200px] overflow-y-auto">
                <pre className="font-mono text-[10px] break-all whitespace-pre-wrap select-all">{mnemonic}</pre>
              </div>
            </div>
            {/* Copy */}
            <Button variant="outline" className="w-full" onClick={handleCopyMnemonic}>
              {mnemonicCopied ? <Check className="h-4 w-4 mr-2 text-success" /> : <Copy className="h-4 w-4 mr-2" />}
              {mnemonicCopied ? t('copiedMnemonic') : t('copyMnemonic')}
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
  const { address, isConnected, source, name, isLocked, lockWallet, autoLockMinutes, setAutoLockMinutes } = useWalletStore();
  const { getExtensionAccounts, connectExtension, connect, disconnect } = useWallet();
  const queryClient = useQueryClient();

  const { data: nexBalance } = useNexBalance(address);
  const freeBalance = nexBalance?.free ?? BigInt(0);
  const reservedBalance = nexBalance?.reserved ?? BigInt(0);
  const totalBalance = freeBalance + reservedBalance;

  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const isLocal = source === 'local';

  const handleRefreshBalance = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['nexBalance', address] });
  }, [queryClient, address]);

  const { containerRef, pullState, pullDistance } = usePullToRefresh({
    onRefresh: handleRefreshBalance,
    disabled: !isConnected,
  });

  const handleConnectExtension = async () => {
    setConnecting(true);
    try {
      const accounts = await getExtensionAccounts();
      if (accounts.length > 0) { await connectExtension(accounts[0]); }
      else { alert(t('wallet.noExtension')); }
    } catch (e) { console.error('Wallet connection failed:', e); }
    finally { setConnecting(false); }
  };

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

  const handleCopy = () => {
    if (!address) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(address);
    } else {
      const ta = Object.assign(document.createElement('textarea'), { value: address, style: 'position:fixed;opacity:0' });
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
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
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isLocal ? 'bg-white/20' : 'bg-white/10 border border-white/20'}`}>
                    {isLocal ? t('wallet.local') : source}
                  </span>
                </div>

                {/* Balance */}
                <div className="relative mt-2 mb-4 space-y-1">
                  <p className="text-2xl font-bold tracking-tight">{formatBalance(totalBalance.toString())} <span className="text-base font-normal opacity-80">NEX</span></p>
                  <div className="flex items-center gap-4 text-xs opacity-80">
                    <span>{t('wallet.freeBalance')}: {formatBalance(freeBalance.toString())}</span>
                    <span>{t('wallet.reservedBalance')}: {formatBalance(reservedBalance.toString())}</span>
                  </div>
                </div>

                {/* Address row */}
                <div className="relative flex items-center gap-2">
                  <span className="font-mono text-xs opacity-70">{shortAddress(address!, 8)}</span>
                  <button className="opacity-70 hover:opacity-100 transition-opacity" onClick={handleCopy}>
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Quick action buttons */}
              <div className={`grid gap-2 ${isLocal ? 'grid-cols-5' : 'grid-cols-4'}`}>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => setShowTransfer(true)}>
                  <Send className="h-5 w-5 text-primary" />
                  <span className="text-[11px]">{t('wallet.transfer')}</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => setShowReceive(true)}>
                  <QrCode className="h-5 w-5 text-green-600" />
                  <span className="text-[11px]">{t('wallet.receive')}</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => setShowSwitch(true)}>
                  <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                  <span className="text-[11px]">{t('wallet.switchAccount')}</span>
                </Button>
                {isLocal && (
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={() => setShowExport(true)}>
                    <Key className="h-5 w-5 text-amber-600" />
                    <span className="text-[11px]">{t('wallet.exportMnemonic')}</span>
                  </Button>
                )}
                {isLocal && (
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" onClick={lockWallet}>
                    <Lock className="h-5 w-5 text-red-600" />
                    <span className="text-[11px]">{t('wallet.lockWallet')}</span>
                  </Button>
                )}
                {!isLocal && (
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1.5" disabled>
                    <Key className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{t('wallet.exportMnemonic')}</span>
                  </Button>
                )}
              </div>

              {/* Add wallet */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium">{t('wallet.addWallet')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="default" size="sm" className="w-full" onClick={() => setShowCreate(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />{t('wallet.create')}
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setShowImport(true)}>
                      <Download className="h-3.5 w-3.5 mr-1" />{t('wallet.import')}
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" onClick={handleConnectExtension} disabled={connecting}>
                      <Wallet className="h-3.5 w-3.5 mr-1" />{connecting ? t('wallet.connecting') : t('wallet.extension')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Auto-lock setting (local wallet only) */}
              {isLocal && (
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
              )}

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
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="default" size="sm" className="w-full" onClick={() => setShowCreate(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />{t('wallet.create')}
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setShowImport(true)}>
                    <Download className="h-3.5 w-3.5 mr-1" />{t('wallet.import')}
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" onClick={handleConnectExtension} disabled={connecting}>
                    <Wallet className="h-3.5 w-3.5 mr-1" />{connecting ? t('wallet.connecting') : t('wallet.extension')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>

      <CreateWalletDialog open={showCreate} onOpenChange={setShowCreate} onCreated={handleCreated} />
      <ImportWalletDialog open={showImport} onOpenChange={setShowImport} onImported={handleImported} />
      <SwitchAccountDialog open={showSwitch} onOpenChange={setShowSwitch} />
      <TransferDialog open={showTransfer} onOpenChange={setShowTransfer} />
      <ReceiveDialog open={showReceive} onOpenChange={setShowReceive} />
      <ExportMnemonicDialog open={showExport} onOpenChange={setShowExport} />
    </>
  );
}
