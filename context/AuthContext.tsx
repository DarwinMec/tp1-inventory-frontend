// src/context/AuthContext.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AuthUser, UserRole } from "@/lib/types";
import {
  loginWithBackend,
  type LoginParams,
  hasRole as hasRoleUtil,
  normalizeRole,
} from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (params: LoginParams) => Promise<boolean>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  updateUserSession: (updates: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_USER_KEY = "gestrest-auth-user";
const AUTH_TOKEN_KEY = "gestrest-token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedUser = window.localStorage.getItem(AUTH_USER_KEY);
      const storedToken = window.localStorage.getItem(AUTH_TOKEN_KEY);

      if (!storedUser || !storedToken) {
        window.localStorage.removeItem(AUTH_USER_KEY);
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        setUser(null);
        return;
      }

      const parsed = JSON.parse(storedUser) as AuthUser;

      setUser({
        ...parsed,
        token: parsed.token || storedToken,
        role: normalizeRole(parsed.role),
        mustChangePassword: Boolean(parsed.mustChangePassword),
      });
    } catch (error) {
      console.error("Error leyendo sesión:", error);
      window.localStorage.removeItem(AUTH_USER_KEY);
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const isAuthenticated = !!user?.token;

  const updateUserSession = useCallback((updates: Partial<AuthUser>) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;

      const updatedUser: AuthUser = {
        ...currentUser,
        ...updates,
        role: normalizeRole(updates.role ?? currentUser.role),
      };

      if (typeof window !== "undefined") {
        window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
        window.localStorage.setItem(AUTH_TOKEN_KEY, updatedUser.token);
      }

      return updatedUser;
    });
  }, []);

  const login = useCallback(
    async (params: LoginParams): Promise<boolean> => {
      try {
        const authUser = await loginWithBackend(params);

        if (!authUser) {
          return false;
        }

        const normalizedUser: AuthUser = {
          ...authUser,
          role: normalizeRole(authUser.role),
          mustChangePassword: Boolean(authUser.mustChangePassword),
        };

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            AUTH_USER_KEY,
            JSON.stringify(normalizedUser)
          );
          window.localStorage.setItem(AUTH_TOKEN_KEY, normalizedUser.token);
        }

        setUser(normalizedUser);

        if (normalizedUser.mustChangePassword) {
          router.push("/change-password");
        } else {
          router.push("/dashboard");
        }

        return true;
      } catch (error) {
        console.error("Error en login:", error);
        return false;
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    setUser(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_USER_KEY);
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }

    router.push("/login");
  }, [router]);

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!user) return false;
      return hasRoleUtil(user.role, roles);
    },
    [user]
  );

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      isAuthLoading,
      login,
      logout,
      hasRole,
      updateUserSession,
    }),
    [user, isAuthenticated, isAuthLoading, login, logout, hasRole, updateUserSession]
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
