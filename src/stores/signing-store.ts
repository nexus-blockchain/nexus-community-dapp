import { create } from 'zustand';

interface SigningState {
  isOpen: boolean;
  _resolve: ((password: string) => void) | null;
  _reject: ((reason?: unknown) => void) | null;
  requestPassword: () => Promise<string>;
  submitPassword: (password: string) => void;
  cancel: () => void;
}

export const useSigningStore = create<SigningState>((set, get) => ({
  isOpen: false,
  _resolve: null,
  _reject: null,

  requestPassword: () => {
    if (get()._reject) { get()._reject!('cancelled'); }
    return new Promise<string>((resolve, reject) => {
      set({ isOpen: true, _resolve: resolve, _reject: reject });
    });
  },

  submitPassword: (password: string) => {
    const { _resolve } = get();
    _resolve?.(password);
    set({ isOpen: false, _resolve: null, _reject: null });
  },

  cancel: () => {
    const { _reject } = get();
    _reject?.(new Error('User cancelled signing'));
    set({ isOpen: false, _resolve: null, _reject: null });
  },
}));
