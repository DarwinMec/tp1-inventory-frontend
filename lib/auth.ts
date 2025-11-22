// src/lib/auth.ts
import { AuthUser, UserRole } from "@/lib/types";

export interface LoginParams {
  // seguimos usando "email" si tu formulario de login pide correo
  email: string;
  password: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

interface AuthResponse {
  token: string;
}

interface UserDTO {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: string;
  active?: boolean;
  createdAt?: string;
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

// ⬇️ este "loginMock" ahora hace login REAL contra tu backend
export async function loginMock({
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
        // si tu backend espera "username", usamos el email como username
        username: email,
        password,
      }),
    });

    if (!loginRes.ok) {
      return null;
    }

    const { token } = (await loginRes.json()) as AuthResponse;

    // Pedimos los datos del usuario autenticado
    const me = await fetchMe(token);

    const user: AuthUser = {
      id: me.id,
      username: me.username,
      email: me.email,
      fullName: me.fullName ?? me.username,
      role: me.role as UserRole,
      token,
    };

    return user;
  } catch (error) {
    console.error("Error en login:", error);
    return null;
  }
}

export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}
