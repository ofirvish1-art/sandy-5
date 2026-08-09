// Lightweight "who am I" helper.
//
// Per the MVP spec, there's no full login system yet — a user is
// identified by phone number. On registration we upsert a row into
// `users` (keyed by phone) and remember the returned id in
// localStorage. Every screen reads that id to know who is posting.
//
// This is intentionally simple. See README.md → "Upgrading to real
// auth" for how to swap this for Supabase Auth later without
// changing the database schema.

const KEY = "earthworks_user";

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeUser(user) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
