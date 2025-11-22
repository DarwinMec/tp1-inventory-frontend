// src/components/layout/Topbar.tsx
"use client";

import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

export function Topbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-3">
      <div>
        <h1 className="text-lg font-semibold">Panel de Gestión</h1>
        <p className="text-xs text-slate-400">
          Monitorea inventarios, ventas y predicciones en tiempo real.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-xs">
        <p className="font-semibold">{user.fullName || user.username} </p>          
        <p className="text-slate-400">{user.role}</p>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          <LogOut className="h-3 w-3" />
          Salir
        </button>
      </div>
    </header>
  );
}
