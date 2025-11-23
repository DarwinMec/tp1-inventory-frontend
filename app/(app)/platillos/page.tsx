"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Plus,
  Utensils,
  Trash2,
  Edit,
  Package,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

// ==== Tipos alineados al backend ====

// DTO/DishIngredientDTO.java
type DishIngredientDTO = {
  id?: string;
  productId: string;
  productName?: string | null;
  quantityNeeded: number;
  unit: string;
  costPerUnit: number;
};

// DTO/DishDTO.java
type DishDTO = {
  id?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  price?: number | null;
  isActive?: boolean | null;
  preparationTime?: number | null;
  ingredients?: DishIngredientDTO[];
};

// ProductDTO equivalente al usado en módulo de insumos
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

// Estado del formulario de ingrediente (para el front)
type IngredientForm = {
  tempId: string;
  productId: string;
  quantityNeeded: number;
  unit: string;
  costPerUnit: number;
};

type FormMode = "create" | "edit";

export default function PlatillosPage() {
  const [dishes, setDishes] = useState<DishDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);

  const [loadingDishes, setLoadingDishes] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [mode, setMode] = useState<FormMode>("create");
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [preparationTime, setPreparationTime] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [ingredients, setIngredients] = useState<IngredientForm[]>([]);

  // Cargar platillos
  useEffect(() => {
    const loadDishes = async () => {
      try {
        setLoadingDishes(true);
        setError(null);
        const data = await apiFetch<DishDTO[]>("/dishes");
        setDishes(data ?? []);
      } catch (e: any) {
        console.error("Error cargando platillos", e);
        setError(
          e?.message ??
            "No se pudieron cargar los platillos. Verifica el backend y tus credenciales."
        );
      } finally {
        setLoadingDishes(false);
      }
    };

    loadDishes();
  }, []);

  // Cargar productos (para ingredientes)
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const data = await apiFetch<ProductDTO[]>("/products");
        setProducts(data ?? []);
      } catch (e: any) {
        console.error("Error cargando productos", e);
        setError(
          e?.message ??
            "No se pudieron cargar los productos para definir ingredientes."
        );
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // Categorías únicas desde los platillos
  const categories = useMemo(() => {
    const set = new Set<string>();
    dishes.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return Array.from(set).sort();
  }, [dishes]);

  const resetForm = () => {
    setMode("create");
    setEditingDishId(null);
    setName("");
    setCategory("");
    setDescription("");
    setPrice("");
    setPreparationTime("");
    setIsActive(true);
    setIngredients([]);
    setError(null);
    setSuccessMessage(null);
  };

  const loadDishIntoForm = (dish: DishDTO) => {
    setMode("edit");
    setEditingDishId(dish.id ?? null);
    setName(dish.name ?? "");
    setCategory(dish.category ?? "");
    setDescription(dish.description ?? "");
    setPrice(dish.price != null ? dish.price.toString() : "");
    setPreparationTime(
      dish.preparationTime != null ? dish.preparationTime.toString() : ""
    );
    setIsActive(dish.isActive ?? true);

    const ingForms: IngredientForm[] =
      dish.ingredients?.map((ing, idx) => ({
        tempId: `${dish.id ?? "new"}-${idx}`,
        productId: ing.productId,
        quantityNeeded: ing.quantityNeeded ?? 0,
        unit: ing.unit ?? "",
        costPerUnit: ing.costPerUnit ?? 0,
      })) ?? [];

    setIngredients(ingForms);
    setError(null);
    setSuccessMessage(null);
  };

  const handleAddIngredient = () => {
    if (!products || products.length === 0) return;

    const defaultProduct = products[0];
    setIngredients((prev) => [
      ...prev,
      {
        tempId: `temp-${Date.now()}-${prev.length}`,
        productId: defaultProduct.id,
        quantityNeeded: 1,
        unit: defaultProduct.unitMeasure,
        costPerUnit: defaultProduct.unitCost ?? 0,
      },
    ]);
  };

  const handleRemoveIngredient = (tempId: string) => {
    setIngredients((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  const handleIngredientChange = (
    tempId: string,
    field: keyof IngredientForm,
    value: string
  ) => {
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.tempId !== tempId) return ing;

        if (field === "productId") {
          const prod = products.find((p) => p.id === value);
          if (!prod) {
            return { ...ing, productId: value };
          }
          return {
            ...ing,
            productId: prod.id,
            unit: prod.unitMeasure,
            costPerUnit: prod.unitCost ?? ing.costPerUnit,
          };
        }

        if (field === "quantityNeeded" || field === "costPerUnit") {
          const num = Number(value.replace(",", ".")) || 0;
          return {
            ...ing,
            [field]: num,
          };
        }

        return {
          ...ing,
          [field]: value,
        };
      })
    );
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError("El nombre del platillo es obligatorio.");
      return false;
    }
    if (!category.trim()) {
      setError("La categoría del platillo es obligatoria.");
      return false;
    }
    if (!price.trim() || Number(price) <= 0) {
      setError("El precio debe ser un número mayor a 0.");
      return false;
    }
    if (ingredients.length === 0) {
      setError("Agrega al menos un ingrediente para el platillo.");
      return false;
    }
    const hasInvalidIngredient = ingredients.some(
      (ing) => !ing.productId || ing.quantityNeeded <= 0
    );
    if (hasInvalidIngredient) {
      setError(
        "Todos los ingredientes deben tener un producto seleccionado y una cantidad mayor a 0."
      );
      return false;
    }
    return true;
  };

  const reloadDishes = async () => {
    try {
      setLoadingDishes(true);
      const data = await apiFetch<DishDTO[]>("/dishes");
      setDishes(data ?? []);
    } catch (e) {
      console.error("Error recargando platillos", e);
    } finally {
      setLoadingDishes(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    try {
      setSaving(true);

      const dto: DishDTO = {
        name: name.trim(),
        category: category.trim(),
        description: description.trim() || undefined,
        price: Number(price.replace(",", ".")),
        isActive,
        preparationTime: preparationTime
          ? Number(preparationTime.replace(",", "."))
          : undefined,
        ingredients: ingredients.map((ing) => ({
          productId: ing.productId,
          quantityNeeded: ing.quantityNeeded,
          unit: ing.unit,
          costPerUnit: ing.costPerUnit,
        })),
      };

      if (mode === "create") {
        await apiFetch<DishDTO>("/dishes", {
          method: "POST",
          body: JSON.stringify(dto),
        });
        setSuccessMessage("Platillo creado correctamente.");
      } else if (mode === "edit" && editingDishId) {
        await apiFetch<DishDTO>(`/dishes/${editingDishId}`, {
          method: "PUT",
          body: JSON.stringify(dto),
        });
        setSuccessMessage("Platillo actualizado correctamente.");
      }

      await reloadDishes();
      if (mode === "create") {
        resetForm();
      }
    } catch (e: any) {
      console.error("Error guardando platillo", e);
      setError(
        e?.message ??
          "Ocurrió un error al guardar el platillo. Verifica el backend y tus permisos (se requiere rol ADMIN)."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!confirm("¿Seguro que deseas eliminar este platillo?")) return;

    try {
      setDeleting(dishId);
      setError(null);
      setSuccessMessage(null);

      await apiFetch<void>(`/dishes/${dishId}`, {
        method: "DELETE",
      });

      setSuccessMessage("Platillo eliminado correctamente.");
      await reloadDishes();

      if (editingDishId === dishId) {
        resetForm();
      }
    } catch (e: any) {
      console.error("Error eliminando platillo", e);
      setError(
        e?.message ??
          "No se pudo eliminar el platillo. Verifica que no esté siendo usado en otras entidades."
      );
    } finally {
      setDeleting(null);
    }
  };

  const formatCurrency = (value?: number | null) => {
    if (value == null) return "S/ —";
    return `S/ ${value.toFixed(2)}`;
  };

  return (
    <section className="space-y-6">
      {/* ENCABEZADO */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            <Utensils className="h-3 w-3" />
            <span>Módulo de platillos</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Gestión de platillos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Crea y administra los platillos de tu carta, definiendo sus
            ingredientes desde el primer momento. La lógica actual del backend
            requiere registrar el platillo junto con sus ingredientes en una
            sola operación.
          </p>
        </div>

        {error && (
          <div className="flex max-w-xs items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
            <p>{error}</p>
          </div>
        )}
      </header>

      {/* CONTENIDO PRINCIPAL: LISTA + FORMULARIO */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
        {/* LISTA DE PLATILLOS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Platillos registrados
              </h2>
              <p className="text-xs text-slate-500">
                Lista de platillos actualmente configurados en el sistema.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Plus className="h-3 w-3" />
              Nuevo platillo
            </button>
          </div>

          {loadingDishes ? (
            <div className="flex min-h-[180px] items-center justify-center text-xs text-slate-500">
              Cargando platillos…
            </div>
          ) : dishes.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center text-xs text-slate-500">
              Aún no hay platillos registrados. Crea el primero con el
              formulario de la derecha.
            </div>
          ) : (
            <div className="max-h-[460px] overflow-auto rounded-xl border border-slate-100">
              <table className="min-w-full border-collapse text-[11px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                      Platillo
                    </th>
                    <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                      Categoría
                    </th>
                    <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                      Precio
                    </th>
                    <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                      Prep. (min)
                    </th>
                    <th className="border-b border-slate-100 px-3 py-2 text-center font-medium text-slate-600">
                      Activo
                    </th>
                    <th className="border-b border-slate-100 px-3 py-2 text-center font-medium text-slate-600">
                      Ingredientes
                    </th>
                    <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dishes.map((dish) => (
                    <tr key={dish.id} className="hover:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {dish.name}
                          </span>
                          {dish.description && (
                            <span className="text-[10px] text-slate-400">
                              {dish.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                        {dish.category ?? "—"}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-800">
                        {formatCurrency(dish.price ?? undefined)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-700">
                        {dish.preparationTime != null
                          ? `${dish.preparationTime} min`
                          : "—"}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-center">
                        {dish.isActive ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            Sí
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            No
                          </span>
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-700">
                        {dish.ingredients?.length ?? 0}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => loadDishIntoForm(dish)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Edit className="h-3 w-3" />
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={deleting === dish.id}
                            onClick={() =>
                              dish.id && handleDeleteDish(dish.id)
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            <Trash2 className="h-3 w-3" />
                            {deleting === dish.id ? "Eliminando…" : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FORMULARIO DE PLATILLO */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {mode === "create"
                  ? "Nuevo platillo"
                  : "Editar platillo"}
              </h2>
              <p className="text-xs text-slate-500">
                Completa los campos del platillo y define los ingredientes que
                utiliza. Estos ingredientes se guardarán junto con el platillo.
              </p>
            </div>

            {mode === "edit" && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
              >
                <X className="h-3 w-3" />
                Cancelar edición
              </button>
            )}
          </div>

          {successMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <Package className="mt-[2px] h-3.5 w-3.5" />
              <p>{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Datos básicos */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Nombre del platillo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                  placeholder="Ej: Lomo Saltado"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Categoría
                </label>
                <input
                  type="text"
                  list="dish-categories"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                  placeholder="Ej: Platos de fondo"
                />
                {categories.length > 0 && (
                  <datalist id="dish-categories">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                placeholder="Breve descripción del platillo…"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Precio (S/)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Tiempo de preparación (min)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={preparationTime}
                  onChange={(e) => setPreparationTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                  placeholder="Ej: 15"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  id="dish-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-0"
                />
                <label
                  htmlFor="dish-active"
                  className="text-xs font-medium text-slate-700"
                >
                  Platillo activo en la carta
                </label>
              </div>
            </div>

            {/* Ingredientes */}
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-800">
                  Ingredientes del platillo
                </p>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  disabled={loadingProducts || products.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-3 w-3" />
                  Agregar ingrediente
                </button>
              </div>

              {loadingProducts && (
                <p className="text-[11px] text-slate-400">
                  Cargando lista de productos…
                </p>
              )}

              {!loadingProducts && products.length === 0 && (
                <p className="text-[11px] text-slate-400">
                  No hay productos registrados. Primero registra insumos en el
                  módulo correspondiente.
                </p>
              )}

              {!loadingProducts && ingredients.length === 0 && products.length > 0 && (
                <p className="text-[11px] text-slate-400">
                  Agrega al menos un ingrediente para este platillo.
                </p>
              )}

              {ingredients.length > 0 && (
                <div className="max-h-56 overflow-auto rounded-lg border border-slate-100 bg-white">
                  <table className="min-w-full border-collapse text-[11px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="border-b border-slate-100 px-2 py-1 text-left font-medium text-slate-600">
                          Producto
                        </th>
                        <th className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-600">
                          Cantidad
                        </th>
                        <th className="border-b border-slate-100 px-2 py-1 text-left font-medium text-slate-600">
                          Unidad
                        </th>
                        <th className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-600">
                          Costo unit.
                        </th>
                        <th className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-600">
                          Subtotal
                        </th>
                        <th className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-600">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredients.map((ing) => {
                        const subtotal = ing.quantityNeeded * ing.costPerUnit;
                        return (
                          <tr key={ing.tempId} className="hover:bg-slate-50/60">
                            <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                              <select
                                value={ing.productId}
                                onChange={(e) =>
                                  handleIngredientChange(
                                    ing.tempId,
                                    "productId",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none ring-blue-500 focus:ring-1"
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                              <input
                                type="number"
                                min={0}
                                step="0.001"
                                value={ing.quantityNeeded}
                                onChange={(e) =>
                                  handleIngredientChange(
                                    ing.tempId,
                                    "quantityNeeded",
                                    e.target.value
                                  )
                                }
                                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-[11px] outline-none ring-blue-500 focus:ring-1"
                              />
                            </td>
                            <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                              <input
                                type="text"
                                value={ing.unit}
                                onChange={(e) =>
                                  handleIngredientChange(
                                    ing.tempId,
                                    "unit",
                                    e.target.value
                                  )
                                }
                                className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none ring-blue-500 focus:ring-1"
                              />
                            </td>
                            <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={ing.costPerUnit}
                                onChange={(e) =>
                                  handleIngredientChange(
                                    ing.tempId,
                                    "costPerUnit",
                                    e.target.value
                                  )
                                }
                                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-[11px] outline-none ring-blue-500 focus:ring-1"
                              />
                            </td>
                            <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                              {subtotal ? `S/ ${subtotal.toFixed(2)}` : "S/ 0.00"}
                            </td>
                            <td className="border-b border-slate-100 px-2 py-1 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveIngredient(ing.tempId)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100"
                              >
                                <Trash2 className="h-3 w-3" />
                                Quitar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* BOTÓN GUARDAR */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={saving || loadingProducts || products.length === 0}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    Guardando…
                  </span>
                ) : mode === "create" ? (
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Crear platillo
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Actualizar platillo
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
