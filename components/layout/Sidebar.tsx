// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  UtensilsCrossed,
  Truck,
  LineChart,
  ShoppingCart,
  FileText,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/lib/types";

type MenuItem = {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles: UserRole[]; // "ADMIN" | "MANAGER" | "EMPLOYEE"
};

const menuItems: MenuItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    href: "/insumos",
    label: "Insumos",
    icon: Boxes,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/platillos",
    label: "Platillos",
    icon: UtensilsCrossed,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/proveedores",
    label: "Proveedores",
    icon: Truck,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/ventas",
    label: "Ventas",
    icon: ShoppingCart,
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    href: "/predicciones",
    label: "Predicciones",
    icon: LineChart,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/ordenes",
    label: "Órdenes",
    icon: FileText,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/reportes",
    label: "Reportes",
    icon: FileText,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    icon: Users,
    roles: ["ADMIN"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <aside className="hidden h-screen w-64 border-r border-slate-800 bg-slate-900/80 px-4 py-6 md:block">
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-semibold">
            GestRest
          </span>
          <span className="text-lg font-bold">
            AI <span className="text-emerald-400">Chiclayo</span>
          </span>
        </Link>
        <p className="mt-1 text-xs text-slate-500">
          Inventarios &amp; Predicción de demanda
        </p>
      </div>

      <nav className="space-y-1 text-sm">
        {menuItems
          .filter((item) => item.roles.includes(user.role))
          .map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 transition ${
                  active
                    ? "bg-blue-600/20 text-blue-300"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
