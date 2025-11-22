// src/lib/types.ts
export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  token: string; // JWT del backend
}



// --- Inventario / negocio ---

export type CategoriaInsumo =
  | "Carnes"
  | "Vegetales"
  | "Granos"
  | "Lácteos"
  | "Condimentos"
  | "Bebidas"
  | "Otros";

export interface Insumo {
  id: string;
  nombre: string;
  categoria: CategoriaInsumo;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  activo: boolean;
}

export type CategoriaPlatillo =
  | "Criollo"
  | "Marino"
  | "Norteño"
  | "Entrada"
  | "Fondo"
  | "Otros";

export interface RecetaItem {
  insumoId: string;
  cantidad: number;
  unidad: string;
}

export interface Platillo {
  id: string;
  nombre: string;
  categoria: CategoriaPlatillo;
  precio: number;
  activo: boolean;
  receta: RecetaItem[];
}

export interface Proveedor {
  id: string;
  nombre: string;
  ruc: string;
  contacto: string;
  telefono?: string;
  direccion: string;
  insumosIds: string[];
  calificacion: number; // 1-5
}

export interface Venta {
  id: string;
  fecha: string; // ISO
  platilloId: string;
  cantidad: number;
}

export interface PrediccionDetalleInsumo {
  insumoId: string;
  cantidadNecesaria: number;
  unidad: string;
}

export interface PrediccionPlatillo {
  id: string;
  platilloId: string;
  demandaPredicha7Dias: number;
  insumosRequeridos: PrediccionDetalleInsumo[];
}

export interface MetricasModelo {
  rmse: number;
  mae: number;
  r2: number;
  mape: number;
}
