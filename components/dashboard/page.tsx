// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

// Tipos mínimos basados en tus DTOs de Spring Boot
type ProductDTO = {
  id: string;
  name: string;
  // ...otros campos no usados por ahora
};

type SupplierDTO = {
  id: string;
  name: string;
  isActive: boolean;
};

type AlertDTO = {
  id: string;
  alertTypeName: string;
  isRead: boolean;
  isResolved: boolean;
  productName?: string;
  dishName?: string;
};

type PredictionDTO = {
  id: string;
  dishName: string;
  predictedDate: string;
  predictedQuantity: number | null;
};

type SaleDTO = {
  id: string;
  saleDate: string; // LocalDate
  saleTime: string | null; // LocalTime
  totalAmount: number;
};

interface DashboardKpis {
  totalInsumos: number;
  alertasStock: number;
  proximaDemandaTotal: number;
  proveedoresActivos: number;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKpis>({
    totalInsumos: 0,
    alertasStock: 0,
    proximaDemandaTotal: 0,
    proveedoresActivos: 0,
  });

  const [ultimasVentas, setUltimasVentas] = useState<SaleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setError(null);

        if (typeof window === "undefined") return;

        const token = window.localStorage.getItem("gestrest-token");
        if (!token) {
          setError("No hay sesión activa. Inicia sesión nuevamente.");
          setLoading(false);
          return;
        }

        const headers: HeadersInit = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        // Llamamos a varios endpoints en paralelo
        const [
          productsRes,
          suppliersRes,
          alertsRes,
          predictionsRes,
          salesRes,
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/api/products`, { headers }),
          fetch(`${API_BASE_URL}/api/suppliers`, { headers }),
          fetch(`${API_BASE_URL}/api/alerts`, { headers }),
          fetch(`${API_BASE_URL}/api/predictions`, { headers }),
          fetch(`${API_BASE_URL}/api/sales`, { headers }),
        ]);

        if (
          !productsRes.ok ||
          !suppliersRes.ok ||
          !alertsRes.ok ||
          !predictionsRes.ok ||
          !salesRes.ok
        ) {
          throw new Error(
            "Error cargando datos del dashboard. Verifica que el backend esté corriendo y que tu usuario tenga permisos."
          );
        }

        const [products, suppliers, alerts, predictions, sales] =
          await Promise.all([
            productsRes.json() as Promise<ProductDTO[]>,
            suppliersRes.json() as Promise<SupplierDTO[]>,
            alertsRes.json() as Promise<AlertDTO[]>,
            predictionsRes.json() as Promise<PredictionDTO[]>,
            salesRes.json() as Promise<SaleDTO[]>,
          ]);

        const totalInsumos = products.length;

        const proveedoresActivos = suppliers.filter(
          (s) => s.isActive
        ).length;

        // Consideramos "alertas de stock" como alertas no resueltas
        const alertasStock = alerts.filter((a) => !a.isResolved).length;

        const proximaDemandaTotal = predictions.reduce(
          (acc, p) => acc + (p.predictedQuantity ?? 0),
          0
        );

        // Ordenar ventas de más reciente a más antigua (saleDate + saleTime)
        const ventasOrdenadas = [...sales].sort((a, b) => {
          const dateA = buildDate(a.saleDate, a.saleTime);
          const dateB = buildDate(b.saleDate, b.saleTime);
          return dateB.getTime() - dateA.getTime();
        });

        const ultimas = ventasOrdenadas.slice(0, 5);

        setKpis({
          totalInsumos,
          alertasStock,
          proximaDemandaTotal,
          proveedoresActivos,
        });
        setUltimasVentas(ultimas);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message ??
            "Ocurrió un error cargando los datos del dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          Dashboard general
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Resumen del inventario, ventas y predicciones para el restaurante en
          Chiclayo.
        </p>
      </header>

      {loading && (
        <p className="text-sm text-slate-400">Cargando datos del dashboard...</p>
      )}

      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs uppercase text-slate-400">
                Total insumos
              </p>
              <p className="mt-2 text-2xl font-bold">{kpis.totalInsumos}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs uppercase text-slate-400">
                Alertas de stock
              </p>
              <p className="mt-2 text-2xl font-bold text-red-400">
                {kpis.alertasStock}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs uppercase text-slate-400">
                Próxima demanda (7 días)
              </p>
              <p className="mt-2 text-2xl font-bold">
                {kpis.proximaDemandaTotal}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs uppercase text-slate-400">
                Proveedores activos
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-400">
                {kpis.proveedoresActivos}
              </p>
            </div>
          </div>

          {/* Tabla simple de últimas ventas */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-sm font-semibold">
              Últimas ventas registradas
            </h3>
            <p className="mb-3 mt-1 text-xs text-slate-400">
              Estas ventas servirán luego como base para entrenar el modelo ML.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-2 py-2">ID</th>
                    <th className="px-2 py-2">Fecha</th>
                    <th className="px-2 py-2">Hora</th>
                    <th className="px-2 py-2">Monto total (S/)</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimasVentas.map((v) => (
                    <tr
                      key={v.id}
                      className="border-b border-slate-900/60"
                    >
                      <td className="px-2 py-2">{v.id}</td>
                      <td className="px-2 py-2">
                        {formatDate(v.saleDate)}
                      </td>
                      <td className="px-2 py-2">
                        {v.saleTime ?? "--"}
                      </td>
                      <td className="px-2 py-2">
                        {v.totalAmount?.toFixed
                          ? v.totalAmount.toFixed(2)
                          : v.totalAmount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// Helpers

function buildDate(dateStr: string, timeStr: string | null): Date {
  const time = timeStr ?? "00:00:00";
  return new Date(`${dateStr}T${time}`);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
