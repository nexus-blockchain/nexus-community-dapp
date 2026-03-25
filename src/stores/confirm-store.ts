import { create } from 'zustand';
import type { ConfirmDialogConfig } from '@/lib/types';

interface ConfirmState {
  isOpen: boolean;
  config: ConfirmDialogConfig | null;
  _resolve: ((confirmed: boolean) => void) | null;
  requestConfirm: (config: ConfirmDialogConfig) => Promise<boolean>;
  confirm: () => void;
  cancel: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  config: null,
  _resolve: null,

  requestConfirm: (config: ConfirmDialogConfig) => {
    // Cancel any pending confirmation
    const prev = get()._resolve;
    if (prev) prev(false);

    return new Promise<boolean>((resolve) => {
      set({ isOpen: true, config, _resolve: resolve });
    });
  },

  confirm: () => {
    const { _resolve } = get();
    _resolve?.(true);
    set({ isOpen: false, config: null, _resolve: null });
  },

  cancel: () => {
    const { _resolve } = get();
    _resolve?.(false);
    set({ isOpen: false, config: null, _resolve: null });
  },
}));
