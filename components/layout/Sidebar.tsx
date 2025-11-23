'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Utensils,
  Truck,
  ShoppingCart,
  LineChart,
  FileText,
  Users,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/insumos', label: 'Insumos', icon: Package },
  { href: '/platillos', label: 'Platillos', icon: Utensils },
  { href: '/proveedores', label: 'Proveedores', icon: Truck },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { href: '/predicciones', label: 'Predicciones', icon: LineChart },
  { href: '/ordenes', label: 'Órdenes', icon: FileText },
  { href: '/usuarios', label: 'Usuarios', icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden bg-slate-950 text-slate-100 md:flex md:w-64 md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold">
          AI
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">TP1 Inventory</p>
          <p className="text-[11px] text-slate-400">Gestión & Predicción</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3 text-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 transition ${
                active
                  ? 'bg-slate-800 text-slate-50'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-3 py-3 text-[11px] text-slate-500">
        <p>Sistema de tesis · Chiclayo</p>
      </div>
    </aside>
  );
}
