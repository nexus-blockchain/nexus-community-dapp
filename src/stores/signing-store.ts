import { create } from 'zustand';

interface SigningState {
  isOpen: boolean;
  isSigning: boolean;
  _resolve: ((password: string) => void) | null;
  _reject: ((reason?: unknown) => void) | null;
  requestPassword: () => Promise<string>;
  submitPassword: (password: string) => void;
  cancel: () => void;
  signingDone: () => void;
  signingFailed: (error?: string) => void;
}

export const useSigningStore = create<SigningState>((set, get) => ({
  isOpen: false,
  isSigning: false,
  _resolve: null,
  _reject: null,

  requestPassword: () => {
    if (get()._reject) { get()._reject!('cancelled'); }
    return new Promise<string>((resolve, reject) => {
      set({ isOpen: true, isSigning: false, _resolve: resolve, _reject: reject });
    });
  },

  submitPassword: (password: string) => {
    const { _resolve } = get();
    _resolve?.(password);
    // Keep dialog open with signing state — signingDone/signingFailed will close it
    set({ isSigning: true, _resolve: null, _reject: null });
  },

  cancel: () => {
    const { _reject } = get();
    _reject?.(new Error('User cancelled signing'));
    set({ isOpen: false, isSigning: false, _resolve: null, _reject: null });
  },

  signingDone: () => {
    set({ isOpen: false, isSigning: false });
  },

  signingFailed: () => {
    set({ isOpen: false, isSigning: false });
  },
}));
