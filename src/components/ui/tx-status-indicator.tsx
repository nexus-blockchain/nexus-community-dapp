'use client';

import { useTranslations } from 'next-intl';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { isTxBusy } from '@/lib/utils/chain-helpers';
import type { TxState } from '@/lib/types';

interface TxStatusIndicatorProps {
  txState: TxState;
  successMessage?: string;
}

export function TxStatusIndicator({ txState, successMessage }: TxStatusIndicatorProps) {
  const tTx = useTranslations('tx');
  if (txState.status === 'idle') return null;
  const isBusy = isTxBusy(txState);
  return (
    <div className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-sm">
      {isBusy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      {txState.status === 'finalized' && <Check className="h-4 w-4 text-success" />}
      {txState.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
      <span>
        {txState.status === 'signing' && tTx('signingPleaseWait')}
        {txState.status === 'broadcasting' && tTx('broadcasting')}
        {txState.status === 'inBlock' && tTx('inBlockWaiting')}
        {txState.status === 'finalized' && (successMessage || tTx('success'))}
        {txState.status === 'error' && (txState.error || tTx('operationFailed'))}
      </span>
    </div>
  );
}
