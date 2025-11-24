"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownCircle,
  Search,
  Package,
  Truck,
  Plus,
  Receipt,
} from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

// ===== Tipos alineados al backend =====

type InventoryTransactionDTO = {
  id?: string;
  productId: string;
  productName?: string | null;
  transactionType: string; // "inbound" | "outbound" | "adjustment"
  quantity: number;
  unitCost?: number | null;
  totalCost?: number | null;
  supplierId?: string | null;
  supplierName?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  transactionDate?: string | null; // ISO string
};

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

type SupplierDTO = {
  id?: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  isActive?: boolean | null;
};

const PAGE_SIZE = 20;

export default function ComprasPage() {
  const [transactions, setTransactions] = useState<InventoryTransactionDTO[]>([]);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);

  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros y paginación
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Selección de movimiento para ver detalle (opcional)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  // ===== Formulario de nueva compra =====
  const [productId, setProductId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // ===== Carga inicial =====

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoadingTransactions(true);
        setError(null);

        // Backend: InventoryTransactionController -> GET /api/inventory/transactions
        const data = await apiFetch<InventoryTransactionDTO[]>("/inventory/transactions");
        setTransactions(data ?? []);
      } catch (e: any) {
        console.error("Error cargando movimientos de inventario", e);
        setError(
          e?.message ??
            "No se pudieron cargar los movimientos de compras. Verifica el backend y tus credenciales."
        );
      } finally {
        setLoadingTransactions(false);
      }
    };

    loadTransactions();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        const data = await apiFetch<ProductDTO[]>("/products");
        setProducts((data ?? []).filter((p) => p.isActive !== false));
      } catch (e: any) {
        console.error("Error cargando productos para compras", e);
        setError(
          e?.message ??
            "No se pudieron cargar los productos. Verifica el backend."
        );
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const data = await apiFetch<SupplierDTO[]>("/suppliers");
        setSuppliers((data ?? []).filter((s) => s.isActive !== false));
      } catch (e: any) {
        console.error("Error cargando proveedores para compras", e);
        setError(
          e?.message ??
            "No se pudieron cargar los proveedores. Verifica el backend."
        );
      } finally {
        setLoadingSuppliers(false);
      }
    };

    loadSuppliers();
  }, []);

  const reloadTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const data = await apiFetch<InventoryTransactionDTO[]>("/inventory/transactions");
      setTransactions(data ?? []);
    } catch (e) {
      console.error("Error recargando movimientos", e);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // ===== Helpers / derivados =====

  // Solo queremos mostrar COMPRAS (transactionType = inbound)
  const inboundTransactions = useMemo(
    () =>
      (transactions ?? []).filter(
        (t) => (t.transactionType ?? "").toLowerCase() === "inbound"
      ),
    [transactions]
  );

  // KPIs
  const totalPurchases = inboundTransactions.length;
  const totalSpent = inboundTransactions.reduce((acc, t) => {
    const qty = t.quantity ?? 0;
    const uc = t.unitCost ?? 0;
    const tc = t.totalCost ?? qty * uc;
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

  // Filtrado + paginación
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return inboundTransactions
      .filter((t) => {
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
  }, [inboundTransactions, searchTerm]);

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

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const resetForm = () => {
    setProductId(products[0]?.id ?? "");
    setSupplierId("");
    setQuantity(1);
    setUnitCost(products[0]?.unitCost ?? 0);
    setReferenceNumber("");
    setNotes("");
    setError(null);
    setSuccessMessage(null);
  };

  // Inicializar valores por defecto cuando se cargan productos
  useEffect(() => {
    if (!productId && products.length > 0) {
      setProductId(products[0].id);
      setUnitCost(products[0].unitCost ?? 0);
    }
  }, [products, productId]);

  // Cada vez que cambia el producto seleccionado, actualizar unitCost y quizá notas
  useEffect(() => {
    if (!productId) return;
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setUnitCost(prod.unitCost ?? 0);
  }, [productId, products]);

  const formTotal = useMemo(
    () => (quantity || 0) * (unitCost || 0),
    [quantity, unitCost]
  );

  // ===== Manejo de envío =====

  const validateForm = (): boolean => {
    if (!productId) {
      setError("Selecciona un producto para registrar la compra.");
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

      // transactionType fijo a "inbound" (compra)
      const body: Partial<InventoryTransactionDTO> = {
        productId,
        supplierId: supplierId || undefined,
        transactionType: "inbound",
        quantity,
        unitCost,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
        // transactionDate: lo dejamos null para que el backend asigne ahora
      };

      await apiFetch<InventoryTransactionDTO>("/inventory/transactions", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setSuccessMessage("Compra registrada correctamente.");
      await reloadTransactions();
      resetForm();
    } catch (e: any) {
      console.error("Error registrando compra", e);
      setError(
        e?.message ??
          "Ocurrió un error al registrar la compra. Verifica el backend y los datos ingresados."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* ENCABEZADO */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            <ArrowDownCircle className="h-3 w-3" />
            <span>Movimientos de inventario · Compras</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Compras de insumos (ingresos al inventario)
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Registra ingresos de productos al inventario (compras a proveedores)
            y revisa el historial de movimientos de tipo <b>inbound</b>.
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
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Receipt className="h-5 w-5 text-slate-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Compras registradas
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingTransactions ? "…" : totalPurchases}
            </span>
            <span className="text-[11px] text-slate-400">
              Movimientos de inventario de tipo inbound.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <Package className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Productos distintos
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingTransactions ? "…" : distinctProducts}
            </span>
            <span className="text-[11px] text-slate-400">
              Insumos diferentes con compras registradas.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <Truck className="h-5 w-5 text-blue-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Proveedores involucrados
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingTransactions ? "…" : distinctSuppliers}
            </span>
            <span className="text-[11px] text-slate-400">
              Proveedores usados en las compras registradas.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
            <ArrowDownCircle className="h-5 w-5 text-amber-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Monto total comprado
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingTransactions ? "…" : `S/ ${totalSpent.toFixed(2)}`}
            </span>
            <span className="text-[11px] text-slate-400">
              Suma de los montos (totalCost) de las compras inbound.
            </span>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: HISTORIAL + FORM */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)]">
        {/* HISTORIAL DE COMPRAS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Historial de compras (inbound)
              </h2>
              <p className="text-xs text-slate-500">
                Movimientos de entrada de productos al inventario.
              </p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por producto, proveedor, fecha o ref…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-72 rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
              />
            </div>
          </div>

          {loadingTransactions ? (
            <div className="flex min-h-[220px] items-center justify-center text-xs text-slate-500">
              Cargando movimientos de compras…
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center text-xs text-slate-500">
              No se encontraron compras con los filtros aplicados.
            </div>
          ) : (
            <>
              <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-100">
                <table className="min-w-full border-collapse text-[11px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                        Fecha / hora
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                        Producto
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                        Proveedor
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                        Cantidad
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                        Costo total
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                        Ref.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTransactions.map((t) => {
                      const qty = t.quantity ?? 0;
                      const uc = t.unitCost ?? 0;
                      const total = t.totalCost ?? qty * uc;

                      return (
                        <tr
                          key={t.id ?? `${t.productId}-${t.transactionDate}`}
                          className="hover:bg-slate-50/60 cursor-pointer"
                          onClick={() => setSelectedTransactionId(t.id ?? null)}
                        >
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                            {formatDateTime(t.transactionDate)}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                            {t.productName ?? "—"}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                            {t.supplierName ?? "—"}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-800">
                            {qty.toFixed(3)}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-2 text-right text-slate-800">
                            {`S/ ${total.toFixed(2)}`}
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

              {/* PAGINACIÓN */}
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
                  compras
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
                    <span className="font-semibold">{currentPage}</span> de{" "}
                    <span className="font-semibold">{totalPages}</span>
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

              {/* DETALLE SELECCIONADO */}
              {selectedTransaction && (
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Detalle de la compra seleccionada
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatDateTime(selectedTransaction.transactionDate)} ·{" "}
                        {selectedTransaction.productName ?? "Producto"} ·{" "}
                        {selectedTransaction.supplierName ?? "Proveedor sin nombre"}
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
                      <span className="font-semibold">Producto:</span>{" "}
                      {selectedTransaction.productName ?? "—"}
                    </p>
                    <p>
                      <span className="font-semibold">Proveedor:</span>{" "}
                      {selectedTransaction.supplierName ?? "—"}
                    </p>
                    <p>
                      <span className="font-semibold">Cantidad:</span>{" "}
                      {selectedTransaction.quantity?.toFixed(3) ?? "—"}
                    </p>
                    <p>
                      <span className="font-semibold">Costo unitario:</span>{" "}
                      {selectedTransaction.unitCost != null
                        ? `S/ ${selectedTransaction.unitCost.toFixed(2)}`
                        : "—"}
                    </p>
                    <p>
                      <span className="font-semibold">Total:</span>{" "}
                      {(() => {
                        const qty = selectedTransaction.quantity ?? 0;
                        const uc = selectedTransaction.unitCost ?? 0;
                        const total =
                          selectedTransaction.totalCost ?? qty * uc;
                        return `S/ ${total.toFixed(2)}`;
                      })()}
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

        {/* FORMULARIO: NUEVA COMPRA */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Registrar nueva compra (inbound)
              </h2>
              <p className="text-xs text-slate-500">
                Selecciona el producto, proveedor y cantidades para registrar un
                ingreso de inventario.
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

          {successMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <ArrowDownCircle className="mt-[2px] h-3.5 w-3.5" />
              <p>{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Producto / Proveedor */}
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)]">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Producto
                </label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  disabled={loadingProducts || products.length === 0}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {loadingProducts
                      ? "Cargando productos…"
                      : "Selecciona un producto…"}
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.unitMeasure ? ` · ${p.unitMeasure}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Proveedor (opcional)
                </label>
                <div className="relative">
                  <Truck className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    disabled={loadingSuppliers || suppliers.length === 0}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">
                      {loadingSuppliers
                        ? "Cargando proveedores…"
                        : "Sin proveedor (opcional)…"}
                    </option>
                    {suppliers.map((s) => (
                      <option key={s.id ?? s.name} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Cantidad / costo */}
            <div className="grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Cantidad
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                />
                <p className="text-[11px] text-slate-400">
                  Usa la misma unidad de medida definida para el producto.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Costo unitario (S/)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                />
                <p className="text-[11px] text-slate-400">
                  Si lo dejas en 0, el total también quedará en 0. Lo ideal es usar el costo real.
                </p>
              </div>
            </div>

            {/* Referencia / notas */}
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  N° de documento / referencia
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Ej: FAC-00123, BOLETA-567, OC-2025-01…"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Observaciones sobre la compra, condiciones, etc."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                />
              </div>
            </div>

            {/* Resumen */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-xs font-semibold text-slate-800">
                Resumen de la compra
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                El total final también se valida y calcula en el backend usando
                cantidad y costo unitario.
              </p>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-700">Total estimado:</span>
                <span className="font-semibold text-slate-900">
                  S/ {formTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* BOTÓN GUARDAR */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={
                  saving ||
                  loadingProducts ||
                  products.length === 0
                }
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    Registrando compra…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4" />
                    Registrar compra
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
