// lib/services/dishes.service.ts

import { apiFetch } from "@/lib/apiClient";
import type { DishDTO } from "@/lib/backend-types";

export function getDishes() {
  return apiFetch<DishDTO[]>("/dishes");
}

export function getDishById(dishId: string) {
  return apiFetch<DishDTO>(`/dishes/${dishId}`);
}

export function createDish(payload: Partial<DishDTO>) {
  return apiFetch<DishDTO>("/dishes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDish(dishId: string, payload: Partial<DishDTO>) {
  return apiFetch<DishDTO>(`/dishes/${dishId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteDish(dishId: string) {
  return apiFetch<void>(`/dishes/${dishId}`, {
    method: "DELETE",
  });
}