"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { canAccessPath } from "@/lib/permissions";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, isAuthenticated, isAuthLoading } = useAuthContext();

  const canAccess = canAccessPath(user?.role, pathname);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!canAccess) {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, isAuthenticated, canAccess, router]);

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-5 text-center shadow-xl">
          <p className="text-sm font-semibold">Cargando sesión...</p>
          <p className="mt-1 text-xs text-slate-400">
            Validando permisos del usuario
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!canAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>

          <h1 className="text-base font-semibold">Acceso no autorizado</h1>

          <p className="mt-2 text-sm text-slate-500">
            Tu rol no tiene permisos para acceder a este módulo.
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Redirigiendo al dashboard...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}