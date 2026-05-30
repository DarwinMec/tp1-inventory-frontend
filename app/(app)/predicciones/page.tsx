"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  LineChart as LineChartIcon,
  Sparkles,
  History,
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Server,
} from "lucide-react";
import {
  LineChart,
  Line,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useAuthContext } from "@/context/AuthContext";
import type {
  DishDTO,
  DishIngredientDTO,
  MLModelInfoDTO,
  MLPredictionResponseDTO,
  MLServiceHealthDTO,
  MLServicePredictionDTO,
  MLTrainResponseDTO,
  WeeklyGlobalPredictionResponseDTO,
} from "@/lib/backend-types";
import {
  generatePredictions,
  getActiveMLModel,
  getDishById,
  getDishes,
  getMLHealth,
  getWeeklySupplyPlan,
  trainMLModel,
} from "@/lib/services";

type ViewMode = "byDish" | "weekly";

function toNumber(value?: number | string | null) {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getIngredientUnit(ingredient: DishIngredientDTO) {
  return ingredient.unit ?? ingredient.unitMeasure ?? "";
}

function parseISODateAsLocal(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatDateLabel(value: string) {
  return parseISODateAsLocal(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
  });
}

function formatDateTooltip(value: string) {
  return parseISODateAsLocal(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatWeekDate(value?: string | null) {
  if (!value) return "—";

  return parseISODateAsLocal(value).toLocaleDateString("es-PE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PrediccionesPage() {
  const { user } = useAuthContext();

  const [viewMode, setViewMode] = useState<ViewMode>("byDish");

  const [mlHealth, setMlHealth] = useState<MLServiceHealthDTO | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const [trainingFastMode, setTrainingFastMode] = useState(true);
  const [training, setTraining] = useState(false);
  const [trainingResult, setTrainingResult] =
    useState<MLTrainResponseDTO | null>(null);
  const [trainingMessage, setTrainingMessage] = useState<string | null>(null);
  const [trainingError, setTrainingError] = useState<string | null>(null);

  const [dishes, setDishes] = useState<DishDTO[]>([]);
  const [selectedDishId, setSelectedDishId] = useState<string>("");
  const [horizonWeeks, setHorizonWeeks] = useState<number>(4);
  const [predictions, setPredictions] = useState<
    MLServicePredictionDTO[] | null
  >(null);
  const [modelInfo, setModelInfo] = useState<MLModelInfoDTO | null>(null);

  const [loadingDishes, setLoadingDishes] = useState(false);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [loadingModelInfo, setLoadingModelInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dishIngredients, setDishIngredients] = useState<
    DishIngredientDTO[] | null
  >(null);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  const [weeklyPlan, setWeeklyPlan] =
    useState<WeeklyGlobalPredictionResponseDTO | null>(null);
  const [weeklyHorizon, setWeeklyHorizon] = useState<number>(1);
  const [loadingWeeklyPlan, setLoadingWeeklyPlan] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  const loadActiveModelInfo = useCallback(async () => {
    try {
      setLoadingModelInfo(true);

      const info = await getActiveMLModel();
      setModelInfo(info);
    } catch (e) {
      console.error("Error cargando info del modelo ML", e);
      setModelInfo(null);
    } finally {
      setLoadingModelInfo(false);
    }
  }, []);

  const loadMLHealth = useCallback(async () => {
    try {
      setLoadingHealth(true);

      const health = await getMLHealth();
      setMlHealth(health);
    } catch (e) {
      console.error("Error verificando servicio ML", e);
      setMlHealth({
        status: "unavailable",
        message: "No se pudo conectar con el servicio ML.",
      });
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  const loadDishes = useCallback(async () => {
    try {
      setLoadingDishes(true);
      setError(null);

      const data = await getDishes();
      setDishes((data ?? []).filter((dish) => dish.isActive !== false));
    } catch (e: any) {
      console.error("Error cargando platillos", e);
      setError(
        e?.message ??
          "No se pudieron cargar los platillos. Verifica permisos y el backend."
      );
    } finally {
      setLoadingDishes(false);
    }
  }, []);

  useEffect(() => {
    loadDishes();
    loadActiveModelInfo();
    loadMLHealth();
  }, [loadDishes, loadActiveModelInfo, loadMLHealth]);

  useEffect(() => {
    const loadIngredients = async () => {
      if (!selectedDishId) {
        setDishIngredients(null);
        return;
      }

      try {
        setLoadingIngredients(true);

        const dish = await getDishById(selectedDishId);
        setDishIngredients(dish.ingredients ?? []);
      } catch (e) {
        console.error("Error cargando ingredientes del platillo", e);
        setDishIngredients(null);
      } finally {
        setLoadingIngredients(false);
      }
    };

    loadIngredients();
  }, [selectedDishId]);

  const handleTrainModel = async () => {
    const confirmed = window.confirm(
      trainingFastMode
        ? "Se entrenará un nuevo modelo en modo rápido. ¿Deseas continuar?"
        : "Se entrenará un nuevo modelo completo. Puede tardar varios minutos. ¿Deseas continuar?"
    );

    if (!confirmed) return;

    try {
      setTraining(true);
      setTrainingError(null);
      setTrainingMessage(null);
      setTrainingResult(null);

      const response = await trainMLModel({
        fastMode: trainingFastMode,
        registerInDb: true,
        createdBy: user?.username ?? "admin",
      });

      if (!response.success) {
        setTrainingError(
          response.message ?? "No se pudo entrenar el modelo correctamente."
        );
        return;
      }

      setTrainingResult(response);
      setTrainingMessage(
        response.message ?? "Modelo entrenado y registrado correctamente."
      );

      await loadActiveModelInfo();
      await loadMLHealth();
    } catch (e: any) {
      console.error("Error entrenando modelo ML", e);
      setTrainingError(
        e?.message ??
          "Ocurrió un error durante el entrenamiento del modelo ML."
      );
    } finally {
      setTraining(false);
    }
  };

  const handleRequestPrediction = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedDishId) {
      setError("Selecciona un platillo antes de generar la predicción.");
      return;
    }

    try {
      setLoadingPrediction(true);
      setError(null);
      setPredictions(null);

      const resp: MLPredictionResponseDTO = await generatePredictions({
        dishId: selectedDishId,
        weeksAhead: horizonWeeks,
        saveToDb: true,
        createdBy: user?.username ?? "admin",
      });

      if (!resp.success) {
        setError(resp.message ?? "El servicio ML no pudo generar predicciones.");
        setPredictions(null);
        return;
      }

      setPredictions(resp.predictions ?? []);
    } catch (e: any) {
      console.error("Error generando predicción", e);
      setError(
        e?.message ??
          "Ocurrió un error al generar la predicción. Revisa el backend y el servicio ML."
      );
    } finally {
      setLoadingPrediction(false);
    }
  };

  const handleRequestWeeklyPlan = async (e: FormEvent) => {
    e.preventDefault();

    try {
      setLoadingWeeklyPlan(true);
      setWeeklyError(null);
      setWeeklyPlan(null);

      const resp = await getWeeklySupplyPlan(weeklyHorizon);

      setWeeklyPlan(resp);
    } catch (e: any) {
      console.error("Error obteniendo plan semanal global", e);
      setWeeklyError(
        e?.message ??
          "Ocurrió un error al obtener el plan semanal. Verifica el endpoint /ml-service/weekly-supply."
      );
    } finally {
      setLoadingWeeklyPlan(false);
    }
  };

  const chartData =
    predictions?.map((p) => ({
      date: p.weekStart ?? "",
      Predicción: toNumber(p.predictedDemand),
    })) ?? [];

  const selectedDish = dishes.find((d) => d.id === selectedDishId) || null;

  const totalPredicted = useMemo(
    () =>
      predictions?.reduce(
        (acc, p) => acc + toNumber(p.predictedDemand),
        0
      ) ?? 0,
    [predictions]
  );

  const ingredientTotals = useMemo(() => {
    if (
      !predictions ||
      predictions.length === 0 ||
      !dishIngredients ||
      dishIngredients.length === 0
    ) {
      return [];
    }

    const totalDemandUnits = totalPredicted;

    return dishIngredients.map((ing) => ({
      productId: ing.productId,
      productName: ing.productName ?? "Insumo",
      unit: getIngredientUnit(ing),
      perDish: toNumber(ing.quantityNeeded),
      totalQuantity: totalDemandUnits * toNumber(ing.quantityNeeded),
    }));
  }, [predictions, dishIngredients, totalPredicted]);

  const dominantConfidence = useMemo(() => {
    if (!predictions || predictions.length === 0) return null;

    const counts: Record<string, number> = {};

    for (const p of predictions) {
      const key = (p.confidence || "desconocida").toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [predictions]);

  const totalWeeklyDemand = useMemo(
    () =>
      weeklyPlan?.dishes?.reduce(
        (acc, d) => acc + toNumber(d.predictedDemand),
        0
      ) ?? 0,
    [weeklyPlan]
  );

  const suppliesNeedingPurchase = useMemo(
    () =>
      weeklyPlan?.supplies?.filter((s) => toNumber(s.quantityToBuy) > 0)
        .length ?? 0,
    [weeklyPlan]
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Sparkles className="h-3 w-3" />
            <span>Módulo de predicciones</span>
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            Predicción de demanda y abastecimiento
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Usa el modelo de Machine Learning para estimar la demanda de
            platillos por semana y convertirla en un plan de abastecimiento de
            insumos. Puedes trabajar por platillo o con una vista global de toda
            la carta para la próxima semana.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
          <LineChartIcon className="h-4 w-4 text-blue-600" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-slate-700">
              Servicio ML activo
            </span>
            <span className="truncate">
              {loadingModelInfo
                ? "Cargando info del modelo…"
                : modelInfo?.modelName || "Modelo no identificado"}
            </span>
          </div>
        </div>
      </header>

      <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs">
        <button
          type="button"
          onClick={() => setViewMode("byDish")}
          className={`rounded-full px-3 py-1 font-medium transition ${
            viewMode === "byDish"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Por platillo
        </button>

        <button
          type="button"
          onClick={() => setViewMode("weekly")}
          className={`rounded-full px-3 py-1 font-medium transition ${
            viewMode === "weekly"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Semana completa (global)
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <BrainCircuit className="h-5 w-5 text-blue-600" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Gestión del modelo predictivo
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Entrena o reentrena el modelo XGBoost usando los datos
                  históricos registrados en ventas.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                loadActiveModelInfo();
                loadMLHealth();
              }}
              disabled={loadingModelInfo || loadingHealth}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  loadingModelInfo || loadingHealth ? "animate-spin" : ""
                }`}
              />
              Actualizar
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] font-medium text-slate-500">
                Modelo activo
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                {modelInfo?.modelName ?? "—"}
              </p>
              <p className="text-[11px] text-slate-400">
                {modelInfo?.modelType ?? "Sin tipo registrado"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] font-medium text-slate-500">Versión</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                {modelInfo?.version ?? "—"}
              </p>
              <p className="text-[11px] text-slate-400">
                Último modelo registrado.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] font-medium text-slate-500">
                R² actual
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {modelInfo?.r2 != null
                  ? `${(modelInfo.r2 * 100).toFixed(1)}%`
                  : "—"}
              </p>
              <p className="text-[11px] text-slate-400">
                Desempeño registrado.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={trainingFastMode}
                onChange={(e) => setTrainingFastMode(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300"
                disabled={training}
              />
              Entrenamiento rápido
            </label>

            <button
              type="button"
              onClick={handleTrainModel}
              disabled={training}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {training ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BrainCircuit className="h-4 w-4" />
              )}
              {training ? "Entrenando modelo..." : "Entrenar modelo"}
            </button>
          </div>

          {(trainingMessage || trainingError) && (
            <div
              className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                trainingError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {trainingError ? (
                <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="mt-[2px] h-3.5 w-3.5" />
              )}
              <p>{trainingError ?? trainingMessage}</p>
            </div>
          )}

          {trainingResult && (
            <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3 text-[11px] text-slate-500">
              <p>
                <span className="font-medium text-slate-700">Modelo ID:</span>{" "}
                {trainingResult.modelId ?? "—"}
              </p>
              <p>
                <span className="font-medium text-slate-700">Versión:</span>{" "}
                {trainingResult.version ?? "—"}
              </p>
              <p>
                <span className="font-medium text-slate-700">Historial:</span>{" "}
                {trainingResult.trainingHistoryId ?? "—"}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                mlHealth?.status === "ok" || mlHealth?.status === "healthy"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-orange-50 text-orange-600"
              }`}
            >
              <Server className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Estado del servicio ML
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Verificación de comunicación entre Spring Boot y FastAPI.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-xs text-slate-600">
            <p>
              <span className="font-medium text-slate-800">Estado:</span>{" "}
              {loadingHealth ? "Verificando..." : mlHealth?.status ?? "—"}
            </p>

            <p>
              <span className="font-medium text-slate-800">Servicio:</span>{" "}
              {mlHealth?.service ?? "GestRest AI ML Service"}
            </p>

            <p>
              <span className="font-medium text-slate-800">Versión:</span>{" "}
              {mlHealth?.version ?? "—"}
            </p>

            <p className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
              {mlHealth?.message ??
                "El backend consultará /api/ml-service/health para verificar si FastAPI está disponible."}
            </p>
          </div>
        </div>
      </div>

      {viewMode === "byDish" && (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <form
              onSubmit={handleRequestPrediction}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <History className="h-4 w-4 text-slate-500" />
                Predicción semanal por platillo
              </h2>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Platillo
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                  value={selectedDishId}
                  onChange={(e) => setSelectedDishId(e.target.value)}
                  disabled={loadingDishes || loadingPrediction}
                >
                  <option value="">
                    {loadingDishes
                      ? "Cargando platillos…"
                      : "Selecciona un platillo…"}
                  </option>
                  {dishes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.category ? ` · ${d.category}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Datos obtenidos desde <code>/api/dishes</code>. En tu backend
                  actual este endpoint requiere rol <b>ADMIN</b>.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Horizonte de predicción (semanas)
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={horizonWeeks}
                  onChange={(e) =>
                    setHorizonWeeks(
                      Math.min(12, Math.max(1, Number(e.target.value) || 1))
                    )
                  }
                  className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                  disabled={loadingPrediction}
                />
                <p className="text-[11px] text-slate-400">
                  Se usa como parámetro <code>weeksAhead</code> en el endpoint
                  de predicción del servicio ML.
                </p>
              </div>

              <button
                type="submit"
                disabled={!selectedDishId || loadingPrediction || loadingDishes}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loadingPrediction ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    Generando predicción…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LineChartIcon className="h-4 w-4" />
                    Generar predicción
                  </span>
                )}
              </button>

              {error && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
                  <p>{error}</p>
                </div>
              )}
            </form>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Resumen de predicción y modelo
              </h2>

              {predictions && predictions.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-medium text-slate-500">
                      Demanda total estimada
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {totalPredicted.toFixed(0)} uds
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Suma de la demanda prevista en el horizonte.
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-medium text-slate-500">
                      Semanas pronosticadas
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {predictions.length}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Cada punto representa el inicio de semana.
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-medium text-slate-500">
                      Confianza dominante
                    </p>
                    <p className="mt-1 text-lg font-semibold capitalize text-slate-900">
                      {dominantConfidence ?? "—"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Etiquetas de confianza reportadas por el servicio ML.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Genera una predicción para ver el resumen de demanda
                  estimada.
                </p>
              )}

              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-700">
                  Modelo de Machine Learning activo
                </p>

                {modelInfo ? (
                  <div className="mt-1 grid grid-cols-1 gap-2 text-[11px] text-slate-500 sm:grid-cols-2">
                    <p>
                      <span className="font-medium">Modelo:</span>{" "}
                      {modelInfo.modelName ?? "—"}
                    </p>
                    <p>
                      <span className="font-medium">Tipo:</span>{" "}
                      {modelInfo.modelType ?? "—"}
                    </p>
                    <p>
                      <span className="font-medium">MAE:</span>{" "}
                      {modelInfo.mae != null ? modelInfo.mae.toFixed(2) : "—"}
                    </p>
                    <p>
                      <span className="font-medium">RMSE:</span>{" "}
                      {modelInfo.rmse != null ? modelInfo.rmse.toFixed(2) : "—"}
                    </p>
                    <p>
                      <span className="font-medium">R2:</span>{" "}
                      {modelInfo.r2 != null
                        ? `${(modelInfo.r2 * 100).toFixed(1)}%`
                        : "—"}
                    </p>
                    <p>
                      <span className="font-medium">Entrenado:</span>{" "}
                      {modelInfo.trainedAt ?? "—"}
                    </p>
                  </div>
                ) : loadingModelInfo ? (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Cargando información del modelo…
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-400">
                    No se pudo obtener la información del modelo activo.
                  </p>
                )}
              </div>

              {selectedDish && (
                <div className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                  <p>
                    Platillo seleccionado:{" "}
                    <span className="font-semibold text-slate-800">
                      {selectedDish.name}
                    </span>
                  </p>
                  {selectedDish.category && (
                    <p>Categoría: {selectedDish.category}</p>
                  )}
                </div>
              )}

              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-700">
                  Insumos requeridos para abastecer la demanda
                </p>

                {loadingIngredients && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Cargando ingredientes del platillo…
                  </p>
                )}

                {!loadingIngredients &&
                  predictions &&
                  predictions.length > 0 &&
                  ingredientTotals.length === 0 && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      No se encontraron ingredientes para este platillo.
                    </p>
                  )}

                {!loadingIngredients &&
                  predictions &&
                  predictions.length > 0 &&
                  ingredientTotals.length > 0 && (
                    <div className="mt-2 max-h-52 overflow-auto rounded-lg border border-slate-100">
                      <table className="min-w-full border-collapse text-[11px]">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="border-b border-slate-100 px-2 py-1 text-left font-medium text-slate-600">
                              Insumo
                            </th>
                            <th className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-600">
                              Por plato
                            </th>
                            <th className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-600">
                              Total requerido
                            </th>
                            <th className="border-b border-slate-100 px-2 py-1 text-left font-medium text-slate-600">
                              Unidad
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ingredientTotals.map((ing) => (
                            <tr key={ing.productId}>
                              <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                                {ing.productName}
                              </td>
                              <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                                {ing.perDish.toFixed(3)}
                              </td>
                              <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                                {ing.totalQuantity.toFixed(3)}
                              </td>
                              <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                                {ing.unit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                {!loadingIngredients &&
                  (!predictions || predictions.length === 0) && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Genera una predicción para ver los insumos requeridos.
                    </p>
                  )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Predicción de demanda semanal
                </h2>
                <p className="text-xs text-slate-500">
                  Cada punto representa la demanda esperada de un platillo para
                  la semana que inicia en la fecha mostrada en el eje X.
                </p>
              </div>
            </div>

            {loadingPrediction && (
              <div className="flex min-h-[220px] items-center justify-center text-xs text-slate-500">
                Generando predicción…
              </div>
            )}

            {!loadingPrediction && (!predictions || predictions.length === 0) && (
              <div className="flex min-h-[220px] items-center justify-center text-xs text-slate-500">
                Aún no hay datos. Genera una predicción para visualizar la
                serie.
              </div>
            )}

            {!loadingPrediction && predictions && predictions.length > 0 && (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: 4, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={formatDateLabel}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      labelFormatter={formatDateTooltip}
                      formatter={(value) => [
                        `${Number(value).toFixed(0)} uds`,
                        "Predicción",
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="Predicción"
                      stroke="#2563eb"
                      strokeWidth={2.2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {viewMode === "weekly" && (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <form
              onSubmit={handleRequestWeeklyPlan}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <History className="h-4 w-4 text-slate-500" />
                Planificación de abastecimiento semanal (global)
              </h2>

              <p className="text-xs text-slate-500">
                El sistema consultará el modelo de ML para{" "}
                <b>todos los platillos activos</b> y consolidará los insumos
                necesarios para abastecer la demanda de la semana objetivo.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Semanas hacia adelante
                </label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={weeklyHorizon}
                  onChange={(e) =>
                    setWeeklyHorizon(
                      Math.min(4, Math.max(1, Number(e.target.value) || 1))
                    )
                  }
                  className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-1"
                  disabled={loadingWeeklyPlan}
                />
                <p className="text-[11px] text-slate-400">
                  Se usa como parámetro <code>weeksAhead</code> en{" "}
                  <code>/ml-service/weekly-supply</code>. Para el MVP, lo más
                  común será 1 semana.
                </p>
              </div>

              <button
                type="submit"
                disabled={loadingWeeklyPlan}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loadingWeeklyPlan ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                    Generando plan semanal…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LineChartIcon className="h-4 w-4" />
                    Generar plan semanal global
                  </span>
                )}
              </button>

              {weeklyError && (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="mt-[2px] h-3.5 w-3.5" />
                  <p>{weeklyError}</p>
                </div>
              )}
            </form>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900">
                Resumen del plan semanal
              </h2>

              {loadingWeeklyPlan && (
                <p className="text-xs text-slate-500">
                  Generando plan semanal global…
                </p>
              )}

              {!loadingWeeklyPlan && !weeklyPlan && (
                <p className="text-xs text-slate-500">
                  Genera un plan semanal para ver las predicciones agregadas por
                  platillo e insumos.
                </p>
              )}

              {weeklyPlan && (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-medium text-slate-500">
                        Semana objetivo
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatWeekDate(weeklyPlan.weekStart)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Corresponde al inicio de la semana pronosticada.
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-medium text-slate-500">
                        Demanda total estimada
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {totalWeeklyDemand.toFixed(0)} platos
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Suma de la demanda pronosticada para todos los
                        platillos.
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[11px] font-medium text-slate-500">
                        Insumos a comprar
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {suppliesNeedingPurchase}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Número de insumos cuya cantidad a comprar es mayor que
                        0.
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-500">
                    Usa esta vista como <b>planner de compras semanales</b>:
                    compara el requerido semanal con tu stock actual y enfócate
                    en los insumos con mayor <b>cantidad a comprar</b>.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Predicciones por platillo
              </h3>
              <p className="text-xs text-slate-500">
                Listado de todos los platillos con su demanda pronosticada para
                la semana objetivo.
              </p>

              {loadingWeeklyPlan && (
                <div className="mt-3 text-xs text-slate-500">
                  Generando plan semanal global…
                </div>
              )}

              {!loadingWeeklyPlan &&
                (!weeklyPlan || (weeklyPlan.dishes?.length ?? 0) === 0) && (
                  <div className="mt-3 text-xs text-slate-500">
                    No hay predicciones disponibles. Genera un plan semanal para
                    ver los datos.
                  </div>
                )}

              {weeklyPlan && (weeklyPlan.dishes?.length ?? 0) > 0 && (
                <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-100">
                  <table className="min-w-full border-collapse text-[11px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="border-b border-slate-100 px-2 py-1 text-left font-medium text-slate-600">
                          Platillo
                        </th>
                        <th className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-600">
                          Demanda
                        </th>
                        <th className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-600">
                          Confianza
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyPlan.dishes?.map((d) => (
                        <tr key={d.dishId}>
                          <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                            {d.dishName}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                            {toNumber(d.predictedDemand).toFixed(2)}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                            {d.confidence}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Insumos consolidados para la semana
              </h3>
              <p className="text-xs text-slate-500">
                Total requerido, stock disponible y cantidad a comprar por cada
                insumo.
              </p>

              {loadingWeeklyPlan && (
                <div className="mt-3 text-xs text-slate-500">
                  Generando plan semanal global…
                </div>
              )}

              {!loadingWeeklyPlan &&
                (!weeklyPlan || (weeklyPlan.supplies?.length ?? 0) === 0) && (
                  <div className="mt-3 text-xs text-slate-500">
                    No hay insumos calculados. Genera un plan semanal para ver
                    los datos.
                  </div>
                )}

              {weeklyPlan && (weeklyPlan.supplies?.length ?? 0) > 0 && (
                <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-100">
                  <table className="min-w-full border-collapse text-[11px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="border-b border-slate-100 px-2 py-1 text-left font-medium text-slate-600">
                          Insumo
                        </th>
                        <th className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-600">
                          Req. total
                        </th>
                        <th className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-600">
                          Stock disp.
                        </th>
                        <th className="border-b border-slate-100 px-2 py-1 text-right font-medium text-slate-600">
                          Comprar
                        </th>
                        <th className="border-b border-slate-100 px-2 py-1 text-left font-medium text-slate-600">
                          Unidad
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyPlan.supplies?.map((s) => (
                        <tr key={s.productId}>
                          <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                            {s.productName}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                            {toNumber(s.totalRequired).toFixed(3)}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-1 text-right text-slate-700">
                            {toNumber(s.availableStock).toFixed(3)}
                          </td>
                          <td
                            className={`border-b border-slate-100 px-2 py-1 text-right font-semibold ${
                              toNumber(s.quantityToBuy) > 0
                                ? "text-emerald-700"
                                : "text-slate-500"
                            }`}
                          >
                            {toNumber(s.quantityToBuy).toFixed(3)}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-1 text-slate-700">
                            {s.unitMeasure}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}