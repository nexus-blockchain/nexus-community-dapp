'use client';

import { useEffect, useRef } from 'react';
import { useWalletStore } from '@/stores/wallet-store';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;
const CHECK_INTERVAL_MS = 30_000; // 30s
const VISIBILITY_GRACE_MS = 60_000; // 1 min

/**
 * Auto-locks local wallets after idle timeout or prolonged background tab.
 * Only active when: connected + source === 'local' + not already locked + autoLockMinutes > 0
 */
export function useAutoLock() {
  const isConnected = useWalletStore((s) => s.isConnected);
  const source = useWalletStore((s) => s.source);
  const isLocked = useWalletStore((s) => s.isLocked);
  const autoLockMinutes = useWalletStore((s) => s.autoLockMinutes);
  const lockWallet = useWalletStore((s) => s.lockWallet);

  const lastActivityRef = useRef(Date.now());
  const hiddenAtRef = useRef<number | null>(null);

  const shouldRun = isConnected && source === 'local' && !isLocked && autoLockMinutes > 0;

  // Track user activity
  useEffect(() => {
    if (!shouldRun) return;

    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };

    for (const evt of ACTIVITY_EVENTS) {
      document.addEventListener(evt, onActivity, { passive: true });
    }
    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        document.removeEventListener(evt, onActivity);
      }
    };
  }, [shouldRun]);

  // Periodic idle check
  useEffect(() => {
    if (!shouldRun) return;

    const id = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= autoLockMinutes * 60_000) {
        lockWallet();
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(id);
  }, [shouldRun, autoLockMinutes, lockWallet]);

  // Visibility change — lock if hidden > 1 min
  useEffect(() => {
    if (!shouldRun) return;

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
      } else {
        if (hiddenAtRef.current && Date.now() - hiddenAtRef.current >= VISIBILITY_GRACE_MS) {
          lockWallet();
        }
        hiddenAtRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [shouldRun, lockWallet]);
}
