"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, AlertCircle, Package, Utensils, Truck, Activity, ShieldCheck, LineChart as LineChartIcon, Sparkles } from "lucide-react";
import {
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { apiFetch } from "@/lib/apiClient";

// Tipos alineados a DashboardStatsDto.java
type DashboardStatsDto = {
  totalInsumos: number;
  totalPlatillos: number;
  totalProveedores: number;
  ventasHoy: number;
  variacionVentasPorcentaje: number;
  rotacionInventario: number;
  nivelServicio: number; // 0–100
};

// Tipos alineados a DashboardTendenciaDto.java
type DashboardTendenciaDto = {
  mes: string; // "Ene", "Feb", etc.
  ventas: number;
  prediccion: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [tendencias, setTendencias] = useState<DashboardTendenciaDto[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingTendencias, setLoadingTendencias] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1) Cargar stats del dashboard
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoadingStats(true);
        setError(null);
        const data = await apiFetch<DashboardStatsDto>("/dashboard/stats");
        setStats(data);
      } catch (e: any) {
        console.error("Error cargando stats del dashboard", e);
        setError(
          e?.message ??
            "No se pudieron cargar las métricas del dashboard. Verifica el backend y tus credenciales."
        );
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
  }, []);

  // 2) Cargar tendencias (ventas vs predicción, últimos N meses)
  useEffect(() => {
    const loadTendencias = async () => {
      try {
        setLoadingTendencias(true);
        setError(null);
        // Puedes cambiar ?meses=6 a 3, 12, etc.
        const data = await apiFetch<DashboardTendenciaDto[]>(
          "/dashboard/tendencias?meses=6"
        );
        setTendencias(data ?? []);
      } catch (e: any) {
        console.error("Error cargando tendencias del dashboard", e);
        setError(
          e?.message ??
            "No se pudieron cargar las tendencias de ventas. Verifica el backend."
        );
      } finally {
        setLoadingTendencias(false);
      }
    };

    loadTendencias();
  }, []);

  const chartData = useMemo(
    () =>
      tendencias.map((t) => ({
        mes: t.mes,
        Ventas: t.ventas,
        Predicción: t.prediccion,
      })),
    [tendencias]
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

  return (
    <section className="space-y-6">
      {/* HEADER */}
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
            Revisa de un vistazo el estado de tus insumos, platillos,
            proveedores y las ventas recientes. Los datos se alimentan
            directamente del backend de inventarios y del módulo de ventas.
          </p>
        </div>

        {error && (
          <div className="flex max-w-xs items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
            <p>{error}</p>
          </div>
        )}
      </header>

      {/* KPIs PRINCIPALES */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total insumos */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Package className="h-5 w-5 text-slate-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Total de insumos
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingStats ? "…" : stats?.totalInsumos ?? "—"}
            </span>
            <span className="text-[11px] text-slate-400">
              Productos registrados en inventario.
            </span>
          </div>
        </div>

        {/* Total platillos */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Utensils className="h-5 w-5 text-slate-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Total de platillos
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingStats ? "…" : stats?.totalPlatillos ?? "—"}
            </span>
            <span className="text-[11px] text-slate-400">
              Platillos activos en la carta.
            </span>
          </div>
        </div>

        {/* Total proveedores */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Truck className="h-5 w-5 text-slate-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Total de proveedores
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingStats ? "…" : stats?.totalProveedores ?? "—"}
            </span>
            <span className="text-[11px] text-slate-400">
              Aliados para tu cadena de abastecimiento.
            </span>
          </div>
        </div>

        {/* Nivel de servicio */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Nivel de servicio
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingStats || stats == null
                ? "—"
                : `${stats.nivelServicio.toFixed(1)}%`}
            </span>
            <span className="text-[11px] text-slate-400">
              {nivelServicioLabel} · basado en productos sin alerta de stock.
            </span>
          </div>
        </div>
      </div>

      {/* BLOQUE VENTAS + ROTACIÓN */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Tarjeta de ventas hoy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Ventas de hoy
              </h2>
              <p className="text-xs text-slate-500">
                Monto total de ventas del día y variación frente a ayer.
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
              <LineChartIcon className="h-4 w-4 text-blue-600" />
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-2xl font-semibold text-slate-900">
                {loadingStats || stats == null
                  ? "S/ —"
                  : `S/ ${stats.ventasHoy.toFixed(2)}`}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Considera solo ventas registradas en la fecha actual.
              </p>
            </div>

            {stats && (
              <div
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
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
                  {stats.variacionVentasPorcentaje.toFixed(1)}%
                </span>
                <span className="text-[10px] opacity-70">vs. ayer</span>
              </div>
            )}
          </div>
        </div>

        {/* Tarjeta de rotación de inventario */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
              <Activity className="h-4 w-4 text-slate-700" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Rotación de inventario
              </h2>
              <p className="text-xs text-slate-500">
                Estimación de cuántas veces se renueva tu inventario en el
                periodo.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xl font-semibold text-slate-900">
              {loadingStats || stats == null
                ? "—"
                : stats.rotacionInventario.toFixed(2)}{" "}
              <span className="text-sm font-normal text-slate-500">
                veces
              </span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Cálculo simplificado a partir de ventas e inventario promedio.
            </p>
          </div>
        </div>
      </div>

      {/* GRÁFICO: TENDENCIA VENTAS VS PREDICCIÓN */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Tendencia de ventas vs predicción
            </h2>
            <p className="text-xs text-slate-500">
              Compara el histórico de ventas mensuales con la predicción
              estimada por el modelo. Útil para ver si el modelo sigue la
              dinámica real del negocio.
            </p>
          </div>
        </div>

        {loadingTendencias && (
          <div className="flex min-h-[220px] items-center justify-center text-xs text-slate-500">
            Cargando tendencias de ventas…
          </div>
        )}

        {!loadingTendencias && chartData.length === 0 && (
          <div className="flex min-h-[220px] items-center justify-center text-xs text-slate-500">
            No hay datos de tendencias disponibles. Registra ventas para ver la
            evolución mensual.
          </div>
        )}

        {!loadingTendencias && chartData.length > 0 && (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 4, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `S/ ${Number(value).toFixed(2)}`,
                    name,
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
                  dataKey="Predicción"
                  stroke="#22c55e"
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
    </section>
  );
}
