// lib/services/reports.service.ts

import { apiFetch } from "@/lib/apiClient";
import type { ReportDTO } from "@/lib/backend-types";

export type SalesSummaryRequest = {
  startDate: string;
  endDate: string;
};

export function getReports() {
  return apiFetch<ReportDTO[]>("/reports");
}

export function generateSalesSummary(payload: SalesSummaryRequest) {
  return apiFetch<ReportDTO>("/reports/sales-summary", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}