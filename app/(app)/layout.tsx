'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar común para todo el sistema */}
      <Sidebar />

      {/* Columna principal */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Topbar común */}
        <Topbar />

        {/* Contenido específico de cada página */}
        <main className="flex-1 px-4 py-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
