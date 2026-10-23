/** Learn-page progress per letter, kept in this browser. */
import { useSyncExternalStore } from "react";

export type LetterProgress = {
  /** Times the handshape was held correctly with the glove. */
  practiced: number;
  /** Quiz answers for this letter. */
  quizCorrect: number;
  quizWrong: number;
  lastAt: string | null;
};

type Progress = Record<string, LetterProgress>;

const STORAGE_KEY = "bridge-learn-progress-v1";
const EMPTY: LetterProgress = { practiced: 0, quizCorrect: 0, quizWrong: 0, lastAt: null };

let progress: Progress = load();
const listeners = new Set<() => void>();

function load(): Progress {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Progress;
  } catch {
    return {};
  }
}

function update(letter: string, change: (p: LetterProgress) => Partial<LetterProgress>) {
  const prev = progress[letter] ?? EMPTY;
  progress = { ...progress, [letter]: { ...prev, ...change(prev), lastAt: new Date().toISOString() } };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* storage full or blocked; progress still works for this visit */
  }
  listeners.forEach((fn) => fn());
}

export const recordPractice = (letter: string) => update(letter, (p) => ({ practiced: p.practiced + 1 }));

export const recordQuiz = (letter: string, correct: boolean) =>
  update(letter, (p) => (correct ? { quizCorrect: p.quizCorrect + 1 } : { quizWrong: p.quizWrong + 1 }));

export function letterProgress(p: Progress, letter: string): LetterProgress {
  return p[letter] ?? EMPTY;
}

/** A letter counts as learned once it's been done right with the glove or in the quiz. */
export function isLearned(p: LetterProgress): boolean {
  return p.practiced > 0 || p.quizCorrect > 0;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useLearnProgress(): Progress {
  return useSyncExternalStore(subscribe, () => progress);
}
