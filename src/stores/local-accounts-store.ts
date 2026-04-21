import { create } from 'zustand';

export interface LocalAccount {
  address: string;
  name: string;
  encryptedJson: string; // JSON-stringified KeyringPair$Json
  encryptedMnemonic?: string; // AES-GCM encrypted, base64 encoded
  createdAt: number;
}

const STORAGE_KEY = 'nexus_local_accounts';

function loadAccounts(): { accounts: LocalAccount[]; loadError: string | null } {
  if (typeof window === 'undefined') return { accounts: [], loadError: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { accounts: raw ? JSON.parse(raw) : [], loadError: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown local account storage error';
    return { accounts: [], loadError: message };
  }
}

function saveAccounts(accounts: LocalAccount[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

interface LocalAccountsState {
  accounts: LocalAccount[];
  hydrated: boolean;
  loadError: string | null;

  hydrate: () => void;
  addAccount: (account: LocalAccount) => void;
  removeAccount: (address: string) => void;
  renameAccount: (address: string, name: string) => void;
  getAll: () => LocalAccount[];
}

export const useLocalAccountsStore = create<LocalAccountsState>((set, get) => ({
  accounts: [],
  hydrated: false,
  loadError: null,

  hydrate: () => {
    if (get().hydrated) return;
    const { accounts, loadError } = loadAccounts();
    set({ accounts, hydrated: true, loadError });
  },

  addAccount: (account) => {
    const existing = get().accounts;
    if (existing.some((a) => a.address === account.address)) {
      throw new Error('Account already exists');
    }
    const accounts = [...existing, account];
    saveAccounts(accounts);
    set({ accounts, loadError: null });
  },

  removeAccount: (address) => {
    const accounts = get().accounts.filter((a) => a.address !== address);
    saveAccounts(accounts);
    set({ accounts, loadError: null });
  },

  renameAccount: (address, name) => {
    const accounts = get().accounts.map((a) =>
      a.address === address ? { ...a, name } : a,
    );
    saveAccounts(accounts);
    set({ accounts, loadError: null });
  },

  getAll: () => get().accounts,
}));
