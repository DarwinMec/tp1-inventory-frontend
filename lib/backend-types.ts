// lib/backend-types.ts

export type UserRole = "ADMIN" | "MANAGER" | "EMPLOYEE";

export type PageResponse<T> = {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
};

export type CategoryDTO = {
  id: string;
  name: string;
  description?: string | null;
};

export type ProductDTO = {
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

export type InventoryDTO = {
  productId: string;
  productName: string;
  currentStock?: number | null;
  availableStock?: number | null;
  reservedStock?: number | null;
  lastUpdated?: string | null;
};

export type InventoryTransactionDTO = {
  id?: string;
  productId: string;
  productName?: string | null;
  transactionType: string;
  quantity: number;
  unitCost?: number | null;
  totalCost?: number | null;
  supplierId?: string | null;
  supplierName?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  transactionDate?: string | null;
};

export type SupplierDTO = {
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

export type DishIngredientDTO = {
  id?: string;
  productId: string;
  productName?: string | null;
  quantityNeeded: number;
  unit?: string | null;
  unitMeasure?: string | null;
  costPerUnit?: number | null;
};

export type DishDTO = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  price?: number | null;
  preparationTime?: number | null;
  isActive?: boolean | null;
  ingredients?: DishIngredientDTO[];
};

export type SaleItemDTO = {
  id?: string;
  dishId?: string | null;
  dishName?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  totalAmount?: number | null;
};

export type SaleDTO = {
  id?: string;
  saleDate?: string | null;
  saleTime?: string | null;
  totalAmount?: number | null;
  paymentMethod?: string | null;
  customerName?: string | null;
  notes?: string | null;

  dayOfWeek?: number | null;
  month?: number | null;
  year?: number | null;
  weather?: string | null;
  isHoliday?: boolean | null;
  isWeekend?: boolean | null;

  items?: SaleItemDTO[];
};

export type UserDTO = {
  id: string;
  username: string;
  email: string;
  fullName?: string | null;
  role: string;
  active?: boolean | null;
  isActive?: boolean | null;
  phone?: string | null;
  createdAt?: string | null;
};

export type AlertDTO = {
  id: string;
  alertTypeId?: string | null;
  alertTypeName?: string | null;
  title: string;
  message?: string | null;
  severity?: "low" | "medium" | "high" | "critical" | string | null;
  productId?: string | null;
  productName?: string | null;
  dishId?: string | null;
  dishName?: string | null;
  isRead?: boolean | null;
  isResolved?: boolean | null;
  resolvedByUsername?: string | null;
  resolvedAt?: string | null;
  createdAt?: string | null;
};

export type MLServiceHealthDTO = {
  status?: string;
  service?: string;
  version?: string;
  message?: string;
};

export type MLModelInfoDTO = {
  modelId?: string | null;
  modelName?: string | null;
  modelType?: string | null;
  version?: string | null;
  mae?: number | null;
  rmse?: number | null;
  r2?: number | null;
  trainedAt?: string | null;
  createdAt?: string | null;
};

export type MLPredictionRequestDTO = {
  dishId?: string | null;
  weeksAhead?: number;
  saveToDb?: boolean;
  createdBy?: string;
};

export type MLServicePredictionDTO = {
  dishId?: string | null;
  dishName?: string | null;
  weekStart?: string | null;
  predictedDemand?: number | null;
  confidence?: string | null;
};

export type MLPredictionResponseDTO = {
  success: boolean;
  message?: string | null;
  modelId?: string | null;
  totalPredictions?: number | null;
  predictions?: MLServicePredictionDTO[];
};

export type MLTrainRequestDTO = {
  startDate?: string | null;
  endDate?: string | null;
  fastMode?: boolean;
  registerInDb?: boolean;
  createdBy?: string;
};

export type MLTrainResponseDTO = {
  success: boolean;
  message?: string | null;
  modelId?: string | null;
  trainingHistoryId?: string | null;
  modelPath?: string | null;
  version?: string | null;
  createdBy?: string | null;
  metrics?: Record<string, unknown> | null;
};

export type WeeklyGlobalSupplyItemDTO = {
  productId: string;
  productName: string;
  unitMeasure?: string | null;
  totalRequired?: number | null;
  currentStock?: number | null;
  availableStock?: number | null;
  quantityToBuy?: number | null;
};

export type WeeklyGlobalDishPredictionDTO = {
  dishId: string;
  dishName?: string | null;
  weekStart?: string | null;
  predictedDemand?: number | null;
  confidence?: string | null;
};

export type WeeklyGlobalPredictionResponseDTO = {
  weekStart?: string | null;
  dishes?: WeeklyGlobalDishPredictionDTO[];
  supplies?: WeeklyGlobalSupplyItemDTO[];
};

export type DashboardStatsDTO = {
  totalInsumos: number;
  totalPlatillos: number;
  totalProveedores: number;
  ventasHoy: number;
  variacionVentasPorcentaje: number;
  rotacionInventario: number;
  nivelServicio: number;
};

export type DashboardTendenciaDTO = {
  mes: string;
  ventas: number;
  prediccion: number;
};

export type ReportDTO = {
  id: string;
  reportType: string;
  title: string;
  parametersJson?: Record<string, unknown> | null;
  filePath?: string | null;
  fileFormat?: string | null;
  generatedByUsername?: string | null;
  generatedAt?: string | null;
};