import { useEffect, useState } from "react";

// "Continue Watching" — a lightweight localStorage watch history recorded
// when the user plays an episode. Keyed by mal_id; the most recently watched
// entry floats to the top. Phase 4 keeps this client-side (a home server can
// later mirror it per-user via the backend).

export interface WatchHistoryEntry {
  mal_id: number;
  title: string;
  poster?: string;
  episode: number;
  updated_at: number;
}

const KEY = "watch-history";

function read(): WatchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let history: WatchHistoryEntry[] = read();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(history.slice(0, 20)));
  } catch {
    // Storage unavailable — history just won't persist.
  }
}

/** Record that the user watched `episode` of `anime`. */
export function recordWatch(entry: Omit<WatchHistoryEntry, "updated_at">) {
  history = [
    { ...entry, updated_at: Date.now() },
    ...history.filter((h) => h.mal_id !== entry.mal_id),
  ];
  persist();
  notify();
}

export function useWatchHistory() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return history;
}

export function clearWatchHistory() {
  history = [];
  persist();
  notify();
}
