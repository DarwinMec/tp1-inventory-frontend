// app/insumos/page.tsx
"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

// Tipos mínimos alineados con tu backend (ProductDTO + InventoryDTO)
type ProductDTO = {
  id: string;
  name: string;
  description?: string | null;
  unitMeasure: string;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  unitCost: number;
  isActive: boolean;
  categoryId?: string | null;
  categoryName?: string | null;
};

type InventoryDTO = {
  productId: string;
  productName: string;
  currentStock: number | string | null;
  availableStock: number | string | null;
  reservedStock: number | string | null;
  lastUpdated: string;
};

// Tipo de fila que mostraremos en la tabla
type InsumoRow = {
  id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  activo: boolean;
};

export default function InsumosPage() {
  const [insumos, setInsumos] = useState<InsumoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInsumos() {
      try {
        setLoading(true);
        setError(null);

        // 1) Traemos todos los productos (insumos base)
        const products = await apiFetch<ProductDTO[]>("/api/products");

        // 2) Para cada producto, consultamos su inventario actual
        const rows: InsumoRow[] = await Promise.all(
          products.map(async (p) => {
            let inventory: InventoryDTO | null = null;

            try {
              inventory = await apiFetch<InventoryDTO>(
                `/api/inventory/${p.id}`
              );
            } catch (e) {
              console.warn(
                `No se pudo cargar inventario para el producto ${p.id}`,
                e
              );
            }

            const stockActual = inventory?.currentStock
              ? Number(inventory.currentStock)
              : 0;

            return {
              id: p.id,
              nombre: p.name,
              categoria: p.categoryName ?? "Sin categoría",
              unidad: p.unitMeasure,
              stockActual,
              stockMinimo: p.minStock,
              activo: p.isActive,
            };
          })
        );

        setInsumos(rows);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message ??
            "Ocurrió un error cargando los insumos desde el backend."
        );
      } finally {
        setLoading(false);
      }
    }

    loadInsumos();
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Insumos</h2>
        <p className="mt-1 text-sm text-slate-400">
          Gestión de insumos del restaurante conectada al backend (Spring Boot +
          PostgreSQL).
        </p>
      </header>

      {loading && (
        <p className="text-sm text-slate-400">Cargando insumos...</p>
      )}

      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Listado de insumos</h3>
              <p className="mt-1 text-xs text-slate-400">
                Datos obtenidos desde la API: /api/products + /api/inventory.
              </p>
            </div>
            {/* Aquí luego podemos agregar botón "Nuevo insumo" con Dialog */}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="px-2 py-2">Nombre</th>
                  <th className="px-2 py-2">Categoría</th>
                  <th className="px-2 py-2">Unidad</th>
                  <th className="px-2 py-2">Stock actual</th>
                  <th className="px-2 py-2">Stock mínimo</th>
                  <th className="px-2 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {insumos.map((i) => {
                  const enAlerta = i.stockActual < i.stockMinimo;

                  return (
                    <tr
                      key={i.id}
                      className="border-b border-slate-900/60 text-xs"
                    >
                      <td className="px-2 py-2">{i.nombre}</td>
                      <td className="px-2 py-2">{i.categoria}</td>
                      <td className="px-2 py-2">{i.unidad}</td>
                      <td className="px-2 py-2">
                        {i.stockActual.toLocaleString("es-PE")}
                      </td>
                      <td className="px-2 py-2">
                        {i.stockMinimo.toLocaleString("es-PE")}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] ${
                            !i.activo
                              ? "bg-slate-600/30 text-slate-300"
                              : enAlerta
                              ? "bg-red-500/20 text-red-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {!i.activo
                            ? "Inactivo"
                            : enAlerta
                            ? "Stock bajo"
                            : "Activo"}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {insumos.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-2 py-4 text-center text-xs text-slate-500"
                    >
                      No hay insumos registrados en el sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
