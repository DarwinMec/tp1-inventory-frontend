// lib/services/inventory.service.ts

import { apiFetch } from "@/lib/apiClient";
import type {
  InventoryDTO,
  InventoryTransactionDTO,
} from "@/lib/backend-types";

export function getInventoryByProduct(productId: string) {
  return apiFetch<InventoryDTO>(`/inventory/${productId}`);
}

export function getInventoryTransactions() {
  return apiFetch<InventoryTransactionDTO[]>("/inventory/transactions");
}

export function createInventoryTransaction(
  payload: Partial<InventoryTransactionDTO>
) {
  return apiFetch<InventoryTransactionDTO>("/inventory/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}