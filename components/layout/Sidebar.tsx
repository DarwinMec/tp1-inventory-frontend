"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Utensils,
  Truck,
  ShoppingCart,
  LineChart,
  FileText,
  Users,
  BarChart3,
  BellRing,
} from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { canAccessModule, ROUTE_PERMISSIONS } from "@/lib/permissions";

type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const ICONS_BY_ROUTE: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/insumos": Package,
  "/platillos": Utensils,
  "/proveedores": Truck,
  "/ventas": ShoppingCart,
  "/predicciones": LineChart,
  "/ordenes": FileText,
  "/usuarios": Users,
  "/reportes": BarChart3,
  "/alertas": BellRing,
};

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthContext();

  const visibleItems: SidebarItem[] = ROUTE_PERMISSIONS
    .filter((item) => ICONS_BY_ROUTE[item.href])
    .filter((item) => canAccessModule(user?.role, item.roles))
    .map((item) => ({
      href: item.href,
      label: item.label,
      icon: ICONS_BY_ROUTE[item.href],
    }));

  return (
    <aside className="hidden bg-slate-950 text-slate-100 md:flex md:w-64 md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold">
          ML
        </div>

        <div className="leading-tight">
          <p className="text-sm font-semibold">GestRest AI</p>
          <p className="text-[11px] text-slate-400">
            Inventarios & Predicción
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3 text-sm">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 transition ${
                active
                  ? "bg-slate-800 text-slate-50"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-50"
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

        {user && (
          <p className="mt-1">
            Rol activo:{" "}
            <span className="font-semibold text-slate-300">{user.role}</span>
          </p>
        )}
      </div>
    </aside>
  );
}