// lib/services/users.service.ts

import { apiFetch } from "@/lib/apiClient";
import type { UserDTO } from "@/lib/backend-types";

export type CreateUserPayload = Partial<UserDTO> & {
  password?: string;
  active?: boolean;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export function getUsers() {
  return apiFetch<UserDTO[]>("/users");
}

export function getUserById(userId: string) {
  return apiFetch<UserDTO>(`/users/${userId}`);
}

export function createUser(payload: CreateUserPayload) {
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

export function changeOwnPassword(payload: ChangePasswordPayload) {
  return apiFetch<{ success: boolean; message?: string }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
