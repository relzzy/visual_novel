// ─── Story Data Types ────────────────────────────────────────────────────────

/** A single dialogue choice the player can pick. */
export interface Choice {
  /** The label shown on the choice button. */
  text: string;

  /** The scene to navigate to when this choice is picked. */
  nextSceneId: string;

  /**
   * Optional relationship changes applied when this choice is picked.
   * Maps character name to the relationship point delta (e.g., { "Touka": 5 }).
   */
  relationshipChange?: Record<string, number>;

  /**
   * Optional requirements for this choice to be available.
   * Maps character name to the minimum relationship points required (e.g., { "Touka": 15 }).
   */
  requires?: Record<string, number>;

  /**
   * Optional MC stat changes applied when this choice is picked.
   * Maps stat name to the delta (e.g., { "energy": -10 }).
   */
  mcStatChange?: Record<string, number>;

  /**
   * Optional outfit requirement for this choice to be available.
   * Specifies the required outfit ID (e.g., "school").
   */
  requiresOutfit?: string;

  /**
   * Optional items rewarded to the player when this choice is picked.
   * Each entry specifies the item id, display name, and quantity to grant.
   */
  itemRewards?: { id: string; name: string; qty: number }[];

  /**
   * Optional inventory item requirement for this choice to be available.
   * The player must possess at least `qty` of the item with the given `id`.
   */
  requiresItem?: { id: string; qty: number };

  /**
   * Optional money cost for this choice.
   * If the player's current money is strictly less than this value,
   * the choice button renders as disabled/greyed out.
   * The cost is deducted when the choice is picked.
   */
  moneyCost?: number;

  /**
   * Optional money reward granted when this choice is picked.
   */
  moneyReward?: number;

  /**
   * Optional time cost in minutes. When this choice is picked,
   * the in-game clock advances by this many minutes.
   * (e.g., 15 = 15 minutes spent cooking)
   */
  timePassed?: number;

  /**
   * Optional maximum allowed time (total minutes from midnight).
   * If currentTime exceeds this value, the choice is locked.
   * (e.g., 540 = must be before 9:00 AM)
   */
  requiresTimeMax?: number;

  /**
   * Optional minimum allowed time (total minutes from midnight).
   * If currentTime is below this value, the choice is locked.
   * (e.g., 360 = must be at least 6:00 AM)
   */
  requiresTimeMin?: number;
}

/** A character rendered on-screen during a scene. */
export interface CharacterOnScreen {
  /** The character's display name. */
  name: string;

  /** Path or URL to the character sprite image. */
  spriteUrl: string;

  /** Where on the stage the character should be positioned. */
  position: 'left' | 'center' | 'right';
}

/** A single line of dialogue within a scene's sequence. */
export interface SequenceLine {
  /** The name of the character speaking this line. */
  speaker: string;

  /** The dialogue text for this line. */
  text: string;
}

/** A single scene in the visual novel. */
export interface Scene {
  /** Path or URL to the background image displayed behind the dialogue. */
  backgroundImage: string;

  /**
   * @deprecated Use `charactersOnScreen` instead.
   * Path or URL to the character sprite shown on screen.
   */
  characterSprite?: string;

  /**
   * Array of dialogue lines for this scene.
   * Each entry contains a speaker name and their dialogue text.
   */
  sequence: SequenceLine[];

  /** The next scene to navigate to automatically when clicked (linear dialogue). */
  nextSceneId?: string;

  /** The choices available to the player at the end of this scene. */
  choices?: Choice[];

  /** Array of characters to render on screen during this scene. */
  charactersOnScreen?: CharacterOnScreen[];
}

/**
 * The full story database.
 * Keys are Scene IDs, values are Scene objects.
 */
export type StoryData = Record<string, Scene>;
