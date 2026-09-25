import { reserveIds } from "../model/ids";
import {
  DOTA_JSON_VERSION,
  defaultConversionSettings,
  type ConversionSettings,
  type GridDocument,
  type SymbolSettings,
} from "../model/types";
import { SYMBOL_PRESETS } from "../symbols/symbolSet";
import type { Layer, LibraryEntry } from "../compose/layers";

const STORAGE_KEY = "dota-hero-grid-art:v1";

/** Everything restored after a page reload. The photo itself is not stored. */
export type SavedSession = {
  doc: GridDocument;
  settings: ConversionSettings;
  symbols: SymbolSettings;
  library: LibraryEntry[];
  layers: Layer[];
  composeName: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validDocument(v: unknown): v is GridDocument {
  return (
    isRecord(v) &&
    v.version === DOTA_JSON_VERSION &&
    Array.isArray(v.configs) &&
    v.configs.length > 0 &&
    v.configs.every((c) => isRecord(c) && typeof c.id === "string" && Array.isArray(c.categories)) &&
    typeof v.activeConfigId === "string"
  );
}

function collectIds(s: SavedSession): string[] {
  const ids: string[] = [];
  for (const cfg of s.doc.configs) {
    ids.push(cfg.id);
    for (const c of cfg.categories) ids.push(c.id);
  }
  for (const e of s.library) {
    ids.push(e.id);
    for (const c of e.categories) ids.push(c.id);
  }
  for (const l of s.layers) {
    ids.push(l.id);
    for (const c of l.categories) ids.push(c.id);
  }
  return ids;
}

/** Saved session, or null when there is none or it is unreadable. */
export function loadSession(): SavedSession | null {
  let raw: unknown;
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return null;
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(raw) || !validDocument(raw.doc)) return null;
  const session: SavedSession = {
    doc: raw.doc,
    // Defaults first so settings added in later versions get sensible values.
    settings: { ...defaultConversionSettings(), ...(isRecord(raw.settings) ? raw.settings : {}) },
    symbols: { ...SYMBOL_PRESETS[0].settings, ...(isRecord(raw.symbols) ? raw.symbols : {}) },
    library: Array.isArray(raw.library) ? (raw.library as LibraryEntry[]) : [],
    layers: Array.isArray(raw.layers) ? (raw.layers as Layer[]) : [],
    composeName: typeof raw.composeName === "string" ? raw.composeName : "Сборка",
  };
  reserveIds(collectIds(session));
  return session;
}

/**
 * Store the session. If the browser quota is exceeded, the compose page
 * (usually the biggest part) is dropped and the document is kept.
 * Returns false when nothing could be saved.
 */
export function saveSession(session: SavedSession): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, library: [], layers: [] }));
      return true;
    } catch {
      return false;
    }
  }
}
