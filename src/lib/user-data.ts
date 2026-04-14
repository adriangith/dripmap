import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Constraints } from "@/lib/types";

export interface UserData {
  bookmarks: string[];
  visited: string[];
  preferences: Partial<Constraints> | null;
  onboardingComplete: boolean;
}

const EMPTY_USER_DATA: UserData = {
  bookmarks: [],
  visited: [],
  preferences: null,
  onboardingComplete: false,
};

function userDocRef(uid: string) {
  return doc(db, "users", uid);
}

export async function loadUserData(uid: string): Promise<UserData> {
  const snap = await getDoc(userDocRef(uid));
  if (!snap.exists()) return { ...EMPTY_USER_DATA };
  const data = snap.data();
  return {
    bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
    visited: Array.isArray(data.visited) ? data.visited : [],
    preferences: data.preferences ?? null,
    onboardingComplete: !!data.onboardingComplete,
  };
}

export async function saveUserData(uid: string, data: Partial<UserData>): Promise<void> {
  await setDoc(userDocRef(uid), data, { merge: true });
}

export function subscribeUserData(uid: string, callback: (data: UserData) => void): Unsubscribe {
  return onSnapshot(userDocRef(uid), (snap) => {
    if (!snap.exists()) {
      callback({ ...EMPTY_USER_DATA });
      return;
    }
    const data = snap.data();
    callback({
      bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
      visited: Array.isArray(data.visited) ? data.visited : [],
      preferences: data.preferences ?? null,
      onboardingComplete: !!data.onboardingComplete,
    });
  });
}

/** Union-merge localStorage data into Firestore on first sign-in */
export async function migrateLocalData(uid: string): Promise<void> {
  const existing = await loadUserData(uid);

  const localBookmarks = getLocalArray("dripmap-bookmarks");
  const localVisited = getLocalArray("dripmap-visited");

  const mergedBookmarks = [...new Set([...existing.bookmarks, ...localBookmarks])];
  const mergedVisited = [...new Set([...existing.visited, ...localVisited])];

  await saveUserData(uid, {
    bookmarks: mergedBookmarks,
    visited: mergedVisited,
  });
}

function getLocalArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
