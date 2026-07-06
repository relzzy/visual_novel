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
  const { currentSceneId, relationships, mcStats, currentOutfit, inventory, money, currentTime, loadStore } = useGameStore();
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
        currentOutfit,
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
            currentOutfit: parsed.currentOutfit,
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
  const { mcStats, currentOutfit } = useGameStore();

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

          {/* ── Equipped Outfit Section ── */}
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-4 border-b border-white/5 pb-2">Current Outfit</h3>
            <div className="flex items-center gap-3 p-3 border border-white/5 bg-white/[0.02] rounded">
              <span className="text-lg opacity-50">🧥</span>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase tracking-[0.2em] text-white/35">Outfit</span>
                <span className="text-xs text-white/70 uppercase tracking-wide truncate">
                  {currentOutfit}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Wardrobe Modal ──────────────────────────────────────────────────────────

const OUTFITS = [
  { id: 'casual', name: 'Casual', img: '/assets/characters/mc_casual.png' },
  { id: 'college', name: 'College', img: '/assets/characters/mc_school_uniform-removebg-preview.png' },
  { id: 'sleepwear', name: 'Sleepwear', img: '/assets/characters/mc_sleepwear.png' },
];

function WardrobeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { currentOutfit, setOutfit } = useGameStore();

  if (!isOpen) return null;

  const activeOutfitObj = OUTFITS.find((o) => o.id === currentOutfit) || OUTFITS[0];

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
          {/* ── Left Column: Outfit Selection Cards ── */}
          <div className="flex-1 overflow-y-auto p-5 border-r border-white/5 flex flex-wrap gap-4 content-start">
            {OUTFITS.map((outfit) => {
              const isEquipped = currentOutfit === outfit.id;
              return (
                <button
                  key={outfit.id}
                  onClick={() => setOutfit(outfit.id)}
                  className={`
                    w-[120px] h-[160px] rounded flex flex-col items-center p-2
                    border transition-all duration-200 cursor-pointer group relative
                    ${isEquipped
                      ? 'border-white/60 bg-white/10 shadow-[0_0_12px_rgba(255,255,255,0.08)]'
                      : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/[0.05]'
                    }
                  `}
                >
                  <span className={`text-[10px] uppercase tracking-[0.15em] mb-2 text-center w-full truncate ${isEquipped ? 'text-white/90' : 'text-white/50 group-hover:text-white/70'}`}>
                    {outfit.name}
                  </span>
                  <div className="flex-1 w-full bg-black/50 border border-white/5 rounded overflow-hidden relative">
                    <img
                      src={outfit.img}
                      alt={outfit.name}
                      className="absolute inset-0 w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity"
                      draggable={false}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Right Column: Current Wear ── */}
          <div className="w-[300px] flex-shrink-0 flex flex-col items-center p-5 bg-black/20">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/40 text-center mb-4">Current Wear</h4>
            <div className="w-full flex-1 rounded border border-white/10 bg-black/40 relative overflow-hidden flex justify-center items-end">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
              <img
                key={activeOutfitObj.id}
                src={activeOutfitObj.img}
                alt={activeOutfitObj.name}
                className="w-[90%] h-[90%] object-contain object-bottom animate-fade-in z-0 relative"
                style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' }}
                draggable={false}
              />
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
  const { relationships, currentOutfit, inventory, money, currentTime, toggleRestartModal } = useGameStore();

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

                // Check outfit requirement
                if (reqMet && choice.requiresOutfit) {
                  if (currentOutfit !== choice.requiresOutfit) {
                    reqMet = false;
                    lockReason = `Requires: ${choice.requiresOutfit.replace(/_/g, ' ')}`;
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

// ─── Game Menu (Hamburger Dropdown) ──────────────────────────────────────────
// Always visible — positioned next to the money HUD as a hamburger icon.

interface GameMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onOpenStatus: () => void;
  onOpenDirectory: () => void;
  onOpenWardrobe: () => void;
  onOpenInventory: () => void;
  onSave: () => void;
  onLoad: () => void;
  onRestart: () => void;
}

function GameMenu({ isOpen, onToggle, onOpenStatus, onOpenDirectory, onOpenWardrobe, onOpenInventory, onSave, onLoad, onRestart }: GameMenuProps) {
  const menuItems = [
    { label: 'Status', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', icon2: 'M12 7a4 4 0 1 0 0-0.01', onClick: onOpenStatus },
    { label: 'Directory', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', icon2: 'M9 7a4 4 0 1 0 0-0.01', onClick: onOpenDirectory },
    { label: 'Wardrobe', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', onClick: onOpenWardrobe },
    { label: 'Inventory', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', onClick: onOpenInventory },
    { label: 'Save', icon: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z', onClick: onSave },
    { label: 'Load', icon: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z', onClick: onLoad },
  ];

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={onToggle}
        className={`
          w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200
          border backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.5)]
          ${isOpen
            ? 'bg-white/15 border-white/30 text-white'
            : 'bg-neutral-950/70 border-white/10 text-white/50 active:bg-white/15 active:text-white'
          }
        `}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {isOpen ? (
            <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
          ) : (
            <><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></>
          )}
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-44 backdrop-blur-xl bg-neutral-950/95 border border-white/10 rounded-lg overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.7)] z-[70] animate-fade-in">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => { item.onClick(); onToggle(); }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 text-left
                text-xs uppercase tracking-[0.15em] text-white/60
                active:bg-white/10 active:text-white transition-colors
                ${i < menuItems.length - 1 ? 'border-b border-white/5' : ''}
              `}
            >
              <svg className="w-4 h-4 flex-shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
                {item.icon2 && <path d={item.icon2} />}
              </svg>
              {item.label}
            </button>
          ))}

          {/* Restart — separated with stronger border */}
          <button
            onClick={() => { onRestart(); onToggle(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs uppercase tracking-[0.15em] text-red-400/60 active:bg-red-500/10 active:text-red-400 transition-colors border-t border-white/10"
          >
            <svg className="w-4 h-4 flex-shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Restart
          </button>
        </div>
      )}
    </>
  );
}

// ─── Main Engine ─────────────────────────────────────────────────────────────

export default function VisualNovelEngine() {
  const { currentSceneId, currentLineIndex, setScene, advanceLine, updateRelationship, updateMcStat, addItem, money, updateMoney, currentTime, advanceTime, isRestartModalOpen, toggleRestartModal, resetStore, currentOutfit } = useGameStore();
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
  const [gameMenuOpen, setGameMenuOpen] = useState(false);

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
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none" style={{ touchAction: 'manipulation' }}>
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

      {/* ── Top-Left: Money HUD + Menu Button ─────────────────── */}
      <div className="vn-hud-money absolute top-6 left-8 z-40 flex items-center gap-3">
        {/* Menu Button */}
        <div className="relative">
          <GameMenu
            isOpen={gameMenuOpen}
            onToggle={() => setGameMenuOpen(o => !o)}
            onOpenStatus={() => { setMcStatusOpen(true); setStatusOpen(true); }}
            onOpenDirectory={() => setDirectoryOpen(true)}
            onOpenWardrobe={() => setWardrobeOpen(true)}
            onOpenInventory={() => setInventoryOpen(true)}
            onSave={() => setModalMode('save')}
            onLoad={() => setModalMode('load')}
            onRestart={() => toggleRestartModal(true)}
          />
        </div>

        {/* Money Badge */}
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

            // MC Outfit Override
            let spriteUrl = char.spriteUrl;
            if (char.name === 'MC' || char.name === 'Akihito') {
              const OUTFITS: Record<string, string> = {
                'casual': '/assets/characters/mc_casual.png',
                'college': '/assets/characters/mc_school_uniform-removebg-preview.png',
                'sleepwear': '/assets/characters/mc_sleepwear.png',
              };
              spriteUrl = OUTFITS[currentOutfit] || OUTFITS['casual'];
            }

            return (
              <img
                key={`${char.name}-${char.position}-${idx}`}
                src={spriteUrl}
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
