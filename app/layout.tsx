// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "GestRest Machine Learning - Sistema de Gestión de Inventarios",
  description:
    "Sistema inteligente de gestión de inventarios y predicción de demanda para restaurantes en Chiclayo, Perú.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
