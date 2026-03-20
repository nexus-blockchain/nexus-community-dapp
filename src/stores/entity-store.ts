import { create } from 'zustand';

const STORAGE_KEY = 'nexus_entity';

interface StoredEntity {
  currentEntityId: number;
  entityName: string;
}

function loadEntity(): StoredEntity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data.currentEntityId === 'number' && typeof data.entityName === 'string') {
      return data;
    }
  } catch {}
  return null;
}

function saveEntity(id: number, name: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentEntityId: id, entityName: name }));
}

function clearStoredEntity() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

interface EntityState {
  currentEntityId: number | null;
  entityName: string | null;
  memberStatus: 'none' | 'active' | 'frozen' | 'banned';
  memberLevel: number;

  setEntity: (id: number, name: string) => void;
  setMemberStatus: (status: 'none' | 'active' | 'frozen' | 'banned') => void;
  setMemberLevel: (level: number) => void;
  clearEntity: () => void;
}

const stored = loadEntity();

export const useEntityStore = create<EntityState>((set) => ({
  currentEntityId: stored?.currentEntityId ?? null,
  entityName: stored?.entityName ?? null,
  memberStatus: 'none',
  memberLevel: 0,

  setEntity: (id, name) => {
    saveEntity(id, name);
    set({ currentEntityId: id, entityName: name });
  },

  setMemberStatus: (status) => set({ memberStatus: status }),

  setMemberLevel: (level) => set({ memberLevel: level }),

  clearEntity: () => {
    clearStoredEntity();
    set({ currentEntityId: null, entityName: null, memberStatus: 'none', memberLevel: 0 });
  },
}));
