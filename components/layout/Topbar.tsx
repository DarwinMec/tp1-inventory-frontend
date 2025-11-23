'use client';

import { Bell, Menu, UserCircle2 } from 'lucide-react';

interface TopbarProps {
  title?: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white/80 px-4 backdrop-blur">
      <div className="flex items-center gap-2">
        {/* Botón para sidebar móvil (por ahora solo adorno, luego lo podemos hacer funcional) */}
        <button className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 md:hidden">
          <Menu className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-slate-900">
            {title ?? 'Dashboard general'}
          </h1>
          <p className="text-xs text-slate-500">
            {subtitle ?? 'Restaurantes de Chiclayo · Inventarios y demanda'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1">
          <UserCircle2 className="h-5 w-5 text-slate-500" />
          <div className="hidden text-xs leading-tight text-slate-600 sm:block">
            <p className="font-medium">Usuario</p>
            <p className="text-[10px] text-slate-400">Rol asignado</p>
          </div>
        </div>
      </div>
    </header>
  );
}
