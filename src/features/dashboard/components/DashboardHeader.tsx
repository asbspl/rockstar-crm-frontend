
import { useEffect } from "react";
import { formatDate } from "../../../lib/date";
import "../styles/DashboardHeader.css";

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

function DashboardHeader({
  title,
  subtitle,
  isRefreshing,
  lastUpdated,
  onRefresh,
}: DashboardHeaderProps) {
  useEffect(() => {
    // Dashboard header initialization, if needed.
  }, []);

  return (
    <header className="dashboard-header">
      <div className="dashboard-header-main">
        <div>
          <p className="dashboard-eyebrow">Operations overview</p>
          <h1 className="dashboard-title">{title}</h1>
          <p className="dashboard-subtitle">{subtitle}</p>
        </div>

        <div className="dashboard-header-tools">
          <div className="dashboard-date-chip" aria-live="polite">
            <span className="dashboard-date-label">Today</span>
            <strong>{formatDate(new Date())}</strong>
          </div>

          <button
            type="button"
            className="dashboard-refresh-button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh dashboard summary"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {lastUpdated && (
        <p className="dashboard-last-updated">
          Last updated: {formatDate(lastUpdated)}{" "}
          {new Date(lastUpdated).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </header>
  );
}

export default DashboardHeader;
