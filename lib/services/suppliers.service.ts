// lib/services/suppliers.service.ts

import { apiFetch } from "@/lib/apiClient";
import type { SupplierDTO } from "@/lib/backend-types";

export function getSuppliers() {
  return apiFetch<SupplierDTO[]>("/suppliers");
}

export function createSupplier(payload: Partial<SupplierDTO>) {
  return apiFetch<SupplierDTO>("/suppliers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSupplier(supplierId: string, payload: Partial<SupplierDTO>) {
  return apiFetch<SupplierDTO>(`/suppliers/${supplierId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSupplier(supplierId: string) {
  return apiFetch<void>(`/suppliers/${supplierId}`, {
    method: "DELETE",
  });
}