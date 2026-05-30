// lib/services/sales.service.ts

import { apiFetch } from "@/lib/apiClient";
import type { PageResponse, SaleDTO } from "@/lib/backend-types";

export function getSales() {
  return apiFetch<SaleDTO[]>("/sales");
}

export function getSalesPage(page = 0, size = 10) {
  return apiFetch<PageResponse<SaleDTO>>(`/sales/page?page=${page}&size=${size}`);
}

export function getSaleById(saleId: string) {
  return apiFetch<SaleDTO>(`/sales/${saleId}`);
}

export function createSale(payload: Partial<SaleDTO>) {
  return apiFetch<SaleDTO>("/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}