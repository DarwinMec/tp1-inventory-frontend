// src/lib/auth.ts
import { AuthUser, UserRole } from "@/lib/types";

export interface LoginParams {
  email: string;
  password: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

interface AuthResponse {
  token: string;
  mustChangePassword?: boolean | null;
}

interface UserDTO {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: string;
  active?: boolean;
  isActive?: boolean;
  mustChangePassword?: boolean | null;
  createdAt?: string;
}

export function normalizeRole(role?: string | null): UserRole {
  const cleanRole = (role ?? "")
    .replace("ROLE_", "")
    .trim()
    .toUpperCase();

  if (cleanRole === "ADMIN") return "ADMIN";
  if (cleanRole === "MANAGER") return "MANAGER";
  if (cleanRole === "EMPLOYEE") return "EMPLOYEE";

  return "EMPLOYEE";
}

function getLoginErrorMessage(rawBody: string): string {
  if (!rawBody) return "Credenciales incorrectas.";

  try {
    const parsed = JSON.parse(rawBody) as { message?: string; error?: string };
    return parsed.message || parsed.error || "Credenciales incorrectas.";
  } catch {
    return rawBody.length <= 120 ? rawBody : "Credenciales incorrectas.";
  }
}

async function fetchMe(token: string): Promise<UserDTO> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error al obtener perfil: ${text}`);
  }

  return (await res.json()) as UserDTO;
}

export async function loginWithBackend({
  email,
  password,
}: LoginParams): Promise<AuthUser | null> {
  try {
    const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: email,
        password,
      }),
    });

    if (!loginRes.ok) {
      const text = await loginRes.text();
      throw new Error(getLoginErrorMessage(text));
    }

    const authResponse = (await loginRes.json()) as AuthResponse;
    const me = await fetchMe(authResponse.token);

    const user: AuthUser = {
      id: me.id,
      username: me.username,
      email: me.email,
      fullName: me.fullName ?? me.username,
      role: normalizeRole(me.role),
      token: authResponse.token,
      mustChangePassword: Boolean(
        authResponse.mustChangePassword ?? me.mustChangePassword ?? false
      ),
    };

    return user;
  } catch (error) {
    console.error("Error en login:", error);
    return null;
  }
}

export const loginMock = loginWithBackend;

export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}
