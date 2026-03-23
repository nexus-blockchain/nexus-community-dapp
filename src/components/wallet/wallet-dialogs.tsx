'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { copyToClipboard, readFromClipboard } from '@/lib/utils/clipboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Copy, Check, Send, QrCode, ShieldAlert } from 'lucide-react';
import { cryptoWaitReady, decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { useWalletStore } from '@/stores';
import { useTransfer } from '@/hooks/use-transfer';
import { useNexBalance } from '@/hooks/use-nex-balance';
import { formatBalance, shortAddress } from '@/lib/utils/chain-helpers';
import { validateAmount } from '@/lib/utils/amount';

async function isValidSS58(address: string): Promise<boolean> {
  try {
    await cryptoWaitReady();
    decodeAddress(address);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// QR Code Display (lazy-loaded)
// ─────────────────────────────────────────────
export function QRCodeDisplay({ value }: { value: string }) {
  const [QR, setQR] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import('qrcode.react').then((mod) => setQR(() => mod.QRCodeSVG));
  }, []);

  if (!QR) return <div className="h-[180px] w-[180px] animate-pulse rounded bg-muted" />;
  return <QR value={value} size={180} bgColor="#FFFFFF" fgColor="#000000" level="M" />;
}

// ─────────────────────────────────────────────
// Transfer Dialog
// ─────────────────────────────────────────────
export function TransferDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('wallet');
  const tTx = useTranslations('tx');
  const { address, source } = useWalletStore();
  const { data: nexBalance } = useNexBalance(address);
  const balance = nexBalance?.free ?? BigInt(0);
  const { transfer, txState, reset } = useTransfer();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const isLocal = source === 'local';

  const resetState = () => { setRecipient(''); setAmount(''); setPassword(''); setError(''); reset(); };
  const handleOpenChange = (v: boolean) => { if (!v) resetState(); onOpenChange(v); };

  const handlePaste = async () => {
    try { const text = await readFromClipboard(); if (text) setRecipient(text.trim()); } catch {}
  };

  const handleMax = () => {
    const reserve = BigInt(10 ** 11);
    const maxAmount = balance > reserve ? balance - reserve : BigInt(0);
    setAmount(formatBalance(maxAmount.toString()));
  };

  const handleTransfer = async () => {
    setError('');
    if (!recipient.trim()) { setError(t('enterRecipient')); return; }
    if (!(await isValidSS58(recipient))) { setError(t('invalidAddress')); return; }
    if (recipient === address) { setError(t('cannotSendToSelf')); return; }
    const validation = validateAmount(amount, 'NEX');
    if (!validation.valid) { setError(validation.error || ''); return; }
    if (isLocal && !password) { setError(t('enterPassword')); return; }
    const rawAmount = validation.value!;
    if (rawAmount > balance) { setError(t('insufficientBalance')); return; }
    try { await transfer(recipient.trim(), rawAmount, isLocal ? password : undefined); } catch {}
  };

  const isProcessing = ['signing', 'broadcasting', 'inBlock'].includes(txState.status);
  const isSuccess = txState.status === 'finalized';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('transferNex')}</DialogTitle>
          <DialogDescription>{t('transferDesc')}</DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="space-y-4 text-center py-4">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-success/20">
              <Check className="h-8 w-8 text-success" />
            </div>
            <p className="text-sm font-medium">{t('transferSuccess')}</p>
            {txState.hash && <p className="font-mono text-xs text-muted-foreground break-all">{t('blockHash', { hash: txState.hash })}</p>}
            <Button className="w-full" onClick={() => handleOpenChange(false)}>{t('done')}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary p-3 text-center">
              <p className="text-xs text-muted-foreground">{t('availableBalance')}</p>
              <p className="text-lg font-bold text-primary">{formatBalance(balance.toString())} NEX</p>
            </div>
            <div>
              <label className="text-sm font-medium">{t('recipientAddress')}</label>
              <div className="relative mt-1">
                <Input placeholder={t('recipientPlaceholder')} value={recipient}
                  onChange={(e) => setRecipient(e.target.value)} className="pr-16" disabled={isProcessing} />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary font-medium"
                  onClick={handlePaste}>{t('paste')}</button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t('amount')}</label>
              <div className="relative mt-1">
                <Input type="text" inputMode="decimal" placeholder="0" value={amount}
                  onChange={(e) => setAmount(e.target.value)} className="pr-16" disabled={isProcessing} />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary font-medium"
                  onClick={handleMax}>MAX</button>
              </div>
            </div>
            {isLocal && (
              <div>
                <label className="text-sm font-medium">{t('walletPassword')}</label>
                <Input type="password" autoComplete="off" placeholder={t('walletPasswordPlaceholder')} value={password}
                  onChange={(e) => setPassword(e.target.value)} className="mt-1" disabled={isProcessing} />
              </div>
            )}
            {(error || txState.error) && <p className="text-sm text-destructive">{error || txState.error}</p>}
            <Button className="w-full" onClick={handleTransfer} disabled={isProcessing}>
              {txState.status === 'signing' && tTx('signing')}
              {txState.status === 'broadcasting' && tTx('broadcasting')}
              {txState.status === 'inBlock' && tTx('inBlock')}
              {!isProcessing && t('confirmTransfer')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Receive QR Code Dialog
// ─────────────────────────────────────────────
export function ReceiveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('wallet');
  const { address } = useWalletStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    await copyToClipboard(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('receiveNex')}</DialogTitle>
          <DialogDescription>{t('receiveDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* QR Code */}
          <div className="flex justify-center">
            <div className="rounded-xl border-2 border-primary/20 bg-white p-4 shadow-sm">
              {address && <QRCodeDisplay value={address} />}
            </div>
          </div>

          {/* Address display */}
          <div>
            <p className="text-xs text-center text-muted-foreground mb-2">{t('myAddress')}</p>
            <div className="rounded-lg border bg-secondary/50 p-3">
              <p className="font-mono text-xs text-center break-all select-all">{address}</p>
            </div>
          </div>

          {/* Copy button */}
          <Button className="w-full" variant={copied ? 'outline' : 'default'} onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-2 text-success" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? t('addressCopied') : t('copyAddress')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
