// lib/services/products.service.ts

import { apiFetch } from "@/lib/apiClient";
import type { CategoryDTO, ProductDTO } from "@/lib/backend-types";

export function getProducts() {
  return apiFetch<ProductDTO[]>("/products");
}

export function getCategories() {
  return apiFetch<CategoryDTO[]>("/categories");
}

export function createProduct(payload: Partial<ProductDTO>) {
  return apiFetch<ProductDTO>("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProduct(productId: string, payload: Partial<ProductDTO>) {
  return apiFetch<ProductDTO>(`/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(productId: string) {
  return apiFetch<void>(`/products/${productId}`, {
    method: "DELETE",
  });
}