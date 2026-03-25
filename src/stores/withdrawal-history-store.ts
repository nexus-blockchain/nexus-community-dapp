import { create } from 'zustand';

export interface WithdrawalRecord {
  id: string;
  address: string;
  entityId: number;
  amount: string;       // raw bigint string
  repurchaseAccount: string | null;
  hash: string;
  timestamp: number;
}

const STORAGE_KEY = 'nexus_withdrawal_history';
const MAX_RECORDS = 200;

function loadAll(): WithdrawalRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(records: WithdrawalRecord[]) {
  if (typeof window === 'undefined') return;
  if (records.length > MAX_RECORDS) records.length = MAX_RECORDS;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

interface WithdrawalHistoryState {
  _version: number;
  addRecord: (record: Omit<WithdrawalRecord, 'id'>) => void;
  getRecords: (address: string, entityId?: number) => WithdrawalRecord[];
}

export const useWithdrawalHistoryStore = create<WithdrawalHistoryState>((set) => ({
  _version: 0,

  addRecord: (record) => {
    const all = loadAll();
    const entry: WithdrawalRecord = {
      ...record,
      id: `${record.hash}-${record.timestamp}`,
    };
    all.unshift(entry);
    saveAll(all);
    set((s) => ({ _version: s._version + 1 }));
  },

  getRecords: (address, entityId) => {
    const all = loadAll();
    return all.filter(
      (r) => r.address === address && (entityId == null || r.entityId === entityId),
    );
  },
}));
