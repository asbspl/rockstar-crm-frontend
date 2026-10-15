import api from "../../../api/client";
import {
  DASHBOARD_METRICS,
  isDashboardSummary,
  type DashboardSummary,
  type DashboardSummaryResponse,
} from "../types/dashboard.types";

function getDataEnvelope(responseData: unknown): unknown {
  if (!responseData || typeof responseData !== "object") {
    return responseData;
  }

  const payload = responseData as DashboardSummaryResponse;
  const data = payload.data;

  return payload && "data" in payload ? data : responseData;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (!import.meta.env.VITE_API_BASE_URL) {
    throw new Error(
      "The dashboard API base URL is not configured. Set VITE_API_BASE_URL before loading the dashboard.",
    );
  }

  const response = await api.get<DashboardSummaryResponse | DashboardSummary>(
    "/api/dashboard/summary",
  );

  const payload = getDataEnvelope(response.data);

  if (!isDashboardSummary(payload)) {
    const message =
      (response.data && typeof response.data === "object" && "message" in response.data
        ? response.data.message
        : undefined) ?? "Dashboard summary response is missing required metrics.";

    throw new Error(message);
  }

  const normalized: DashboardSummary = {
    companies: 0,
    employees: 0,
    drivers: 0,
    contractors: 0,
    clients: 0,
    customers: 0,
    sites: 0,
    quotations: 0,
    orders: 0,
    visits: 0,
    queries: 0,
  };

  for (const key of DASHBOARD_METRICS) {
    const rawValue = payload[key];
    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue)) {
      throw new Error(`Invalid dashboard metric for ${key}.`);
    }

    normalized[key] = numericValue;
  }

  return normalized;
}
