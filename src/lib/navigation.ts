import { useCallback, useSyncExternalStore } from 'react';

/**
 * In-app "pages" (module, wizard step, plastic page, open patient, …) kept in the browser
 * history, so the header's ← Back button, the browser's back button and the screens' own
 * "Back" buttons all move through the same trail instead of leaving the app.
 *
 * Each history entry holds a small `{ key: value }` map. Entries from an earlier page load
 * (e.g. after a refresh, when the quotation being built is gone) are ignored, so going back
 * into them just shows the starting screen.
 */

type NavValues = Record<string, string | number | null>;
interface NavEntry {
  session: string;
  depth: number;
  values: NavValues;
}

const SESSION = Math.random().toString(36).slice(2);
const listeners = new Set<() => void>();
let entry: NavEntry = { session: SESSION, depth: 0, values: {} };
/** This page load's trail, index = depth — used to turn "go to the previous screen" into history.back(). */
const trail: NavValues[] = [{}];

function readHistory(): NavEntry {
  const state = window.history.state as Partial<NavEntry> | null;
  return state && state.session === SESSION && typeof state.depth === 'number' && state.values
    ? { session: SESSION, depth: state.depth, values: state.values }
    : { session: SESSION, depth: 0, values: {} };
}

function notify() {
  listeners.forEach((listener) => listener());
}

let started = false;
function start() {
  if (started || typeof window === 'undefined') return;
  started = true;
  // A fresh page load always starts at the first screen.
  window.history.replaceState({ ...(window.history.state ?? {}), ...entry }, '');
  window.addEventListener('popstate', () => {
    entry = readHistory();
    notify();
  });
}

function sameValues(a: NavValues, b: NavValues): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if ((a[key] ?? null) !== (b[key] ?? null)) return false;
  return true;
}

/** Move to a new screen: `patch` sets keys, `reset` clears keys that belong to the old screen. */
export function navigate(patch: NavValues, reset: string[] = []): void {
  start();
  const values: NavValues = { ...entry.values, ...patch };
  for (const key of reset) delete values[key];
  if (sameValues(values, entry.values)) return;
  // Going to exactly the previous screen = a real "back", so the trail doesn't loop.
  if (entry.depth > 0 && sameValues(values, trail[entry.depth - 1] ?? {})) {
    window.history.back();
    return;
  }
  entry = { session: SESSION, depth: entry.depth + 1, values };
  trail.length = entry.depth;
  trail.push(values);
  window.history.pushState({ ...entry }, '');
  notify();
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** One navigation value (like useState), stored in the browser history. */
export function useNavValue<T extends string | number | null>(key: string, initial: T, reset: string[] = []): [T, (next: T) => void] {
  const value = useSyncExternalStore(subscribe, () => (key in entry.values ? (entry.values[key] as T) : initial));
  const resetKey = reset.join('|');
  const set = useCallback(
    (next: T) => {
      const resets = resetKey ? resetKey.split('|') : [];
      // The default is stored as "unset", so returning to it matches the earlier entry exactly.
      if (next === initial) navigate({}, [key, ...resets]);
      else navigate({ [key]: next }, resets);
    },
    [key, resetKey, initial],
  );
  return [value, set];
}

/** How many screens deep we are in this page load (0 = the first screen: no ← Back). */
export function useNavDepth(): number {
  return useSyncExternalStore(subscribe, () => entry.depth);
}

export function goBack(): void {
  if (entry.depth > 0) window.history.back();
}
