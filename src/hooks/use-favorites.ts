import { useEffect, useState } from "react";

// Module-level favorite store (localStorage-backed). A module store is used
// instead of per-component state so every card shares the same list and
// toggling a heart anywhere updates all cards immediately. Phase 4 (user
// system) can swap the persistence layer for a per-user backend without
// changing the hook's API.
const KEY = "favorite-anime-ids";

function read(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

let favorites: number[] = read();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(favorites));
  } catch {
    // Storage unavailable (private mode, quota) — favorites just won't persist.
  }
}

export function useFavorites() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggle = (id: number) => {
    favorites = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    persist();
    notify();
  };

  return {
    ids: favorites,
    toggle,
    isFavorite: (id: number) => favorites.includes(id),
  };
}
