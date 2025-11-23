"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Package,
  Search,
  Filter,
  Activity,
  TriangleAlert,
  CheckCircle2,
  Sparkle,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

// ===== Tipos alineados al backend =====

type ProductDTO = {
  id: string;
  name: string;
  description?: string | null;
  unitMeasure: string;
  minStock?: number | null;
  maxStock?: number | null;
  reorderPoint?: number | null;
  unitCost?: number | null;
  isActive?: boolean | null;
  categoryId?: string | null;
  categoryName?: string | null;
};

type InventoryDTO = {
  productId: string;
  productName: string;
  currentStock?: number | null;
  availableStock?: number | null;
  reservedStock?: number | null;
  lastUpdated?: string | null;
};

type EnrichedInsumo = {
  product: ProductDTO;
  inventory: InventoryDTO | null;
  // Estado derivado: "ok" | "near_min" | "below_min" | "no_stock"
  status: "ok" | "near_min" | "below_min" | "no_stock";
};

export default function InsumosPage() {
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [insumos, setInsumos] = useState<EnrichedInsumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [onlyCritical, setOnlyCritical] = useState(false);

  // 1) Cargar productos (insumos base)
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Backend: GET /api/products
        const data = await apiFetch<ProductDTO[]>("/products");
        setProducts(data);
      } catch (e: any) {
        console.error("Error cargando insumos", e);
        setError(
          e?.message ??
            "No se pudieron cargar los insumos. Verifica el backend y tus credenciales."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // 2) Cargar inventario para cada producto y enriquecer
  useEffect(() => {
    const loadInventoryForProducts = async () => {
      if (!products || products.length === 0) {
        setInsumos([]);
        return;
      }

      try {
        setLoadingInventory(true);
        setError(null);

        // Llamadas paralelas a /inventory/{productId}
        const enriched: EnrichedInsumo[] = await Promise.all(
          products.map(async (p) => {
            try {
              const inv = await apiFetch<InventoryDTO>(
                `/inventory/${p.id}`
              );

              const current =
                inv.currentStock != null ? inv.currentStock : 0;
              const min =
                p.minStock != null ? p.minStock : 0;

              let status: EnrichedInsumo["status"] = "ok";

              if (current <= 0) {
                status = "no_stock";
              } else if (current < min) {
                status = "below_min";
              } else if (current < min * 1.3) {
                // zona "cercana" al mínimo (30% por encima)
                status = "near_min";
              } else {
                status = "ok";
              }

              return {
                product: p,
                inventory: inv,
                status,
              };
            } catch (err) {
              // Si falla el inventario de un producto, lo dejamos con null
              console.warn(
                `No se pudo obtener inventario para el producto ${p.id}`,
                err
              );
              return {
                product: p,
                inventory: null,
                status: "ok",
              };
            }
          })
        );

        setInsumos(enriched);
      } catch (e: any) {
        console.error("Error cargando inventario de insumos", e);
        setError(
          e?.message ??
            "Ocurrió un error al cargar el inventario de insumos."
        );
      } finally {
        setLoadingInventory(false);
      }
    };

    loadInventoryForProducts();
  }, [products]);

  // 3) Categorías disponibles
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set).sort();
  }, [products]);

  // 4) Filtros y búsqueda
  const filteredInsumos = useMemo(() => {
    return insumos
      .filter((i) => {
        const term = searchTerm.toLowerCase();

        if (term) {
          const matchName = i.product.name
            .toLowerCase()
            .includes(term);
          const matchCat = (i.product.categoryName ?? "")
            .toLowerCase()
            .includes(term);
          if (!matchName && !matchCat) return false;
        }

        if (
          selectedCategory !== "todos" &&
          (i.product.categoryName ?? "") !== selectedCategory
        ) {
          return false;
        }

        if (onlyCritical) {
          return (
            i.status === "below_min" ||
            i.status === "no_stock"
          );
        }

        return true;
      })
      .sort((a, b) =>
        a.product.name.localeCompare(b.product.name)
      );
  }, [insumos, searchTerm, selectedCategory, onlyCritical]);

  // 5) KPIs para tarjetas
  const totalInsumos = insumos.length;
  const belowMinCount = insumos.filter(
    (i) => i.status === "below_min" || i.status === "no_stock"
  ).length;
  const nearMinCount = insumos.filter(
    (i) => i.status === "near_min"
  ).length;

  const formatStatusLabel = (status: EnrichedInsumo["status"]) => {
    switch (status) {
      case "no_stock":
        return "Sin stock";
      case "below_min":
        return "Bajo mínimo";
      case "near_min":
        return "Cerca del mínimo";
      case "ok":
      default:
        return "En rango";
    }
  };

  const statusClasses = (status: EnrichedInsumo["status"]) => {
    switch (status) {
      case "no_stock":
        return "bg-red-50 text-red-700 border-red-200";
      case "below_min":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "near_min":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "ok":
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  return (
    <section className="space-y-6">
      {/* ENCABEZADO */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Sparkles className="h-3 w-3" />
            <span>Módulo de insumos</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Insumos e inventario
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Revisa el estado de tus insumos, su stock actual versus el stock
            mínimo configurado y detecta rápidamente cuáles requieren
            reposición.
          </p>
        </div>

        {error && (
          <div className="flex max-w-xs items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
            <p>{error}</p>
          </div>
        )}
      </header>

      {/* TARJETAS RESUMEN */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Package className="h-5 w-5 text-slate-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Total de insumos
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loading ? "…" : totalInsumos}
            </span>
            <span className="text-[11px] text-slate-400">
              Productos registrados en catálogo.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
            <TriangleAlert className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Insumos críticos
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingInventory ? "…" : belowMinCount}
            </span>
            <span className="text-[11px] text-slate-400">
              Bajo mínimo o sin stock.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
            <Activity className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Insumos en zona de riesgo
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingInventory ? "…" : nearMinCount}
            </span>
            <span className="text-[11px] text-slate-400">
              Cercanos al stock mínimo.
            </span>
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o categoría…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
            />
          </div>

          {/* Categoría */}
          <div className="flex items-center gap-2 sm:w-64">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
            >
              <option value="todos">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle solo críticos */}
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={onlyCritical}
            onChange={(e) => setOnlyCritical(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-0"
          />
          <span>Mostrar solo insumos críticos</span>
        </label>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Listado de insumos
            </h2>
            <p className="text-xs text-slate-500">
              Stock actual, stock mínimo y estado de cada insumo.
            </p>
          </div>

          {(loading || loadingInventory) && (
            <p className="text-[11px] text-slate-400">
              Cargando datos de inventario…
            </p>
          )}
        </div>

        {filteredInsumos.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center text-xs text-slate-500">
            {loading || loadingInventory
              ? "Cargando insumos…"
              : "No se encontraron insumos con los filtros aplicados."}
          </div>
        ) : (
          <div className="max-h-[480px] overflow-auto rounded-xl border border-slate-100">
            <table className="min-w-full border-collapse text-[11px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                    Insumo
                  </th>
                  <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                    Categoría
                  </th>
                  <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                    Stock actual
                  </th>
                  <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                    Stock mín.
                  </th>
                  <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                    Disponible
                  </th>
                  <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                    Unidad
                  </th>
                  <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInsumos.map((i) => {
                  const inv = i.inventory;
                  const current =
                    inv?.currentStock != null ? inv.currentStock : 0;
                  const available =
                    inv?.availableStock != null ? inv.availableStock : current;
                  const min =
                    i.product.minStock != null ? i.product.minStock : 0;

                  return (
                    <tr key={i.product.id} className="hover:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {i.product.name}
                          </span>
                          {i.product.description && (
                            <span className="text-[10px] text-slate-400">
                              {i.product.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                        {i.product.categoryName ?? "—"}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-800">
                        {current.toFixed(3)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-700">
                        {min.toFixed(0)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-700">
                        {available.toFixed(3)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                        {i.product.unitMeasure}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClasses(
                            i.status
                          )}`}
                        >
                          {i.status === "ok" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <TriangleAlert className="h-3 w-3" />
                          )}
                          {formatStatusLabel(i.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
