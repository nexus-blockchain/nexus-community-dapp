'use client';

import { useCallback, useRef, useEffect } from 'react';
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import type { Signer } from '@polkadot/types/types';
import { useWalletStore } from '@/stores/wallet-store';
import { useLocalAccountsStore } from '@/stores/local-accounts-store';
import { decodeAddress } from '@polkadot/util-crypto';

const APP_NAME = 'NEXUS Community dApp';

const SUPPORTED_WALLETS = ['polkadot-js', 'talisman', 'subwallet-js'] as const;
export type SupportedWallet = (typeof SUPPORTED_WALLETS)[number];

/** Unified account type for both extension and local wallets */
export interface UnifiedAccount {
  address: string;
  name: string;
  source: string; // extension name or 'local'
}

async function getExtensionDapp() {
  return import('@polkadot/extension-dapp');
}

export function useWallet() {
  const { address, name, source, isConnected, setWallet, disconnect } =
    useWalletStore();

  const hydrate = useLocalAccountsStore((s) => s.hydrate);
  const localAccounts = useLocalAccountsStore((s) => s.accounts);

  // Hydrate local accounts on mount
  useEffect(() => { hydrate(); }, [hydrate]);

  // Cache signer after connection
  const signerRef = useRef<Signer | null>(null);

  /** Get accounts from browser extensions only */
  const getExtensionAccounts = useCallback(async (): Promise<InjectedAccountWithMeta[]> => {
    try {
      const { web3Enable, web3Accounts } = await getExtensionDapp();
      // web3Enable can hang indefinitely when no extension is installed,
      // so add a timeout to prevent the loading spinner from spinning forever.
      const extensions = await Promise.race([
        web3Enable(APP_NAME),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Extension timeout')), 3000)
        ),
      ]);
      if (extensions.length === 0) return [];
      return web3Accounts();
    } catch {
      return [];
    }
  }, []);

  /** Get all accounts (extension + local) as UnifiedAccount[] */
  const getAccounts = useCallback(async (): Promise<UnifiedAccount[]> => {
    const result: UnifiedAccount[] = [];
    const seen = new Set<string>();

    // Read local accounts from store snapshot to keep this callback reference stable
    const currentLocalAccounts = useLocalAccountsStore.getState().accounts;
    for (const la of currentLocalAccounts) {
      const key = `local-${la.address}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ address: la.address, name: la.name, source: 'local' });
    }

    // Extension accounts
    try {
      const extAccounts = await getExtensionAccounts();
      for (const ea of extAccounts) {
        const key = `${ea.meta.source}-${ea.address}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({
          address: ea.address,
          name: ea.meta.name || 'Unknown',
          source: ea.meta.source,
        });
      }
    } catch {
      // Extension not available — ignore
    }

    return result;
  }, [getExtensionAccounts]);

  /** Connect to a specific account (unified or extension) */
  const connect = useCallback(
    async (account: UnifiedAccount | InjectedAccountWithMeta) => {
      // Determine source
      const src = 'source' in account && typeof account.source === 'string'
        ? account.source
        : (account as InjectedAccountWithMeta).meta?.source;
      const acctName = 'name' in account && typeof account.name === 'string'
        ? account.name
        : ((account as InjectedAccountWithMeta).meta?.name || 'Unknown');
      const acctAddress = account.address;

      // Validate SS58 address format
      try {
        decodeAddress(acctAddress);
      } catch {
        throw new Error('Invalid account address');
      }

      if (src === 'local') {
        // Local wallet — no signer needed at connect time
        signerRef.current = null;
        setWallet(acctAddress, acctName, 'local');
      } else {
        // Extension wallet
        const { web3Enable, web3FromSource } = await getExtensionDapp();
        await web3Enable(APP_NAME);
        const injector = await web3FromSource(src!);
        if (!injector) {
          throw new Error(`Failed to connect to ${src}`);
        }
        signerRef.current = injector.signer;
        setWallet(acctAddress, acctName, src!);
      }
    },
    [setWallet],
  );

  /** Connect extension account (legacy compat) */
  const connectExtension = useCallback(
    async (account: InjectedAccountWithMeta) => {
      const { web3FromSource } = await getExtensionDapp();
      const injector = await web3FromSource(account.meta.source);
      if (!injector) {
        throw new Error(`Failed to connect to ${account.meta.source}`);
      }
      signerRef.current = injector.signer;
      setWallet(account.address, account.meta.name || 'Unknown', account.meta.source);
    },
    [setWallet],
  );

  /** Get signer for transaction signing (extension wallets only) */
  const getSigner = useCallback(async () => {
    if (!source) throw new Error('Wallet not connected');

    if (source === 'local') {
      throw new Error('Local wallets require password. Use signWithLocal() instead.');
    }

    if (signerRef.current) return signerRef.current;

    const { web3FromSource } = await getExtensionDapp();
    const injector = await web3FromSource(source);
    signerRef.current = injector.signer;
    return injector.signer;
  }, [source]);

  /** Disconnect and clear signer */
  const handleDisconnect = useCallback(() => {
    signerRef.current = null;
    disconnect();
  }, [disconnect]);

  return {
    address,
    name,
    source,
    isConnected,
    isLocal: source === 'local',
    getAccounts,
    getExtensionAccounts,
    connect,
    connectExtension,
    disconnect: handleDisconnect,
    getSigner,
    supportedWallets: SUPPORTED_WALLETS,
    localAccounts,
  };
}
