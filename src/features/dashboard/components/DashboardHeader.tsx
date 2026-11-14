import { RefreshCw } from "lucide-react";
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
  return (
    <header className="dashboard-header">
      <div className="dashboard-header-main">
        <div className="dashboard-heading">
          <h1 className="dashboard-title">{title}</h1>
          <p className="dashboard-subtitle">{subtitle}</p>
        </div>

        <div className="dashboard-header-right">
          <div className="dashboard-header-tools">
            <span className="dashboard-date-text">
              {formatDate(new Date())}
            </span>

            <button
              type="button"
              className="dashboard-refresh-button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh dashboard summary"
            >
              <RefreshCw
                size={15}
                className={isRefreshing ? "refresh-spinning" : ""}
              />
              {isRefreshing ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>

          {lastUpdated && (
            <div className="dashboard-last-updated">
              Last synced:{" "}
              {new Date(lastUpdated).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;