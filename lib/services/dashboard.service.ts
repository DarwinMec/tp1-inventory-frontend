// lib/services/dashboard.service.ts

import { apiFetch } from "@/lib/apiClient";
import type {
  DashboardStatsDTO,
  DashboardTendenciaDTO,
} from "@/lib/backend-types";

export function getDashboardStats() {
  return apiFetch<DashboardStatsDTO>("/dashboard/stats");
}

export function getDashboardTrends(months = 6) {
  return apiFetch<DashboardTendenciaDTO[]>(
    `/dashboard/tendencias?meses=${months}`
  );
}