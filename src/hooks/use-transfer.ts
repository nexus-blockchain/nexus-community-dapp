'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/chain';
import { useWallet } from './use-wallet';
import { useLocalWallet } from './use-local-wallet';
import { useWalletStore } from '@/stores/wallet-store';
import { useTransferHistoryStore } from '@/stores/transfer-history-store';
import {
  recordFailure,
  recordSuccess,
} from '@/lib/utils/brute-force-protection';
import type { TxState } from '@/lib/types';

export function useTransfer() {
  const { api } = useApi();
  const { address, source, getSigner } = useWallet();
  const { unlockWallet } = useLocalWallet();
  const isLocked = useWalletStore((s) => s.isLocked);
  const queryClient = useQueryClient();
  const [txState, setTxState] = useState<TxState>({
    status: 'idle',
    hash: null,
    error: null,
    blockNumber: null,
  });

  const reset = useCallback(() => {
    setTxState({ status: 'idle', hash: null, error: null, blockNumber: null });
  }, []);

  /** Invalidate the React Query balance cache after tx finalized */
  const refreshBalance = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['nexBalance', address] });
  }, [queryClient, address]);

  const transfer = useCallback(
    async (to: string, amount: bigint, password?: string) => {
      if (!api || !address) {
        setTxState({ status: 'error', hash: null, error: 'API or wallet not connected', blockNumber: null });
        return;
      }

      if (isLocked && source === 'local') {
        setTxState({ status: 'error', hash: null, error: 'Wallet is locked', blockNumber: null });
        return;
      }

      try {
        setTxState({ status: 'signing', hash: null, error: null, blockNumber: null });

        const tx = api.tx.balances.transferKeepAlive(to, amount);

        if (source === 'local' && password) {
          // Local wallet: unlock keypair via shared utility
          let pair;
          try {
            pair = await unlockWallet(address, password);
          } catch {
            recordFailure(address);
            throw new Error('Wrong password');
          }
          recordSuccess(address);

          setTxState((prev) => ({ ...prev, status: 'broadcasting' }));

          await new Promise<void>((resolve, reject) => {
            tx.signAndSend(pair, ({ status, dispatchError }: any) => {
              if (status.isInBlock) {
                setTxState({ status: 'inBlock', hash: status.asInBlock.toHex(), error: null, blockNumber: null });
              }
              if (status.isFinalized) {
                const blockHash = status.asFinalized.toHex();
                if (dispatchError) {
                  let errorMsg = 'Transaction failed';
                  if (dispatchError.isModule) {
                    const decoded = api.registry.findMetaError(dispatchError.asModule);
                    errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                  }
                  setTxState({ status: 'error', hash: blockHash, error: errorMsg, blockNumber: null });
                  reject(new Error(errorMsg));
                  return;
                }
                setTxState({ status: 'finalized', hash: blockHash, error: null, blockNumber: null });
                useTransferHistoryStore.getState().addRecord({
                  from: address, to, amount: amount.toString(), hash: blockHash, timestamp: Date.now(),
                });
                refreshBalance();
                resolve();
              }
            }).catch((err: Error) => {
              setTxState({ status: 'error', hash: null, error: err.message, blockNumber: null });
              reject(err);
            });
          });
        } else {
          // Extension wallet: use signer
          const signer = await getSigner();
          setTxState((prev) => ({ ...prev, status: 'broadcasting' }));

          await new Promise<void>((resolve, reject) => {
            tx.signAndSend(address, { signer }, ({ status, dispatchError }: any) => {
              if (status.isInBlock) {
                setTxState({ status: 'inBlock', hash: status.asInBlock.toHex(), error: null, blockNumber: null });
              }
              if (status.isFinalized) {
                const blockHash = status.asFinalized.toHex();
                if (dispatchError) {
                  let errorMsg = 'Transaction failed';
                  if (dispatchError.isModule) {
                    const decoded = api.registry.findMetaError(dispatchError.asModule);
                    errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                  }
                  setTxState({ status: 'error', hash: blockHash, error: errorMsg, blockNumber: null });
                  reject(new Error(errorMsg));
                  return;
                }
                setTxState({ status: 'finalized', hash: blockHash, error: null, blockNumber: null });
                useTransferHistoryStore.getState().addRecord({
                  from: address, to, amount: amount.toString(), hash: blockHash, timestamp: Date.now(),
                });
                refreshBalance();
                resolve();
              }
            }).catch((err: Error) => {
              setTxState({ status: 'error', hash: null, error: err.message, blockNumber: null });
              reject(err);
            });
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        if (txState.status !== 'error') {
          setTxState({ status: 'error', hash: null, error: errorMsg, blockNumber: null });
        }
      }
    },
    [api, address, source, isLocked, getSigner, unlockWallet, refreshBalance, txState.status],
  );

  return { transfer, txState, reset };
}
