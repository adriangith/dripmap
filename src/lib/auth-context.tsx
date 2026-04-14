"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  FacebookAuthProvider,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

type AuthProvider = "google" | "apple" | "facebook";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (provider: AuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function getProvider(name: AuthProvider) {
  switch (name) {
    case "google":
      return new GoogleAuthProvider();
    case "apple":
      return new OAuthProvider("apple.com");
    case "facebook":
      return new FacebookAuthProvider();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async (provider: AuthProvider) => {
    await signInWithPopup(auth, getProvider(provider));
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);

  return <AuthContext value={value}>{children}</AuthContext>;
}
