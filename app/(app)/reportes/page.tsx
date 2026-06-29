"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
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

type ReportExportFormat = "json" | "pdf" | "xlsx";

type ExportableReport = {
  metadata: {
    id: string;
    title: string;
    reportType: string;
    period: string;
    generatedBy: string;
    generatedAt: string;
    originalFileFormat: string;
  };
  summary: {
    startDate: string;
    endDate: string;
    totalOrders: number;
    totalItems: number;
    totalSalesAmount: number;
  };
  topDishes: TopDish[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function buildValidDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function parseReportDate(value?: string | null): Date | null {
  if (!value) return null;

  const cleanValue = String(value).trim();

  const isoMatch = cleanValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return buildValidDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3])
    );
  }

  const slashMatch = cleanValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return buildValidDate(
      Number(slashMatch[3]),
      Number(slashMatch[2]),
      Number(slashMatch[1])
    );
  }

  const compactMatch = cleanValue.match(/^\d{6,8}$/);
  if (!compactMatch) return null;

  const year = Number(cleanValue.slice(0, 4));
  const rest = cleanValue.slice(4);

  if (rest.length === 4) {
    return buildValidDate(
      year,
      Number(rest.slice(0, 2)),
      Number(rest.slice(2, 4))
    );
  }

  if (rest.length === 2) {
    return buildValidDate(year, Number(rest.slice(0, 1)), Number(rest.slice(1)));
  }

  if (rest.length === 3) {
    const monthOneDigit = Number(rest.slice(0, 1));
    const dayTwoDigits = Number(rest.slice(1));
    const firstCandidate = buildValidDate(year, monthOneDigit, dayTwoDigits);

    if (firstCandidate) return firstCandidate;

    const monthTwoDigits = Number(rest.slice(0, 2));
    const dayOneDigit = Number(rest.slice(2));
    return buildValidDate(year, monthTwoDigits, dayOneDigit);
  }

  return null;
}

function formatDateOnly(value?: string | null) {
  if (!value) return "—";

  const parsedDate = parseReportDate(value);

  if (!parsedDate) {
    return String(value);
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
}

function formatDateForFilename(value?: string | null) {
  const parsedDate = parseReportDate(value);

  if (!parsedDate) {
    return String(value ?? "sin_fecha").replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function getReportPeriod(report: ReportDTO) {
  const payload = getPayload(report);
  return `${formatDateOnly(payload.startDate)} al ${formatDateOnly(
    payload.endDate
  )}`;
}

function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

function getReportBaseFilename(report: ReportDTO) {
  const payload = getPayload(report);
  const title = sanitizeFilename(report.title || "reporte_ventas");
  const start = formatDateForFilename(payload.startDate);
  const end = formatDateForFilename(payload.endDate);

  return `${title}_${start}_al_${end}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function buildExportableReport(report: ReportDTO): ExportableReport {
  const payload = getPayload(report);

  return {
    metadata: {
      id: report.id,
      title: report.title,
      reportType: report.reportType,
      period: getReportPeriod(report),
      generatedBy: report.generatedByUsername ?? "—",
      generatedAt: formatDateTime(report.generatedAt),
      originalFileFormat: report.fileFormat ?? "JSON",
    },
    summary: {
      startDate: formatDateOnly(payload.startDate),
      endDate: formatDateOnly(payload.endDate),
      totalOrders: Number(payload.totalOrders ?? 0),
      totalItems: Number(payload.totalItems ?? 0),
      totalSalesAmount: Number(payload.totalSalesAmount ?? 0),
    },
    topDishes: (payload.topDishes ?? []).map((dish) => ({
      dishName: dish.dishName ?? "—",
      totalQuantity: Number(dish.totalQuantity ?? 0),
    })),
  };
}

function exportReportAsJson(report: ReportDTO) {
  const data = buildExportableReport(report);
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });

  downloadBlob(blob, `${getReportBaseFilename(report)}.json`);
}

function exportReportAsXlsx(report: ReportDTO) {
  const data = buildExportableReport(report);
  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    ["Reporte", data.metadata.title],
    ["Tipo", data.metadata.reportType],
    ["Periodo", data.metadata.period],
    ["Generado por", data.metadata.generatedBy],
    ["Fecha de generación", data.metadata.generatedAt],
    ["Pedidos", data.summary.totalOrders],
    ["Unidades vendidas", data.summary.totalItems],
    ["Ventas", data.summary.totalSalesAmount],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");

  const topDishesSheet = XLSX.utils.json_to_sheet(
    data.topDishes.map((dish, index) => ({
      "#": index + 1,
      Platillo: dish.dishName,
      "Cantidad vendida": dish.totalQuantity,
    }))
  );
  XLSX.utils.book_append_sheet(workbook, topDishesSheet, "Platos vendidos");

  XLSX.writeFile(workbook, `${getReportBaseFilename(report)}.xlsx`);
}

function exportReportAsPdf(report: ReportDTO) {
  const data = buildExportableReport(report);
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text("Reporte de resumen de ventas", 14, 16);

  doc.setFontSize(10);
  doc.text(`Reporte: ${data.metadata.title}`, 14, 25);
  doc.text(`Periodo: ${data.metadata.period}`, 14, 31);
  doc.text(`Generado por: ${data.metadata.generatedBy}`, 14, 37);
  doc.text(`Fecha de generación: ${data.metadata.generatedAt}`, 14, 43);

  autoTable(doc, {
    startY: 51,
    head: [["Indicador", "Valor"]],
    body: [
      ["Pedidos", data.summary.totalOrders],
      ["Unidades vendidas", data.summary.totalItems],
      ["Ventas", formatCurrency(data.summary.totalSalesAmount)],
    ],
  });

  const lastAutoTable = (
    doc as jsPDF & { lastAutoTable?: { finalY: number } }
  ).lastAutoTable;

  autoTable(doc, {
    startY: (lastAutoTable?.finalY ?? 82) + 10,
    head: [["#", "Platillo", "Cantidad vendida"]],
    body:
      data.topDishes.length > 0
        ? data.topDishes.map((dish, index) => [
            index + 1,
            dish.dishName,
            dish.totalQuantity,
          ])
        : [["—", "No se registraron platos vendidos en el periodo", "—"]],
  });

  doc.save(`${getReportBaseFilename(report)}.pdf`);
}

function getExportFormatLabel(format: ReportExportFormat) {
  switch (format) {
    case "json":
      return "JSON";
    case "pdf":
      return "PDF";
    case "xlsx":
      return "XLSX";
    default:
      return format;
  }
}

export default function ReportesPage() {
  const [reports, setReports] = useState<ReportDTO[]>([]);

  const [startDate, setStartDate] = useState(daysAgoISO(30));
  const [endDate, setEndDate] = useState(todayISO());

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportingReportKey, setExportingReportKey] = useState<string | null>(
    null
  );

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

  const handleExportReport = (report: ReportDTO, format: ReportExportFormat) => {
    const exportKey = `${report.id}-${format}`;

    try {
      setError(null);
      setSuccessMessage(null);
      setExportingReportKey(exportKey);

      if (format === "json") {
        exportReportAsJson(report);
      } else if (format === "pdf") {
        exportReportAsPdf(report);
      } else {
        exportReportAsXlsx(report);
      }

      setSuccessMessage(
        `Reporte exportado en formato ${getExportFormatLabel(
          format
        )} correctamente.`
      );
    } catch (e: any) {
      console.error("Error exportando reporte", e);
      setError(
        e?.message ??
          "No se pudo exportar el reporte. Intenta nuevamente o verifica el contenido del reporte."
      );
    } finally {
      setExportingReportKey(null);
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
                  Periodo: {getReportPeriod(latestReport)}
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
                    Exportar
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
                  const exportFormats: ReportExportFormat[] = [
                    "json",
                    "pdf",
                    "xlsx",
                  ];

                  return (
                    <tr key={report.id} className="hover:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">
                            {report.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {report.reportType} · Formatos disponibles
                          </span>
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                        {getReportPeriod(report)}
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
                        <div className="flex flex-wrap gap-1.5">
                          {exportFormats.map((format) => {
                            const exportKey = `${report.id}-${format}`;
                            const isExporting = exportingReportKey === exportKey;

                            return (
                              <button
                                key={format}
                                type="button"
                                onClick={() => handleExportReport(report, format)}
                                disabled={exportingReportKey !== null}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                title={`Descargar reporte en formato ${getExportFormatLabel(
                                  format
                                )}`}
                              >
                                {isExporting ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3" />
                                )}
                                {getExportFormatLabel(format)}
                              </button>
                            );
                          })}
                        </div>
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
