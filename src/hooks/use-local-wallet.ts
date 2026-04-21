'use client';

import { useCallback } from 'react';
import { Keyring } from '@polkadot/keyring';
import { mnemonicGenerate, mnemonicValidate, cryptoWaitReady } from '@polkadot/util-crypto';
import type { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types';
import { useLocalAccountsStore, type LocalAccount } from '@/stores/local-accounts-store';
import {
  checkAttemptAllowed,
  recordFailure,
  recordSuccess,
} from '@/lib/utils/brute-force-protection';
import { decryptMnemonic, encryptMnemonic } from '@/lib/utils/mnemonic-crypto';

const SS58_FORMAT = 273;

export type LocalWalletErrorCode =
  | 'ACCOUNT_NOT_FOUND'
  | 'INVALID_ACCOUNT_JSON'
  | 'INVALID_ACCOUNT_FORMAT'
  | 'WRONG_PASSWORD'
  | 'MNEMONIC_NOT_STORED'
  | 'MNEMONIC_DECRYPT_FAILED';

export class LocalWalletError extends Error {
  code: LocalWalletErrorCode;

  constructor(code: LocalWalletErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'LocalWalletError';
    this.code = code;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function isLocalWalletError(error: unknown, code?: LocalWalletErrorCode): error is LocalWalletError {
  return error instanceof LocalWalletError && (code ? error.code === code : true);
}

function getKeyring() {
  return new Keyring({ type: 'sr25519', ss58Format: SS58_FORMAT });
}

function getLocalAccountOrThrow(address: string): LocalAccount {
  const { accounts, loadError } = useLocalAccountsStore.getState();

  if (loadError) {
    throw new LocalWalletError('INVALID_ACCOUNT_JSON', 'Local wallet storage is corrupted', { cause: loadError });
  }

  const account = accounts.find((a) => a.address === address);
  if (!account) {
    throw new LocalWalletError('ACCOUNT_NOT_FOUND', 'Local account not found');
  }

  return account;
}

function parseAccountJson(encryptedJson: string): KeyringPair$Json {
  try {
    const parsed = JSON.parse(encryptedJson) as Partial<KeyringPair$Json>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.encoded !== 'string' || typeof parsed.address !== 'string') {
      throw new Error('Invalid keyring JSON shape');
    }
    return parsed as KeyringPair$Json;
  } catch (error) {
    throw new LocalWalletError('INVALID_ACCOUNT_JSON', 'Local wallet JSON is invalid', { cause: error });
  }
}

function getUnlockErrorMessage(error: unknown): string {
  if (isLocalWalletError(error, 'ACCOUNT_NOT_FOUND')) {
    return 'Local wallet data not found';
  }
  if (isLocalWalletError(error, 'INVALID_ACCOUNT_JSON') || isLocalWalletError(error, 'INVALID_ACCOUNT_FORMAT')) {
    return 'Local wallet data is corrupted or incompatible';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Failed to unlock local wallet';
}

export function useLocalWallet() {
  const { addAccount, hydrate } = useLocalAccountsStore();

  /** Create a new wallet from a random mnemonic */
  const createWallet = useCallback(
    async (name: string, password: string): Promise<{ mnemonic: string; address: string }> => {
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      await cryptoWaitReady();
      hydrate();

      const mnemonic = mnemonicGenerate(12);
      const keyring = getKeyring();
      const pair = keyring.addFromMnemonic(mnemonic, { name }, 'sr25519');
      const json = pair.toJson(password);
      const encryptedMnemonic = await encryptMnemonic(mnemonic, password);

      const account: LocalAccount = {
        address: pair.address,
        name,
        encryptedJson: JSON.stringify(json),
        encryptedMnemonic,
        createdAt: Date.now(),
      };
      addAccount(account);

      // Lock the pair after export
      pair.lock();

      return { mnemonic, address: pair.address };
    },
    [addAccount, hydrate],
  );

  /** Import a wallet from an existing mnemonic */
  const importWallet = useCallback(
    async (mnemonic: string, name: string, password: string): Promise<{ address: string; duplicate: boolean }> => {
      await cryptoWaitReady();
      hydrate();

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const trimmed = mnemonic.trim().replace(/\s+/g, ' ');
      if (!mnemonicValidate(trimmed)) {
        throw new Error('Invalid mnemonic phrase');
      }

      const keyring = getKeyring();
      const pair = keyring.addFromMnemonic(trimmed, { name }, 'sr25519');

      // Check for duplicate address — return existing instead of throwing
      const existingAccounts = useLocalAccountsStore.getState().accounts;
      if (existingAccounts.some((a) => a.address === pair.address)) {
        pair.lock();
        return { address: pair.address, duplicate: true };
      }

      const json = pair.toJson(password);
      const encryptedMnemonic = await encryptMnemonic(trimmed, password);

      const account: LocalAccount = {
        address: pair.address,
        name,
        encryptedJson: JSON.stringify(json),
        encryptedMnemonic,
        createdAt: Date.now(),
      };
      addAccount(account);

      pair.lock();

      return { address: pair.address, duplicate: false };
    },
    [addAccount, hydrate],
  );

  /** Unlock a local wallet by password → returns the unlocked KeyringPair (caller must lock after use) */
  const unlockWallet = useCallback(
    async (address: string, password: string): Promise<KeyringPair> => {
      await cryptoWaitReady();
      hydrate();

      const account = getLocalAccountOrThrow(address);
      const json = parseAccountJson(account.encryptedJson);
      const keyring = getKeyring();

      let pair: KeyringPair;
      try {
        pair = keyring.addFromJson(json);
      } catch (error) {
        throw new LocalWalletError('INVALID_ACCOUNT_FORMAT', 'Local wallet keypair format is invalid', { cause: error });
      }

      try {
        pair.decodePkcs8(password);
      } catch (error) {
        try {
          pair.lock();
        } catch {}
        throw new LocalWalletError('WRONG_PASSWORD', 'Wrong password', { cause: error });
      }

      return pair;
    },
    [hydrate],
  );

  /** Export the mnemonic for a local wallet (decrypt with password) */
  const exportMnemonic = useCallback(
    async (address: string, password: string): Promise<string> => {
      hydrate();

      const check = checkAttemptAllowed(address);
      if (!check.allowed) {
        throw new Error(check.errorKey === 'accountLockedOut' ? `ACCOUNT_LOCKED:${check.waitSeconds}` : `TOO_MANY_ATTEMPTS:${check.waitSeconds}`);
      }

      const account = getLocalAccountOrThrow(address);
      if (!account.encryptedMnemonic) {
        throw new LocalWalletError('MNEMONIC_NOT_STORED', 'Mnemonic backup is not stored for this wallet');
      }

      let pair: KeyringPair | null = null;
      try {
        pair = await unlockWallet(address, password);
      } catch (error) {
        if (isLocalWalletError(error, 'WRONG_PASSWORD')) {
          recordFailure(address);
          const nextCheck = checkAttemptAllowed(address);
          if (!nextCheck.allowed) {
            throw new Error(nextCheck.errorKey === 'accountLockedOut' ? `ACCOUNT_LOCKED:${nextCheck.waitSeconds}` : `TOO_MANY_ATTEMPTS:${nextCheck.waitSeconds}`);
          }
        }
        throw error;
      } finally {
        pair?.lock();
      }

      recordSuccess(address);

      try {
        return await decryptMnemonic(account.encryptedMnemonic, password);
      } catch (error) {
        throw new LocalWalletError('MNEMONIC_DECRYPT_FAILED', 'Stored mnemonic could not be decrypted', { cause: error });
      }
    },
    [hydrate, unlockWallet],
  );

  return {
    createWallet,
    importWallet,
    unlockWallet,
    exportMnemonic,
    getUnlockErrorMessage,
  };
}
