export const DASHBOARD_METRICS = [
  "companies",
  "employees",
  "drivers",
  "contractors",
  "clients",
  "customers",
  "sites",
  "quotations",
  "orders",
  "visits",
  "queries",
] as const;

export type DashboardMetricKey = (typeof DASHBOARD_METRICS)[number];

export interface DashboardSummary {
  companies: number;
  employees: number;
  drivers: number;
  contractors: number;
  clients: number;
  customers: number;
  sites: number;
  quotations: number;
  orders: number;
  visits: number;
  queries: number;
}

export interface DashboardSummaryResponse {
  success?: boolean;
  message?: string;
  data?: Partial<DashboardSummary> | DashboardSummary | null;
}

export function isDashboardSummary(value: unknown): value is DashboardSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return DASHBOARD_METRICS.every(
    (metric) => typeof candidate[metric] === "number" && Number.isFinite(candidate[metric]),
  );
}
