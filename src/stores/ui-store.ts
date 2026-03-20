import { create } from 'zustand';

export type TabId = 'community' | 'mall' | 'market' | 'earnings' | 'me';

interface UiState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'community',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
