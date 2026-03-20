import { create } from 'zustand';

export interface TransferRecord {
  id: string;          // unique: `${hash}-${timestamp}`
  from: string;
  to: string;
  amount: string;      // raw bigint string
  hash: string;        // block hash
  timestamp: number;   // Date.now()
}

const STORAGE_KEY = 'nexus_transfer_history';
const MAX_RECORDS_PER_ADDRESS = 100;

function loadAll(): Record<string, TransferRecord[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, TransferRecord[]>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

interface TransferHistoryState {
  /** Add a completed transfer record (keyed by sender address) */
  addRecord: (record: Omit<TransferRecord, 'id'>) => void;
  /** Get all records involving an address (sent or received) */
  getRecords: (address: string) => TransferRecord[];
  /** Clear all records for an address */
  clearRecords: (address: string) => void;
}

export const useTransferHistoryStore = create<TransferHistoryState>(() => ({
  addRecord: (record) => {
    const all = loadAll();
    const entry: TransferRecord = {
      ...record,
      id: `${record.hash}-${record.timestamp}`,
    };
    // Store under sender address
    const key = record.from;
    const list = all[key] ?? [];
    list.unshift(entry);
    // Cap at max
    if (list.length > MAX_RECORDS_PER_ADDRESS) list.length = MAX_RECORDS_PER_ADDRESS;
    all[key] = list;
    saveAll(all);
  },

  getRecords: (address) => {
    const all = loadAll();
    // Collect records from all address keys where this address is sender or receiver
    const seen = new Set<string>();
    const results: TransferRecord[] = [];
    for (const records of Object.values(all)) {
      for (const r of records) {
        if ((r.from === address || r.to === address) && !seen.has(r.id)) {
          seen.add(r.id);
          results.push(r);
        }
      }
    }
    results.sort((a, b) => b.timestamp - a.timestamp);
    return results;
  },

  clearRecords: (address) => {
    const all = loadAll();
    delete all[address];
    saveAll(all);
  },
}));
