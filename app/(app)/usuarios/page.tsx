"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Users,
  UserRoundCog,
  ShieldCheck,
  Mail,
  Key,
  UserPlus,
  Edit,
  Trash2,
  X,
  Search,
  CheckCircle2,
} from "lucide-react";
import type { UserDTO } from "@/lib/backend-types";
import { createUser, deleteUser, getUsers, updateUser } from "@/lib/services";

type Role = "ADMIN" | "MANAGER" | "EMPLOYEE" | string;

type UserWithTimestamps = UserDTO & {
  updatedAt?: string | null;
};

type UserPayload = Partial<UserDTO> & {
  password?: string;
  active?: boolean;
};

type FormMode = "create" | "edit";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "MANAGER", label: "Gerente / Supervisor" },
  { value: "EMPLOYEE", label: "Operador / Almacenero" },
];

const PAGE_SIZE = 20;

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

function humanRole(role: Role) {
  const found = ROLE_OPTIONS.find((option) => option.value === role);

  if (found) return found.label;

  return String(role || "Sin rol");
}

function statusBadgeClasses(isActive?: boolean | null) {
  return isActive
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-slate-100 text-slate-500 border-slate-200";
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserWithTimestamps[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [mode, setMode] = useState<FormMode>("create");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("EMPLOYEE");
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      setError(null);

      const data = await getUsers();

      setUsers((data ?? []) as UserWithTimestamps[]);
    } catch (e: any) {
      console.error("Error cargando usuarios", e);
      setError(
        e?.message ??
          "No se pudieron cargar los usuarios. Verifica el backend, los permisos y el token."
      );
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const resetForm = () => {
    setMode("create");
    setEditingUserId(null);
    setSelectedUserId(null);

    setUsername("");
    setFullName("");
    setEmail("");
    setRole("EMPLOYEE");
    setActive(true);
    setPassword("");

    setError(null);
    setSuccessMessage(null);
  };

  const loadUserIntoForm = (user: UserWithTimestamps) => {
    setMode("edit");
    setEditingUserId(user.id);
    setSelectedUserId(user.id);

    setUsername(user.username ?? "");
    setFullName(user.fullName ?? "");
    setEmail(user.email ?? "");
    setRole(user.role ?? "EMPLOYEE");
    setActive(user.active ?? user.isActive ?? true);
    setPassword("");

    setError(null);
    setSuccessMessage(null);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return users
      .filter((user) => {
        if (roleFilter !== "todos" && user.role !== roleFilter) {
          return false;
        }

        if (!term) return true;

        const usernameText = (user.username ?? "").toLowerCase();
        const fullNameText = (user.fullName ?? "").toLowerCase();
        const emailText = (user.email ?? "").toLowerCase();
        const roleText = (user.role ?? "").toLowerCase();

        return (
          usernameText.includes(term) ||
          fullNameText.includes(term) ||
          emailText.includes(term) ||
          roleText.includes(term)
        );
      })
      .sort((a, b) => {
        const aKey = a.createdAt ?? "";
        const bKey = b.createdAt ?? "";
        return bKey.localeCompare(aKey);
      });
  }, [users, searchTerm, roleFilter]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE)),
    [filteredUsers.length]
  );

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    return filteredUsers.slice(start, end);
  }, [filteredUsers, currentPage]);

  const selectedUser = useMemo(
    () => filteredUsers.find((user) => user.id === selectedUserId) ?? null,
    [filteredUsers, selectedUserId]
  );

  const totalUsers = users.length;
  const activeUsersCount = users.filter(
    (user) => user.active !== false && user.isActive !== false
  ).length;
  const adminCount = users.filter((user) => user.role === "ADMIN").length;
  const managerCount = users.filter((user) => user.role === "MANAGER").length;

  const validateForm = (): boolean => {
    if (!username.trim()) {
      setError("El nombre de usuario es obligatorio.");
      return false;
    }

    if (!email.trim()) {
      setError("El correo electrónico es obligatorio.");
      return false;
    }

    if (!role) {
      setError("Selecciona un rol para el usuario.");
      return false;
    }

    if (mode === "create" && password.trim().length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload: UserPayload = {
        username: username.trim(),
        email: email.trim(),
        fullName: fullName.trim() || null,
        role,
        active,
        isActive: active,
      };

      if (password.trim()) {
        payload.password = password;
      }

      if (mode === "create") {
        await createUser(payload);
        setSuccessMessage("Usuario creado correctamente.");
      } else if (mode === "edit" && editingUserId) {
        await updateUser(editingUserId, payload);
        setSuccessMessage("Usuario actualizado correctamente.");
      }

      await loadUsers();

      if (mode === "create") {
        resetForm();
      } else {
        setPassword("");
      }
    } catch (e: any) {
      console.error("Error guardando usuario", e);
      setError(
        e?.message ??
          "Ocurrió un error al guardar el usuario. Verifica el backend, los datos y tus permisos."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserWithTimestamps) => {
    if (!user.id) return;

    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar el usuario "${user.username}"? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      setDeleting(user.id);
      setError(null);
      setSuccessMessage(null);

      await deleteUser(user.id);

      setSuccessMessage("Usuario eliminado correctamente.");
      await loadUsers();

      if (selectedUserId === user.id) setSelectedUserId(null);
      if (editingUserId === user.id) resetForm();
    } catch (e: any) {
      console.error("Error eliminando usuario", e);
      setError(
        e?.message ??
          "No se pudo eliminar el usuario. Verifica si tiene dependencias o permisos."
      );
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            <Users className="h-3 w-3" />
            <span>Gestión de usuarios y roles</span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Usuarios del sistema Inventory ML
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Administra las cuentas de acceso al sistema, asigna roles y controla
            qué usuarios están activos. Solo los perfiles con rol adecuado
            podrán acceder a ciertos módulos como inventario, ventas,
            predicciones y reportes.
          </p>
        </div>

        {error && (
          <div className="flex max-w-xs items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
            <p>{error}</p>
          </div>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <Users className="h-5 w-5 text-slate-700" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Usuarios totales
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingUsers ? "…" : totalUsers}
            </span>
            <span className="text-[11px] text-slate-400">
              Cuentas registradas en el sistema.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Usuarios activos
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingUsers ? "…" : activeUsersCount}
            </span>
            <span className="text-[11px] text-slate-400">
              Con acceso habilitado actualmente.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
            <UserRoundCog className="h-5 w-5 text-blue-700" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Administradores
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingUsers ? "…" : adminCount}
            </span>
            <span className="text-[11px] text-slate-400">
              Control total del sistema.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
            <UserRoundCog className="h-5 w-5 text-amber-700" />
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Gerentes / Supervisores
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {loadingUsers ? "…" : managerCount}
            </span>
            <span className="text-[11px] text-slate-400">
              Enfoque en análisis y decisiones.
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Usuarios registrados
              </h2>
              <p className="text-xs text-slate-500">
                Lista de cuentas con acceso al sistema, sus roles y estado.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, usuario o correo…"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-blue-500 focus:ring-1"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
              >
                <option value="todos">Todos los roles</option>
                {ROLE_OPTIONS.map((roleOption) => (
                  <option key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingUsers ? (
            <div className="flex min-h-[220px] items-center justify-center text-xs text-slate-500">
              Cargando usuarios…
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center text-xs text-slate-500">
              No se encontraron usuarios con los filtros aplicados.
            </div>
          ) : (
            <>
              <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-100">
                <table className="min-w-full border-collapse text-[11px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                        Usuario
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                        Correo
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-left font-medium text-slate-600">
                        Rol
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-center font-medium text-slate-600">
                        Estado
                      </th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right font-medium text-slate-600">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedUsers.map((user) => {
                      const isUserActive =
                        user.active !== false && user.isActive !== false;

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/60">
                          <td className="border-b border-slate-100 px-3 py-2 text-slate-800">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {user.fullName || user.username}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                @{user.username}
                              </span>
                            </div>
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                            {user.email}
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2 text-slate-700">
                            {humanRole(user.role)}
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusBadgeClasses(
                                isUserActive
                              )}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isUserActive
                                    ? "bg-emerald-500"
                                    : "bg-slate-400"
                                }`}
                              />
                              {isUserActive ? "Activo" : "Inactivo"}
                            </span>
                          </td>

                          <td className="border-b border-slate-100 px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => loadUserIntoForm(user)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Edit className="h-3 w-3" />
                                Editar
                              </button>

                              <button
                                type="button"
                                disabled={deleting === user.id}
                                onClick={() => handleDeleteUser(user)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                              >
                                <Trash2 className="h-3 w-3" />
                                {deleting === user.id
                                  ? "Eliminando…"
                                  : "Eliminar"}
                              </button>
                            </div>
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
                    {paginatedUsers.length}
                  </span>{" "}
                  de{" "}
                  <span className="font-semibold">{filteredUsers.length}</span>{" "}
                  usuarios
                </span>

                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
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
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              {selectedUser && (
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Detalle del usuario seleccionado
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Creado: {formatDateTime(selectedUser.createdAt)} ·
                        Última actualización:{" "}
                        {formatDateTime(selectedUser.updatedAt)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedUserId(null)}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                    >
                      <X className="h-3 w-3" />
                      Cerrar
                    </button>
                  </div>

                  <div className="grid gap-2 text-[11px] text-slate-700 sm:grid-cols-2">
                    <p>
                      <span className="font-semibold">Nombre:</span>{" "}
                      {selectedUser.fullName || "—"}
                    </p>

                    <p>
                      <span className="font-semibold">Usuario:</span> @
                      {selectedUser.username}
                    </p>

                    <p>
                      <span className="font-semibold">Correo:</span>{" "}
                      {selectedUser.email}
                    </p>

                    <p>
                      <span className="font-semibold">Rol:</span>{" "}
                      {humanRole(selectedUser.role)}
                    </p>

                    <p className="sm:col-span-2">
                      <span className="font-semibold">Estado:</span>{" "}
                      {selectedUser.active !== false &&
                      selectedUser.isActive !== false
                        ? "Activo"
                        : "Inactivo"}
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
                {mode === "create" ? "Crear nuevo usuario" : "Editar usuario"}
              </h2>
              <p className="text-xs text-slate-500">
                Completa los datos de acceso y asigna un rol. Para editar, solo
                actualiza los campos necesarios; la contraseña es opcional.
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
            >
              <X className="h-3 w-3" />
              Nuevo usuario
            </button>
          </div>

          {successMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 className="mt-[2px] h-3.5 w-3.5" />
              <p>{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Usuario
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Ej: jperez"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="usuario@restaurante.com"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-blue-500 focus:ring-1"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Rol
                </label>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                >
                  {ROLE_OPTIONS.map((roleOption) => (
                    <option key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Contraseña {mode === "edit" && "(opcional)"}
                </label>

                <div className="relative">
                  <Key className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      mode === "create"
                        ? "Mínimo 6 caracteres…"
                        : "Deja vacío para no cambiarla"
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-blue-500 focus:ring-1"
                  />
                </div>

                <p className="text-[11px] text-slate-400">
                  La contraseña se envía solo si escribes algo. En edición,
                  dejar en blanco mantiene la actual.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Estado
                </label>

                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                  <input
                    id="user-active"
                    type="checkbox"
                    checked={active}
                    onChange={(event) => setActive(event.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />

                  <label
                    htmlFor="user-active"
                    className="select-none text-slate-700"
                  >
                    Usuario activo
                  </label>
                </div>

                <p className="text-[11px] text-slate-400">
                  Si está activo, puede iniciar sesión y usar el sistema según
                  su rol.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={saving || loadingUsers}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    Guardando usuario…
                  </span>
                ) : mode === "create" ? (
                  <span className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Crear usuario
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Actualizar usuario
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