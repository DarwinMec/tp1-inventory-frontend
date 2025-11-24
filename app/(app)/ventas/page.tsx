"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ShoppingCart,
  Search,
  CalendarClock,
  Plus,
  UtensilsCrossed,
  Receipt,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

// ==== Tipos alineados al backend ====

// DTO/SaleItemDTO.java
type SaleItemDTO = {
  id?: string;
  dishId: string;
  dishName?: string | null;
  quantity: number;
  unitPrice?: number | null;
  totalAmount?: number | null;
};

// DTO/SaleDTO.java
type SaleDTO = {
  id?: string;
  saleDate?: string | null; // "2025-11-23"
  saleTime?: string | null; // "14:30:00"
  totalAmount?: number | null;
  dayOfWeek?: number | null;
  month?: number | null;
  year?: number | null;
  weather?: string | null;
  isHoliday?: boolean | null;
  isWeekend?: boolean | null;
  items?: SaleItemDTO[];
};

// DishDTO usado para seleccionar platos
type DishDTO = {
  id: string;
  name: string;
  category?: string | null;
  price?: number | null;
  isActive?: boolean | null;
};

type SaleFormItem = {
  tempId: string;
  dishId: string;
  quantity: number;
  unitPrice: number;
};

type FormMode = "create";

export default function VentasPage() {
  const [sales, setSales] = useState<SaleDTO[]>([]);
  const [dishes, setDishes] = useState<DishDTO[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20; // 20 ventas por página

  const [loadingSales, setLoadingSales] = useState(false);
  const [loadingDishes, setLoadingDishes] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
    useEffect(() => {
    setCurrentPage(1);
    }, [searchTerm]);

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const [items, setItems] = useState<SaleFormItem[]>([]);

  // 1) Cargar ventas
  useEffect(() => {
    const loadSales = async () => {
      try {
        setLoadingSales(true);
        setError(null);

        // Backend: GET /api/sales -> "/sales"
        const data = await apiFetch<SaleDTO[]>("/sales");
        setSales(data ?? []);
      } catch (e: any) {
        console.error("Error cargando ventas", e);
        setError(
          e?.message ??
            "No se pudieron cargar las ventas. Verifica el backend y tus credenciales."
        );
      } finally {
        setLoadingSales(false);
      }
    };

    loadSales();
  }, []);

  // 2) Cargar platos para registrar ventas
  useEffect(() => {
    const loadDishes = async () => {
      try {
        setLoadingDishes(true);
        const data = await apiFetch<DishDTO[]>("/dishes");
        // filtrar solo activos si se desea
        setDishes((data ?? []).filter((d) => d.isActive !== false));
      } catch (e: any) {
        console.error("Error cargando platillos para ventas", e);
        setError(
          e?.message ??
            "No se pudieron cargar los platillos para registrar ventas."
        );
      } finally {
        setLoadingDishes(false);
      }
    };

    loadDishes();
  }, []);

  const reloadSales = async () => {
    try {
      setLoadingSales(true);
      const data = await apiFetch<SaleDTO[]>("/sales");
      setSales(data ?? []);
    } catch (e) {
      console.error("Error recargando ventas", e);
    } finally {
      setLoadingSales(false);
    }
  };

  const resetForm = () => {
    setItems([]);
    setError(null);
    setSuccessMessage(null);
  };

  const handleAddItem = () => {
    if (!dishes || dishes.length === 0) return;
    const defaultDish = dishes[0];
    setItems((prev) => [
      ...prev,
      {
        tempId: `item-${Date.now()}-${prev.length}`,
        dishId: defaultDish.id,
        quantity: 1,
        unitPrice: defaultDish.price ?? 0,
      },
    ]);
  };

  const handleRemoveItem = (tempId: string) => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
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
            return { ...item, dishId: value };
          }
          return {
            ...item,
            dishId: dish.id,
            unitPrice: dish.price ?? item.unitPrice,
          };
        }

        if (field === "quantity" || field === "unitPrice") {
          const num = Number(value.replace(",", ".")) || 0;
          return {
            ...item,
            [field]: num,
          };
        }

        return {
          ...item,
          [field]: value as any,
        };
      })
    );
  };

  const validateForm = (): boolean => {
    if (items.length === 0) {
      setError("La venta debe tener al menos un ítem (plato).");
      return false;
    }

    const hasInvalid = items.some(
      (i) => !i.dishId || i.quantity <= 0 || i.unitPrice < 0
    );
    if (hasInvalid) {
      setError(
        "Cada ítem debe tener un plato seleccionado, cantidad > 0 y precio unitario válido."
      );
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

      // Construir SaleDTO mínimo: solo items; fecha/hora se rellenan en backend
      const body: Partial<SaleDTO> = {
        items: items.map((i) => ({
          dishId: i.dishId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      };

      await apiFetch<SaleDTO>("/sales", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setSuccessMessage("Venta registrada correctamente.");
      resetForm();
      await reloadSales();
    } catch (e: any) {
      console.error("Error registrando venta", e);
      setError(
        e?.message ??
          "Ocurrió un error al registrar la venta. Verifica el backend e inventario."
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredSales = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return sales
      .filter((s) => {
        if (!term) return true;

        const dateStr = s.saleDate ?? "";
        const idStr = s.id ?? "";
        const anyDish = (s.items ?? []).some((it) =>
          (it.dishName ?? "").toLowerCase().includes(term)
        );

        return (
          dateStr.toLowerCase().includes(term) ||
          idStr.toLowerCase().includes(term) ||
          anyDish
        );
      })
      .sort((a, b) => {
        const aKey = `${a.saleDate ?? ""}T${a.saleTime ?? ""}`;
        const bKey = `${b.saleDate ?? ""}T${b.saleTime ?? ""}`;
        return bKey.localeCompare(aKey);
      });
  }, [sales, searchTerm]);

    const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredSales.length / pageSize)),
    [filteredSales.length, pageSize]
    );

    const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredSales.slice(start, end);
    }, [filteredSales, currentPage, pageSize]);


  const totalSalesCount = filteredSales.length;
  const totalRevenue = filteredSales.reduce(
    (acc, s) => acc + (s.totalAmount ?? 0),
    0
  );
  const avgTicket =
    totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  const selectedSale = useMemo(
    () => filteredSales.find((s) => s.id === selectedSaleId) ?? null,
    [filteredSales, selectedSaleId]
  );

  const formatDateTime = (sale: SaleDTO) => {
    if (!sale.saleDate) return "—";
    const time = sale.saleTime ?? "00:00:00";
    const isoString = `${sale.saleDate}T${time}`;
    const d = new Date(isoString);

    if (Number.isNaN(d.getTime())) {
      return sale.saleDate;
    }

    return d.toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const computeLineTotal = (item: SaleFormItem) =>
    (item.quantity || 0) * (item.unitPrice || 0);

  const previewTotal = items.reduce(
    (acc, it) => acc + computeLineTotal(it),
    0
  );

  return (
    <section className="space-y-6">
      {/* ENCABEZADO */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            <ShoppingCart className="h-3 w-3" />
            <span>Módulo de ventas</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Registro e historial de ventas
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Visualiza el historial de ventas y registra nuevas órdenes. Cada
            venta descuenta inventario automáticamente según las recetas
            configuradas para cada platillo.
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
              Total de movimientos de venta en el sistema.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <ShoppingCart className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Importe total vendido
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingSales ? "…" : `S/ ${totalRevenue.toFixed(2)}`}
            </span>
            <span className="text-[11px] text-slate-400">
              Suma de los montos totales de las ventas listadas.
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
              {loadingSales ? "…" : `S/ ${avgTicket.toFixed(2)}`}
            </span>
            <span className="text-[11px] text-slate-400">
              Importe promedio por venta en el periodo visualizado.
            </span>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: HISTORIAL + NUEVA VENTA */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)]">
        {/* HISTORIAL DE VENTAS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Historial de ventas
              </h2>
              <p className="text-xs text-slate-500">
                Ventas registradas en el sistema, con fecha, hora e importe
                total.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por fecha, ID o platillo…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                />
              </div>
            </div>
          </div>

          {loadingSales ? (
            <div className="flex min-h-[220px] items-center justify-center text-xs text-slate-500">
              Cargando ventas…
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center text-xs text-slate-500">
              No se encontraron ventas con los filtros aplicados.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-100">
                <table className="min-w-full border-collapse text-[11px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                        Fecha / hora
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
                        Ver detalle
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSales.map((s) => {
                      const itemCount =
                        s.items?.reduce(
                          (acc, it) => acc + (it.quantity ?? 0),
                          0
                        ) ?? 0;

                      return (
                        <tr
                          key={s.id ?? `${s.saleDate}-${s.saleTime}`}
                          className="hover:bg-slate-50/60"
                        >
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {formatDateTime(s)}
                              </span>
                              {s.id && (
                                <span className="text-[10px] text-slate-400">
                                  ID: {s.id}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="border-b border-slate-100 px-3 py-2 text-center text-slate-700">
                            {itemCount}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-800">
                            {s.totalAmount != null
                              ? `S/ ${s.totalAmount.toFixed(2)}`
                              : "S/ 0.00"}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-2 text-center text-[10px]">
                            <span className="inline-flex items-center justify-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              {s.isHoliday
                                ? "Feriado"
                                : s.isWeekend
                                ? "Fin de semana"
                                : "Día laborable"}
                            </span>
                          </td>
                          <td className="border-b border-slate-100 px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedSaleId(s.id ?? null)
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <UtensilsCrossed className="h-3 w-3" />
                              Detalle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                        Mostrando{" "}
                        <span className="font-semibold">
                        {paginatedSales.length}
                        </span>{" "}
                        de{" "}
                        <span className="font-semibold">
                        {filteredSales.length}
                        </span>{" "}
                        ventas
                    </span>

                    <div className="inline-flex items-center gap-1">
                        <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                        >
                        Anterior
                        </button>
                        <span>
                        Página{" "}
                        <span className="font-semibold">
                            {currentPage}
                        </span>{" "}
                        de{" "}
                        <span className="font-semibold">
                            {totalPages}
                        </span>
                        </span>
                        <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
                        >
                        Siguiente
                        </button>
                    </div>
                    </div>
              </div>

              {/* Detalle de la venta seleccionada */}
              {selectedSale && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Detalle de la venta seleccionada
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatDateTime(selectedSale)}
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
                    <div className="max-h-52 overflow-auto rounded-lg border border-slate-100 bg-white">
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
                          {selectedSale.items.map((it) => {
                            const lineTotal =
                              it.totalAmount ??
                              ((it.quantity ?? 0) *
                                (it.unitPrice ?? 0));

                            return (
                              <tr key={it.id ?? it.dishId}>
                                <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                                  {it.dishName ?? "—"}
                                </td>
                                <td className="border-b border-slate-100 px-2 py-1 text-center text-slate-700">
                                  {it.quantity}
                                </td>
                                <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                                  {it.unitPrice != null
                                    ? `S/ ${it.unitPrice.toFixed(2)}`
                                    : "S/ 0.00"}
                                </td>
                                <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                                  {`S/ ${lineTotal.toFixed(2)}`}
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

        {/* FORMULARIO: NUEVA VENTA */}
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
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
            >
              <X className="h-3 w-3" />
              Limpiar
            </button>
          </div>

          {successMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <ShoppingCart className="mt-[2px] h-3.5 w-3.5" />
              <p>{successMessage}</p>
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
                  disabled={loadingDishes || dishes.length === 0}
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
                          Precio unit. (S/)
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
                      {items.map((item) => {
                        const dish = dishes.find(
                          (d) => d.id === item.dishId
                        );
                        const lineTotal = computeLineTotal(item);

                        return (
                          <tr key={item.tempId} className="hover:bg-slate-50/60">
                            <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                              <select
                                value={item.dishId}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.tempId,
                                    "dishId",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none ring-blue-500 focus:ring-1"
                              >
                                {dishes.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                    {d.category ? ` · ${d.category}` : ""}
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
                                onChange={(e) =>
                                  handleItemChange(
                                    item.tempId,
                                    "quantity",
                                    e.target.value
                                  )
                                }
                                className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-[11px] outline-none ring-blue-500 focus:ring-1"
                              />
                            </td>
                            <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleItemChange(
                                    item.tempId,
                                    "unitPrice",
                                    e.target.value
                                  )
                                }
                                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-[11px] outline-none ring-blue-500 focus:ring-1"
                              />
                            </td>
                            <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                              {`S/ ${lineTotal.toFixed(2)}`}
                            </td>
                            <td className="border-b border-slate-100 px-2 py-1 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveItem(item.tempId)
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100"
                              >
                                <X className="h-3 w-3" />
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

            {/* Resumen de la venta */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-xs font-semibold text-slate-800">
                Resumen de la venta
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Este total es referencial. El monto final se recalcula también
                en el backend al registrar la venta.
              </p>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-700">Total estimado:</span>
                <span className="font-semibold text-slate-900">
                  S/ {previewTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* BOTÓN GUARDAR */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={saving || loadingDishes || dishes.length === 0}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    Registrando venta…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Registrar venta
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
