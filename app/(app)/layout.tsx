"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BellRing,
  FileText,
  LayoutDashboard,
  LineChart,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
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

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthContext();

  const visibleItems: SidebarItem[] = useMemo(
    () =>
      ROUTE_PERMISSIONS
        .filter((item) => ICONS_BY_ROUTE[item.href])
        .filter((item) => canAccessModule(user?.role, item.roles))
        .map((item) => ({
          href: item.href,
          label: item.label,
          icon: ICONS_BY_ROUTE[item.href],
        })),
    [user?.role]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="Cerrar menú móvil"
        className="absolute inset-0 bg-slate-950/60"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-slate-950 text-slate-100 shadow-2xl">
        <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
          <div className="flex items-center gap-2">
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

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3 text-sm">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
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
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <Sidebar />

        <MobileSidebar
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

          <main className="flex-1 px-4 py-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}