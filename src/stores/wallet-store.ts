import { create } from 'zustand';

const AUTO_LOCK_KEY = 'nexus_auto_lock_minutes';
const WALLET_SESSION_KEY = 'nexus_wallet_session';

function getStoredAutoLockMinutes(): number {
  if (typeof window === 'undefined') return 5;
  const v = localStorage.getItem(AUTO_LOCK_KEY);
  if (v === null) return 5;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

/** Restore wallet connection info (address/name/source) from localStorage */
function loadWalletSession(): { address: string; name: string; source: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WALLET_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.address && parsed.source) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveWalletSession(address: string, name: string, source: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WALLET_SESSION_KEY, JSON.stringify({ address, name, source }));
}

function clearWalletSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WALLET_SESSION_KEY);
}

interface WalletState {
  address: string | null;
  name: string | null;
  source: string | null;  // wallet extension name
  isConnected: boolean;

  // Lock state (not persisted — resets on refresh)
  isLocked: boolean;
  lockedAt: number | null;
  autoLockMinutes: number;

  // Hydration
  _hydrated: boolean;
  _hydrate: () => void;

  // Actions
  setWallet: (address: string, name: string, source: string) => void;
  disconnect: () => void;
  lockWallet: () => void;
  unlockWallet: () => void;
  setAutoLockMinutes: (minutes: number) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  name: null,
  source: null,
  isConnected: false,
  isLocked: false,
  lockedAt: null,
  autoLockMinutes: 5,

  _hydrated: false,
  _hydrate: () => {
    const restored = loadWalletSession();
    set({
      address: restored?.address ?? null,
      name: restored?.name ?? null,
      source: restored?.source ?? null,
      isConnected: !!restored,
      isLocked: restored?.source === 'local',
      autoLockMinutes: getStoredAutoLockMinutes(),
      _hydrated: true,
    });
  },

  setWallet: (address, name, source) => {
    saveWalletSession(address, name, source);
    set({ address, name, source, isConnected: true, isLocked: false, lockedAt: null });
  },

  disconnect: () => {
    clearWalletSession();
    set({ address: null, name: null, source: null, isConnected: false, isLocked: false, lockedAt: null });
  },

  lockWallet: () =>
    set({ isLocked: true, lockedAt: Date.now() }),

  unlockWallet: () =>
    set({ isLocked: false, lockedAt: null }),

  setAutoLockMinutes: (minutes) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTO_LOCK_KEY, String(minutes));
    }
    set({ autoLockMinutes: minutes });
  },
}));
