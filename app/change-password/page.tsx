"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound, LogOut } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { changeOwnPassword } from "@/lib/services";

export default function ChangePasswordPage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isAuthLoading,
    logout,
    updateUserSession,
  } = useAuthContext();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && user && !user.mustChangePassword) {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, isAuthenticated, user, router]);

  const isFormValid = useMemo(() => {
    return (
      currentPassword.trim().length > 0 &&
      newPassword.trim().length >= 6 &&
      confirmPassword.trim().length >= 6 &&
      newPassword === confirmPassword &&
      currentPassword !== newPassword
    );
  }, [currentPassword, newPassword, confirmPassword]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!currentPassword.trim()) {
      setError("Ingresa la contraseña temporal actual.");
      return;
    }

    if (newPassword.trim().length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("La nueva contraseña debe ser diferente a la contraseña temporal.");
      return;
    }

    try {
      setSaving(true);

      await changeOwnPassword({
        currentPassword,
        newPassword,
      });

      updateUserSession({ mustChangePassword: false });
      setSuccessMessage("Contraseña actualizada correctamente. Redirigiendo al dashboard...");

      window.setTimeout(() => {
        router.replace("/dashboard");
      }, 900);
    } catch (e: any) {
      console.error("Error cambiando contraseña", e);
      setError(e?.message ?? "No se pudo actualizar la contraseña.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/20 text-blue-300">
            <KeyRound className="h-6 w-6" />
          </div>

          <h1 className="mt-3 text-2xl font-bold">
            Cambio obligatorio de contraseña
          </h1>

          <p className="mt-2 text-xs text-slate-400">
            Por seguridad, debes reemplazar tu contraseña temporal antes de ingresar al sistema.
          </p>
        </div>

        {(error || successMessage) && (
          <div
            className={`mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
              error
                ? "border-red-800 bg-red-950/40 text-red-300"
                : "border-emerald-800 bg-emerald-950/40 text-emerald-300"
            }`}
          >
            {error ? (
              <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="mt-[2px] h-3.5 w-3.5" />
            )}
            <p>{error ?? successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Contraseña temporal
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
              placeholder="Ingresa tu contraseña temporal"
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
              placeholder="Mínimo 6 caracteres"
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Confirmar nueva contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
              placeholder="Repite la nueva contraseña"
              disabled={saving}
            />
          </div>

          <button
            type="submit"
            disabled={saving || !isFormValid}
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {saving ? "Actualizando contraseña..." : "Actualizar contraseña"}
          </button>
        </form>

        <button
          type="button"
          onClick={logout}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
