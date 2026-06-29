// src/lib/apiClient.ts
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const AUTH_TOKEN_KEY = "gestrest-token";

type ApiErrorBody = {
  message?: string;
  error?: string;
  validationErrors?: Record<string, string> | null;
};

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

function buildFriendlyErrorMessage(status: number, rawBody: string): string {
  if (!rawBody) {
    return status >= 500
      ? "Ocurrió un error inesperado en el servidor. Intenta nuevamente."
      : "No se pudo completar la operación.";
  }

  try {
    const parsed = JSON.parse(rawBody) as ApiErrorBody;

    const validationMessages = parsed.validationErrors
      ? Object.values(parsed.validationErrors).filter(Boolean)
      : [];

    if (validationMessages.length > 0) {
      return validationMessages.join(" ");
    }

    if (parsed.message) return parsed.message;
    if (parsed.error) return parsed.error;
  } catch {
    // Si no es JSON, usamos el texto plano si es corto y legible.
  }

  if (rawBody.length <= 180 && !rawBody.includes("timestamp")) {
    return rawBody;
  }

  return status >= 500
    ? "Ocurrió un error inesperado en el servidor. Intenta nuevamente."
    : "No se pudo completar la operación. Revisa los datos ingresados.";
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers = new Headers(options.headers ?? undefined);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/api") ? path : `/api${path}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(buildFriendlyErrorMessage(res.status, text));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
