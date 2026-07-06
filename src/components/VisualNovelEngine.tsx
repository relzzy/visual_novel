import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore, formatTime, type ClothingCategory } from '../store/gameStore';
import storyData from '../data/storyData.json';
import type { StoryData, Choice, CharacterOnScreen } from '../types/storyTypes';

const story = storyData as unknown as StoryData;

// ─── Typewriter Hook ─────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 25) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const rafRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;
    lastTimeRef.current = 0;

    const step = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= speed) {
        indexRef.current++;
        lastTimeRef.current = timestamp;

        if (indexRef.current >= text.length) {
          setDisplayed(text);
          setDone(true);
          return;
        }
        setDisplayed(text.slice(0, indexRef.current));
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, speed]);

  const skip = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setDisplayed(text);
    setDone(true);
  }, [text]);

  return { displayed, done, skip };
}

// ─── Save/Load Modal ─────────────────────────────────────────────────────────
type ModalMode = 'save' | 'load' | null;

interface SaveSlot {
  sceneId: string;
  timestamp: number;
}

interface SaveLoadModalProps {
  mode: ModalMode;
  onClose: () => void;
}

function SaveLoadModal({ mode, onClose }: SaveLoadModalProps) {
  const { currentSceneId, relationships, mcStats, equippedClothes, unlockedClothes, inventory, money, currentTime, loadStore } = useGameStore();
  const [slots, setSlots] = useState<(SaveSlot | null)[]>(Array(10).fill(null));

  useEffect(() => {
    if (!mode) return;
    const loadedSlots = [];
    for (let i = 1; i <= 10; i++) {
      const data = localStorage.getItem(`vn_save_slot_${i}`);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          loadedSlots.push({ sceneId: parsed.currentSceneId, timestamp: parsed.timestamp || Date.now() });
        } catch (e) {
          loadedSlots.push(null);
        }
      } else {
        loadedSlots.push(null);
      }
    }
    setSlots(loadedSlots);
  }, [mode]);

  if (!mode) return null;

  const handleSlotClick = (index: number) => {
    const slotKey = `vn_save_slot_${index + 1}`;
    if (mode === 'save') {
      const saveData = {
        currentSceneId,
        relationships,
        mcStats,
        equippedClothes,
        unlockedClothes,
        inventory,
        money,
        currentTime,
        timestamp: Date.now()
      };
      localStorage.setItem(slotKey, JSON.stringify(saveData));
      onClose();
    } else if (mode === 'load') {
      const data = localStorage.getItem(slotKey);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          loadStore({
            currentSceneId: parsed.currentSceneId,
            relationships: parsed.relationships,
            mcStats: parsed.mcStats,
            equippedClothes: parsed.equippedClothes,
            unlockedClothes: parsed.unlockedClothes,
            inventory: parsed.inventory,
            money: parsed.money,
            currentTime: parsed.currentTime,
          });
          onClose();
        } catch (e) {
          console.error("Failed to load save", e);
        }
      }
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded flex flex-col h-[70vh] max-h-[600px] shadow-2xl">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
          <h2 className="text-white text-lg tracking-[0.2em] uppercase font-light">
            {mode === 'save' ? 'Save Game' : 'Load Game'}
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors px-2 py-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {slots.map((slot, i) => (
            <button
              key={i}
              onClick={() => handleSlotClick(i)}
              disabled={mode === 'load' && !slot}
              className={`w-full text-left p-4 border flex items-center justify-between transition-all duration-300
                ${mode === 'load' && !slot 
                  ? 'border-white/5 bg-white/[0.02] text-white/20 cursor-not-allowed' 
                  : 'border-white/10 bg-black/40 text-white/80 hover:bg-white/10 hover:border-white/30 cursor-pointer'
                }
              `}
            >
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-1">Slot {i + 1}</span>
                <span className="text-sm font-light tracking-wide uppercase">
                  {slot ? `Scene: ${slot.sceneId}` : 'Empty'}
                </span>
              </div>
              {slot && (
                <span className="text-[10px] text-white/30 tracking-widest uppercase">Occupied</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Directory Modal ─────────────────────────────────────────────────────────

function DirectoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { relationships } = useGameStore();

  if (!isOpen) return null;

  const characters = Object.keys(relationships);

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-neutral-900 border border-white/10 rounded flex flex-col h-[70vh] max-h-[600px] shadow-2xl">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
          <h2 className="text-white text-lg tracking-[0.2em] uppercase font-light">
            Directory
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors px-2 py-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {characters.length === 0 ? (
            <div className="text-center text-white/30 uppercase tracking-widest mt-10 text-xs">
              No Intel Gathered.
            </div>
          ) : (
            characters.map(char => {
              const score = relationships[char];
              const percentage = Math.max(0, Math.min(100, (score + 100) / 2));
              
              return (
                <div key={char} className="flex flex-col sm:flex-row items-center gap-5 p-5 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors rounded">
                  <div className="w-14 h-14 rounded-full border border-white/20 bg-black/60 flex items-center justify-center flex-shrink-0 text-center leading-tight">
                    <span className="text-[8px] text-white/40 uppercase tracking-widest">
                      image<br/>here
                    </span>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-2.5 w-full">
                    <div className="flex justify-between items-end">
                      <span className="text-white tracking-[0.2em] uppercase text-sm font-medium">{char}</span>
                      <span className="text-white/50 font-mono text-[10px] tracking-widest">
                        [{score > 0 ? '+' : ''}{score}]
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-black/80 rounded-full overflow-hidden relative border border-white/10">
                      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/20 z-10" />
                      <div 
                        className="h-full bg-white transition-all duration-1000 ease-out relative z-0" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[8px] sm:text-[9px] text-white/30 tracking-widest uppercase">
                      <span className="w-16 text-left">Angry</span>
                      <span className="w-16 text-center">Neutral</span>
                      <span className="w-16 text-right">Favorable</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Status Modal (MC Stats + Equipped Clothes) ─────────────────────────────

function StatusModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { mcStats, equippedClothes } = useGameStore();

  if (!isOpen) return null;

  const statLabels: Record<string, { label: string; icon: string; low: string; high: string }> = {
    energy: { label: 'Energy', icon: '⚡', low: 'Exhausted', high: 'Energised' },
    cleanliness: { label: 'Cleanliness', icon: '✦', low: 'Filthy', high: 'Pristine' },
  };

  const clothingIcons: Record<string, string> = {
    tops: '👕',
    bottoms: '👖',
    shoes: '👟',
    under: '🩲',
    over: '🧥',
    accessories: '💍',
  };

  const formatItemName = (id: string) => id.replace(/_/g, ' ');

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded flex flex-col shadow-2xl max-h-[80vh]">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
          <h2 className="text-white text-lg tracking-[0.2em] uppercase font-light">
            Status
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors px-2 py-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* ── Stats Section ── */}
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-4 border-b border-white/5 pb-2">Vitals</h3>
            <div className="space-y-5">
              {Object.entries(mcStats).map(([key, value]) => {
                const meta = statLabels[key] || { label: key, icon: '●', low: 'Low', high: 'High' };
                const clampedValue = Math.max(0, Math.min(100, value));
                const hue = (clampedValue / 100) * 120;

                return (
                  <div key={key} className="flex flex-col gap-2.5">
                    <div className="flex justify-between items-end">
                      <span className="text-white tracking-[0.2em] uppercase text-sm font-medium flex items-center gap-2">
                        <span className="text-base opacity-60">{meta.icon}</span>
                        {meta.label}
                      </span>
                      <span className="text-white/50 font-mono text-[10px] tracking-widest">
                        {clampedValue}/100
                      </span>
                    </div>

                    <div className="w-full h-2 bg-black/80 rounded-full overflow-hidden relative border border-white/10">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${clampedValue}%`,
                          backgroundColor: `hsl(${hue}, 70%, 50%)`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between text-[8px] sm:text-[9px] text-white/30 tracking-widest uppercase">
                      <span>{meta.low}</span>
                      <span>{meta.high}</span>
                    </div>
                  </div>
                );
              })}

              {Object.keys(mcStats).length === 0 && (
                <div className="text-center text-white/30 uppercase tracking-widest text-xs">
                  No Stats Tracked.
                </div>
              )}
            </div>
          </div>

          {/* ── Equipped Clothes Section ── */}
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-4 border-b border-white/5 pb-2">Equipped Clothing</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(equippedClothes).map(([category, itemId]) => (
                <div
                  key={category}
                  className="flex items-center gap-3 p-3 border border-white/5 bg-white/[0.02] rounded"
                >
                  <span className="text-lg opacity-50">{clothingIcons[category] || '●'}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-white/35">{category}</span>
                    <span className="text-xs text-white/70 uppercase tracking-wide truncate">
                      {itemId === 'none' ? '—' : formatItemName(itemId)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Wardrobe Modal ──────────────────────────────────────────────────────────

const CATEGORY_ORDER: ClothingCategory[] = ['tops', 'bottoms', 'shoes', 'under', 'over', 'accessories'];

const CATEGORY_LABELS: Record<ClothingCategory, { label: string; icon: string }> = {
  tops: { label: 'Tops', icon: '👕' },
  bottoms: { label: 'Bottoms', icon: '👖' },
  shoes: { label: 'Shoes', icon: '👟' },
  under: { label: 'Under', icon: '🩲' },
  over: { label: 'Over', icon: '🧥' },
  accessories: { label: 'Accessories', icon: '💍' },
};

function WardrobeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { equippedClothes, unlockedClothes, equipItem } = useGameStore();

  if (!isOpen) return null;

  const formatName = (id: string) => id.replace(/_/g, ' ');

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-neutral-900 border border-white/10 rounded flex flex-col shadow-2xl h-[80vh] max-h-[700px]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40 flex-shrink-0">
          <h2 className="text-white text-lg tracking-[0.2em] uppercase font-light">
            Wardrobe
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors px-2 py-1">✕</button>
        </div>

        {/* Body: Two-column layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* ── Left Column: Item Grid ── */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 border-r border-white/5">
            {CATEGORY_ORDER.map((category) => {
              const items = unlockedClothes[category];
              const equipped = equippedClothes[category];
              const meta = CATEGORY_LABELS[category];

              return (
                <div key={category}>
                  {/* Category Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm opacity-50">{meta.icon}</span>
                    <h3 className="text-[10px] uppercase tracking-[0.25em] text-white/40">{meta.label}</h3>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>

                  {/* Horizontal scrollable item row */}
                  {items.length === 0 ? (
                    <div className="text-[10px] text-white/20 uppercase tracking-widest pl-1">
                      No items unlocked
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                      {items.map((itemId) => {
                        const isEquipped = equipped === itemId;
                        return (
                          <button
                            key={itemId}
                            onClick={() => equipItem(category, itemId)}
                            className={`
                              flex-shrink-0 w-[100px] h-[100px] rounded
                              flex flex-col items-center justify-center gap-2
                              border transition-all duration-200
                              ${isEquipped
                                ? 'border-white/60 bg-white/10 shadow-[0_0_12px_rgba(255,255,255,0.08)]'
                                : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/[0.05]'
                              }
                              cursor-pointer group
                            `}
                          >
                            <img
                              src={`https://placehold.co/60x60/1a1a1a/666666?text=${encodeURIComponent(formatName(itemId).slice(0, 8))}`}
                              alt={formatName(itemId)}
                              className="w-[52px] h-[52px] rounded object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                              draggable={false}
                            />
                            <span className={`
                              text-[8px] uppercase tracking-[0.1em] text-center leading-tight px-1 truncate w-full
                              ${isEquipped ? 'text-white/80' : 'text-white/40 group-hover:text-white/60'}
                            `}>
                              {formatName(itemId)}
                            </span>
                            {isEquipped && (
                              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white/50" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Right Column: Character Preview ── */}
          <div className="w-[240px] flex-shrink-0 flex flex-col items-center p-5 bg-black/20">
            <div className="sticky top-0 flex flex-col items-center gap-5 w-full">
              {/* Character silhouette placeholder */}
              <div className="w-[160px] h-[280px] rounded border border-white/10 bg-black/40 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />
                <div className="flex flex-col items-center gap-2 relative z-10">
                  {/* Simple stick-figure silhouette */}
                  <div className="w-10 h-10 rounded-full border border-white/20 bg-white/[0.04]" />
                  <div className="w-px h-12 bg-white/15" />
                  <div className="w-16 h-px bg-white/15" />
                  <div className="flex gap-6">
                    <div className="w-px h-10 bg-white/15" />
                    <div className="w-px h-10 bg-white/15" />
                  </div>
                  <span className="text-[8px] text-white/25 uppercase tracking-widest mt-2">Preview</span>
                </div>
              </div>

              {/* Equipped items summary */}
              <div className="w-full space-y-2">
                <h4 className="text-[9px] uppercase tracking-[0.2em] text-white/30 text-center mb-3">Currently Wearing</h4>
                {CATEGORY_ORDER.map((category) => {
                  const itemId = equippedClothes[category];
                  const meta = CATEGORY_LABELS[category];
                  return (
                    <div
                      key={category}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded bg-white/[0.02]"
                    >
                      <span className="text-xs opacity-40">{meta.icon}</span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[7px] uppercase tracking-[0.15em] text-white/25">{meta.label}</span>
                        <span className="text-[10px] text-white/60 uppercase tracking-wide truncate">
                          {itemId === 'none' ? '—' : formatName(itemId)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inventory Modal ─────────────────────────────────────────────────────────

function InventoryModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { inventory } = useGameStore();

  if (!isOpen) return null;

  const formatName = (id: string) => id.replace(/_/g, ' ');

  // Pad to a minimum of 20 slots for the classic RPG bag look
  const GRID_SLOTS = Math.max(20, inventory.length);

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-neutral-900 border border-white/10 rounded flex flex-col shadow-2xl max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40 flex-shrink-0">
          <h2 className="text-white text-lg tracking-[0.2em] uppercase font-light">
            Inventory
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-white/30 tracking-widest uppercase">
              {inventory.length} item{inventory.length !== 1 ? 's' : ''}
            </span>
            <button onClick={onClose} className="text-white/50 hover:text-white transition-colors px-2 py-1">✕</button>
          </div>
        </div>

        {/* Grid Body */}
        <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          <div
            className="grid gap-2.5"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            }}
          >
            {Array.from({ length: GRID_SLOTS }).map((_, i) => {
              const item = inventory[i];

              if (item) {
                return (
                  <div
                    key={item.id}
                    className="relative aspect-square rounded border border-white/15 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/30 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 p-2 group"
                  >
                    {/* Icon placeholder */}
                    <img
                      src={`https://placehold.co/100x100/1a1a1a/666666?text=${encodeURIComponent(formatName(item.id).slice(0, 8))}`}
                      alt={item.name}
                      className="w-[48px] h-[48px] rounded object-cover opacity-60 group-hover:opacity-90 transition-opacity"
                      draggable={false}
                    />

                    {/* Item name */}
                    <span className="text-[8px] text-white/50 uppercase tracking-[0.1em] text-center leading-tight truncate w-full group-hover:text-white/70 transition-colors">
                      {item.name}
                    </span>

                    {/* Quantity badge */}
                    <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono text-white/40 bg-black/60 rounded px-1 py-0.5 leading-none border border-white/5">
                      ×{item.qty}
                    </span>
                  </div>
                );
              }

              // Empty slot
              return (
                <div
                  key={`empty-${i}`}
                  className="aspect-square rounded border border-white/5 bg-white/[0.01]"
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dialogue Box ────────────────────────────────────────────────────────────

interface DialogueBoxProps {
  scene: StoryData[string];
  speaker: string;
  displayed: string;
  done: boolean;
  isLastLine: boolean;
  skip: () => void;
  onAdvanceLine: () => void;
  onChoice: (choice: Choice) => void;
  onNextScene: (sceneId: string) => void;
  disabled: boolean;
  onOpenModal: (mode: ModalMode) => void;
  onOpenDirectory: () => void;
  onOpenStatus: () => void;
  onOpenInventory: () => void;
}

function DialogueBox({ scene, speaker, displayed, done, isLastLine, skip, onAdvanceLine, onChoice, onNextScene, disabled, onOpenModal, onOpenDirectory, onOpenStatus, onOpenInventory }: DialogueBoxProps) {
  const { relationships, equippedClothes, inventory, money, currentTime, toggleRestartModal } = useGameStore();

  const handleBoxClick = () => {
    if (!done) {
      // Typewriter still running — skip to end of current line
      skip();
    } else if (!isLastLine) {
      // More lines in the sequence — advance to the next one
      onAdvanceLine();
    } else {
      // Last line of the sequence
      if (scene.choices && scene.choices.length > 0) {
        // Choices are present — do nothing, force the player to pick
        return;
      }
      if (scene.nextSceneId && !disabled) {
        onNextScene(scene.nextSceneId);
      }
    }
  };

  // Whether to show the "click to continue" hint
  const showContinueHint = !done || (!isLastLine) || (isLastLine && scene.nextSceneId && (!scene.choices || scene.choices.length === 0));

  return (
    <div
      className="vn-dialogue-panel absolute inset-x-0 bottom-0 z-20 px-4 pb-4 sm:px-8 sm:pb-8"
      onClick={handleBoxClick}
    >
      <div className="max-w-5xl mx-auto w-full relative">
        {/* Quick Menu */}
        <div className="vn-quick-menu absolute -top-8 right-2 flex items-center gap-5 text-[10px] sm:text-xs tracking-[0.2em] text-white/30 uppercase z-30">
          <button className="hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); onOpenStatus(); }}>Status</button>
          <button className="hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); onOpenDirectory(); }}>Directory</button>
          <button className="hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); onOpenInventory(); }}>Inventory</button>
          <button className="hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); onOpenModal('save'); }}>Save</button>
          <button className="hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); onOpenModal('load'); }}>Load</button>
          <button 
            className="hover:text-red-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); toggleRestartModal(true); }}
          >
            Restart
          </button>
        </div>

        <div
          className="vn-dialogue-inner backdrop-blur-md bg-neutral-950/90 border-t border-white/10 p-6 sm:p-8 cursor-pointer relative"
        >
          {/* Speaker Name */}
          <div className="vn-speaker mb-4">
            <span className="text-white text-sm sm:text-base tracking-[0.15em] font-medium uppercase">
              {speaker}
            </span>
          </div>

          {/* Dialogue text */}
          <p className="vn-dialogue-text text-white/80 leading-relaxed min-h-[6rem] text-base sm:text-lg font-light tracking-wide">
            {displayed}
            {!done && (
              <span className="inline-block w-2 h-4 ml-1 align-middle animate-blink bg-white/50" />
            )}
          </p>

          {/* Choices — only shown on the last line of the sequence */}
          {done && isLastLine && scene.choices && scene.choices.length > 0 && (
            <div className="vn-choices mt-6 flex flex-col gap-3">
              {scene.choices.map((choice, i) => {
                let reqMet = true;
                let lockReason = '';

                // Check relationship requirements
                if (choice.requires) {
                  for (const [char, reqScore] of Object.entries(choice.requires)) {
                    if ((relationships[char] || 0) < reqScore) {
                      reqMet = false;
                      lockReason = `Req: ${Object.entries(choice.requires).map(([c, s]) => `${c} ${s}`).join(', ')}`;
                      break;
                    }
                  }
                }

                // Check clothing requirements
                if (reqMet && choice.requiresClothes) {
                  for (const [cat, itemId] of Object.entries(choice.requiresClothes)) {
                    if (equippedClothes[cat as keyof typeof equippedClothes] !== itemId) {
                      reqMet = false;
                      lockReason = `Requires: ${itemId.replace(/_/g, ' ')}`;
                      break;
                    }
                  }
                }

                // Check inventory item requirements
                if (reqMet && choice.requiresItem) {
                  const held = inventory.find((item) => item.id === choice.requiresItem!.id);
                  const heldQty = held?.qty ?? 0;
                  if (heldQty < choice.requiresItem.qty) {
                    reqMet = false;
                    lockReason = `Requires: ${choice.requiresItem.id.replace(/_/g, ' ')} ×${choice.requiresItem.qty}`;
                  }
                }

                // Check money cost requirement
                if (reqMet && choice.moneyCost !== undefined && choice.moneyCost > money) {
                  reqMet = false;
                  lockReason = `Requires: ¤${choice.moneyCost.toLocaleString()} (have ¤${money.toLocaleString()})`;
                }

                // Check time maximum requirement (too late)
                if (reqMet && choice.requiresTimeMax !== undefined && currentTime > choice.requiresTimeMax) {
                  reqMet = false;
                  lockReason = `Too late — needed before ${formatTime(choice.requiresTimeMax)}`;
                }

                // Check time minimum requirement (too early)
                if (reqMet && choice.requiresTimeMin !== undefined && currentTime < choice.requiresTimeMin) {
                  reqMet = false;
                  lockReason = `Too early — available after ${formatTime(choice.requiresTimeMin)}`;
                }

                return (
                  <button
                    key={`${choice.nextSceneId}-${i}`}
                    disabled={disabled || !reqMet}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChoice(choice);
                    }}
                    className={`
                      choice-stagger-${i}
                      animate-fade-in-up
                      group relative w-full text-left px-6 py-4
                      border border-white/10 text-xs sm:text-sm uppercase tracking-[0.15em]
                      transition-all duration-300 ease-out
                      ${reqMet 
                        ? 'bg-black/40 text-white/70 cursor-pointer hover:bg-white hover:text-black hover:border-white active:scale-[0.99]' 
                        : 'bg-black/20 text-white/20 cursor-not-allowed'
                      }
                    `}
                  >
                    {choice.text}

                    {/* Lock reason indicator (relationship or clothing) */}
                    {!reqMet && lockReason && (
                      <span className="float-right text-[10px] text-white/30 mt-0.5">
                        [{lockReason}]
                      </span>
                    )}

                    {/* Relationship change indicators */}
                    {reqMet && choice.relationshipChange && (
                      <span className="float-right text-[10px] text-white/30 mt-0.5 space-x-2 group-hover:text-black/50 transition-colors">
                        {Object.entries(choice.relationshipChange).map(([char, delta]) => (
                           <span key={char}>
                             {delta > 0 ? '+' : ''}{delta} {char}
                           </span>
                        ))}
                      </span>
                    )}

                    {/* Money cost/reward indicators */}
                    {reqMet && choice.moneyCost !== undefined && (
                      <span className="float-right text-[10px] text-amber-400/50 mt-0.5 ml-2 group-hover:text-amber-600 transition-colors">
                        -¤{choice.moneyCost.toLocaleString()}
                      </span>
                    )}
                    {reqMet && choice.moneyReward !== undefined && (
                      <span className="float-right text-[10px] text-emerald-400/50 mt-0.5 ml-2 group-hover:text-emerald-600 transition-colors">
                        +¤{choice.moneyReward.toLocaleString()}
                      </span>
                    )}

                    {/* Time cost indicator */}
                    {reqMet && choice.timePassed !== undefined && (
                      <span className="float-right text-[10px] text-sky-400/50 mt-0.5 ml-2 group-hover:text-sky-600 transition-colors">
                        🕐 {choice.timePassed}m
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Continue hint */}
          {showContinueHint && (
            <div className="vn-continue-hint absolute bottom-4 right-6 text-white/20 text-xs tracking-widest uppercase animate-pulse font-sans">
              Tap to continue
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Hotbar ───────────────────────────────────────────────────────────
// Hidden by default; revealed via CSS media query on mobile landscape.

interface MobileHotbarProps {
  onOpenStatus: () => void;
  onOpenDirectory: () => void;
  onOpenWardrobe: () => void;
  onOpenInventory: () => void;
  onSave: () => void;
  onLoad: () => void;
  onRestart: () => void;
}

function MobileHotbar({ onOpenStatus, onOpenDirectory, onOpenWardrobe, onOpenInventory, onSave, onLoad, onRestart }: MobileHotbarProps) {
  const btnClass = "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-white/40 active:text-white active:bg-white/10 transition-colors";
  const iconClass = "w-[18px] h-[18px]";
  const labelClass = "text-[7px] tracking-[0.1em] uppercase leading-none";

  return (
    <div className="vn-mobile-hotbar absolute bottom-0 inset-x-0 z-[60] h-12 hidden items-center bg-neutral-950/90 backdrop-blur-md border-t border-white/10">
      <button className={btnClass} onClick={onOpenStatus}>
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <span className={labelClass}>Status</span>
      </button>

      <button className={btnClass} onClick={onOpenDirectory}>
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span className={labelClass}>Directory</span>
      </button>

      <button className={btnClass} onClick={onOpenWardrobe}>
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
        <span className={labelClass}>Wardrobe</span>
      </button>

      <button className={btnClass} onClick={onOpenInventory}>
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
        </svg>
        <span className={labelClass}>Items</span>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10 flex-shrink-0" />

      <button className={btnClass} onClick={onSave}>
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
        </svg>
        <span className={labelClass}>Save</span>
      </button>

      <button className={btnClass} onClick={onLoad}>
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span className={labelClass}>Load</span>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10 flex-shrink-0" />

      <button className={`${btnClass} !text-red-400/40 active:!text-red-400 active:!bg-red-500/10`} onClick={onRestart}>
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
        <span className={labelClass}>Reset</span>
      </button>
    </div>
  );
}

// ─── Main Engine ─────────────────────────────────────────────────────────────

export default function VisualNovelEngine() {
  const { currentSceneId, currentLineIndex, setScene, advanceLine, updateRelationship, updateMcStat, addItem, money, updateMoney, currentTime, advanceTime, isRestartModalOpen, toggleRestartModal, resetStore } = useGameStore();
  const scene = story[currentSceneId];

  // Derive current sequence line
  const currentLine = scene?.sequence?.[currentLineIndex];
  const isLastLine = scene ? currentLineIndex >= scene.sequence.length - 1 : true;
  const { displayed, done, skip } = useTypewriter(currentLine?.text ?? '', 25);

  const [fading, setFading] = useState(false);
  const [sceneVisible, setSceneVisible] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [mcStatusOpen, setMcStatusOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: number, text: string, color: string }>>([]);
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);

  // Pre-load background images and character sprites for smoother transitions
  useEffect(() => {
    if (!scene) return;
    const preload = (id: string) => {
      const next = story[id];
      if (next?.backgroundImage) {
        const img = new Image();
        img.src = next.backgroundImage;
      }
      // Preload multi-sprite array
      if (next?.charactersOnScreen) {
        next.charactersOnScreen.forEach((char: CharacterOnScreen) => {
          const img = new Image();
          img.src = char.spriteUrl;
        });
      }
      // Legacy single-sprite fallback
      if (next?.characterSprite) {
        const img = new Image();
        img.src = next.characterSprite;
      }
    };
    if (scene.nextSceneId) preload(scene.nextSceneId);
    if (scene.choices) {
      scene.choices.forEach(c => preload(c.nextSceneId));
    }
  }, [scene]);

  const advanceScene = useCallback((nextId: string) => {
    if (fading) return;
    setFading(true);

    setTimeout(() => {
      setScene(nextId);
      setSceneVisible(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSceneVisible(true);
          setFading(false);
        });
      });
    }, 600);
  }, [fading, setScene]);

  const handleChoice = useCallback(
    (choice: Choice) => {
      const newNotifications: Array<{ id: number, text: string, color: string }> = [];
      const addNotif = (text: string, color: string) => {
        newNotifications.push({ id: Date.now() + Math.random(), text, color });
      };

      if (choice.relationshipChange) {
        Object.entries(choice.relationshipChange).forEach(([char, delta]) => {
          updateRelationship(char, delta);
          addNotif(`${delta > 0 ? '+' : ''}${delta} ${char}`, delta > 0 ? 'text-pink-400' : 'text-red-400');
        });
      }
      if (choice.mcStatChange) {
        Object.entries(choice.mcStatChange).forEach(([stat, delta]) => {
          updateMcStat(stat as 'energy' | 'cleanliness', delta);
          addNotif(`${delta > 0 ? '+' : ''}${delta} ${stat}`, delta > 0 ? 'text-emerald-400' : 'text-red-400');
        });
      }
      if (choice.itemRewards) {
        choice.itemRewards.forEach((reward) => {
          addItem(reward.id, reward.name, reward.qty);
          addNotif(`+${reward.qty} ${reward.name.replace(/_/g, ' ')}`, 'text-blue-400');
        });
      }
      if (choice.moneyCost !== undefined) {
        updateMoney(-choice.moneyCost);
        addNotif(`-¤${choice.moneyCost}`, 'text-amber-500');
      }
      if (choice.moneyReward !== undefined) {
        updateMoney(choice.moneyReward);
        addNotif(`+¤${choice.moneyReward}`, 'text-amber-300');
      }
      if (choice.timePassed !== undefined) {
        advanceTime(choice.timePassed);
        addNotif(`-${choice.timePassed}m`, 'text-sky-400');
      }

      if (newNotifications.length > 0) {
        setNotifications(prev => [...prev, ...newNotifications]);
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => !newNotifications.find(nn => nn.id === n.id)));
        }, 2000);
      }

      advanceScene(choice.nextSceneId);
    },
    [advanceScene, updateRelationship, updateMcStat, addItem, updateMoney, advanceTime]
  );

  // ── Error state ──────────────────────────────────────────────────────────

  if (!scene) {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-screen bg-black text-white gap-4">
        <span className="text-white font-sans tracking-widest uppercase text-xl">Scene Not Found</span>
        <span className="text-white/50 font-sans text-sm">
          No scene with ID "<code className="text-white/80">{currentSceneId}</code>" exists.
        </span>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* ── Background ──────────────────────────────────────── */}
      <img
        key={scene.backgroundImage}
        src={scene.backgroundImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{ opacity: sceneVisible ? 1 : 0 }}
        draggable={false}
      />



      {/* Bottom gradient for dialogue legibility */}
      <div
        className="vn-gradient absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 45%, transparent 100%)',
        }}
      />

      {/* ── Top-Left Money HUD ────────────────────────────────── */}
      <div className="vn-hud-money absolute top-6 left-8 z-40">
        <div className="flex items-center gap-3 bg-gradient-to-b from-amber-500 to-amber-700 px-6 py-3 rounded-lg border-2 border-amber-300/50 shadow-[0_8px_16px_rgba(0,0,0,0.6),_inset_0_2px_4px_rgba(255,255,255,0.4)] transform hover:scale-105 transition-transform duration-300">
          <span className="text-amber-100 text-3xl font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] font-sans">
            ¤
          </span>
          <span className="text-white text-3xl font-black tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-serif">
            {money.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Top-Right Clock HUD ───────────────────────────────── */}
      <div className="vn-hud-clock absolute top-6 right-8 z-50">
        <div 
          onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
          className="flex items-center gap-3 backdrop-blur-md bg-neutral-950/70 border border-white/10 px-5 py-2.5 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:bg-neutral-900/80 transition-all duration-300 group cursor-pointer relative"
        >
          {/* SVG Clock Icon */}
          <svg
            className={`w-5 h-5 transition-colors duration-300 flex-shrink-0 ${timeDropdownOpen ? 'text-white' : 'text-white/40 group-hover:text-white/60'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>

          {/* Time Display */}
          <span className={`text-sm font-medium tracking-[0.2em] font-mono uppercase transition-colors duration-300 ${timeDropdownOpen ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>
            {formatTime(currentTime)}
          </span>
        </div>

        {/* Time Dropdown */}
        {timeDropdownOpen && (
          <div className="absolute top-full right-0 mt-2 w-full backdrop-blur-md bg-neutral-950/90 border border-white/10 rounded overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col z-50 animate-fade-in">
            {[5, 15, 30].map(mins => (
              <button
                key={mins}
                onClick={(e) => {
                  e.stopPropagation();
                  advanceTime(mins);
                  const notif = { id: Date.now() + Math.random(), text: `-${mins}m`, color: 'text-sky-400' };
                  setNotifications(prev => [...prev, notif]);
                  setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== notif.id)), 2000);
                  setTimeDropdownOpen(false);
                }}
                className="px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/50 hover:bg-white/10 hover:text-white transition-colors text-right border-b border-white/5 last:border-0"
              >
                +{mins} mins
              </button>
            ))}
          </div>
        )}

        {/* Notifications HUD */}
        <div className={`absolute right-0 flex flex-col items-end gap-2 pointer-events-none transition-all duration-300 ${timeDropdownOpen ? 'top-[calc(100%+140px)]' : 'top-full mt-4'}`}>
          {notifications.map(notif => (
            <div key={notif.id} className={`animate-fade-out-up font-bold font-mono tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-sm uppercase ${notif.color}`}>
              {notif.text}
            </div>
          ))}
        </div>
      </div>

      {/* ── Left-edge Toggles ────────────────────────────────── */}
      <div className="vn-edge-toggle absolute left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
        <button 
          onClick={() => setDirectoryOpen(true)}
          className="bg-neutral-950/80 backdrop-blur-md border border-white/10 border-l-0 rounded-r-md py-6 px-1.5 hover:bg-white/10 transition-colors flex items-center justify-center group"
        >
          <span 
            className="text-[9px] text-white/30 tracking-[0.3em] uppercase group-hover:text-white transition-colors" 
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Directory
          </span>
        </button>
        <button 
          onClick={() => setWardrobeOpen(true)}
          className="bg-neutral-950/80 backdrop-blur-md border border-white/10 border-l-0 rounded-r-md py-6 px-1.5 hover:bg-white/10 transition-colors flex items-center justify-center group"
        >
          <span 
            className="text-[9px] text-white/30 tracking-[0.3em] uppercase group-hover:text-white transition-colors" 
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Wardrobe
          </span>
        </button>
      </div>

      {/* ── Right-edge MC Status Toggle ───────────────────────── */}
      <div className="vn-edge-toggle absolute right-0 top-1/2 -translate-y-1/2 z-40">
        <button 
          onClick={() => setMcStatusOpen(true)}
          className="bg-neutral-950/80 backdrop-blur-md border border-white/10 border-r-0 rounded-l-md py-6 px-1.5 hover:bg-white/10 transition-colors flex items-center justify-center group"
        >
          <span 
            className="text-[9px] text-white/30 tracking-[0.3em] uppercase group-hover:text-white transition-colors" 
            style={{ writingMode: 'vertical-rl' }}
          >
            MC Status
          </span>
        </button>
      </div>

      {/* ── Character Sprites (Multi-Sprite Rendering) ────────── */}
      {scene.charactersOnScreen && scene.charactersOnScreen.length > 0 && (
        <div className="vn-sprite-layer absolute inset-0 z-10 pointer-events-none">
          {scene.charactersOnScreen.map((char, idx) => {
            // Position classes based on char.position
            const positionStyles: Record<string, string> = {
              left: 'left-0 sm:left-8',
              center: 'left-1/2 -translate-x-1/2',
              right: 'right-0 sm:right-8',
            };

            return (
              <img
                key={`${char.name}-${char.position}-${idx}`}
                src={char.spriteUrl}
                alt={char.name}
                draggable={false}
                className={`absolute bottom-0 h-[75vh] object-contain transition-opacity duration-700 ${positionStyles[char.position] || positionStyles.center}`}
                style={{
                  opacity: sceneVisible ? 1 : 0,
                  filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))',
                  background: 'transparent',
                }}
              />
            );
          })}
        </div>
      )}

      {/* ── Legacy Single Sprite Fallback ─────────────────────── */}
      {!scene.charactersOnScreen && scene.characterSprite && (
        <img
          key={scene.characterSprite}
          src={scene.characterSprite}
          alt={currentLine?.speaker ?? ''}
          draggable={false}
          className="absolute bottom-0 left-0 sm:left-12 z-10 h-[75vh] object-contain transition-opacity duration-700 pointer-events-none"
          style={{
            opacity: sceneVisible ? 1 : 0,
            filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))',
          }}
        />
      )}

      {/* ── Dialogue Box ─────────────────────────────────────── */}
      <DialogueBox
        scene={scene}
        speaker={currentLine?.speaker ?? ''}
        displayed={displayed}
        done={done}
        isLastLine={isLastLine}
        skip={skip}
        onAdvanceLine={advanceLine}
        onChoice={handleChoice}
        onNextScene={advanceScene}
        disabled={fading}
        onOpenModal={setModalMode}
        onOpenDirectory={() => setDirectoryOpen(true)}
        onOpenStatus={() => setStatusOpen(true)}
        onOpenInventory={() => setInventoryOpen(true)}
      />

      {/* ── Mobile Hotbar ───────────────────────────────────── */}
      <MobileHotbar
        onOpenStatus={() => { setMcStatusOpen(true); setStatusOpen(true); }}
        onOpenDirectory={() => setDirectoryOpen(true)}
        onOpenWardrobe={() => setWardrobeOpen(true)}
        onOpenInventory={() => setInventoryOpen(true)}
        onSave={() => setModalMode('save')}
        onLoad={() => setModalMode('load')}
        onRestart={() => toggleRestartModal(true)}
      />

      {/* ── Transition Overlay ───────────────────────────────── */}
      <div
        className="vn-transition-overlay absolute inset-0 bg-black z-40 pointer-events-none transition-opacity duration-[600ms]"
        style={{ opacity: fading ? 1 : 0 }}
      />

      {/* ── Save/Load Modal ──────────────────────────────────── */}
      <SaveLoadModal 
        mode={modalMode} 
        onClose={() => setModalMode(null)} 
      />

      {/* ── Directory Modal ──────────────────────────────────── */}
      <DirectoryModal 
        isOpen={directoryOpen}
        onClose={() => setDirectoryOpen(false)}
      />

      {/* ── MC Status Modal ──────────────────────────────────── */}
      <StatusModal
        isOpen={mcStatusOpen || statusOpen}
        onClose={() => { setMcStatusOpen(false); setStatusOpen(false); }}
      />

      {/* ── Wardrobe Modal ────────────────────────────────────── */}
      <WardrobeModal
        isOpen={wardrobeOpen}
        onClose={() => setWardrobeOpen(false)}
      />

      {/* ── Inventory Modal ───────────────────────────────────── */}
      <InventoryModal
        isOpen={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
      />

      {/* ── Restart Confirmation Modal ─────────────────────────── */}
      {isRestartModalOpen && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-neutral-900 border border-white/10 rounded shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 bg-black/40">
              <h2 className="text-white text-lg tracking-[0.2em] uppercase font-light text-center">
                Restart Game?
              </h2>
            </div>
            <div className="p-6 text-center">
              <p className="text-white/50 text-sm tracking-wide leading-relaxed mb-6">
                All progress, inventory, relationships, and money will be lost. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => toggleRestartModal(false)}
                  className="flex-1 py-3 px-4 border border-white/10 text-white/60 text-xs uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { resetStore(); }}
                  className="flex-1 py-3 px-4 border border-red-500/30 bg-red-500/10 text-red-400 text-xs uppercase tracking-[0.2em] hover:bg-red-500/30 hover:text-red-300 transition-all duration-200"
                >
                  Confirm Restart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
