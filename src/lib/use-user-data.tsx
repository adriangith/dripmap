"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { subscribeUserData, saveUserData, migrateLocalData, type UserData } from "@/lib/user-data";
import type { Constraints } from "@/lib/types";

interface UserDataContextValue {
  bookmarks: string[];
  visited: string[];
  preferences: Partial<Constraints> | null;
  onboardingComplete: boolean;
  toggleBookmark: (slug: string) => void;
  toggleVisited: (slug: string) => void;
  savePreferences: (prefs: Partial<Constraints>) => void;
  setOnboardingComplete: () => void;
  loading: boolean;
}

const UserDataContext = createContext<UserDataContextValue>({
  bookmarks: [],
  visited: [],
  preferences: null,
  onboardingComplete: false,
  toggleBookmark: () => {},
  toggleVisited: () => {},
  savePreferences: () => {},
  setOnboardingComplete: () => {},
  loading: true,
});

export function useUserData() {
  return useContext(UserDataContext);
}

const LOCAL_BOOKMARKS_KEY = "dripmap-bookmarks";
const LOCAL_VISITED_KEY = "dripmap-visited";
const LOCAL_PREFS_KEY = "dripmap-preferences";
const LOCAL_ONBOARDING_KEY = "dripmap-onboarding-complete";

function getLocalArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : []) : [];
  } catch {
    return [];
  }
}

function setLocalArray(key: string, arr: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(arr));
}

export function UserDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<UserData>({
    bookmarks: [],
    visited: [],
    preferences: null,
    onboardingComplete: false,
  });
  const [loading, setLoading] = useState(true);
  const migratedRef = useRef<string | null>(null);

  // Load from localStorage on mount (before auth resolves)
  useEffect(() => {
    const prefs = (() => {
      try {
        const raw = localStorage.getItem(LOCAL_PREFS_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

    setData({
      bookmarks: getLocalArray(LOCAL_BOOKMARKS_KEY),
      visited: getLocalArray(LOCAL_VISITED_KEY),
      preferences: prefs,
      onboardingComplete: localStorage.getItem(LOCAL_ONBOARDING_KEY) === "true",
    });
    setLoading(false);
  }, []);

  // When user signs in, subscribe to Firestore + migrate
  useEffect(() => {
    if (!user) return;

    // Migrate localStorage on first sign-in for this user
    if (migratedRef.current !== user.uid) {
      migratedRef.current = user.uid;
      migrateLocalData(user.uid);
    }

    const unsub = subscribeUserData(user.uid, (cloudData) => {
      setData(cloudData);
      // Sync back to localStorage so offline/anon still works
      setLocalArray(LOCAL_BOOKMARKS_KEY, cloudData.bookmarks);
      setLocalArray(LOCAL_VISITED_KEY, cloudData.visited);
      if (cloudData.preferences) {
        localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(cloudData.preferences));
      }
      if (cloudData.onboardingComplete) {
        localStorage.setItem(LOCAL_ONBOARDING_KEY, "true");
      }
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const toggleBookmark = useCallback((slug: string) => {
    setData((prev) => {
      const has = prev.bookmarks.includes(slug);
      const next = has ? prev.bookmarks.filter((s) => s !== slug) : [...prev.bookmarks, slug];
      // Persist
      setLocalArray(LOCAL_BOOKMARKS_KEY, next);
      if (user) saveUserData(user.uid, { bookmarks: next });
      return { ...prev, bookmarks: next };
    });
  }, [user]);

  const toggleVisited = useCallback((slug: string) => {
    setData((prev) => {
      const has = prev.visited.includes(slug);
      const next = has ? prev.visited.filter((s) => s !== slug) : [...prev.visited, slug];
      setLocalArray(LOCAL_VISITED_KEY, next);
      if (user) saveUserData(user.uid, { visited: next });
      return { ...prev, visited: next };
    });
  }, [user]);

  const savePreferences = useCallback((prefs: Partial<Constraints>) => {
    setData((prev) => {
      localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(prefs));
      if (user) saveUserData(user.uid, { preferences: prefs });
      return { ...prev, preferences: prefs };
    });
  }, [user]);

  const setOnboardingComplete = useCallback(() => {
    setData((prev) => {
      localStorage.setItem(LOCAL_ONBOARDING_KEY, "true");
      if (user) saveUserData(user.uid, { onboardingComplete: true });
      return { ...prev, onboardingComplete: true };
    });
  }, [user]);

  const value = useMemo(() => ({
    ...data,
    toggleBookmark,
    toggleVisited,
    savePreferences,
    setOnboardingComplete,
    loading,
  }), [data, toggleBookmark, toggleVisited, savePreferences, setOnboardingComplete, loading]);

  return <UserDataContext value={value}>{children}</UserDataContext>;
}
