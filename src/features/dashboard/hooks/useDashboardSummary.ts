import { useCallback, useEffect, useState } from "react";
import { getDashboardSummary } from "../api/dashboard.api";
import type { DashboardSummary } from "../types/dashboard.types";

export function useDashboardSummary() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSummary = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const data = await getDashboardSummary();
      setSummary(data);
      setLastUpdated(new Date());
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load dashboard summary at the moment.";

      setError(message);
      setSummary(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refetch: fetchSummary,
  };
}
