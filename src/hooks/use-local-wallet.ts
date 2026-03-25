'use client';

import { useCallback } from 'react';
import { Keyring } from '@polkadot/keyring';
import { mnemonicGenerate, mnemonicValidate, cryptoWaitReady } from '@polkadot/util-crypto';
import type { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types';
import { useLocalAccountsStore, type LocalAccount } from '@/stores/local-accounts-store';
import { encryptMnemonic, decryptMnemonic } from '@/lib/utils/mnemonic-crypto';

const SS58_FORMAT = 273;

function getKeyring() {
  return new Keyring({ type: 'sr25519', ss58Format: SS58_FORMAT });
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
      const encMnemonic = await encryptMnemonic(mnemonic, password);

      const account: LocalAccount = {
        address: pair.address,
        name,
        encryptedJson: JSON.stringify(json),
        encryptedMnemonic: encMnemonic,
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
    async (mnemonic: string, name: string, password: string): Promise<{ address: string }> => {
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

      // Check for duplicate address before saving
      const existingAccounts = useLocalAccountsStore.getState().accounts;
      if (existingAccounts.some((a) => a.address === pair.address)) {
        pair.lock();
        throw new Error('DUPLICATE_ACCOUNT');
      }

      const json = pair.toJson(password);
      const encMnemonic = await encryptMnemonic(trimmed, password);

      const account: LocalAccount = {
        address: pair.address,
        name,
        encryptedJson: JSON.stringify(json),
        encryptedMnemonic: encMnemonic,
        createdAt: Date.now(),
      };
      addAccount(account);

      pair.lock();

      return { address: pair.address };
    },
    [addAccount, hydrate],
  );

  /** Unlock a local wallet by password → returns the unlocked KeyringPair (caller must lock after use) */
  const unlockWallet = useCallback(
    async (address: string, password: string): Promise<KeyringPair> => {
      await cryptoWaitReady();
      hydrate();

      const accounts = useLocalAccountsStore.getState().accounts;
      const account = accounts.find((a) => a.address === address);
      if (!account) throw new Error('Local account not found');

      const json: KeyringPair$Json = JSON.parse(account.encryptedJson);
      const keyring = getKeyring();
      const pair = keyring.addFromJson(json);
      pair.decodePkcs8(password);

      return pair;
    },
    [hydrate],
  );

  /** Export the mnemonic for a local wallet (decrypt with password) */
  const exportMnemonic = useCallback(
    async (address: string, password: string): Promise<string> => {
      hydrate();
      const accounts = useLocalAccountsStore.getState().accounts;
      const account = accounts.find((a) => a.address === address);
      if (!account) throw new Error('Local account not found');
      if (!account.encryptedMnemonic) throw new Error('MNEMONIC_NOT_STORED');

      // Verify password is correct by attempting to unlock the keypair first
      const pair = await unlockWallet(address, password);
      pair.lock();

      return decryptMnemonic(account.encryptedMnemonic, password);
    },
    [hydrate, unlockWallet],
  );

  return {
    createWallet,
    importWallet,
    unlockWallet,
    exportMnemonic,
  };
}
