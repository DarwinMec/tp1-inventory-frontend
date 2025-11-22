// src/context/AuthContext.tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AuthUser, UserRole } from "@/lib/types";
import { loginMock, type LoginParams, hasRole as hasRoleUtil } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (params: LoginParams) => Promise<boolean>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_USER_KEY = "gestrest-auth-user";
const AUTH_TOKEN_KEY = "gestrest-token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  // Cargar sesión desde localStorage al montar
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedUser = window.localStorage.getItem(AUTH_USER_KEY);
      if (storedUser) {
        const parsed = JSON.parse(storedUser) as AuthUser;
        setUser(parsed);
      }
    } catch (error) {
      console.error("Error leyendo sesión:", error);
    }
  }, []);

  const isAuthenticated = !!user?.token;

  const login = async (params: LoginParams): Promise<boolean> => {
    try {
      const authUser = await loginMock(params);

      if (!authUser) {
        return false;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
        window.localStorage.setItem(AUTH_TOKEN_KEY, authUser.token);
      }

      setUser(authUser);
      router.push("/dashboard");
      return true;
    } catch (error) {
      console.error("Error en login:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_USER_KEY);
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    router.push("/login");
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return hasRoleUtil(user.role, roles);
  };

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      login,
      logout,
      hasRole,
    }),
    [user, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext debe usarse dentro de AuthProvider");
  }
  return ctx;
}
