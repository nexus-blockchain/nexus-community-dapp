'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ApiPromise } from '@polkadot/api';
import { useApi } from '@/lib/chain';
import { useWallet } from './use-wallet';
import { useLocalWallet } from './use-local-wallet';
import { useWalletStore } from '@/stores/wallet-store';
import { useSigningStore } from '@/stores/signing-store';
import { parseDispatchError } from '@/lib/chain/error-parser';
import type { TxState, ConfirmDialogConfig } from '@/lib/types';
import { DANGEROUS_OPERATIONS } from '@/lib/chain/constants';
import { useConfirmStore } from '@/stores/confirm-store';
import {
  checkAttemptAllowed,
  recordFailure,
  recordSuccess,
} from '@/lib/utils/brute-force-protection';

interface UseEntityMutationOptions {
  onSuccess?: (blockHash: string) => void;
  onError?: (error: string) => void;
  invalidateKeys?: unknown[][];
  confirmDialog?: ConfirmDialogConfig;
}

export function useEntityMutation(
  palletName: string,
  callName: string,
  options?: UseEntityMutationOptions,
) {
  const { api } = useApi();
  const { address, source, getSigner } = useWallet();
  const { unlockWallet } = useLocalWallet();
  const isLocked = useWalletStore((s) => s.isLocked);
  const requestPassword = useSigningStore((s) => s.requestPassword);
  const signingDone = useSigningStore((s) => s.signingDone);
  const signingFailed = useSigningStore((s) => s.signingFailed);
  const requestConfirm = useConfirmStore((s) => s.requestConfirm);
  const queryClient = useQueryClient();
  const [txState, setTxState] = useState<TxState>({
    status: 'idle',
    hash: null,
    error: null,
    blockNumber: null,
  });

  const isDangerous = DANGEROUS_OPERATIONS.includes(callName as any);
  const needsConfirmation = isDangerous || !!options?.confirmDialog;

  const reset = useCallback(() => {
    setTxState({ status: 'idle', hash: null, error: null, blockNumber: null });
  }, []);

  const mutate = useCallback(
    async (params: unknown[]) => {
      if (!api || !address) {
        setTxState({ status: 'error', hash: null, error: 'API or wallet not connected', blockNumber: null });
        return;
      }

      if (source === 'local' && isLocked) {
        setTxState({ status: 'error', hash: null, error: 'Wallet is locked', blockNumber: null });
        return;
      }

      try {
        // Enforce confirmation for dangerous operations
        if (needsConfirmation && options?.confirmDialog) {
          const confirmed = await requestConfirm(options.confirmDialog);
          if (!confirmed) return;
        }

        setTxState({ status: 'signing', hash: null, error: null, blockNumber: null });

        const tx = (api.tx as any)[palletName][callName](...params);

        if (source === 'local') {
          // Local wallet: check brute force protection, then prompt for password
          const bfCheck = checkAttemptAllowed(address);
          if (!bfCheck.allowed) {
            throw new Error(`Account locked. Try again in ${bfCheck.waitSeconds}s`);
          }

          const password = await requestPassword();

          let pair;
          try {
            pair = await unlockWallet(address, password);
          } catch {
            recordFailure(address);
            signingFailed();
            throw new Error('Wrong password');
          }
          recordSuccess(address);
          signingDone();

          setTxState((prev) => ({ ...prev, status: 'broadcasting' }));

          try {
            await new Promise<void>((resolve, reject) => {
              let unsub: (() => void) | undefined;
              const unsubPromise = tx.signAndSend(pair, ({ status, dispatchError }: any) => {
                if (status.isInBlock) {
                  const blockHash = status.asInBlock.toHex();
                  if (dispatchError) {
                    let errorMsg = 'Transaction failed';
                    if (dispatchError.isModule) {
                      const parsed = parseDispatchError(api, dispatchError);
                      errorMsg = parsed.message;
                    }
                    unsub?.();
                    setTxState({ status: 'error', hash: blockHash, error: errorMsg, blockNumber: null });
                    options?.onError?.(errorMsg);
                    reject(new Error(errorMsg));
                    return;
                  }
                  setTxState({ status: 'inBlock', hash: blockHash, error: null, blockNumber: null });
                }

                if (status.isFinalized) {
                  unsub?.();
                  const blockHash = status.asFinalized.toHex();

                  if (dispatchError) {
                    let errorMsg = 'Transaction failed';
                    if (dispatchError.isModule) {
                      const parsed = parseDispatchError(api, dispatchError);
                      errorMsg = parsed.message;
                    }
                    setTxState({ status: 'error', hash: blockHash, error: errorMsg, blockNumber: null });
                    options?.onError?.(errorMsg);
                    reject(new Error(errorMsg));
                    return;
                  }

                  setTxState({ status: 'finalized', hash: blockHash, error: null, blockNumber: null });

                  if (options?.invalidateKeys) {
                    for (const key of options.invalidateKeys) {
                      queryClient.invalidateQueries({ queryKey: key });
                    }
                  }

                  options?.onSuccess?.(blockHash);
                  resolve();
                }
              });
              unsubPromise.then((u: () => void) => { unsub = u; }).catch((err: Error) => {
                setTxState({ status: 'error', hash: null, error: err.message, blockNumber: null });
                options?.onError?.(err.message);
                reject(err);
              });
            });
          } finally {
            pair.lock();
          }
        } else {
          // Extension wallet: use signer
          const signer = await getSigner();

          setTxState((prev) => ({ ...prev, status: 'broadcasting' }));

          await new Promise<void>((resolve, reject) => {
            let unsub: (() => void) | undefined;
            const unsubPromise = tx.signAndSend(address, { signer }, ({ status, dispatchError }: any) => {
              if (status.isInBlock) {
                const blockHash = status.asInBlock.toHex();
                if (dispatchError) {
                  let errorMsg = 'Transaction failed';
                  if (dispatchError.isModule) {
                    const parsed = parseDispatchError(api, dispatchError);
                    errorMsg = parsed.message;
                  }
                  unsub?.();
                  setTxState({ status: 'error', hash: blockHash, error: errorMsg, blockNumber: null });
                  options?.onError?.(errorMsg);
                  reject(new Error(errorMsg));
                  return;
                }
                setTxState({ status: 'inBlock', hash: blockHash, error: null, blockNumber: null });
              }

              if (status.isFinalized) {
                unsub?.();
                const blockHash = status.asFinalized.toHex();

                if (dispatchError) {
                  let errorMsg = 'Transaction failed';
                  if (dispatchError.isModule) {
                    const parsed = parseDispatchError(api, dispatchError);
                    errorMsg = parsed.message;
                  }
                  setTxState({ status: 'error', hash: blockHash, error: errorMsg, blockNumber: null });
                  options?.onError?.(errorMsg);
                  reject(new Error(errorMsg));
                  return;
                }

                setTxState({ status: 'finalized', hash: blockHash, error: null, blockNumber: null });

                if (options?.invalidateKeys) {
                  for (const key of options.invalidateKeys) {
                    queryClient.invalidateQueries({ queryKey: key });
                  }
                }

                options?.onSuccess?.(blockHash);
                resolve();
              }
            });
            unsubPromise.then((u: () => void) => { unsub = u; }).catch((err: Error) => {
              setTxState({ status: 'error', hash: null, error: err.message, blockNumber: null });
              options?.onError?.(err.message);
              reject(err);
            });
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setTxState({
          status: 'error',
          hash: null,
          error: errorMsg,
          blockNumber: null,
        });
        options?.onError?.(errorMsg);
      }
    },
    [api, address, source, isLocked, getSigner, unlockWallet, requestPassword, signingDone, signingFailed, requestConfirm, needsConfirmation, palletName, callName, queryClient, options],
  );

  return {
    mutate,
    txState,
    reset,
    isDangerous,
    needsConfirmation,
    confirmConfig: options?.confirmDialog,
  };
}
