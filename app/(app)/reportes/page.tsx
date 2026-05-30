"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileJson,
  Loader2,
  Plus,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { ReportDTO } from "@/lib/backend-types";
import { generateSalesSummary, getReports } from "@/lib/services";

type TopDish = {
  dishName: string;
  totalQuantity: number;
};

type SalesSummaryPayload = {
  startDate?: string;
  endDate?: string;
  totalOrders?: number;
  totalSalesAmount?: number;
  totalItems?: number;
  topDishes?: TopDish[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

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

function formatCurrency(value?: number | null) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);
}

function getPayload(report: ReportDTO): SalesSummaryPayload {
  return (report.parametersJson ?? {}) as SalesSummaryPayload;
}

export default function ReportesPage() {
  const [reports, setReports] = useState<ReportDTO[]>([]);

  const [startDate, setStartDate] = useState(daysAgoISO(30));
  const [endDate, setEndDate] = useState(todayISO());

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getReports();

      const sorted = [...(data ?? [])].sort((a, b) => {
        const dateA = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
        const dateB = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
        return dateB - dateA;
      });

      setReports(sorted);
    } catch (e: any) {
      console.error("Error cargando reportes", e);
      setError(
        e?.message ??
          "No se pudieron cargar los reportes. Verifica el backend o tus permisos."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const latestReport = reports[0] ?? null;
  const latestPayload = latestReport ? getPayload(latestReport) : null;

  const totalReports = reports.length;

  const totalGeneratedSales = useMemo(() => {
    return reports.reduce((acc, report) => {
      const payload = getPayload(report);
      return acc + Number(payload.totalSalesAmount ?? 0);
    }, 0);
  }, [reports]);

  const totalOrdersReported = useMemo(() => {
    return reports.reduce((acc, report) => {
      const payload = getPayload(report);
      return acc + Number(payload.totalOrders ?? 0);
    }, 0);
  }, [reports]);

  const handleGenerateSalesSummary = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!startDate || !endDate) {
      setError("Debes seleccionar fecha de inicio y fecha de fin.");
      return;
    }

    if (endDate < startDate) {
      setError("La fecha fin no puede ser anterior a la fecha de inicio.");
      return;
    }

    try {
      setGenerating(true);

      await generateSalesSummary({
        startDate,
        endDate,
      });

      setSuccessMessage("Reporte de ventas generado correctamente.");
      await loadReports();
    } catch (e: any) {
      console.error("Error generando reporte", e);
      setError(e?.message ?? "No se pudo generar el reporte de ventas.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Sparkles className="h-3 w-3" />
            <span>Módulo de reportes</span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Reportes operativos
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Genera y consulta reportes de ventas para analizar el rendimiento
            del restaurante en un periodo determinado.
          </p>
        </div>

        <button
          type="button"
          onClick={loadReports}
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <FileJson className="h-5 w-5 text-blue-600" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Reportes generados
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {loading ? "…" : totalReports}
            </p>
            <p className="text-[11px] text-slate-400">
              Registros almacenados en el sistema.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Pedidos reportados
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {loading ? "…" : totalOrdersReported}
            </p>
            <p className="text-[11px] text-slate-400">
              Suma acumulada de reportes guardados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
            <BarChart3 className="h-5 w-5 text-amber-600" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Ventas reportadas
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {loading ? "…" : formatCurrency(totalGeneratedSales)}
            </p>
            <p className="text-[11px] text-slate-400">
              Total acumulado de los reportes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <Plus className="h-5 w-5 text-blue-600" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Generar resumen de ventas
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Selecciona un rango de fechas para generar un reporte con total
                de pedidos, monto vendido, unidades vendidas y platos más
                solicitados.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-slate-600">
              Fecha de inicio
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1"
              />
            </label>

            <label className="space-y-1 text-xs font-medium text-slate-600">
              Fecha de fin
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleGenerateSalesSummary}
            disabled={generating}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarDays className="h-4 w-4" />
            )}
            {generating ? "Generando reporte..." : "Generar reporte"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <Trophy className="h-5 w-5 text-emerald-600" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Último reporte generado
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Vista rápida del reporte más reciente almacenado en el sistema.
              </p>
            </div>
          </div>

          {!latestReport || !latestPayload ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              Todavía no hay reportes generados.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  {latestReport.title}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Generado por {latestReport.generatedByUsername ?? "—"} ·{" "}
                  {formatDateTime(latestReport.generatedAt)}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Pedidos</p>
                  <p className="text-base font-semibold text-slate-900">
                    {latestPayload.totalOrders ?? 0}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Unidades</p>
                  <p className="text-base font-semibold text-slate-900">
                    {latestPayload.totalItems ?? 0}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">Ventas</p>
                  <p className="text-base font-semibold text-slate-900">
                    {formatCurrency(latestPayload.totalSalesAmount)}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-slate-700">
                  Platos más vendidos
                </p>

                {latestPayload.topDishes && latestPayload.topDishes.length > 0 ? (
                  <div className="space-y-2">
                    {latestPayload.topDishes.map((dish, index) => (
                      <div
                        key={`${dish.dishName}-${index}`}
                        className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-xs"
                      >
                        <span className="font-medium text-slate-700">
                          {index + 1}. {dish.dishName}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                          {dish.totalQuantity} und.
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    No se registraron platos vendidos en el periodo.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Historial de reportes
            </h2>
            <p className="text-xs text-slate-500">
              Reportes generados previamente por usuarios autorizados.
            </p>
          </div>

          {loading && (
            <p className="text-[11px] text-slate-400">Cargando reportes…</p>
          )}
        </div>

        {reports.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            {loading
              ? "Cargando reportes..."
              : "No hay reportes registrados todavía."}
          </div>
        ) : (
          <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-100">
            <table className="min-w-full border-collapse text-[11px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                    Reporte
                  </th>
                  <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                    Periodo
                  </th>
                  <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                    Pedidos
                  </th>
                  <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                    Unidades
                  </th>
                  <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                    Ventas
                  </th>
                  <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                    Generado por
                  </th>
                  <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                    Fecha
                  </th>
                </tr>
              </thead>

              <tbody>
                {reports.map((report) => {
                  const payload = getPayload(report);

                  return (
                    <tr key={report.id} className="hover:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">
                            {report.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {report.reportType} · {report.fileFormat ?? "JSON"}
                          </span>
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                        {payload.startDate ?? "—"} al {payload.endDate ?? "—"}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-700">
                        {payload.totalOrders ?? 0}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-700">
                        {payload.totalItems ?? 0}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-800">
                        {formatCurrency(payload.totalSalesAmount)}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                        {report.generatedByUsername ?? "—"}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                        {formatDateTime(report.generatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}