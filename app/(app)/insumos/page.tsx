"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Package,
  Search,
  Filter,
  Activity,
  TriangleAlert,
  CheckCircle2,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import type {
  CategoryDTO,
  InventoryDTO,
  ProductDTO,
} from "@/lib/backend-types";
import {
  createProduct,
  deleteProduct,
  getCategories,
  getInventoryByProduct,
  getProducts,
  updateProduct,
} from "@/lib/services";

type EnrichedInsumo = {
  product: ProductDTO;
  inventory: InventoryDTO | null;
  status: "ok" | "near_min" | "below_min" | "no_stock";
};

type ProductFormState = {
  id?: string;
  name: string;
  description: string;
  unitMeasure: string;
  minStock: string;
  maxStock: string;
  reorderPoint: string;
  unitCost: string;
  categoryId: string;
  isActive: boolean;
};

const emptyForm: ProductFormState = {
  name: "",
  description: "",
  unitMeasure: "kg",
  minStock: "",
  maxStock: "",
  reorderPoint: "",
  unitCost: "",
  categoryId: "",
  isActive: true,
};

const unitOptions = ["kg", "g", "L", "ml", "unidad", "paquete", "caja"];

function toNumberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
}

function buildProductPayload(form: ProductFormState): Partial<ProductDTO> {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    unitMeasure: form.unitMeasure.trim(),
    minStock: toNumberOrNull(form.minStock),
    maxStock: toNumberOrNull(form.maxStock),
    reorderPoint: toNumberOrNull(form.reorderPoint),
    unitCost: toNumberOrNull(form.unitCost),
    categoryId: form.categoryId || null,
    isActive: form.isActive,
  };
}

export default function InsumosPage() {
  const { hasRole } = useAuthContext();

  const canManageProducts = hasRole(["ADMIN"]);

  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [insumos, setInsumos] = useState<EnrichedInsumo[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [onlyCritical, setOnlyCritical] = useState(false);

  const [highlightedProductId, setHighlightedProductId] = useState<
    string | null
  >(null);

  const [showOnlyHighlightedProduct, setShowOnlyHighlightedProduct] =
    useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDTO | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getProducts();
      setProducts(data ?? []);
    } catch (e: any) {
      console.error("Error cargando insumos", e);
      setError(
        e?.message ??
          "No se pudieron cargar los insumos. Verifica el backend y tus credenciales."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    if (!canManageProducts) return;

    try {
      const data = await getCategories();
      setCategories(data ?? []);
    } catch (e) {
      console.warn("No se pudieron cargar categorías", e);
      setCategories([]);
    }
  }, [canManageProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const productParam = params.get("productId");

    if (productParam) {
      setHighlightedProductId(productParam);
      setShowOnlyHighlightedProduct(true);
      setSearchTerm("");
      setSelectedCategory("todos");
      setOnlyCritical(false);
    }
  }, []);

  useEffect(() => {
    const loadInventoryForProducts = async () => {
      if (!products || products.length === 0) {
        setInsumos([]);
        return;
      }

      try {
        setLoadingInventory(true);
        setError(null);

        const enriched: EnrichedInsumo[] = await Promise.all(
          products.map(async (p) => {
            try {
              const inv = await getInventoryByProduct(p.id);

              const current = inv.currentStock != null ? inv.currentStock : 0;
              const available =
                inv.availableStock != null ? inv.availableStock : current;
              const min = p.minStock != null ? p.minStock : 0;

              let status: EnrichedInsumo["status"] = "ok";

              if (available <= 0) {
                status = "no_stock";
              } else if (min > 0 && available < min) {
                status = "below_min";
              } else if (min > 0 && available < min * 1.3) {
                status = "near_min";
              }

              return {
                product: p,
                inventory: inv,
                status,
              };
            } catch (err) {
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
          e?.message ?? "Ocurrió un error al cargar el inventario de insumos."
        );
      } finally {
        setLoadingInventory(false);
      }
    };

    loadInventoryForProducts();
  }, [products]);

  const categoryNames = useMemo(() => {
    const set = new Set<string>();

    products.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });

    return Array.from(set).sort();
  }, [products]);

  const filteredInsumos = useMemo(() => {
    return insumos
      .filter((i) => {
        if (
          showOnlyHighlightedProduct &&
          highlightedProductId &&
          i.product.id !== highlightedProductId
        ) {
          return false;
        }

        const term = searchTerm.toLowerCase();

        if (term) {
          const matchName = i.product.name.toLowerCase().includes(term);
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
          return i.status === "below_min" || i.status === "no_stock";
        }

        return true;
      })
      .sort((a, b) => a.product.name.localeCompare(b.product.name));
  }, [
    insumos,
    searchTerm,
    selectedCategory,
    onlyCritical,
    highlightedProductId,
    showOnlyHighlightedProduct,
  ]);

  const totalInsumos = insumos.length;
  const activeInsumos = insumos.filter(
    (i) => i.product.isActive !== false
  ).length;
  const inactiveInsumos = insumos.filter(
    (i) => i.product.isActive === false
  ).length;

  const belowMinCount = insumos.filter(
    (i) => i.status === "below_min" || i.status === "no_stock"
  ).length;

  const nearMinCount = insumos.filter((i) => i.status === "near_min").length;

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: ProductDTO) => {
    setEditingProduct(product);
    setForm({
      id: product.id,
      name: product.name ?? "",
      description: product.description ?? "",
      unitMeasure: product.unitMeasure ?? "kg",
      minStock: product.minStock != null ? String(product.minStock) : "",
      maxStock: product.maxStock != null ? String(product.maxStock) : "",
      reorderPoint:
        product.reorderPoint != null ? String(product.reorderPoint) : "",
      unitCost: product.unitCost != null ? String(product.unitCost) : "",
      categoryId: product.categoryId ?? "",
      isActive: product.isActive !== false,
    });
    setError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      setError("El nombre del insumo es obligatorio.");
      return false;
    }

    if (!form.unitMeasure.trim()) {
      setError("La unidad de medida es obligatoria.");
      return false;
    }

    const minStock = toNumberOrNull(form.minStock);
    const maxStock = toNumberOrNull(form.maxStock);

    if (minStock != null && minStock < 0) {
      setError("El stock mínimo no puede ser negativo.");
      return false;
    }

    if (maxStock != null && maxStock < 0) {
      setError("El stock máximo no puede ser negativo.");
      return false;
    }

    if (minStock != null && maxStock != null && maxStock < minStock) {
      setError("El stock máximo no puede ser menor que el stock mínimo.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!canManageProducts) return;

    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = buildProductPayload(form);

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        setSuccessMessage("Insumo actualizado correctamente.");
      } else {
        await createProduct(payload);
        setSuccessMessage("Insumo creado correctamente.");
      }

      closeModal();
      await loadProducts();
    } catch (e: any) {
      console.error("Error guardando insumo", e);
      setError(e?.message ?? "No se pudo guardar el insumo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: ProductDTO) => {
    if (!canManageProducts) return;

    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar el insumo "${product.name}"?`
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);

      await deleteProduct(product.id);

      setSuccessMessage("Insumo eliminado correctamente.");
      await loadProducts();
    } catch (e: any) {
      console.error("Error eliminando insumo", e);
      setError(
        e?.message ??
          "No se pudo eliminar el insumo. Puede estar asociado a platillos, ventas o inventario."
      );
    }
  };

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

        {canManageProducts && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo insumo
          </button>
        )}
      </header>

      {(error || successMessage) && (
        <div
          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
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

      {highlightedProductId && (
        <div className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
            <p>
              Llegaste a este módulo desde una alerta. El sistema está mostrando
              el insumo relacionado para revisar su stock, configuración y
              estado.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowOnlyHighlightedProduct(false);
              setHighlightedProductId(null);

              if (typeof window !== "undefined") {
                window.history.replaceState(null, "", "/insumos");
              }
            }}
            className="rounded-lg border border-blue-200 bg-white px-3 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Ver todos los insumos
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
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
              {activeInsumos} activos · {inactiveInsumos} inactivos
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
              Zona de riesgo
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingInventory ? "…" : nearMinCount}
            </span>
            <span className="text-[11px] text-slate-400">
              Cercanos al stock mínimo.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              En rango
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingInventory
                ? "…"
                : Math.max(totalInsumos - belowMinCount - nearMinCount, 0)}
            </span>
            <span className="text-[11px] text-slate-400">
              Inventario estable.
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o categoría…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={showOnlyHighlightedProduct}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 sm:w-64">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={showOnlyHighlightedProduct}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="todos">Todas las categorías</option>
              {categoryNames.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={onlyCritical}
            onChange={(e) => setOnlyCritical(e.target.checked)}
            disabled={showOnlyHighlightedProduct}
            className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-0 disabled:opacity-60"
          />
          <span>Mostrar solo insumos críticos</span>
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Listado de insumos
            </h2>
            <p className="text-xs text-slate-500">
              Stock actual, stock mínimo, estado y configuración base de cada
              insumo.
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
              : highlightedProductId
              ? "No se encontró el insumo relacionado con la alerta."
              : "No se encontraron insumos con los filtros aplicados."}
          </div>
        ) : (
          <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-100">
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
                  {canManageProducts && (
                    <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                      Acciones
                    </th>
                  )}
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
                    <tr
                      key={i.product.id}
                      className={`hover:bg-slate-50/60 ${
                        i.product.id === highlightedProductId
                          ? "bg-blue-50/80"
                          : ""
                      }`}
                    >
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                        <div className="flex flex-col">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              {i.product.name}
                            </span>

                            {i.product.id === highlightedProductId && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-700">
                                Relacionado con alerta
                              </span>
                            )}

                            {i.product.isActive === false && (
                              <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-500">
                                Inactivo
                              </span>
                            )}
                          </div>

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
                        {min.toFixed(3)}
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

                      {canManageProducts && (
                        <td className="border-b border-slate-100 px-3 py-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(i.product)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                              title="Editar insumo"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(i.product)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-100 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                              title="Eliminar insumo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && canManageProducts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {editingProduct ? "Editar insumo" : "Nuevo insumo"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Configura los datos base del producto usado como insumo en el
                  inventario.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Nombre del insumo
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1"
                  placeholder="Ej. Arroz"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-600">
                Categoría
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      categoryId: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2">
                Descripción
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1"
                  placeholder="Descripción opcional"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-600">
                Unidad de medida
                <select
                  value={form.unitMeasure}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      unitMeasure: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1"
                >
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-600">
                Costo unitario
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitCost}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      unitCost: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1"
                  placeholder="0.00"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-600">
                Stock mínimo
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.minStock}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      minStock: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1"
                  placeholder="Ej. 10"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-600">
                Stock máximo
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.maxStock}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      maxStock: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1"
                  placeholder="Ej. 100"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-600">
                Punto de reorden
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.reorderPoint}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      reorderPoint: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1"
                  placeholder="Ej. 20"
                />
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
                Insumo activo
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}