// lib/services/users.service.ts

import { apiFetch } from "@/lib/apiClient";
import type { UserDTO } from "@/lib/backend-types";

export function getUsers() {
  return apiFetch<UserDTO[]>("/users");
}

export function getUserById(userId: string) {
  return apiFetch<UserDTO>(`/users/${userId}`);
}

export function createUser(payload: Partial<UserDTO> & { password?: string }) {
  return apiFetch<UserDTO>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(userId: string, payload: Partial<UserDTO>) {
  return apiFetch<UserDTO>(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteUser(userId: string) {
  return apiFetch<void>(`/users/${userId}`, {
    method: "DELETE",
  });
}