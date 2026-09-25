import { useEffect, useState } from "react";
import { heroCardPortraitUrl, heroPortraitUrl, type Hero } from "../heroes/heroes";

type Entry = { image: HTMLImageElement; ready: boolean; failed: boolean; triedFallback: boolean };

const cache = new Map<number, Entry>();
const listeners = new Set<() => void>();
let notifyFrame = 0;

function notify(): void {
  if (notifyFrame) return;
  notifyFrame = requestAnimationFrame(() => {
    notifyFrame = 0;
    listeners.forEach((l) => l());
  });
}

/**
 * Loaded portrait or null (still loading, offline, or unknown hero). The
 * first call starts the download; subscribers are told when it arrives.
 * Images are drawn without CORS, so canvases showing them must never be
 * read back with getImageData.
 */
export function getPortrait(hero: Hero): HTMLImageElement | null {
  let entry = cache.get(hero.id);
  if (!entry) {
    const image = new Image();
    const created: Entry = { image, ready: false, failed: false, triedFallback: false };
    image.onload = () => {
      created.ready = true;
      notify();
    };
    image.onerror = () => {
      if (!created.triedFallback) {
        created.triedFallback = true;
        image.src = heroPortraitUrl(hero);
        return;
      }
      created.failed = true;
    };
    image.src = heroCardPortraitUrl(hero);
    cache.set(hero.id, created);
    entry = created;
  }
  return entry.ready ? entry.image : null;
}

/** Changes whenever new portraits finish loading; use as an effect dependency to redraw. */
export function usePortraitVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const listener = () => setVersion((v) => v + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return version;
}
