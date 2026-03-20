'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/chain';
import { useWallet } from './use-wallet';
import { useWalletStore } from '@/stores/wallet-store';
import { useTransferHistoryStore } from '@/stores/transfer-history-store';
import type { TxState } from '@/lib/types';

export function useTransfer() {
  const { api } = useApi();
  const { address, source, getSigner } = useWallet();
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
          // Local wallet: sign with keypair directly
          const { cryptoWaitReady } = await import('@polkadot/util-crypto');
          const { Keyring } = await import('@polkadot/keyring');
          const { useLocalAccountsStore } = await import('@/stores/local-accounts-store');

          await cryptoWaitReady();
          const accounts = useLocalAccountsStore.getState().accounts;
          const account = accounts.find((a) => a.address === address);
          if (!account) throw new Error('Local account not found');

          const json = JSON.parse(account.encryptedJson);
          const keyring = new Keyring({ type: 'sr25519', ss58Format: 273 });
          const pair = keyring.addFromJson(json);
          pair.decodePkcs8(password);

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
    [api, address, source, isLocked, getSigner, refreshBalance, txState.status],
  );

  return { transfer, txState, reset };
}
