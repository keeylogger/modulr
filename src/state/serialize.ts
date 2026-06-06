import type { AppState } from './types';
import { defaultState } from './defaults';

type Json = unknown;

function isPlainObject(value: Json): value is Record<string, Json> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively strip values that are identical to the defaults so the serialized
 * payload only carries what the user actually changed. Arrays are treated
 * atomically (kept whole if any element differs) which keeps child ordering /
 * SVG paths intact.
 */
function stripDefaults(current: Json, base: Json): Json | undefined {
  if (isPlainObject(current) && isPlainObject(base)) {
    const out: Record<string, Json> = {};
    for (const key of Object.keys(current)) {
      const diff = stripDefaults(current[key], base[key]);
      if (diff !== undefined) out[key] = diff;
    }
    return Object.keys(out).length ? out : undefined;
  }

  if (Array.isArray(current) && Array.isArray(base)) {
    return JSON.stringify(current) === JSON.stringify(base) ? undefined : current;
  }

  return current === base ? undefined : current;
}

/** Deep-merge a sparse patch onto a full base object. */
function mergeDefaults<T>(base: T, patch: Json): T {
  if (isPlainObject(base) && isPlainObject(patch)) {
    const out: Record<string, Json> = { ...base };
    for (const key of Object.keys(patch)) {
      out[key] = mergeDefaults((base as Record<string, Json>)[key], patch[key]);
    }
    return out as T;
  }
  if (patch === undefined) return base;
  return patch as T;
}

// --- URL-safe base64 helpers (works with unicode via encodeURIComponent) ----
function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafe(token: string): string {
  let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return b64;
}

export function serializeState(state: AppState): string {
  const stripped = stripDefaults(state, defaultState) ?? {};
  const json = JSON.stringify(stripped);
  return toUrlSafe(btoa(encodeURIComponent(json)));
}

export function deserializeState(token: string): AppState {
  try {
    const json = decodeURIComponent(atob(fromUrlSafe(token)));
    const patch = JSON.parse(json);
    return mergeDefaults(defaultState, patch);
  } catch (err) {
    console.warn('[modulr] Failed to decode shared state, loading defaults.', err);
    return structuredClone(defaultState);
  }
}

const HASH_PREFIX = '#state=';

export function readStateFromHash(): AppState | null {
  const hash = window.location.hash;
  if (!hash.startsWith(HASH_PREFIX)) return null;
  const token = hash.slice(HASH_PREFIX.length);
  if (!token) return null;
  return deserializeState(token);
}

export function buildShareUrl(state: AppState): string {
  const token = serializeState(state);
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${HASH_PREFIX}${token}`;
}

export function writeStateToHash(state: AppState): void {
  const token = serializeState(state);
  const newHash = `${HASH_PREFIX}${token}`;
  if (window.location.hash !== newHash) {
    // replaceState avoids spamming browser history on every keystroke.
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}${newHash}`);
  }
}
