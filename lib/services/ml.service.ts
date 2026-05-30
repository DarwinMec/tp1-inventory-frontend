// lib/services/ml.service.ts

import { apiFetch } from "@/lib/apiClient";
import type {
  MLModelInfoDTO,
  MLPredictionRequestDTO,
  MLPredictionResponseDTO,
  MLServiceHealthDTO,
  MLTrainRequestDTO,
  MLTrainResponseDTO,
  WeeklyGlobalPredictionResponseDTO,
} from "@/lib/backend-types";

export function getMLHealth() {
  return apiFetch<MLServiceHealthDTO>("/ml-service/health");
}

export function getActiveMLModel() {
  return apiFetch<MLModelInfoDTO>("/ml-service/model/active");
}

export function trainMLModel(payload: MLTrainRequestDTO) {
  return apiFetch<MLTrainResponseDTO>("/ml-service/train", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function generatePredictions(payload: MLPredictionRequestDTO) {
  return apiFetch<MLPredictionResponseDTO>("/ml-service/predict", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function syncPredictions(weeks = 4) {
  return apiFetch<MLPredictionResponseDTO>(`/ml-service/sync?weeks=${weeks}`, {
    method: "POST",
  });
}

export function getWeeklySupplyPlan(weeksAhead = 1) {
  return apiFetch<WeeklyGlobalPredictionResponseDTO>(
    `/ml-service/weekly-supply?weeksAhead=${weeksAhead}`
  );
}