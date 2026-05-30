"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Package,
  RefreshCw,
  Server,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Truck,
  Utensils,
  Warehouse,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AlertDTO,
  DashboardStatsDTO,
  DashboardTendenciaDTO,
  InventoryDTO,
  MLModelInfoDTO,
  PageResponse,
  ProductDTO,
  SaleDTO,
  WeeklyGlobalPredictionResponseDTO,
} from "@/lib/backend-types";
import {
  getActiveMLModel,
  getDashboardStats,
  getDashboardTrends,
  getInventoryByProduct,
  getProducts,
  getSalesPage,
  getUnresolvedAlerts,
  getWeeklySupplyPlan,
} from "@/lib/services";

type InventoryStatus = "no_stock" | "below_min" | "near_min" | "ok";

type InventoryHealthItem = {
  product: ProductDTO;
  inventory: InventoryDTO | null;
  currentStock: number;
  availableStock: number;
  minStock: number;
  status: InventoryStatus;
};

function toNumber(value?: number | string | null) {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(toNumber(value));
}

function formatQuantity(value?: number | null) {
  return toNumber(value).toFixed(3);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPercent(value?: number | null) {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

function inventoryStatusLabel(status: InventoryStatus) {
  switch (status) {
    case "no_stock":
      return "Sin stock";
    case "below_min":
      return "Bajo mínimo";
    case "near_min":
      return "Cerca del mínimo";
    case "ok":
    default:
      return "En rango";
  }
}

function inventoryStatusClasses(status: InventoryStatus) {
  switch (status) {
    case "no_stock":
      return "border-red-200 bg-red-50 text-red-700";
    case "below_min":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "near_min":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "ok":
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
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

function buildInventoryHealth(
  products: ProductDTO[],
  inventories: Record<string, InventoryDTO | null>
): InventoryHealthItem[] {
  return products
    .filter((product) => product.isActive !== false)
    .map((product) => {
      const inventory = inventories[product.id] ?? null;

      const currentStock = toNumber(inventory?.currentStock);
      const availableStock =
        inventory?.availableStock != null
          ? toNumber(inventory.availableStock)
          : currentStock;

      const minStock = toNumber(product.minStock ?? product.reorderPoint);

      let status: InventoryStatus = "ok";

      if (availableStock <= 0) {
        status = "no_stock";
      } else if (minStock > 0 && availableStock < minStock) {
        status = "below_min";
      } else if (minStock > 0 && availableStock < minStock * 1.3) {
        status = "near_min";
      }

      return {
        product,
        inventory,
        currentStock,
        availableStock,
        minStock,
        status,
      };
    });
}

function statusWeight(status: InventoryStatus) {
  switch (status) {
    case "no_stock":
      return 0;
    case "below_min":
      return 1;
    case "near_min":
      return 2;
    case "ok":
    default:
      return 3;
  }
}

function getSaleMainDish(sale: SaleDTO) {
  const firstItem = sale.items?.[0];

  if (!firstItem) return "Venta registrada";

  const quantity = firstItem.quantity != null ? ` x${firstItem.quantity}` : "";

  return `${firstItem.dishName ?? "Platillo"}${quantity}`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null);
  const [tendencias, setTendencias] = useState<DashboardTendenciaDTO[]>([]);
  const [alerts, setAlerts] = useState<AlertDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [inventories, setInventories] = useState<
    Record<string, InventoryDTO | null>
  >({});
  const [modelInfo, setModelInfo] = useState<MLModelInfoDTO | null>(null);
  const [weeklySupply, setWeeklySupply] =
    useState<WeeklyGlobalPredictionResponseDTO | null>(null);
  const [latestSales, setLatestSales] = useState<SaleDTO[]>([]);

  const [loading, setLoading] = useState(false);
  const [dataErrors, setDataErrors] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    const errors: string[] = [];

    async function safeLoad<T>(
      label: string,
      request: () => Promise<T>,
      fallback: T
    ): Promise<T> {
      try {
        return await request();
      } catch (error) {
        console.warn(`No se pudo cargar ${label}`, error);
        errors.push(label);
        return fallback;
      }
    }

    try {
      setLoading(true);
      setDataErrors([]);

      const [
        statsData,
        tendenciasData,
        alertsData,
        modelData,
        weeklySupplyData,
        salesPageData,
        productsData,
      ] = await Promise.all([
        safeLoad<DashboardStatsDTO | null>(
          "métricas generales",
          () => getDashboardStats(),
          null
        ),
        safeLoad<DashboardTendenciaDTO[]>(
          "tendencias",
          () => getDashboardTrends(6),
          []
        ),
        safeLoad<AlertDTO[]>(
          "alertas pendientes",
          () => getUnresolvedAlerts(),
          []
        ),
        safeLoad<MLModelInfoDTO | null>(
          "modelo ML activo",
          () => getActiveMLModel(),
          null
        ),
        safeLoad<WeeklyGlobalPredictionResponseDTO | null>(
          "plan semanal de abastecimiento",
          () => getWeeklySupplyPlan(1),
          null
        ),
        safeLoad<PageResponse<SaleDTO>>(
          "últimas ventas",
          () => getSalesPage(0, 5),
          { content: [] }
        ),
        safeLoad<ProductDTO[]>("insumos", () => getProducts(), []),
      ]);

      const inventoryEntries = await Promise.all(
        productsData.map(async (product) => {
          try {
            const inventory = await getInventoryByProduct(product.id);
            return [product.id, inventory] as const;
          } catch (error) {
            console.warn(
              `No se pudo cargar inventario para ${product.name}`,
              error
            );
            return [product.id, null] as const;
          }
        })
      );

      setStats(statsData);
      setTendencias(tendenciasData ?? []);
      setAlerts(alertsData ?? []);
      setModelInfo(modelData);
      setWeeklySupply(weeklySupplyData);
      setLatestSales(salesPageData.content ?? []);
      setProducts(productsData ?? []);
      setInventories(Object.fromEntries(inventoryEntries));
      setDataErrors(errors);
      setLastUpdated(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const chartData = useMemo(
    () =>
      tendencias.map((t) => ({
        mes: t.mes,
        Ventas: toNumber(t.ventas),
        Prediccion: toNumber(t.prediccion),
      })),
    [tendencias]
  );

  const inventoryHealth = useMemo(
    () => buildInventoryHealth(products, inventories),
    [products, inventories]
  );

  const criticalInventoryItems = useMemo(() => {
    return inventoryHealth
      .filter((item) => item.status !== "ok")
      .sort((a, b) => {
        const statusCompare = statusWeight(a.status) - statusWeight(b.status);
        if (statusCompare !== 0) return statusCompare;
        return a.availableStock - b.availableStock;
      })
      .slice(0, 5);
  }, [inventoryHealth]);

  const criticalInventoryCount = useMemo(
    () =>
      inventoryHealth.filter(
        (item) => item.status === "no_stock" || item.status === "below_min"
      ).length,
    [inventoryHealth]
  );

  const nearMinInventoryCount = useMemo(
    () => inventoryHealth.filter((item) => item.status === "near_min").length,
    [inventoryHealth]
  );

  const stableInventoryCount = useMemo(
    () => inventoryHealth.filter((item) => item.status === "ok").length,
    [inventoryHealth]
  );

  const unreadAlertsCount = alerts.filter((alert) => alert.isRead === false)
    .length;

  const highSeverityAlertsCount = alerts.filter((alert) =>
    ["critical", "high"].includes((alert.severity ?? "").toLowerCase())
  ).length;

  const weeklySupplyItems = useMemo(() => {
    return [...(weeklySupply?.supplies ?? [])]
      .filter((item) => toNumber(item.quantityToBuy) > 0)
      .sort((a, b) => toNumber(b.quantityToBuy) - toNumber(a.quantityToBuy))
      .slice(0, 5);
  }, [weeklySupply]);

  const totalToBuy = weeklySupplyItems.reduce(
    (acc, item) => acc + toNumber(item.quantityToBuy),
    0
  );

  const variacionEsPositiva =
    (stats?.variacionVentasPorcentaje ?? 0) >= 0;

  const nivelServicioLabel = useMemo(() => {
    const ns = stats?.nivelServicio ?? 0;
    if (ns >= 95) return "Excelente";
    if (ns >= 85) return "Bueno";
    if (ns >= 70) return "Aceptable";
    return "Bajo";
  }, [stats?.nivelServicio]);

  const modelStatusLabel = modelInfo?.version
    ? `Activo · ${modelInfo.version}`
    : "Sin modelo activo";

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Sparkles className="h-3 w-3" />
            <span>Dashboard general</span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Visión general del restaurante
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Monitorea ventas, inventario, alertas y predicciones del modelo ML
            desde una sola vista operativa.
          </p>

          {lastUpdated && (
            <p className="mt-2 text-[11px] text-slate-400">
              Última actualización: {formatDateTime(lastUpdated)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={loadDashboardData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </header>

      {dataErrors.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
          <p>
            Algunos datos no pudieron cargarse: {dataErrors.join(", ")}. El
            dashboard mostrará la información disponible.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Ventas de hoy
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {loading && !stats ? "…" : formatCurrency(stats?.ventasHoy)}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Ventas registradas en la fecha actual.
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
          </div>

          {stats && (
            <div
              className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                variacionEsPositiva
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {variacionEsPositiva ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              <span>
                {stats.variacionVentasPorcentaje > 0 ? "+" : ""}
                {formatPercent(stats.variacionVentasPorcentaje)}
              </span>
              <span className="text-[10px] opacity-70">vs. ayer</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Alertas pendientes
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {loading ? "…" : alerts.length}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {unreadAlertsCount} no leídas · {highSeverityAlertsCount} de
                severidad alta.
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <BellRing className="h-5 w-5 text-red-600" />
            </div>
          </div>

          <Link
            href="/alertas"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
          >
            Ver alertas
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Insumos críticos
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {loading ? "…" : criticalInventoryCount}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {nearMinInventoryCount} cerca del mínimo ·{" "}
                {stableInventoryCount} estables.
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
              <TriangleAlert className="h-5 w-5 text-orange-600" />
            </div>
          </div>

          <Link
            href="/insumos"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
          >
            Revisar inventario
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Modelo predictivo
              </p>
              <p className="mt-1 max-w-[170px] truncate text-xl font-semibold text-slate-900">
                {modelInfo?.modelType ?? "XGBoost"}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {modelStatusLabel}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <BrainCircuit className="h-5 w-5 text-emerald-600" />
            </div>
          </div>

          <Link
            href="/predicciones"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
          >
            Ver predicciones
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Package className="h-5 w-5 text-slate-700" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Total de insumos
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {loading && !stats ? "…" : stats?.totalInsumos ?? products.length}
            </p>
            <p className="text-[11px] text-slate-400">
              Productos registrados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Utensils className="h-5 w-5 text-slate-700" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Total de platillos
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {loading && !stats ? "…" : stats?.totalPlatillos ?? "—"}
            </p>
            <p className="text-[11px] text-slate-400">
              Carta registrada.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Truck className="h-5 w-5 text-slate-700" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Proveedores</p>
            <p className="text-lg font-semibold text-slate-900">
              {loading && !stats ? "…" : stats?.totalProveedores ?? "—"}
            </p>
            <p className="text-[11px] text-slate-400">
              Cadena de abastecimiento.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Nivel de servicio
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {stats == null ? "—" : `${stats.nivelServicio.toFixed(1)}%`}
            </p>
            <p className="text-[11px] text-slate-400">{nivelServicioLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Tendencia de ventas vs predicción
              </h2>
              <p className="text-xs text-slate-500">
                Comparación mensual entre ventas reales y predicción estimada
                por el modelo ML.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] text-slate-500">
              <TrendingUp className="h-3.5 w-3.5" />
              Últimos 6 meses
            </div>
          </div>

          {loading && chartData.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center text-xs text-slate-500">
              Cargando tendencias de ventas…
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              No hay datos suficientes para mostrar la tendencia.
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: 4, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      name === "Prediccion" ? "Predicción" : String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="Ventas"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Prediccion"
                    name="Predicción"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                    strokeDasharray="4 4"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <Server className="h-5 w-5 text-blue-600" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Estado del modelo ML
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Métricas del modelo activo registrado en el sistema.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-xs text-slate-600">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span>Versión</span>
                <span className="font-semibold text-slate-900">
                  {modelInfo?.version ?? "—"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span>MAE</span>
                <span className="font-semibold text-slate-900">
                  {modelInfo?.mae != null ? modelInfo.mae.toFixed(3) : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span>RMSE</span>
                <span className="font-semibold text-slate-900">
                  {modelInfo?.rmse != null ? modelInfo.rmse.toFixed(3) : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span>R²</span>
                <span className="font-semibold text-slate-900">
                  {modelInfo?.r2 != null
                    ? `${(modelInfo.r2 * 100).toFixed(1)}%`
                    : "—"}
                </span>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-400">
              Entrenado: {formatDateTime(modelInfo?.trainedAt)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <Activity className="h-5 w-5 text-slate-700" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Rotación de inventario
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Indicador operativo calculado por el backend.
                </p>
              </div>
            </div>

            <p className="mt-4 text-2xl font-semibold text-slate-900">
              {stats == null ? "—" : stats.rotacionInventario.toFixed(2)}
              <span className="ml-1 text-sm font-normal text-slate-500">
                veces
              </span>
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              Cálculo simplificado a partir de ventas e inventario promedio.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Insumos que requieren atención
              </h2>
              <p className="text-xs text-slate-500">
                Productos sin stock, bajo mínimo o cercanos al mínimo.
              </p>
            </div>

            <Link
              href="/insumos"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
            >
              Ver todo
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {criticalInventoryItems.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              No hay insumos críticos por el momento.
            </div>
          ) : (
            <div className="space-y-2">
              {criticalInventoryItems.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold text-slate-800">
                        {item.product.name}
                      </p>

                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${inventoryStatusClasses(
                          item.status
                        )}`}
                      >
                        {inventoryStatusLabel(item.status)}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] text-slate-400">
                      Disponible: {formatQuantity(item.availableStock)}{" "}
                      {item.product.unitMeasure} · Mínimo:{" "}
                      {formatQuantity(item.minStock)} {item.product.unitMeasure}
                    </p>
                  </div>

                  <Link
                    href={`/ordenes?productId=${item.product.id}`}
                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-blue-700"
                  >
                    Abastecer
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Plan semanal sugerido
              </h2>
              <p className="text-xs text-slate-500">
                Insumos que el módulo ML recomienda comprar para la próxima
                semana.
              </p>
            </div>

            <Link
              href="/predicciones"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
            >
              Ver ML
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Semana objetivo:{" "}
            <span className="font-semibold">
              {weeklySupply?.weekStart ?? "Sin predicción disponible"}
            </span>{" "}
            · Total sugerido:{" "}
            <span className="font-semibold">{formatQuantity(totalToBuy)}</span>{" "}
            unidades base.
          </div>

          {weeklySupplyItems.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              No hay compras sugeridas para la semana o todavía no se generaron
              predicciones.
            </div>
          ) : (
            <div className="space-y-2">
              {weeklySupplyItems.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {item.productName}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Disponible: {formatQuantity(item.availableStock)}{" "}
                      {item.unitMeasure ?? ""} · Requerido:{" "}
                      {formatQuantity(item.totalRequired)}{" "}
                      {item.unitMeasure ?? ""}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-900">
                      Comprar {formatQuantity(item.quantityToBuy)}
                    </p>
                    <Link
                      href={`/ordenes?productId=${item.productId}`}
                      className="text-[11px] font-semibold text-blue-700 hover:underline"
                    >
                      Registrar ingreso
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Últimas ventas registradas
              </h2>
              <p className="text-xs text-slate-500">
                Resumen de las ventas más recientes del sistema.
              </p>
            </div>

            <Link
              href="/ventas"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
            >
              Ir a ventas
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {latestSales.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              Todavía no hay ventas recientes.
            </div>
          ) : (
            <div className="space-y-2">
              {latestSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {getSaleMainDish(sale)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatDate(sale.saleDate)}
                        {sale.saleTime ? ` · ${sale.saleTime}` : ""}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-slate-900">
                    {formatCurrency(sale.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Alertas operativas recientes
              </h2>
              <p className="text-xs text-slate-500">
                Alertas sin resolver que requieren seguimiento.
              </p>
            </div>

            <Link
              href="/alertas"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
            >
              Ver alertas
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {alerts.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              No hay alertas pendientes.
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-slate-100 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-slate-800">
                      {alert.title}
                    </p>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${severityClasses(
                        alert.severity
                      )}`}
                    >
                      {severityLabel(alert.severity)}
                    </span>
                  </div>

                  <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                    {alert.message ?? "Sin detalle registrado."}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] text-slate-400">
                      {formatDateTime(alert.createdAt)}
                    </p>

                    <Link
                      href={
                        alert.productId
                          ? `/ordenes?productId=${alert.productId}`
                          : alert.dishId
                          ? `/platillos?dishId=${alert.dishId}`
                          : "/alertas"
                      }
                      className="text-[11px] font-semibold text-blue-700 hover:underline"
                    >
                      Atender
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/ventas"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          <span className="inline-flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-blue-600" />
            Registrar venta
          </span>
          <ExternalLink className="h-4 w-4 text-slate-400" />
        </Link>

        <Link
          href="/ordenes"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          <span className="inline-flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-emerald-600" />
            Registrar abastecimiento
          </span>
          <ExternalLink className="h-4 w-4 text-slate-400" />
        </Link>

        <Link
          href="/reportes"
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          <span className="inline-flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-amber-600" />
            Generar reporte
          </span>
          <ExternalLink className="h-4 w-4 text-slate-400" />
        </Link>
      </div>
    </section>
  );
}