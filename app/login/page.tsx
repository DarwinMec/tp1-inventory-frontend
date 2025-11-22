// src/app/login/page.tsx
"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginSchema } from "@/lib/validations";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: LoginSchema) => {
    // 🔹 Aquí hacemos el mapeo username -> email para que coincida con LoginParams
    const ok = await login({
      email: data.username,
      password: data.password,
    });

    if (!ok) {
      toast.error("Credenciales incorrectas. Revisa tu usuario y contraseña.");
    } else {
      toast.success("Bienvenido a GestRest AI");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600/20 px-3 py-1 text-xs font-semibold text-blue-300">
            GestRest AI · Chiclayo
          </div>
          <h1 className="mt-3 text-2xl font-bold">Iniciar sesión</h1>
          <p className="mt-1 text-xs text-slate-400">
            Sistema de gestión de inventarios y predicción de demanda.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Usuario
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
              placeholder="admin"
              {...register("username")}
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-400">
                {errors.username.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-70"
          >
            {isSubmitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
