/* The deck's shared types, for the type check only (tsconfig.site.json). No page loads this file. */

/** A sheet's index on the canvas, or "all" for the overview */
type Focus = number | "all";

/** What canvas.js hands system.js as window.canvas */
interface Canvas {
  boards: HTMLElement[];
  go(target: Focus, fly?: boolean): void;
  zoom(dir: number): void;
  focus(): Focus;
  /** after anything that changes the sheets' size, like a language switch */
  relayout(): void;
  onchange(fn: (focus: Focus, pct: number) => void): void;
  /** once a zoom settles and the sheets are laid out at it, with the zoom */
  onzoom(fn: (z: number) => void): void;
}

/** One language's strings by key, as in strings/en.js */
type Strings = Record<string, string>;

interface Window {
  canvas?: Canvas;
  /** every language's strings by its code: STRINGS.en, STRINGS.cs */
  STRINGS: Record<string, Strings>;
}

/** A board's box on the canvas, in sheet pixels */
interface Rect { x: number; y: number; w: number; h: number }

/** Where the canvas is drawn: its offset on screen and its scale */
interface View { x: number; y: number; s: number }

/** A pointer at a moment, for the coast after a drag */
interface Sample { x: number; y: number; t: number }

/** A drag on the canvas, from pointerdown to pointerup */
interface Drag {
  x: number; y: number;
  vx: number; vy: number;
  board: Element | null;
  moved: boolean;
  touch: boolean;
  hist: Sample[];
  /** started on a control, so it takes a longer move to become a pan */
  soft?: boolean;
}

/** A press on text, a click unless it selects */
interface Press { x: number; y: number; board: Element }

/** Two fingers: their distance and midpoint */
interface Pinch { d: number; x: number; y: number }

/** A row of cells under one ink block, what Seg in system.js returns */
interface CellRow {
  measure(): void;
  set(i: number, jump?: boolean): void;
}

/** A cell's place in its row, in the row's own pixels */
interface Slot { x: number; w: number; end: number }

/** Where a glyph's ink starts and ends, in ems from its origin */
interface Ink { left: number; right: number; top: number; bottom: number }
