"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Package,
  TrendingUp,
  Users,
  ShoppingCart,
  ChefHat,
  Database,
} from "lucide-react";
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

// 🧩 Tipos
type DashboardStats = {
  totalInsumos: number;
  totalPlatillos: number;
  totalProveedores: number;
  ventasHoy: number;
  variacionVentasPorcentaje: number;
  rotacionInventario: number;
  nivelServicio: number;
};

type TendenciaPunto = {
  mes: string;
  ventas: number;
  prediccion: number;
};

type StockAlerta = {
  id: string | number;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
};

type ProveedorResumen = {
  id: string | number;
  nombre: string;
  calificacion?: number;
  insumosClave?: string[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tendencias, setTendencias] = useState<TendenciaPunto[]>([]);
  const [alertasStock, setAlertasStock] = useState<StockAlerta[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorResumen[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsRes, tendenciasRes, alertasRes, proveedoresRes] =
          await Promise.allSettled([
            apiFetch<DashboardStats>("/dashboard/stats"),
            apiFetch<TendenciaPunto[]>("/dashboard/tendencias"),
            apiFetch<StockAlerta[]>("/insumos/alertas"),
            apiFetch<ProveedorResumen[]>("/proveedores/activos"),
          ]);

        // Stats
        if (statsRes.status === "fulfilled" && statsRes.value) {
          setStats(statsRes.value);
        } else {
          setStats(null);
        }

        // Tendencias
        if (tendenciasRes.status === "fulfilled" && tendenciasRes.value) {
          setTendencias(Array.isArray(tendenciasRes.value) ? tendenciasRes.value : []);
        } else {
          setTendencias([]);
        }

        // Alertas de stock
        if (alertasRes.status === "fulfilled" && alertasRes.value) {
          setAlertasStock(Array.isArray(alertasRes.value) ? alertasRes.value : []);
        } else {
          setAlertasStock([]);
        }

        // Proveedores activos
        if (proveedoresRes.status === "fulfilled" && proveedoresRes.value) {
          setProveedores(Array.isArray(proveedoresRes.value) ? proveedoresRes.value : []);
        } else {
          setProveedores([]);
        }
      } catch (e) {
        console.error(e);
        setError("No se pudieron cargar todos los datos del dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const s: DashboardStats = stats ?? {
    totalInsumos: 0,
    totalPlatillos: 0,
    totalProveedores: 0,
    ventasHoy: 0,
    variacionVentasPorcentaje: 0,
    rotacionInventario: 0,
    nivelServicio: 0,
  };

  const variacionEsPositiva = s.variacionVentasPorcentaje >= 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-gradient-to-r from-blue-900 to-blue-700 p-4 text-white shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-blue-100">Inventario total</p>
              <p className="mt-1 text-2xl font-semibold">{s.totalInsumos}</p>
            </div>
            <div className="rounded-full bg-white/10 p-2">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-blue-100">
            Insumos registrados en el sistema
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Platillos activos</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {s.totalPlatillos}
              </p>
            </div>
            <div className="rounded-full bg-blue-50 p-2">
              <ChefHat className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Menú disponible para predicción de demanda
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Ventas del día</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {s.ventasHoy}
              </p>
            </div>
            <div className="rounded-full bg-emerald-50 p-2">
              <ShoppingCart className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs">
            {variacionEsPositiva ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600">
                <TrendingUp className="mr-1 h-3 w-3" />
                +{s.variacionVentasPorcentaje.toFixed(1)}% vs ayer
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-red-600">
                <TrendingUp className="mr-1 h-3 w-3 rotate-180" />
                {s.variacionVentasPorcentaje.toFixed(1)}% vs ayer
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Nivel de servicio
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {s.nivelServicio.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-full bg-indigo-50 p-2">
              <Activity className="h-5 w-5 text-indigo-500" />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Órdenes atendidas sin quiebres de stock
          </p>
        </div>
      </section>

      {/* Gráfica + rotación */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Tendencia de ventas vs predicción
              </h2>
              <p className="text-xs text-slate-500">
                Ventas históricas vs modelo ML (XGBoost)
              </p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tendencias}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="mes" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="ventas"
                  name="Ventas reales"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="prediccion"
                  name="Predicción ML"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Rotación de inventario
            </h2>
            <p className="text-xs text-slate-500">
              Veces que el inventario se renueva en el periodo
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Rotación general</span>
              <span className="text-sm font-semibold text-slate-900">
                {s.rotacionInventario.toFixed(1)} veces
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{
                  width: `${Math.min(100, s.rotacionInventario * 20)}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Valores entre 3 y 6 suelen indicar un uso eficiente del inventario
              en restaurantes.
            </p>
          </div>
        </div>
      </section>

      {/* Alertas + proveedores */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h2 className="text-sm font-semibold text-slate-900">
                Alertas de stock bajo
              </h2>
            </div>
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
              {alertasStock.length} insumos en riesgo
            </span>
          </div>

          <div className="space-y-3">
            {alertasStock.map((a) => {
              const porcentaje =
                a.stockMinimo > 0
                  ? Math.min(100, (a.stockActual / a.stockMinimo) * 100)
                  : 0;

              return (
                <div
                  key={a.id}
                  className="rounded-lg border border-slate-100 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {a.nombre}
                      </p>
                      <p className="text-xs text-slate-500">{a.categoria}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        Stock / mínimo
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {a.stockActual} / {a.stockMinimo}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        porcentaje < 50 ? "bg-red-500" : "bg-amber-400"
                      }`}
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {!loading && alertasStock.length === 0 && (
              <p className="text-xs text-slate-500">
                No hay insumos con alerta de stock en este momento.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-centr justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-slate-900">
                Proveedores activos
              </h2>
            </div>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
              {proveedores.length} proveedores
            </span>
          </div>

          <div className="space-y-3">
            {proveedores.map((p) => (
              <div
                key={p.id}
                className="flex items-start justify-between rounded-lg border border-slate-100 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {p.nombre}
                  </p>
                  {p.insumosClave && p.insumosClave.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      {p.insumosClave.join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  {typeof p.calificacion === "number" && (
                    <span className="text-xs font-semibold text-amber-500">
                      ★ {p.calificacion.toFixed(1)}
                    </span>
                  )}
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5">
                    <Database className="h-3 w-3 text-emerald-600" />
                    <span className="text-[10px] font-medium text-emerald-700">
                      Activo
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {!loading && proveedores.length === 0 && (
              <p className="text-xs text-slate-500">
                No hay proveedores activos registrados.
              </p>
            )}
          </div>
        </div>
      </section>

      {loading && (
        <div className="fixed inset-x-0 bottom-4 flex justify-center">
          <div className="rounded-full bg-slate-900/90 px-4 py-2 text-xs text-slate-100 shadow-lg">
            Cargando datos del dashboard...
          </div>
        </div>
      )}
    </div>
  );
}
