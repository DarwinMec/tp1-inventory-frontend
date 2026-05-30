"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { DishDTO, PageResponse, SaleDTO } from "@/lib/backend-types";
import { createSale, getDishes, getSalesPage } from "@/lib/services";

type SaleFormItem = {
  tempId: string;
  dishId: string;
  quantity: number;
  unitPrice: number;
};

const PAGE_SIZE = 20;

function toNumber(value?: number | string | null) {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(toNumber(value));
}

function formatSaleDateTime(sale: SaleDTO) {
  if (!sale.saleDate) return "—";

  const time = sale.saleTime ?? "00:00:00";
  const isoString = `${sale.saleDate}T${time}`;
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) return sale.saleDate;

  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSaleItemCount(sale: SaleDTO) {
  return (
    sale.items?.reduce((acc, item) => acc + toNumber(item.quantity), 0) ?? 0
  );
}

function getSaleMainDish(sale: SaleDTO) {
  const firstItem = sale.items?.[0];

  if (!firstItem) return "Venta registrada";

  const quantity = firstItem.quantity != null ? ` x${firstItem.quantity}` : "";

  return `${firstItem.dishName ?? "Platillo"}${quantity}`;
}

function buildTempId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function VentasPage() {
  const [sales, setSales] = useState<SaleDTO[]>([]);
  const [dishes, setDishes] = useState<DishDTO[]>([]);

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [loadingSales, setLoadingSales] = useState(false);
  const [loadingDishes, setLoadingDishes] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const [items, setItems] = useState<SaleFormItem[]>([]);

  const loadSales = useCallback(async (page: number) => {
    try {
      setLoadingSales(true);
      setError(null);

      const data: PageResponse<SaleDTO> = await getSalesPage(page, PAGE_SIZE);

      setSales(data.content ?? []);
      setCurrentPage(data.number ?? page);
      setTotalPages(data.totalPages ?? 1);
      setTotalElements(data.totalElements ?? 0);
    } catch (e: any) {
      console.error("Error cargando ventas", e);
      setError(
        e?.message ??
          "No se pudieron cargar las ventas. Verifica el backend y tus credenciales."
      );
    } finally {
      setLoadingSales(false);
    }
  }, []);

  const loadDishes = useCallback(async () => {
    try {
      setLoadingDishes(true);
      setError(null);

      const data = await getDishes();

      setDishes((data ?? []).filter((dish) => dish.isActive !== false));
    } catch (e: any) {
      console.error("Error cargando platillos para ventas", e);
      setError(
        e?.message ??
          "No se pudieron cargar los platillos para registrar ventas."
      );
    } finally {
      setLoadingDishes(false);
    }
  }, []);

  useEffect(() => {
    loadSales(currentPage);
  }, [currentPage, loadSales]);

  useEffect(() => {
    loadDishes();
  }, [loadDishes]);

  const reloadSales = async () => {
    await loadSales(currentPage);
  };

  const resetForm = () => {
    setItems([]);
    setError(null);
    setSuccessMessage(null);
  };

  const computeLineTotal = (item: SaleFormItem) =>
    toNumber(item.quantity) * toNumber(item.unitPrice);

  const previewTotal = useMemo(() => {
    return items.reduce((acc, item) => acc + computeLineTotal(item), 0);
  }, [items]);

  const previewItemCount = useMemo(() => {
    return items.reduce((acc, item) => acc + toNumber(item.quantity), 0);
  }, [items]);

  const handleAddItem = () => {
    if (!dishes || dishes.length === 0) return;

    const defaultDish = dishes[0];

    setItems((prev) => [
      ...prev,
      {
        tempId: buildTempId(),
        dishId: defaultDish.id,
        quantity: 1,
        unitPrice: toNumber(defaultDish.price),
      },
    ]);
  };

  const handleQuickAddDish = (dish: DishDTO) => {
    setError(null);
    setSuccessMessage(null);

    setItems((prev) => {
      const existingItem = prev.find((item) => item.dishId === dish.id);

      if (existingItem) {
        return prev.map((item) =>
          item.tempId === existingItem.tempId
            ? {
                ...item,
                quantity: item.quantity + 1,
                unitPrice: toNumber(dish.price ?? item.unitPrice),
              }
            : item
        );
      }

      return [
        ...prev,
        {
          tempId: buildTempId(),
          dishId: dish.id,
          quantity: 1,
          unitPrice: toNumber(dish.price),
        },
      ];
    });
  };

  const handleRemoveItem = (tempId: string) => {
    setItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handleItemChange = (
    tempId: string,
    field: keyof SaleFormItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;

        if (field === "dishId") {
          const dish = dishes.find((d) => d.id === value);

          if (!dish) {
            return {
              ...item,
              dishId: value,
            };
          }

          return {
            ...item,
            dishId: dish.id,
            unitPrice: toNumber(dish.price ?? item.unitPrice),
          };
        }

        if (field === "quantity") {
          const quantity = Math.max(0, Number(value.replace(",", ".")) || 0);

          return {
            ...item,
            quantity,
          };
        }

        if (field === "unitPrice") {
          const unitPrice = Math.max(0, Number(value.replace(",", ".")) || 0);

          return {
            ...item,
            unitPrice,
          };
        }

        return item;
      })
    );
  };

  const validateForm = (): boolean => {
    if (items.length === 0) {
      setError("La venta debe tener al menos un platillo.");
      return false;
    }

    const hasInvalidDish = items.some((item) => !item.dishId);

    if (hasInvalidDish) {
      setError("Todos los ítems deben tener un platillo seleccionado.");
      return false;
    }

    const hasInvalidQuantity = items.some((item) => item.quantity <= 0);

    if (hasInvalidQuantity) {
      setError("La cantidad de cada platillo debe ser mayor a 0.");
      return false;
    }

    const hasInvalidPrice = items.some((item) => item.unitPrice < 0);

    if (hasInvalidPrice) {
      setError("El precio unitario no puede ser negativo.");
      return false;
    }

    if (previewTotal <= 0) {
      setError("El total de la venta debe ser mayor a 0.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload: Partial<SaleDTO> = {
        items: items.map((item) => ({
          dishId: item.dishId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      };

      const savedSale = await createSale(payload);

      setSuccessMessage(
        `Venta registrada correctamente por ${formatCurrency(
          savedSale.totalAmount ?? previewTotal
        )}. El inventario fue actualizado.`
      );

      setItems([]);
      setSelectedSaleId(savedSale.id ?? null);

      if (currentPage !== 0) {
        setCurrentPage(0);
      } else {
        await loadSales(0);
      }
    } catch (e: any) {
      console.error("Error registrando venta", e);

      const message =
        e?.message ??
        "Ocurrió un error al registrar la venta. Verifica el backend e inventario.";

      if (
        message.toLowerCase().includes("stock") ||
        message.toLowerCase().includes("inventario") ||
        message.toLowerCase().includes("insuficiente")
      ) {
        setError(
          `${message} Revisa el módulo de abastecimiento para reponer los insumos necesarios.`
        );
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredSales = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return sales
      .filter((sale) => {
        if (!term) return true;

        const dateStr = sale.saleDate ?? "";
        const idStr = sale.id ?? "";
        const amountStr = String(sale.totalAmount ?? "");
        const anyDish = (sale.items ?? []).some((item) =>
          (item.dishName ?? "").toLowerCase().includes(term)
        );

        return (
          dateStr.toLowerCase().includes(term) ||
          idStr.toLowerCase().includes(term) ||
          amountStr.includes(term) ||
          anyDish
        );
      })
      .sort((a, b) => {
        const aKey = `${a.saleDate ?? ""}T${a.saleTime ?? ""}`;
        const bKey = `${b.saleDate ?? ""}T${b.saleTime ?? ""}`;
        return bKey.localeCompare(aKey);
      });
  }, [sales, searchTerm]);

  const totalSalesCount = searchTerm ? filteredSales.length : totalElements;

  const currentPageRevenue = useMemo(() => {
    return filteredSales.reduce(
      (acc, sale) => acc + toNumber(sale.totalAmount),
      0
    );
  }, [filteredSales]);

  const avgTicket = useMemo(() => {
    return filteredSales.length > 0
      ? currentPageRevenue / filteredSales.length
      : 0;
  }, [currentPageRevenue, filteredSales.length]);

  const totalItemsOnPage = useMemo(() => {
    return filteredSales.reduce((acc, sale) => acc + getSaleItemCount(sale), 0);
  }, [filteredSales]);

  const selectedSale = useMemo(() => {
    return filteredSales.find((sale) => sale.id === selectedSaleId) ?? null;
  }, [filteredSales, selectedSaleId]);

  const popularDishes = useMemo(() => {
    return dishes.slice(0, 6);
  }, [dishes]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Sparkles className="h-3 w-3" />
            <span>Módulo de ventas</span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Registro e historial de ventas
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Registra nuevas ventas, revisa el historial y valida que cada venta
            descuente inventario automáticamente según las recetas configuradas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            reloadSales();
            loadDishes();
          }}
          disabled={loadingSales || loadingDishes}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loadingSales || loadingDishes ? "animate-spin" : ""
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

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Receipt className="h-5 w-5 text-slate-700" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Ventas registradas
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingSales ? "…" : totalSalesCount}
            </span>
            <span className="text-[11px] text-slate-400">
              Total según historial cargado.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <ShoppingCart className="h-5 w-5 text-emerald-700" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Importe en página
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingSales ? "…" : formatCurrency(currentPageRevenue)}
            </span>
            <span className="text-[11px] text-slate-400">
              Suma de ventas mostradas.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <CalendarClock className="h-5 w-5 text-blue-700" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Ticket promedio
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingSales ? "…" : formatCurrency(avgTicket)}
            </span>
            <span className="text-[11px] text-slate-400">
              Promedio de ventas cargadas.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
            <UtensilsCrossed className="h-5 w-5 text-amber-700" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Platillos vendidos
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingSales ? "…" : totalItemsOnPage}
            </span>
            <span className="text-[11px] text-slate-400">
              Cantidad total en la página.
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Historial de ventas
              </h2>
              <p className="text-xs text-slate-500">
                Ventas registradas en el sistema, con fecha, hora, cantidad de
                platillos e importe total.
              </p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar en página actual…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-blue-500 focus:ring-1 sm:w-72"
              />
            </div>
          </div>

          {loadingSales ? (
            <div className="flex min-h-[260px] items-center justify-center text-xs text-slate-500">
              Cargando ventas…
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              No se encontraron ventas con los filtros aplicados.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-100">
                <table className="min-w-full border-collapse text-[11px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                        Fecha / hora
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                        Venta
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-center font-medium text-slate-600">
                        Ítems
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                        Total
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-center font-medium text-slate-600">
                        Tipo día
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                        Detalle
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSales.map((sale) => {
                      const itemCount = getSaleItemCount(sale);
                      const active = sale.id === selectedSaleId;

                      return (
                        <tr
                          key={sale.id ?? `${sale.saleDate}-${sale.saleTime}`}
                          className={`hover:bg-slate-50/60 ${
                            active ? "bg-blue-50/70" : ""
                          }`}
                        >
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {formatSaleDateTime(sale)}
                              </span>

                              {sale.id && (
                                <span className="text-[10px] text-slate-400">
                                  ID: {sale.id}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {getSaleMainDish(sale)}
                              </span>

                              {(sale.items?.length ?? 0) > 1 && (
                                <span className="text-[10px] text-slate-400">
                                  +{(sale.items?.length ?? 1) - 1} platillo(s)
                                  adicional(es)
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-700">
                            {itemCount}
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2 text-right font-semibold text-slate-800">
                            {formatCurrency(sale.totalAmount)}
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2 text-center text-[10px]">
                            <span className="inline-flex items-center justify-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              {sale.isHoliday
                                ? "Feriado"
                                : sale.isWeekend
                                ? "Fin de semana"
                                : "Día laborable"}
                            </span>
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedSaleId((prev) =>
                                  prev === sale.id ? null : sale.id ?? null
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <UtensilsCrossed className="h-3 w-3" />
                              {active ? "Ocultar" : "Detalle"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-2 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Mostrando{" "}
                  <span className="font-semibold">{filteredSales.length}</span>{" "}
                  de{" "}
                  <span className="font-semibold">
                    {searchTerm ? filteredSales.length : totalElements}
                  </span>{" "}
                  ventas
                </span>

                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 0 || loadingSales}
                    onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <span>
                    Página{" "}
                    <span className="font-semibold">{currentPage + 1}</span> de{" "}
                    <span className="font-semibold">{totalPages}</span>
                  </span>

                  <button
                    type="button"
                    disabled={currentPage + 1 >= totalPages || loadingSales}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages - 1, page + 1)
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              {selectedSale && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Detalle de la venta seleccionada
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatSaleDateTime(selectedSale)} · Total{" "}
                        {formatCurrency(selectedSale.totalAmount)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedSaleId(null)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                    >
                      <X className="h-3 w-3" />
                      Cerrar
                    </button>
                  </div>

                  {selectedSale.items && selectedSale.items.length > 0 ? (
                    <div className="max-h-56 overflow-auto rounded-lg border border-slate-100 bg-white">
                      <table className="min-w-full border-collapse text-[11px]">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="border-b border-slate-100 px-2 py-1 text-left font-medium text-slate-600">
                              Platillo
                            </th>
                            <th className="border-b border-slate-100 px-2 py-1 text-center font-medium text-slate-600">
                              Cantidad
                            </th>
                            <th className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-600">
                              Precio unit.
                            </th>
                            <th className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-600">
                              Subtotal
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {selectedSale.items.map((item) => {
                            const lineTotal =
                              item.totalAmount ??
                              toNumber(item.quantity) * toNumber(item.unitPrice);

                            return (
                              <tr key={item.id ?? item.dishId}>
                                <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                                  {item.dishName ?? "—"}
                                </td>

                                <td className="border-b border-slate-100 px-2 py-1 text-center text-slate-700">
                                  {item.quantity ?? 0}
                                </td>

                                <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                                  {formatCurrency(item.unitPrice)}
                                </td>

                                <td className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-800">
                                  {formatCurrency(lineTotal)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Esta venta no tiene ítems asociados.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Registrar nueva venta
              </h2>
              <p className="text-xs text-slate-500">
                Agrega los platillos vendidos. El sistema calculará el total y
                descontará el stock según los ingredientes de cada plato.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            >
              <X className="h-3 w-3" />
              Limpiar
            </button>
          </div>

          {popularDishes.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-800">
                Acceso rápido a platillos
              </p>

              <div className="flex flex-wrap gap-2">
                {popularDishes.map((dish) => (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => handleQuickAddDish(dish)}
                    disabled={saving}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60"
                  >
                    {dish.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-800">
                  Ítems de la venta
                </p>

                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={loadingDishes || dishes.length === 0 || saving}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="h-3 w-3" />
                  Agregar ítem
                </button>
              </div>

              {loadingDishes && (
                <p className="text-[11px] text-slate-400">
                  Cargando platillos disponibles…
                </p>
              )}

              {!loadingDishes && dishes.length === 0 && (
                <p className="text-[11px] text-slate-400">
                  No hay platillos activos. Configura platillos primero en el
                  módulo correspondiente.
                </p>
              )}

              {!loadingDishes && items.length === 0 && dishes.length > 0 && (
                <p className="text-[11px] text-slate-400">
                  Agrega uno o más platillos vendidos para registrar la venta.
                </p>
              )}

              {items.length > 0 && (
                <div className="max-h-72 overflow-auto rounded-lg border border-slate-100 bg-white">
                  <table className="min-w-full border-collapse text-[11px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="border-b border-slate-100 px-2 py-1 text-left font-medium text-slate-600">
                          Platillo
                        </th>
                        <th className="border-b border-slate-100 px-2 py-1 text-center font-medium text-slate-600">
                          Cantidad
                        </th>
                        <th className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-600">
                          Precio unit. S/
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
                      {items.map((item) => {
                        const lineTotal = computeLineTotal(item);

                        return (
                          <tr key={item.tempId} className="hover:bg-slate-50/60">
                            <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                              <select
                                value={item.dishId}
                                disabled={saving}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.tempId,
                                    "dishId",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                              >
                                {dishes.map((dish) => (
                                  <option key={dish.id} value={dish.id}>
                                    {dish.name}
                                    {dish.category ? ` · ${dish.category}` : ""}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="border-b border-slate-100 px-2 py-1 text-center text-slate-700">
                              <input
                                type="number"
                                min={1}
                                step={1}
                                value={item.quantity}
                                disabled={saving}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.tempId,
                                    "quantity",
                                    e.target.value
                                  )
                                }
                                className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-[11px] outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                              />
                            </td>

                            <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={item.unitPrice}
                                disabled={saving}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.tempId,
                                    "unitPrice",
                                    e.target.value
                                  )
                                }
                                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-[11px] outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                              />
                            </td>

                            <td className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-800">
                              {formatCurrency(lineTotal)}
                            </td>

                            <td className="border-b border-slate-100 px-2 py-1 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.tempId)}
                                disabled={saving}
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

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-xs font-semibold text-slate-800">
                Resumen de la venta
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                El total es referencial. El backend recalcula y valida la venta,
                incluyendo el stock disponible de los ingredientes.
              </p>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">Platillos vendidos:</span>
                  <span className="font-semibold text-slate-900">
                    {previewItemCount}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-700">Total estimado:</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(previewTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={saving || loadingDishes || dishes.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registrando venta…
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    Registrar venta
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}