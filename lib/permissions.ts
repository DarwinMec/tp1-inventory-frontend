import { UserRole } from "@/lib/types";

export const ALL_ROLES: UserRole[] = ["ADMIN", "MANAGER", "EMPLOYEE"];

export type AppRoutePermission = {
  href: string;
  label: string;
  roles: UserRole[];
};

export const ROUTE_PERMISSIONS: AppRoutePermission[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    roles: ALL_ROLES,
  },
  {
    href: "/insumos",
    label: "Insumos",
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    href: "/platillos",
    label: "Platillos",
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/proveedores",
    label: "Proveedores",
    roles: ["ADMIN"],
  },
  {
    href: "/ventas",
    label: "Ventas",
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    href: "/predicciones",
    label: "Predicciones",
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/ordenes",
    label: "Abastecimiento",
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    roles: ["ADMIN"],
  },
  {
    href: "/reportes",
    label: "Reportes",
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/alertas",
    label: "Alertas",
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
];

export function getAllowedRolesForPath(pathname: string): UserRole[] {
  const route = ROUTE_PERMISSIONS
    .filter(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  return route?.roles ?? ALL_ROLES;
}

export function canAccessPath(role: UserRole | undefined, pathname: string) {
  if (!role) return false;

  const allowedRoles = getAllowedRolesForPath(pathname);

  return allowedRoles.includes(role);
}

export function canAccessModule(role: UserRole | undefined, roles: UserRole[]) {
  if (!role) return false;

  return roles.includes(role);
}