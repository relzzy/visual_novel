import { create } from 'zustand';

// ─── Time Utility ────────────────────────────────────────────────────────────

/**
 * Converts total minutes from midnight into a clean 12-hour format string.
 * e.g. 293 → '04:53 AM', 720 → '12:00 PM', 540 → '09:00 AM'
 */
export function formatTime(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440; // handle negatives / overflow
  const hours24 = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface McStats {
  energy: number;
  cleanliness: number;
}

/** A single item in the player's inventory. */
export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
}

/** Clothing category keys. */
export type ClothingCategory = 'tops' | 'bottoms' | 'shoes' | 'under' | 'over' | 'accessories';

/** What the MC currently has equipped — one item per slot. */
export type EquippedClothes = Record<ClothingCategory, string>;

/** All unlocked clothing items — multiple items per category. */
export type UnlockedClothes = Record<ClothingCategory, string[]>;

export interface GameState {
  currentSceneId: string;

  /** Index into the current scene's sequence array. */
  currentLineIndex: number;

  /** NPC relationship scores only — the MC never appears here. */
  relationships: Record<string, number>;

  /** Main Character personal stats. */
  mcStats: McStats;

  /** Currently equipped clothing per slot. */
  equippedClothes: EquippedClothes;

  /** All clothing the player has unlocked per category. */
  unlockedClothes: UnlockedClothes;

  /** Player's inventory — items collected throughout the story. */
  inventory: InventoryItem[];

  /** Player's current money balance. */
  money: number;

  /**
   * Current in-game time as total minutes from midnight.
   * Default is 293 (4:53 AM).
   */
  currentTime: number;

  /** Whether the restart confirmation modal is open. */
  isRestartModalOpen: boolean;

  setScene: (sceneId: string) => void;
  advanceLine: () => void;
  updateRelationship: (characterName: string, delta: number) => void;
  updateMcStat: (stat: keyof McStats, delta: number) => void;
  equipItem: (category: ClothingCategory, itemId: string) => void;
  addItem: (id: string, name: string, qty: number) => void;
  removeItem: (id: string, qty: number) => void;
  updateMoney: (amount: number) => void;
  advanceTime: (minutes: number) => void;
  toggleRestartModal: (open?: boolean) => void;
  resetStore: () => void;
  loadStore: (savedState: Pick<GameState, 'currentSceneId' | 'relationships' | 'mcStats' | 'equippedClothes' | 'unlockedClothes' | 'inventory' | 'money' | 'currentTime'>) => void;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_MC_STATS: McStats = {
  energy: 100,
  cleanliness: 100,
};

const DEFAULT_EQUIPPED_CLOTHES: EquippedClothes = {
  tops: 'basic_shirt',
  bottoms: 'basic_pants',
  shoes: 'basic_sneakers',
  under: 'basic_underwear',
  over: 'none',
  accessories: 'none',
};

const DEFAULT_UNLOCKED_CLOTHES: UnlockedClothes = {
  tops: ['basic_shirt'],
  bottoms: ['basic_pants'],
  shoes: ['basic_sneakers'],
  under: ['basic_underwear'],
  over: [],
  accessories: [],
};

// ─── Store ───────────────────────────────────────────────────────────────────

const DEFAULT_MONEY = 1000;
const DEFAULT_TIME = 293; // 4:53 AM in total minutes from midnight

export const useGameStore = create<GameState>()((set) => ({
  currentSceneId: 'intro',
  currentLineIndex: 0,
  relationships: {},
  mcStats: { ...DEFAULT_MC_STATS },
  equippedClothes: { ...DEFAULT_EQUIPPED_CLOTHES },
  unlockedClothes: structuredClone(DEFAULT_UNLOCKED_CLOTHES),
  inventory: [],
  money: DEFAULT_MONEY,
  currentTime: DEFAULT_TIME,
  isRestartModalOpen: false,

  setScene: (sceneId) =>
    set({ currentSceneId: sceneId, currentLineIndex: 0 }),

  advanceLine: () =>
    set((state) => ({ currentLineIndex: state.currentLineIndex + 1 })),

  updateRelationship: (characterName, delta) =>
    set((state) => {
      const currentScore = state.relationships[characterName] || 0;
      const newScore = Math.max(-100, Math.min(100, currentScore + delta));
      return {
        relationships: {
          ...state.relationships,
          [characterName]: newScore,
        },
      };
    }),

  updateMcStat: (stat, delta) =>
    set((state) => {
      const currentValue = state.mcStats[stat];
      const newValue = Math.max(0, Math.min(100, currentValue + delta));
      return {
        mcStats: {
          ...state.mcStats,
          [stat]: newValue,
        },
      };
    }),

  equipItem: (category, itemId) =>
    set((state) => ({
      equippedClothes: {
        ...state.equippedClothes,
        [category]: itemId,
      },
    })),

  addItem: (id, name, qty) =>
    set((state) => {
      const existing = state.inventory.find((item) => item.id === id);
      if (existing) {
        return {
          inventory: state.inventory.map((item) =>
            item.id === id ? { ...item, qty: item.qty + qty } : item
          ),
        };
      }
      return { inventory: [...state.inventory, { id, name, qty }] };
    }),

  removeItem: (id, qty) =>
    set((state) => {
      const existing = state.inventory.find((item) => item.id === id);
      if (!existing) return state;
      const newQty = existing.qty - qty;
      if (newQty <= 0) {
        return { inventory: state.inventory.filter((item) => item.id !== id) };
      }
      return {
        inventory: state.inventory.map((item) =>
          item.id === id ? { ...item, qty: newQty } : item
        ),
      };
    }),

  updateMoney: (amount) =>
    set((state) => ({
      money: Math.max(0, state.money + amount),
    })),

  advanceTime: (minutes) =>
    set((state) => ({
      currentTime: state.currentTime + minutes,
    })),

  toggleRestartModal: (open) =>
    set((state) => ({
      isRestartModalOpen: open !== undefined ? open : !state.isRestartModalOpen,
    })),

  resetStore: () =>
    set({
      currentSceneId: 'intro',
      currentLineIndex: 0,
      relationships: {},
      mcStats: { ...DEFAULT_MC_STATS },
      equippedClothes: { ...DEFAULT_EQUIPPED_CLOTHES },
      unlockedClothes: structuredClone(DEFAULT_UNLOCKED_CLOTHES),
      inventory: [],
      money: DEFAULT_MONEY,
      currentTime: DEFAULT_TIME,
      isRestartModalOpen: false,
    }),

  loadStore: (savedState) =>
    set({
      currentSceneId: savedState.currentSceneId,
      currentLineIndex: 0,
      relationships: savedState.relationships,
      mcStats: savedState.mcStats ?? { ...DEFAULT_MC_STATS },
      equippedClothes: savedState.equippedClothes ?? { ...DEFAULT_EQUIPPED_CLOTHES },
      unlockedClothes: savedState.unlockedClothes ?? structuredClone(DEFAULT_UNLOCKED_CLOTHES),
      inventory: savedState.inventory ?? [],
      money: savedState.money ?? DEFAULT_MONEY,
      currentTime: savedState.currentTime ?? DEFAULT_TIME,
      isRestartModalOpen: false,
    }),
}));
