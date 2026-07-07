import { app, screen, type BrowserWindow, type Rectangle } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface WindowState {
  width: number;
  height: number;
  /** Absent when there is no usable saved position; Electron then centers the window. */
  x?: number;
  y?: number;
  isMaximized: boolean;
}

// Keep in sync with the minWidth/minHeight passed to BrowserWindow in main.ts.
const MIN_WIDTH = 1024;
const MIN_HEIGHT = 700;

const DEFAULT_STATE: WindowState = { width: 1440, height: 900, isMaximized: false };

const SAVE_DEBOUNCE_MS = 500;

// Minimum part of the window that must land on a display for a saved
// position to be reused: enough width to see it and enough of the top edge
// to grab the title bar.
const VISIBLE_WIDTH = 100;
const VISIBLE_HEIGHT = 40;

function statePath(): string {
  return join(app.getPath('userData'), 'window-state.json');
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Coerce unknown JSON into a safe window state. Pure: display work areas are
 * passed in rather than read from `screen`, so the clamping logic is testable.
 */
export function sanitizeState(raw: unknown, workAreas: Rectangle[]): WindowState {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_STATE };
  const record = raw as Record<string, unknown>;

  const maxWidth = Math.max(...workAreas.map((area) => area.width), MIN_WIDTH);
  const maxHeight = Math.max(...workAreas.map((area) => area.height), MIN_HEIGHT);

  const width = Math.min(
    Math.max(finiteNumber(record.width) ?? DEFAULT_STATE.width, MIN_WIDTH),
    maxWidth,
  );
  const height = Math.min(
    Math.max(finiteNumber(record.height) ?? DEFAULT_STATE.height, MIN_HEIGHT),
    maxHeight,
  );

  const state: WindowState = { width, height, isMaximized: record.isMaximized === true };

  // Reuse the saved position only if the window's title-bar region would be
  // visible on some display; otherwise let Electron center it (covers a
  // window saved on a monitor that has since been unplugged).
  const x = finiteNumber(record.x);
  const y = finiteNumber(record.y);
  if (x !== undefined && y !== undefined) {
    const visible = workAreas.some(
      (area) =>
        x + VISIBLE_WIDTH <= area.x + area.width &&
        x + width - VISIBLE_WIDTH >= area.x &&
        y >= area.y &&
        y + VISIBLE_HEIGHT <= area.y + area.height,
    );
    if (visible) {
      state.x = x;
      state.y = y;
    }
  }

  return state;
}

/** Read the persisted window state. Call after app.whenReady (uses `screen`). */
export function loadWindowState(): WindowState {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(statePath(), 'utf8'));
  } catch {
    // Missing file (first launch), corrupt JSON, or unreadable file: start fresh.
    return { ...DEFAULT_STATE };
  }
  return sanitizeState(
    raw,
    screen.getAllDisplays().map((display) => display.workArea),
  );
}

/**
 * Persist the window's bounds and maximized flag: debounced on resize/move
 * (so hot restarts and crashes don't lose everything) and synchronously on
 * close. getNormalBounds() reports the pre-maximize bounds even while
 * maximized, so unmaximizing after a relaunch restores the original size.
 */
export function trackWindowState(win: BrowserWindow): void {
  let timer: NodeJS.Timeout | undefined;

  const save = (): void => {
    const state: WindowState = {
      ...win.getNormalBounds(),
      isMaximized: win.isMaximized(),
    };
    try {
      writeFileSync(statePath(), JSON.stringify(state));
    } catch {
      // A failed save must never take the app down; worst case the next
      // launch falls back to defaults.
    }
  };

  const scheduleSave = (): void => {
    clearTimeout(timer);
    timer = setTimeout(save, SAVE_DEBOUNCE_MS);
  };

  win.on('resize', scheduleSave);
  win.on('move', scheduleSave);
  win.on('close', () => {
    clearTimeout(timer);
    save();
  });
}
