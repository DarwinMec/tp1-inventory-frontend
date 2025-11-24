"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Truck,
  Search,
  Users,
  Phone,
  Mail,
  MapPin,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

// ==== Tipos alineados al backend ====

// DTO/SupplierDTO.java
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

type FormMode = "create" | "edit";

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);

  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [mode, setMode] = useState<FormMode>("create");
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(
    null
  );

  // Estado del formulario
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  // 1) Cargar proveedores
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        setError(null);

        // Backend: GET /api/suppliers → "/suppliers" en apiFetch
        const data = await apiFetch<SupplierDTO[]>("/suppliers");
        setSuppliers(data ?? []);
      } catch (e: any) {
        console.error("Error cargando proveedores", e);
        setError(
          e?.message ??
            "No se pudieron cargar los proveedores. Verifica el backend y tus credenciales."
        );
      } finally {
        setLoadingSuppliers(false);
      }
    };

    loadSuppliers();
  }, []);

  const resetForm = () => {
    setMode("create");
    setEditingSupplierId(null);
    setName("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setAddress("");
    setCity("");
    setRegion("");
    setIsActive(true);
    setError(null);
    setSuccessMessage(null);
  };

  const loadSupplierIntoForm = (s: SupplierDTO) => {
    setMode("edit");
    setEditingSupplierId(s.id ?? null);
    setName(s.name ?? "");
    setContactPerson(s.contactPerson ?? "");
    setPhone(s.phone ?? "");
    setEmail(s.email ?? "");
    setAddress(s.address ?? "");
    setCity(s.city ?? "");
    setRegion(s.region ?? "");
    setIsActive(s.isActive ?? true);
    setError(null);
    setSuccessMessage(null);
  };

  const reloadSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      const data = await apiFetch<SupplierDTO[]>("/suppliers");
      setSuppliers(data ?? []);
    } catch (e) {
      console.error("Error recargando proveedores", e);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError("El nombre del proveedor es obligatorio.");
      return false;
    }

    if (email.trim() && !email.includes("@")) {
      setError("El correo electrónico no parece válido.");
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

      const dto: SupplierDTO = {
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        region: region.trim() || undefined,
        isActive,
      };

      if (mode === "create") {
        await apiFetch<SupplierDTO>("/suppliers", {
          method: "POST",
          body: JSON.stringify(dto),
        });
        setSuccessMessage("Proveedor creado correctamente.");
      } else if (mode === "edit" && editingSupplierId) {
        await apiFetch<SupplierDTO>(`/suppliers/${editingSupplierId}`, {
          method: "PUT",
          body: JSON.stringify(dto),
        });
        setSuccessMessage("Proveedor actualizado correctamente.");
      }

      await reloadSuppliers();

      if (mode === "create") {
        resetForm();
      }
    } catch (e: any) {
      console.error("Error guardando proveedor", e);
      setError(
        e?.message ??
          "Ocurrió un error al guardar el proveedor. Verifica el backend y tus permisos."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este proveedor?")) return;

    try {
      setDeleting(id);
      setError(null);
      setSuccessMessage(null);

      await apiFetch<void>(`/suppliers/${id}`, {
        method: "DELETE",
      });

      setSuccessMessage("Proveedor eliminado correctamente.");
      await reloadSuppliers();

      if (editingSupplierId === id) {
        resetForm();
      }
    } catch (e: any) {
      console.error("Error eliminando proveedor", e);
      setError(
        e?.message ??
          "No se pudo eliminar el proveedor. Verifica que no esté siendo usado en otras entidades."
      );
    } finally {
      setDeleting(null);
    }
  };

  // Filtros / búsqueda
  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter((s) => {
        const term = searchTerm.toLowerCase();
        if (term) {
          const matchesName = (s.name ?? "")
            .toLowerCase()
            .includes(term);
          const matchesCity = (s.city ?? "")
            .toLowerCase()
            .includes(term);
          const matchesRegion = (s.region ?? "")
            .toLowerCase()
            .includes(term);
          if (!matchesName && !matchesCity && !matchesRegion) return false;
        }

        if (onlyActive && !s.isActive) return false;

        return true;
      })
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [suppliers, searchTerm, onlyActive]);

  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter((s) => s.isActive).length;

  return (
    <section className="space-y-6">
      {/* ENCABEZADO */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Sparkles className="h-3 w-3" />
            <span>Módulo de proveedores</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Gestión de proveedores
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Registra y administra tus proveedores, incluyendo datos de contacto
            y ubicación. Estos registros se utilizarán luego en compras y
            reportes.
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
            <Users className="h-5 w-5 text-slate-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Total de proveedores
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingSuppliers ? "…" : totalSuppliers}
            </span>
            <span className="text-[11px] text-slate-400">
              Proveedores registrados en el sistema.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Proveedores activos
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingSuppliers ? "…" : activeSuppliers}
            </span>
            <span className="text-[11px] text-slate-400">
              Disponibles para compras y abastecimiento.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <MapPin className="h-5 w-5 text-slate-700" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Zonas registradas
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {useMemo(
                () =>
                  new Set(
                    suppliers
                      .map((s) => `${s.city ?? ""}|${s.region ?? ""}`)
                      .filter((v) => v.trim() !== "|")
                  ).size,
                [suppliers]
              )}
            </span>
            <span className="text-[11px] text-slate-400">
              Combinaciones únicas de ciudad / región.
            </span>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL: LISTA + FORMULARIO */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
        {/* LISTA DE PROVEEDORES */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Proveedores registrados
              </h2>
              <p className="text-xs text-slate-500">
                Lista de proveedores con datos básicos de contacto.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, ciudad o región…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                />
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={onlyActive}
                  onChange={(e) => setOnlyActive(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-0"
                />
                <span>Mostrar solo activos</span>
              </label>
            </div>
          </div>

          {loadingSuppliers ? (
            <div className="flex min-h-[220px] items-center justify-center text-xs text-slate-500">
              Cargando proveedores…
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center text-xs text-slate-500">
              No se encontraron proveedores con los filtros aplicados.
            </div>
          ) : (
            <div className="max-h-[460px] overflow-auto rounded-xl border border-slate-100">
              <table className="min-w-full border-collapse text-[11px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                      Proveedor
                    </th>
                    <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                      Contacto
                    </th>
                    <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                      Ubicación
                    </th>
                    <th className="border-b border-slate-100 px-3 py-2 text-center font-medium text-slate-600">
                      Activo
                    </th>
                    <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((s) => (
                    <tr key={s.id ?? s.name} className="hover:bg-slate-50/60">
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                        <div className="flex flex-col">
                          <span className="font-medium">{s.name}</span>
                          {s.email && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Mail className="h-3 w-3" />
                              {s.email}
                            </span>
                          )}
                          {s.phone && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Phone className="h-3 w-3" />
                              {s.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                        {s.contactPerson ?? "—"}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                        <div className="flex flex-col">
                          {(s.city || s.region) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              <span>
                                {s.city ?? "—"}
                                {s.city && s.region ? ", " : ""}
                                {s.region ?? ""}
                              </span>
                            </span>
                          )}
                          {s.address && (
                            <span className="text-[10px] text-slate-400">
                              {s.address}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-center">
                        {s.isActive ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            Sí
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                            No
                          </span>
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => loadSupplierIntoForm(s)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Edit className="h-3 w-3" />
                            Editar
                          </button>
                          {s.id && (
                            <button
                              type="button"
                              disabled={deleting === s.id}
                              onClick={() => handleDeleteSupplier(s.id!)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                            >
                              <Trash2 className="h-3 w-3" />
                              {deleting === s.id ? "Eliminando…" : "Eliminar"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FORMULARIO DE PROVEEDOR */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {mode === "create"
                  ? "Nuevo proveedor"
                  : "Editar proveedor"}
              </h2>
              <p className="text-xs text-slate-500">
                Completa los datos del proveedor. Estos se usarán luego en las
                órdenes de compra y reportes.
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
              <CheckCircle2 className="mt-[2px] h-3.5 w-3.5" />
              <p>{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Fila 1: nombre + contacto */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Nombre del proveedor
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                  placeholder="Ej: Distribuidora El Norte"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Persona de contacto
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
            </div>

            {/* Fila 2: Teléfono + Email */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Teléfono
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                    placeholder="Ej: +51 999 999 999"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                    placeholder="Ej: contacto@proveedor.com"
                  />
                </div>
              </div>
            </div>

            {/* Fila 3: Dirección */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Dirección
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                  placeholder="Ej: Jr. Los Jazmines 123"
                />
              </div>
            </div>

            {/* Fila 4: Ciudad + Región + Activo */}
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                  placeholder="Ej: Chiclayo"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Región / Departamento
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                  placeholder="Ej: Lambayeque"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  id="supplier-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-0"
                />
                <label
                  htmlFor="supplier-active"
                  className="text-xs font-medium text-slate-700"
                >
                  Proveedor activo
                </label>
              </div>
            </div>

            {/* BOTÓN GUARDAR */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
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
                    Crear proveedor
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Actualizar proveedor
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
