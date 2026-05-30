// lib/services/alerts.service.ts

import { apiFetch } from "@/lib/apiClient";
import type { AlertDTO } from "@/lib/backend-types";

export type AlertQuery = {
  unreadOnly?: boolean;
  unresolvedOnly?: boolean;
};

function buildAlertQuery(query?: AlertQuery) {
  const params = new URLSearchParams();

  if (query?.unreadOnly) {
    params.set("unreadOnly", "true");
  }

  if (query?.unresolvedOnly) {
    params.set("unresolvedOnly", "true");
  }

  const queryString = params.toString();

  return queryString ? `/alerts?${queryString}` : "/alerts";
}

export function getAlerts(query?: AlertQuery) {
  return apiFetch<AlertDTO[]>(buildAlertQuery(query));
}

export function getUnreadAlerts() {
  return getAlerts({ unreadOnly: true });
}

export function getUnresolvedAlerts() {
  return getAlerts({ unresolvedOnly: true });
}

export function markAlertAsRead(alertId: string) {
  return apiFetch<AlertDTO>(`/alerts/${alertId}/read`, {
    method: "POST",
  });
}

export function resolveAlert(alertId: string) {
  return apiFetch<AlertDTO>(`/alerts/${alertId}/resolve`, {
    method: "POST",
  });
}