/**
 * Recorded glove samples, shared by the Collect page's recorder and Movement Lab.
 * Kept in localStorage so a refresh mid-session doesn't lose local-only data.
 */
import { useSyncExternalStore } from "react";
import type { Features, Frame } from "./imu";

export type Recording = {
  timestamp: string;
  dbSessionId: number | null;
  localSessionId: string;
  participantId: string;
  letter: string;
  rep: number;
  mode: "static" | "movement";
  /** Window averages, same as the Supabase raw_f / pct_f columns. */
  raw: number[];
  pct: number[];
  notes: string;
  synced: boolean;
  /** Every packet in the window; `t` is ms from the window start. */
  frames: Frame[];
  features: Features;
};

const STORAGE_KEY = "bridge-recordings-v1";

let recordings: Recording[] = load();
let persistError: string | null = null;
const listeners = new Set<() => void>();

function load(): Recording[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Recording[]) : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recordings));
    persistError = null;
  } catch (e) {
    // Usually the ~5 MB quota. Data stays in memory; download the CSVs before refreshing.
    persistError = e instanceof Error ? e.message : "could not save";
  }
}

export function getRecordings(): Recording[] {
  return recordings;
}

export function setRecordings(update: (prev: Recording[]) => Recording[]) {
  recordings = update(recordings);
  save();
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useRecordings(): { recordings: Recording[]; persistError: string | null } {
  const list = useSyncExternalStore(subscribe, getRecordings);
  return { recordings: list, persistError };
}
