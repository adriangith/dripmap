"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { UserDataProvider } from "@/lib/use-user-data";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <UserDataProvider>
        {children}
      </UserDataProvider>
    </AuthProvider>
  );
}
