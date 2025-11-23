// src/lib/apiClient.ts
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const AUTH_TOKEN_KEY = "gestrest-token";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Wrapper genérico de fetch:
 * - Prependa `${API_BASE_URL}` + `/api` si hace falta
 * - Agrega Authorization: Bearer <token> si existe
 * - Lanza error si !res.ok
 * - Devuelve T (JSON parseado) o undefined si 204
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers = new Headers(options.headers ?? undefined);

  // Si hay token, agregamos el Authorization
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Si mandas body y no seteaste Content-Type, lo asumimos JSON
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Construcción de URL final
  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/api") ? path : `/api${path}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error API ${res.status}: ${text}`);
  }

  // Sin contenido (No Content)
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
