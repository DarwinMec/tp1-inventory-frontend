"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Edit,
  Filter,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import type { DishDTO, ProductDTO } from "@/lib/backend-types";
import {
  createDish,
  deleteDish,
  getDishes,
  getProducts,
  updateDish,
} from "@/lib/services";

type IngredientForm = {
  tempId: string;
  productId: string;
  quantityNeeded: number;
  unitMeasure: string;
  costPerUnit: number;
};

type FormMode = "create" | "edit";

function toNumber(value?: number | string | null) {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toNumberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(toNumber(value));
}

function buildTempId() {
  return `ingredient-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getIngredientUnit(
  ingredient: NonNullable<DishDTO["ingredients"]>[number]
) {
  const extended = ingredient as typeof ingredient & {
    unit?: string | null;
    unitMeasure?: string | null;
  };

  return extended.unit ?? extended.unitMeasure ?? "";
}

export default function PlatillosPage() {
  const { hasRole } = useAuthContext();

  const canManageDishes = hasRole(["ADMIN", "MANAGER"]);

  const [dishes, setDishes] = useState<DishDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);

  const [loadingDishes, setLoadingDishes] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [onlyActive, setOnlyActive] = useState(false);

  const [mode, setMode] = useState<FormMode>("create");
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [preparationTime, setPreparationTime] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [ingredients, setIngredients] = useState<IngredientForm[]>([]);

  const [highlightedDishId, setHighlightedDishId] = useState<string | null>(
    null
  );
  const [showOnlyHighlightedDish, setShowOnlyHighlightedDish] = useState(false);
  const [autoLoadedHighlightedDish, setAutoLoadedHighlightedDish] =
    useState(false);

  const loadDishes = useCallback(async () => {
    try {
      setLoadingDishes(true);
      setError(null);

      const data = await getDishes();
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
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);

      const data = await getProducts();
      setProducts((data ?? []).filter((product) => product.isActive !== false));
    } catch (e: any) {
      console.error("Error cargando productos", e);
      setError(
        e?.message ??
          "No se pudieron cargar los insumos para definir los ingredientes."
      );
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadDishes();
    loadProducts();
  }, [loadDishes, loadProducts]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const dishParam = params.get("dishId");

    if (dishParam) {
      setHighlightedDishId(dishParam);
      setShowOnlyHighlightedDish(true);
      setSearchTerm("");
      setSelectedCategory("todos");
      setOnlyActive(false);
    }
  }, []);

  const resetForm = useCallback(() => {
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
  }, []);

  const loadDishIntoForm = useCallback((dish: DishDTO) => {
    setMode("edit");
    setEditingDishId(dish.id ?? null);
    setName(dish.name ?? "");
    setCategory(dish.category ?? "");
    setDescription(dish.description ?? "");
    setPrice(dish.price != null ? String(dish.price) : "");
    setPreparationTime(
      dish.preparationTime != null ? String(dish.preparationTime) : ""
    );
    setIsActive(dish.isActive !== false);

    const mappedIngredients: IngredientForm[] =
      dish.ingredients?.map((ingredient, index) => ({
        tempId: `${dish.id ?? "dish"}-${ingredient.productId}-${index}`,
        productId: ingredient.productId,
        quantityNeeded: toNumber(ingredient.quantityNeeded),
        unitMeasure: getIngredientUnit(ingredient),
        costPerUnit: toNumber(ingredient.costPerUnit),
      })) ?? [];

    setIngredients(mappedIngredients);
    setError(null);
    setSuccessMessage(null);
  }, []);

  useEffect(() => {
    if (!highlightedDishId || autoLoadedHighlightedDish || dishes.length === 0) {
      return;
    }

    const dish = dishes.find((item) => item.id === highlightedDishId);

    if (dish) {
      loadDishIntoForm(dish);
      setAutoLoadedHighlightedDish(true);
    }
  }, [
    highlightedDishId,
    autoLoadedHighlightedDish,
    dishes,
    loadDishIntoForm,
  ]);

  const categoryNames = useMemo(() => {
    const set = new Set<string>();

    dishes.forEach((dish) => {
      if (dish.category) set.add(dish.category);
    });

    return Array.from(set).sort();
  }, [dishes]);

  const visibleDishes = useMemo(() => {
    return dishes
      .filter((dish) => {
        if (
          showOnlyHighlightedDish &&
          highlightedDishId &&
          dish.id !== highlightedDishId
        ) {
          return false;
        }

        const term = searchTerm.toLowerCase().trim();

        if (term) {
          const matchName = dish.name.toLowerCase().includes(term);
          const matchCategory = (dish.category ?? "")
            .toLowerCase()
            .includes(term);
          const matchDescription = (dish.description ?? "")
            .toLowerCase()
            .includes(term);

          if (!matchName && !matchCategory && !matchDescription) {
            return false;
          }
        }

        if (
          selectedCategory !== "todos" &&
          (dish.category ?? "") !== selectedCategory
        ) {
          return false;
        }

        if (onlyActive && dish.isActive === false) {
          return false;
        }

        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [
    dishes,
    highlightedDishId,
    showOnlyHighlightedDish,
    searchTerm,
    selectedCategory,
    onlyActive,
  ]);

  const totalDishes = dishes.length;
  const activeDishes = dishes.filter((dish) => dish.isActive !== false).length;
  const inactiveDishes = dishes.filter((dish) => dish.isActive === false).length;
  const dishesWithIngredients = dishes.filter(
    (dish) => (dish.ingredients?.length ?? 0) > 0
  ).length;

  const recipeCost = useMemo(() => {
    return ingredients.reduce(
      (acc, ingredient) =>
        acc +
        toNumber(ingredient.quantityNeeded) * toNumber(ingredient.costPerUnit),
      0
    );
  }, [ingredients]);

  const salePrice = toNumberOrNull(price) ?? 0;
  const estimatedMargin = salePrice - recipeCost;

  const handleAddIngredient = () => {
    if (products.length === 0) {
      setError("No hay insumos activos disponibles para agregar ingredientes.");
      return;
    }

    const defaultProduct = products[0];

    setIngredients((prev) => [
      ...prev,
      {
        tempId: buildTempId(),
        productId: defaultProduct.id,
        quantityNeeded: 1,
        unitMeasure: defaultProduct.unitMeasure,
        costPerUnit: toNumber(defaultProduct.unitCost),
      },
    ]);
  };

  const handleRemoveIngredient = (tempId: string) => {
    setIngredients((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handleIngredientChange = (
    tempId: string,
    field: keyof IngredientForm,
    value: string
  ) => {
    setIngredients((prev) =>
      prev.map((ingredient) => {
        if (ingredient.tempId !== tempId) return ingredient;

        if (field === "productId") {
          const product = products.find((item) => item.id === value);

          if (!product) {
            return {
              ...ingredient,
              productId: value,
            };
          }

          return {
            ...ingredient,
            productId: product.id,
            unitMeasure: product.unitMeasure,
            costPerUnit: toNumber(product.unitCost),
          };
        }

        if (field === "quantityNeeded") {
          return {
            ...ingredient,
            quantityNeeded: Math.max(0, Number(value.replace(",", ".")) || 0),
          };
        }

        if (field === "costPerUnit") {
          return {
            ...ingredient,
            costPerUnit: Math.max(0, Number(value.replace(",", ".")) || 0),
          };
        }

        if (field === "unitMeasure") {
          return {
            ...ingredient,
            unitMeasure: value,
          };
        }

        return ingredient;
      })
    );
  };

  const validateForm = () => {
    if (!name.trim()) {
      setError("El nombre del platillo es obligatorio.");
      return false;
    }

    const parsedPrice = toNumberOrNull(price);

    if (parsedPrice == null || parsedPrice < 0) {
      setError("El precio del platillo debe ser válido y no negativo.");
      return false;
    }

    const parsedPreparationTime = toNumberOrNull(preparationTime);

    if (
      preparationTime.trim() !== "" &&
      (parsedPreparationTime == null || parsedPreparationTime < 0)
    ) {
      setError("El tiempo de preparación debe ser válido y no negativo.");
      return false;
    }

    const hasInvalidIngredient = ingredients.some(
      (ingredient) => !ingredient.productId || ingredient.quantityNeeded <= 0
    );

    if (hasInvalidIngredient) {
      setError(
        "Todos los ingredientes deben tener un insumo y una cantidad mayor a 0."
      );
      return false;
    }

    const hasDuplicatedIngredient =
      new Set(ingredients.map((ingredient) => ingredient.productId)).size !==
      ingredients.length;

    if (hasDuplicatedIngredient) {
      setError(
        "No puedes repetir el mismo insumo dentro de la receta del platillo."
      );
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    return {
      name: name.trim(),
      category: category.trim() || null,
      description: description.trim() || null,
      price: toNumberOrNull(price),
      preparationTime: toNumberOrNull(preparationTime),
      isActive,
      ingredients: ingredients.map((ingredient) => ({
        productId: ingredient.productId,
        quantityNeeded: ingredient.quantityNeeded,
        unit: ingredient.unitMeasure,
        unitMeasure: ingredient.unitMeasure,
        costPerUnit: ingredient.costPerUnit,
      })),
    } as unknown as Partial<DishDTO>;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!canManageDishes) return;

    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = buildPayload();

      if (mode === "edit" && editingDishId) {
        await updateDish(editingDishId, payload);
        setSuccessMessage("Platillo actualizado correctamente.");
      } else {
        await createDish(payload);
        setSuccessMessage("Platillo creado correctamente.");
      }

      resetForm();
      await loadDishes();
    } catch (e: any) {
      console.error("Error guardando platillo", e);
      setError(e?.message ?? "No se pudo guardar el platillo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dish: DishDTO) => {
    if (!canManageDishes || !dish.id) return;

    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar el platillo "${dish.name}"?`
    );

    if (!confirmed) return;

    try {
      setDeleting(dish.id);
      setError(null);
      setSuccessMessage(null);

      await deleteDish(dish.id);

      setSuccessMessage("Platillo eliminado correctamente.");

      if (editingDishId === dish.id) {
        resetForm();
      }

      await loadDishes();
    } catch (e: any) {
      console.error("Error eliminando platillo", e);
      setError(
        e?.message ??
          "No se pudo eliminar el platillo. Puede estar asociado a ventas o predicciones."
      );
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Sparkles className="h-3 w-3" />
            <span>Módulo de platillos</span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Platillos y recetas
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Gestiona la carta del restaurante, define ingredientes por platillo
            y calcula el costo estimado de cada receta.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadDishes();
            loadProducts();
          }}
          disabled={loadingDishes || loadingProducts}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loadingDishes || loadingProducts ? "animate-spin" : ""
            }`}
          />
          Actualizar
        </button>
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

      {highlightedDishId && (
        <div className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
            <p>
              Llegaste a este módulo desde una alerta. El sistema está mostrando
              el platillo relacionado para revisar su configuración, estado e
              ingredientes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowOnlyHighlightedDish(false);
              setHighlightedDishId(null);
              setAutoLoadedHighlightedDish(false);

              if (typeof window !== "undefined") {
                window.history.replaceState(null, "", "/platillos");
              }
            }}
            className="rounded-lg border border-blue-200 bg-white px-3 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Ver todos los platillos
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Utensils className="h-5 w-5 text-slate-700" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Total de platillos
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {loadingDishes ? "…" : totalDishes}
            </p>
            <p className="text-[11px] text-slate-400">
              {activeDishes} activos · {inactiveDishes} inactivos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Con receta
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {loadingDishes ? "…" : dishesWithIngredients}
            </p>
            <p className="text-[11px] text-slate-400">
              Tienen ingredientes configurados.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <Package className="h-5 w-5 text-blue-700" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Insumos activos
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {loadingProducts ? "…" : products.length}
            </p>
            <p className="text-[11px] text-slate-400">
              Disponibles para recetas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
            <CircleDollarSign className="h-5 w-5 text-amber-700" />
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Costo receta actual
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {formatCurrency(recipeCost)}
            </p>
            <p className="text-[11px] text-slate-400">
              Margen estimado: {formatCurrency(estimatedMargin)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Listado de platillos
              </h2>
              <p className="text-xs text-slate-500">
                Consulta los platillos registrados, su precio, estado y cantidad
                de ingredientes.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar platillo…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={showOnlyHighlightedDish}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400 sm:w-64"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={showOnlyHighlightedDish}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400 sm:w-48"
                >
                  <option value="todos">Todas</option>
                  {categoryNames.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              disabled={showOnlyHighlightedDish}
              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-0 disabled:opacity-60"
            />
            Mostrar solo platillos activos
          </label>

          {loadingDishes ? (
            <div className="flex min-h-[320px] items-center justify-center text-xs text-slate-500">
              Cargando platillos…
            </div>
          ) : visibleDishes.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              {highlightedDishId
                ? "No se encontró el platillo relacionado con la alerta."
                : "No se encontraron platillos con los filtros aplicados."}
            </div>
          ) : (
            <div className="max-h-[560px] overflow-auto rounded-xl border border-slate-100">
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
                    <th className="border-b border-slate-100 px-3 py-2 text-center font-medium text-slate-600">
                      Ingredientes
                    </th>
                    <th className="border-b border-slate-100 px-3 py-2 text-center font-medium text-slate-600">
                      Estado
                    </th>
                    {canManageDishes && (
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {visibleDishes.map((dish) => (
                    <tr
                      key={dish.id}
                      className={`hover:bg-slate-50/60 ${
                        dish.id === highlightedDishId ? "bg-blue-50/80" : ""
                      }`}
                    >
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                        <div className="flex flex-col">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{dish.name}</span>

                            {dish.id === highlightedDishId && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-700">
                                Relacionado con alerta
                              </span>
                            )}
                          </div>

                          {dish.description && (
                            <span className="line-clamp-1 text-[10px] text-slate-400">
                              {dish.description}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                        {dish.category ?? "—"}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-right font-semibold text-slate-800">
                        {formatCurrency(dish.price)}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-700">
                        {dish.ingredients?.length ?? 0}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-2 text-center">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            dish.isActive === false
                              ? "border-slate-200 bg-slate-100 text-slate-500"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {dish.isActive === false ? "Inactivo" : "Activo"}
                        </span>
                      </td>

                      {canManageDishes && (
                        <td className="border-b border-slate-100 px-3 py-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => loadDishIntoForm(dish)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                              title="Editar platillo"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(dish)}
                              disabled={deleting === dish.id}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-100 text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                              title="Eliminar platillo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {mode === "edit" ? "Editar platillo" : "Registrar platillo"}
              </h2>
              <p className="text-xs text-slate-500">
                Define los datos del platillo y los insumos que componen su
                receta.
              </p>
            </div>

            {mode === "edit" && (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
              >
                <X className="h-3 w-3" />
                Nuevo
              </button>
            )}
          </div>

          {!canManageDishes && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Tu rol puede consultar platillos, pero no crear ni modificarlos.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2">
              Nombre del platillo
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canManageDishes || saving}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                placeholder="Ej. Arroz con pollo"
              />
            </label>

            <label className="space-y-1 text-xs font-medium text-slate-600">
              Categoría
              <input
                type="text"
                value={category}
                list="dish-categories"
                onChange={(e) => setCategory(e.target.value)}
                disabled={!canManageDishes || saving}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                placeholder="Ej. Menú"
              />
              <datalist id="dish-categories">
                {categoryNames.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>

            <label className="space-y-1 text-xs font-medium text-slate-600">
              Precio de venta
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={!canManageDishes || saving}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                placeholder="0.00"
              />
            </label>

            <label className="space-y-1 text-xs font-medium text-slate-600">
              Tiempo preparación
              <input
                type="number"
                min="0"
                step="1"
                value={preparationTime}
                onChange={(e) => setPreparationTime(e.target.value)}
                disabled={!canManageDishes || saving}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                placeholder="Minutos"
              />
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={!canManageDishes || saving}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              Platillo activo
            </label>

            <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2">
              Descripción
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canManageDishes || saving}
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                placeholder="Descripción opcional del platillo"
              />
            </label>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Ingredientes de la receta
                </p>
                <p className="text-[11px] text-slate-500">
                  Cada ingrediente representa la cantidad de insumo necesaria
                  para preparar una unidad del platillo.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddIngredient}
                disabled={
                  !canManageDishes ||
                  saving ||
                  loadingProducts ||
                  products.length === 0
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-3 w-3" />
                Agregar
              </button>
            </div>

            {loadingProducts ? (
              <p className="text-[11px] text-slate-400">
                Cargando insumos disponibles…
              </p>
            ) : products.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                No hay insumos activos disponibles. Registra insumos primero.
              </p>
            ) : ingredients.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                Aún no se agregaron ingredientes a esta receta.
              </p>
            ) : (
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-100 bg-white">
                <table className="min-w-full border-collapse text-[11px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border-b border-slate-100 px-2 py-1 text-left font-medium text-slate-600">
                        Insumo
                      </th>
                      <th className="border-b border-slate-100 px-2 py-1 text-center font-medium text-slate-600">
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
                        Acción
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {ingredients.map((ingredient) => {
                      const subtotal =
                        toNumber(ingredient.quantityNeeded) *
                        toNumber(ingredient.costPerUnit);

                      return (
                        <tr
                          key={ingredient.tempId}
                          className="hover:bg-slate-50/60"
                        >
                          <td className="border-b border-slate-100 px-2 py-1">
                            <select
                              value={ingredient.productId}
                              onChange={(e) =>
                                handleIngredientChange(
                                  ingredient.tempId,
                                  "productId",
                                  e.target.value
                                )
                              }
                              disabled={!canManageDishes || saving}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                            >
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="border-b border-slate-100 px-2 py-1 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={ingredient.quantityNeeded}
                              onChange={(e) =>
                                handleIngredientChange(
                                  ingredient.tempId,
                                  "quantityNeeded",
                                  e.target.value
                                )
                              }
                              disabled={!canManageDishes || saving}
                              className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-[11px] outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          </td>

                          <td className="border-b border-slate-100 px-2 py-1">
                            <input
                              type="text"
                              value={ingredient.unitMeasure}
                              onChange={(e) =>
                                handleIngredientChange(
                                  ingredient.tempId,
                                  "unitMeasure",
                                  e.target.value
                                )
                              }
                              disabled={!canManageDishes || saving}
                              className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          </td>

                          <td className="border-b border-slate-100 px-2 py-1 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={ingredient.costPerUnit}
                              onChange={(e) =>
                                handleIngredientChange(
                                  ingredient.tempId,
                                  "costPerUnit",
                                  e.target.value
                                )
                              }
                              disabled={!canManageDishes || saving}
                              className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-[11px] outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          </td>

                          <td className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-800">
                            {formatCurrency(subtotal)}
                          </td>

                          <td className="border-b border-slate-100 px-2 py-1 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveIngredient(ingredient.tempId)
                              }
                              disabled={!canManageDishes || saving}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
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

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            <div className="flex items-center justify-between gap-2">
              <span>Costo estimado de receta:</span>
              <span className="font-semibold">{formatCurrency(recipeCost)}</span>
            </div>

            <div className="mt-1 flex items-center justify-between gap-2">
              <span>Margen estimado:</span>
              <span
                className={`font-semibold ${
                  estimatedMargin < 0 ? "text-red-700" : "text-blue-700"
                }`}
              >
                {formatCurrency(estimatedMargin)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Limpiar
            </button>

            <button
              type="submit"
              disabled={!canManageDishes || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Save className="h-4 w-4" />
              {saving
                ? "Guardando..."
                : mode === "edit"
                ? "Actualizar platillo"
                : "Guardar platillo"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}