"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BellRing,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Utensils,
} from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import type { AlertDTO } from "@/lib/backend-types";
import { canAccessModule, ROUTE_PERMISSIONS } from "@/lib/permissions";
import {
  getAlerts,
  getUnreadAlerts,
  getUnresolvedAlerts,
  markAlertAsRead,
  resolveAlert,
} from "@/lib/services";

type AlertFilter = "active" | "unread" | "unresolved";

type ResolutionAction = {
  route: string;
  label: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function severityLabel(severity?: string | null) {
  switch ((severity ?? "").toLowerCase()) {
    case "critical":
      return "Crítica";
    case "high":
      return "Alta";
    case "medium":
      return "Media";
    case "low":
      return "Baja";
    default:
      return "Sin severidad";
  }
}

function severityClasses(severity?: string | null) {
  switch ((severity ?? "").toLowerCase()) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "low":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function alertStatusLabel(alert: AlertDTO) {
  if (alert.isResolved) return "Resuelta";
  if (alert.isRead) return "Leída";
  return "Nueva";
}

function alertStatusClasses(alert: AlertDTO) {
  if (alert.isResolved) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (alert.isRead) {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

function getAlertIcon(alert: AlertDTO) {
  const text = [
    alert.alertTypeName,
    alert.title,
    alert.message,
    alert.productName,
    alert.dishName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (alert.productId || text.includes("stock") || text.includes("insumo")) {
    return Package;
  }

  if (alert.dishId || text.includes("platillo") || text.includes("receta")) {
    return Utensils;
  }

  if (
    text.includes("seguridad") ||
    text.includes("riesgo") ||
    text.includes("crítica") ||
    text.includes("critica")
  ) {
    return ShieldCheck;
  }

  return BellRing;
}

function getAlertEntity(alert: AlertDTO) {
  if (alert.productName) return `Insumo: ${alert.productName}`;
  if (alert.dishName) return `Platillo: ${alert.dishName}`;
  if (alert.alertTypeName) return alert.alertTypeName;
  return "Alerta general";
}

export default function AlertasPage() {
  const router = useRouter();
  const { user, hasRole } = useAuthContext();

  const canResolveAlerts = hasRole(["ADMIN", "MANAGER"]);
  const isEmployee = user?.role === "EMPLOYEE";

  const [alerts, setAlerts] = useState<AlertDTO[]>([]);
  const [filter, setFilter] = useState<AlertFilter>("unresolved");
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let data: AlertDTO[] = [];

      if (filter === "unread") {
        data = await getUnreadAlerts();
      } else if (filter === "unresolved") {
        data = await getUnresolvedAlerts();
      } else {
        data = await getAlerts();
      }

      setAlerts(data ?? []);
    } catch (e: any) {
      console.error("Error cargando alertas", e);
      setError(
        e?.message ??
          "No se pudieron cargar las alertas. Verifica el backend y tus credenciales."
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const filteredAlerts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return alerts
      .filter((alert) => {
        if (!term) return true;

        const text = [
          alert.title,
          alert.message,
          alert.severity,
          alert.productName,
          alert.dishName,
          alert.alertTypeName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(term);
      })
      .sort((a, b) => {
        const aDate = a.createdAt ?? "";
        const bDate = b.createdAt ?? "";
        return bDate.localeCompare(aDate);
      });
  }, [alerts, searchTerm]);

  const totalAlerts = alerts.length;
  const unreadCount = alerts.filter((alert) => alert.isRead === false).length;
  const unresolvedCount = alerts.filter(
    (alert) => alert.isResolved === false || alert.isResolved == null
  ).length;
  const resolvedCount = alerts.filter((alert) => alert.isResolved === true).length;
  const highSeverityCount = alerts.filter((alert) =>
    ["critical", "high"].includes((alert.severity ?? "").toLowerCase())
  ).length;

  const canAccessRoute = useCallback(
    (route: string) => {
      const baseRoute = route.split("?")[0];

      const permission = ROUTE_PERMISSIONS.find(
        (item) => item.href === baseRoute
      );

      if (!permission) return false;

      return canAccessModule(user?.role, permission.roles);
    },
    [user?.role]
  );

  const getProposedResolutionRoute = (alert: AlertDTO) => {
    const text = [
      alert.alertTypeName,
      alert.title,
      alert.message,
      alert.productName,
      alert.dishName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (alert.productId) {
      if (
        text.includes("stock") ||
        text.includes("inventario") ||
        text.includes("reorden") ||
        text.includes("insumo") ||
        text.includes("producto") ||
        text.includes("abastecimiento") ||
        text.includes("reposicion") ||
        text.includes("reposición")
      ) {
        return `/ordenes?productId=${alert.productId}`;
      }

      return `/insumos?productId=${alert.productId}`;
    }

    if (alert.dishId) {
      return `/platillos?dishId=${alert.dishId}`;
    }

    if (
      text.includes("predic") ||
      text.includes("demanda") ||
      text.includes("modelo") ||
      text.includes("ml")
    ) {
      return "/predicciones";
    }

    if (text.includes("venta") || text.includes("pedido")) {
      return "/ventas";
    }

    if (text.includes("proveedor")) {
      return "/proveedores";
    }

    if (
      text.includes("orden") ||
      text.includes("compra") ||
      text.includes("abastecimiento") ||
      text.includes("reposicion") ||
      text.includes("reposición")
    ) {
      return "/ordenes";
    }

    return "/dashboard";
  };

  const getResolutionLabelForRoute = (route: string) => {
    if (route.startsWith("/insumos")) {
      return isEmployee ? "Ver insumo" : "Atender en insumos";
    }

    if (route.startsWith("/platillos")) return "Atender en platillos";
    if (route.startsWith("/predicciones")) return "Atender en predicciones";
    if (route.startsWith("/ventas")) return "Atender en ventas";
    if (route.startsWith("/proveedores")) return "Atender en proveedores";
    if (route.startsWith("/ordenes")) return "Atender en abastecimiento";
    if (route.startsWith("/dashboard")) return "Ver dashboard";

    return "Atender alerta";
  };

  const getResolutionAction = (alert: AlertDTO): ResolutionAction | null => {
    const proposedRoute = getProposedResolutionRoute(alert);

    if (canAccessRoute(proposedRoute)) {
      return {
        route: proposedRoute,
        label: getResolutionLabelForRoute(proposedRoute),
      };
    }

    /*
     * Caso CP075:
     * EMPLOYEE no tiene acceso a Abastecimiento (/ordenes) ni Platillos
     * según el menú lateral. Por eso no se deben mostrar acciones hacia esos
     * módulos. Si la alerta es de producto/stock, se ofrece como alternativa
     * segura "Ver insumo", porque Employee sí puede acceder a /insumos.
     */
    if (
      proposedRoute.startsWith("/ordenes") &&
      alert.productId &&
      canAccessRoute(`/insumos?productId=${alert.productId}`)
    ) {
      return {
        route: `/insumos?productId=${alert.productId}`,
        label: isEmployee ? "Ver insumo" : "Atender en insumos",
      };
    }

    return null;
  };

  const handleMarkAsRead = async (alert: AlertDTO) => {
    if (alert.isRead) return;

    try {
      setActionLoading(`read-${alert.id}`);
      setError(null);
      setSuccessMessage(null);

      const updatedAlert = await markAlertAsRead(alert.id);

      setAlerts((prev) =>
        prev.map((item) => (item.id === alert.id ? updatedAlert : item))
      );

      setSuccessMessage("Alerta marcada como leída.");
    } catch (e: any) {
      console.error("Error marcando alerta como leída", e);
      setError(e?.message ?? "No se pudo marcar la alerta como leída.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveAlert = async (alert: AlertDTO) => {
    if (!canResolveAlerts || alert.isResolved) return;

    try {
      setActionLoading(`resolve-${alert.id}`);
      setError(null);
      setSuccessMessage(null);

      const updatedAlert = await resolveAlert(alert.id);

      setAlerts((prev) =>
        prev.map((item) => (item.id === alert.id ? updatedAlert : item))
      );

      setSuccessMessage("Alerta marcada como resuelta.");

      if (filter === "unresolved") {
        await loadAlerts();
      }
    } catch (e: any) {
      console.error("Error resolviendo alerta", e);
      setError(e?.message ?? "No se pudo resolver la alerta.");
    } finally {
      setActionLoading(null);
    }
  };

  const goToResolutionModule = async (alert: AlertDTO, route: string) => {
    try {
      setActionLoading(`go-${alert.id}`);

      if (alert.isRead !== true) {
        await markAlertAsRead(alert.id);
      }
    } catch (e) {
      console.warn("No se pudo marcar la alerta como leída antes de redirigir", e);
    } finally {
      setActionLoading(null);
      router.push(route);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Sparkles className="h-3 w-3" />
            <span>Centro de alertas</span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Alertas operativas
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Revisa alertas pendientes, identifica insumos o platillos afectados
            y atiende cada observación desde el módulo correspondiente.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAlerts}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </header>

      {(error || successMessage) && (
        <div
          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error ? (
            <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
          ) : (
            <CheckCircle2 className="mt-[2px] h-3.5 w-3.5" />
          )}
          <p>{error ?? successMessage}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <BellRing className="h-5 w-5 text-slate-700" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Alertas cargadas
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {loading ? "…" : totalAlerts}
            </p>
            <p className="text-[11px] text-slate-400">
              Según el filtro actual.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <Eye className="h-5 w-5 text-blue-700" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              No leídas
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {loading ? "…" : unreadCount}
            </p>
            <p className="text-[11px] text-slate-400">
              Requieren revisión inicial.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
            <TriangleAlert className="h-5 w-5 text-orange-700" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Sin resolver
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {loading ? "…" : unresolvedCount}
            </p>
            <p className="text-[11px] text-slate-400">
              Pendientes de atención.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-700" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Alta severidad
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {loading ? "…" : highSeverityCount}
            </p>
            <p className="text-[11px] text-slate-400">
              Críticas o altas.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título, mensaje, insumo o platillo…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-blue-500 focus:ring-1"
            />
          </div>

          <div className="flex items-center gap-2 sm:w-64">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as AlertFilter)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
            >
              <option value="unresolved">Sin resolver</option>
              <option value="unread">No leídas</option>
              <option value="active">Todas</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          Resueltas en vista: {resolvedCount}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Listado de alertas
            </h2>
            <p className="text-xs text-slate-500">
              Gestiona lectura, seguimiento y resolución de alertas generadas
              por el sistema.
            </p>
          </div>

          {loading && (
            <p className="text-[11px] text-slate-400">Cargando alertas…</p>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center text-xs text-slate-500">
            Cargando alertas operativas…
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            No se encontraron alertas con los filtros aplicados.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const AlertIcon = getAlertIcon(alert);
              const isProcessing =
                actionLoading === `read-${alert.id}` ||
                actionLoading === `resolve-${alert.id}` ||
                actionLoading === `go-${alert.id}`;

              const resolutionAction = getResolutionAction(alert);

              return (
                <article
                  key={alert.id}
                  className={`rounded-2xl border p-4 shadow-sm transition ${
                    alert.isResolved
                      ? "border-slate-200 bg-slate-50/70"
                      : alert.isRead
                      ? "border-slate-200 bg-white"
                      : "border-blue-200 bg-blue-50/40"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                        <AlertIcon className="h-5 w-5 text-slate-700" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">
                            {alert.title}
                          </h3>

                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${severityClasses(
                              alert.severity
                            )}`}
                          >
                            {severityLabel(alert.severity)}
                          </span>

                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${alertStatusClasses(
                              alert
                            )}`}
                          >
                            {alertStatusLabel(alert)}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          {alert.message ?? "Sin detalle registrado."}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(alert.createdAt)}
                          </span>

                          <span>·</span>

                          <span>{getAlertEntity(alert)}</span>

                          {alert.resolvedByUsername && (
                            <>
                              <span>·</span>
                              <span>
                                Resuelta por {alert.resolvedByUsername}
                              </span>
                            </>
                          )}

                          {alert.resolvedAt && (
                            <>
                              <span>·</span>
                              <span>{formatDateTime(alert.resolvedAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      {alert.isRead !== true && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(alert)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Marcar leída
                        </button>
                      )}

                      {resolutionAction ? (
                        <button
                          type="button"
                          onClick={() =>
                            goToResolutionModule(alert, resolutionAction.route)
                          }
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {resolutionAction.label}
                        </button>
                      ) : (
                        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
                          Sin acción directa para tu rol
                        </span>
                      )}

                      {canResolveAlerts && alert.isResolved !== true && (
                        <button
                          type="button"
                          onClick={() => handleResolveAlert(alert)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          Marcar resuelta
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}