"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Filter,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  Truck,
} from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import type {
  InventoryDTO,
  InventoryTransactionDTO,
  ProductDTO,
  SupplierDTO,
} from "@/lib/backend-types";
import {
  createInventoryTransaction,
  getInventoryByProduct,
  getInventoryTransactions,
  getProducts,
  getSuppliers,
} from "@/lib/services";

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

function formatQuantity(value?: number | null) {
  return toNumber(value).toFixed(3);
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AbastecimientoPage() {
  const { hasRole } = useAuthContext();

  const canManageSupply = hasRole(["ADMIN", "MANAGER"]);

  const [transactions, setTransactions] = useState<InventoryTransactionDTO[]>(
    []
  );
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);

  const [selectedInventory, setSelectedInventory] =
    useState<InventoryDTO | null>(null);

  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [loadingSelectedInventory, setLoadingSelectedInventory] =
    useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [productFilter, setProductFilter] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);

  const [highlightedProductId, setHighlightedProductId] = useState<
    string | null
  >(null);

  const [productId, setProductId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const loadTransactions = useCallback(async () => {
    try {
      setLoadingTransactions(true);
      setError(null);

      const data = await getInventoryTransactions();

      setTransactions(data ?? []);
    } catch (e: any) {
      console.error("Error cargando movimientos de inventario", e);
      setError(
        e?.message ??
          "No se pudieron cargar los movimientos de abastecimiento."
      );
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);

      const data = await getProducts();

      setProducts((data ?? []).filter((p) => p.isActive !== false));
    } catch (e: any) {
      console.error("Error cargando productos", e);
      setError(e?.message ?? "No se pudieron cargar los insumos.");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoadingSuppliers(true);

      const data = await getSuppliers();

      setSuppliers((data ?? []).filter((s) => s.isActive !== false));
    } catch (e: any) {
      console.error("Error cargando proveedores", e);
      setError(e?.message ?? "No se pudieron cargar los proveedores.");
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  const loadInventoryBySelectedProduct = useCallback(
    async (selectedProductId: string) => {
      if (!selectedProductId) {
        setSelectedInventory(null);
        return;
      }

      try {
        setLoadingSelectedInventory(true);

        const data = await getInventoryByProduct(selectedProductId);

        setSelectedInventory(data);
      } catch (e) {
        console.warn("No se pudo cargar el inventario del producto", e);
        setSelectedInventory(null);
      } finally {
        setLoadingSelectedInventory(false);
      }
    },
    []
  );

  useEffect(() => {
    loadTransactions();
    loadProducts();
    loadSuppliers();
  }, [loadTransactions, loadProducts, loadSuppliers]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const productParam = params.get("productId");

    if (productParam) {
      setHighlightedProductId(productParam);
      setProductId(productParam);
      setProductFilter(productParam);
      setSearchTerm("");
    }
  }, []);

  useEffect(() => {
    if (!productId && products.length > 0) {
      setProductId(products[0].id);
      setUnitCost(toNumber(products[0].unitCost));
    }
  }, [products, productId]);

  useEffect(() => {
    if (!productId) return;

    const product = products.find((p) => p.id === productId);

    if (!product) return;

    setUnitCost(toNumber(product.unitCost));
  }, [productId, products]);

  useEffect(() => {
    loadInventoryBySelectedProduct(productId);
  }, [productId, loadInventoryBySelectedProduct]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, productFilter]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId]
  );

  const inboundTransactions = useMemo(
    () =>
      (transactions ?? []).filter(
        (t) => (t.transactionType ?? "").toLowerCase() === "inbound"
      ),
    [transactions]
  );

  const totalPurchases = inboundTransactions.length;

  const totalSpent = inboundTransactions.reduce((acc, t) => {
    const qty = toNumber(t.quantity);
    const uc = toNumber(t.unitCost);
    const tc = t.totalCost != null ? toNumber(t.totalCost) : qty * uc;

    return acc + tc;
  }, 0);

  const distinctSuppliers = useMemo(() => {
    const set = new Set(
      inboundTransactions
        .map((t) => t.supplierId)
        .filter((id): id is string => Boolean(id))
    );

    return set.size;
  }, [inboundTransactions]);

  const distinctProducts = useMemo(() => {
    const set = new Set(
      inboundTransactions
        .map((t) => t.productId)
        .filter((id): id is string => Boolean(id))
    );

    return set.size;
  }, [inboundTransactions]);

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return inboundTransactions
      .filter((t) => {
        if (productFilter !== "todos" && t.productId !== productFilter) {
          return false;
        }

        if (!term) return true;

        const productName = (t.productName ?? "").toLowerCase();
        const supplierName = (t.supplierName ?? "").toLowerCase();
        const ref = (t.referenceNumber ?? "").toLowerCase();
        const dateStr = (t.transactionDate ?? "").toLowerCase();
        const idStr = (t.id ?? "").toLowerCase();

        return (
          productName.includes(term) ||
          supplierName.includes(term) ||
          ref.includes(term) ||
          dateStr.includes(term) ||
          idStr.includes(term)
        );
      })
      .sort((a, b) => {
        const aKey = a.transactionDate ?? "";
        const bKey = b.transactionDate ?? "";

        return bKey.localeCompare(aKey);
      });
  }, [inboundTransactions, searchTerm, productFilter]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE)),
    [filteredTransactions.length]
  );

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    return filteredTransactions.slice(start, end);
  }, [filteredTransactions, currentPage]);

  const selectedTransaction = useMemo(
    () =>
      filteredTransactions.find((t) => t.id === selectedTransactionId) ?? null,
    [filteredTransactions, selectedTransactionId]
  );

  const formTotal = useMemo(
    () => toNumber(quantity) * toNumber(unitCost),
    [quantity, unitCost]
  );

  const resetForm = () => {
    const defaultProductId = highlightedProductId ?? products[0]?.id ?? "";

    setProductId(defaultProductId);
    setSupplierId("");
    setQuantity(1);

    const product = products.find((p) => p.id === defaultProductId);

    setUnitCost(toNumber(product?.unitCost));
    setReferenceNumber("");
    setNotes("");
    setError(null);
    setSuccessMessage(null);
  };

  const clearHighlightedProduct = () => {
    setHighlightedProductId(null);
    setProductFilter("todos");

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/ordenes");
    }
  };

  const validateForm = () => {
    if (!canManageSupply) {
      setError("Tu rol no tiene permisos para registrar abastecimiento.");
      return false;
    }

    if (!productId) {
      setError("Selecciona un insumo para registrar el ingreso.");
      return false;
    }

    if (quantity <= 0) {
      setError("La cantidad debe ser mayor a 0.");
      return false;
    }

    if (unitCost < 0) {
      setError("El costo unitario no puede ser negativo.");
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

      const body: Partial<InventoryTransactionDTO> = {
        productId,
        supplierId: supplierId || undefined,
        transactionType: "inbound",
        quantity,
        unitCost,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await createInventoryTransaction(body);

      setSuccessMessage(
        "Ingreso de abastecimiento registrado correctamente. El stock del insumo fue actualizado."
      );

      await loadTransactions();

      if (productId) {
        await loadInventoryBySelectedProduct(productId);
      }

      setQuantity(1);
      setReferenceNumber("");
      setNotes("");
    } catch (e: any) {
      console.error("Error registrando abastecimiento", e);
      setError(
        e?.message ??
          "Ocurrió un error al registrar el abastecimiento. Verifica los datos ingresados."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Sparkles className="h-3 w-3" />
            <span>Módulo de abastecimiento</span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Abastecimiento de insumos
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Registra ingresos de inventario por compras o reposiciones de
            insumos. Cada registro genera un movimiento <b>inbound</b> y
            actualiza el stock disponible.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadTransactions();
            loadProducts();
            loadSuppliers();

            if (productId) {
              loadInventoryBySelectedProduct(productId);
            }
          }}
          disabled={loadingTransactions || loadingProducts || loadingSuppliers}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loadingTransactions || loadingProducts || loadingSuppliers
                ? "animate-spin"
                : ""
            }`}
          />
          Actualizar
        </button>
      </header>

      {highlightedProductId && (
        <div className="flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
            <p>
              Llegaste a este módulo desde una alerta. El sistema ha
              preseleccionado el insumo relacionado para registrar su reposición.
            </p>
          </div>

          <button
            type="button"
            onClick={clearHighlightedProduct}
            className="rounded-lg border border-blue-200 bg-white px-3 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Ver todos los abastecimientos
          </button>
        </div>
      )}

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
              Ingresos registrados
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingTransactions ? "…" : totalPurchases}
            </span>
            <span className="text-[11px] text-slate-400">
              Movimientos inbound.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <Package className="h-5 w-5 text-emerald-700" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Insumos abastecidos
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingTransactions ? "…" : distinctProducts}
            </span>
            <span className="text-[11px] text-slate-400">
              Productos con ingresos.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <Truck className="h-5 w-5 text-blue-700" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Proveedores usados
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingTransactions ? "…" : distinctSuppliers}
            </span>
            <span className="text-[11px] text-slate-400">
              Asociados a ingresos.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
            <CircleDollarSign className="h-5 w-5 text-amber-700" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Monto abastecido
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingTransactions ? "…" : formatCurrency(totalSpent)}
            </span>
            <span className="text-[11px] text-slate-400">
              Costo total acumulado.
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1.05fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Historial de abastecimiento
              </h2>
              <p className="text-xs text-slate-500">
                Movimientos de entrada de insumos al inventario.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por producto, proveedor o ref…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-blue-500 focus:ring-1 sm:w-72"
                />
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-blue-500 focus:ring-1 sm:w-64"
                >
                  <option value="todos">Todos los insumos</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loadingTransactions ? (
            <div className="flex min-h-[280px] items-center justify-center text-xs text-slate-500">
              Cargando movimientos de abastecimiento…
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              No se encontraron movimientos con los filtros aplicados.
            </div>
          ) : (
            <>
              <div className="max-h-[410px] overflow-auto rounded-xl border border-slate-100">
                <table className="min-w-full border-collapse text-[11px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                        Fecha
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                        Insumo
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                        Proveedor
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                        Cantidad
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                        Total
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                        Ref.
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedTransactions.map((t) => {
                      const qty = toNumber(t.quantity);
                      const total =
                        t.totalCost != null
                          ? toNumber(t.totalCost)
                          : qty * toNumber(t.unitCost);

                      const highlighted = t.productId === highlightedProductId;

                      return (
                        <tr
                          key={t.id ?? `${t.productId}-${t.transactionDate}`}
                          className={`cursor-pointer hover:bg-slate-50/70 ${
                            highlighted ? "bg-blue-50/70" : ""
                          }`}
                          onClick={() => setSelectedTransactionId(t.id ?? null)}
                        >
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                            {formatDateTime(t.transactionDate)}
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {t.productName ?? "—"}
                              </span>
                              {highlighted && (
                                <span className="text-[10px] font-medium text-blue-600">
                                  Relacionado con alerta
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                            {t.supplierName ?? "—"}
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-800">
                            {formatQuantity(qty)}
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-800">
                            {formatCurrency(total)}
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-700">
                            {t.referenceNumber ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Mostrando{" "}
                  <span className="font-semibold">
                    {paginatedTransactions.length}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold">
                    {filteredTransactions.length}
                  </span>{" "}
                  movimientos
                </span>

                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <span>
                    Página <span className="font-semibold">{currentPage}</span>{" "}
                    de <span className="font-semibold">{totalPages}</span>
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              {selectedTransaction && (
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Detalle del ingreso seleccionado
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatDateTime(selectedTransaction.transactionDate)} ·{" "}
                        {selectedTransaction.productName ?? "Insumo"} ·{" "}
                        {selectedTransaction.supplierName ??
                          "Proveedor no registrado"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTransactionId(null)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="grid gap-2 text-[11px] text-slate-700 sm:grid-cols-2">
                    <p>
                      <span className="font-semibold">Insumo:</span>{" "}
                      {selectedTransaction.productName ?? "—"}
                    </p>

                    <p>
                      <span className="font-semibold">Proveedor:</span>{" "}
                      {selectedTransaction.supplierName ?? "—"}
                    </p>

                    <p>
                      <span className="font-semibold">Cantidad:</span>{" "}
                      {formatQuantity(selectedTransaction.quantity)}
                    </p>

                    <p>
                      <span className="font-semibold">Costo unitario:</span>{" "}
                      {formatCurrency(selectedTransaction.unitCost)}
                    </p>

                    <p>
                      <span className="font-semibold">Total:</span>{" "}
                      {formatCurrency(
                        selectedTransaction.totalCost ??
                          toNumber(selectedTransaction.quantity) *
                            toNumber(selectedTransaction.unitCost)
                      )}
                    </p>

                    <p>
                      <span className="font-semibold">Referencia:</span>{" "}
                      {selectedTransaction.referenceNumber ?? "—"}
                    </p>

                    <p className="sm:col-span-2">
                      <span className="font-semibold">Notas:</span>{" "}
                      {selectedTransaction.notes ?? "—"}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Registrar ingreso de abastecimiento
              </h2>
              <p className="text-xs text-slate-500">
                Selecciona el insumo, proveedor y cantidad comprada para
                actualizar el inventario.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
            >
              Limpiar
            </button>
          </div>

          {!canManageSupply && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Tu rol solo permite consultar abastecimiento. No puedes registrar
              nuevos ingresos.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3">
              <label className="space-y-1 text-xs font-medium text-slate-700">
                Insumo
                <select
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    setProductFilter(e.target.value || "todos");
                  }}
                  disabled={loadingProducts || products.length === 0}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {loadingProducts
                      ? "Cargando insumos…"
                      : "Selecciona un insumo…"}
                  </option>

                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.unitMeasure ? ` · ${p.unitMeasure}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              {selectedProduct && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">
                      Estado actual del insumo
                    </span>
                    {loadingSelectedInventory && (
                      <span className="text-slate-400">Actualizando…</span>
                    )}
                  </div>

                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <p>
                      <span className="block text-slate-400">Stock actual</span>
                      <span className="font-semibold text-slate-800">
                        {formatQuantity(selectedInventory?.currentStock)}{" "}
                        {selectedProduct.unitMeasure}
                      </span>
                    </p>

                    <p>
                      <span className="block text-slate-400">Disponible</span>
                      <span className="font-semibold text-slate-800">
                        {formatQuantity(selectedInventory?.availableStock)}{" "}
                        {selectedProduct.unitMeasure}
                      </span>
                    </p>

                    <p>
                      <span className="block text-slate-400">Stock mínimo</span>
                      <span className="font-semibold text-slate-800">
                        {formatQuantity(selectedProduct.minStock)}{" "}
                        {selectedProduct.unitMeasure}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              <label className="space-y-1 text-xs font-medium text-slate-700">
                Proveedor
                <div className="relative">
                  <Truck className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    disabled={loadingSuppliers || suppliers.length === 0}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-normal outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">
                      {loadingSuppliers
                        ? "Cargando proveedores…"
                        : "Sin proveedor registrado"}
                    </option>

                    {suppliers.map((s) => (
                      <option key={s.id ?? s.name} value={s.id ?? ""}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-medium text-slate-700">
                Cantidad comprada
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={quantity}
                  disabled={!canManageSupply}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-700">
                Costo unitario S/
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitCost}
                  disabled={!canManageSupply}
                  onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </label>
            </div>

            <div className="grid gap-3">
              <label className="space-y-1 text-xs font-medium text-slate-700">
                Documento / referencia
                <input
                  type="text"
                  value={referenceNumber}
                  disabled={!canManageSupply}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Ej. FAC-00123, BOLETA-567, OC-2026-01"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-700">
                Notas
                <textarea
                  value={notes}
                  disabled={!canManageSupply}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Observaciones sobre la compra o reposición."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-500" />
                <p className="text-xs font-semibold text-slate-800">
                  Resumen del ingreso
                </p>
              </div>

              <p className="mt-1 text-[11px] text-slate-500">
                El backend registrará la fecha actual y actualizará el stock
                del insumo seleccionado.
              </p>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-700">Total estimado:</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(formTotal)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={
                  saving ||
                  !canManageSupply ||
                  loadingProducts ||
                  products.length === 0
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    Registrando…
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Registrar abastecimiento
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