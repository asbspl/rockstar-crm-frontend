import SummaryCard from "./SummaryCard";
import type { DashboardSummary } from "../types/dashboard.types";

const metricDefinitions = [
  { key: "companies", label: "Total Companies", icon: "🏢", helper: "Business entities" },
  { key: "employees", label: "Total Employees", icon: "👥", helper: "Workforce" },
  { key: "drivers", label: "Total Drivers", icon: "🚚", helper: "Fleet" },
  { key: "contractors", label: "Total Contractors", icon: "🛠️", helper: "Service partners" },
  { key: "clients", label: "Total Clients", icon: "🏛️", helper: "Accounts" },
  { key: "customers", label: "Total Customers", icon: "🤝", helper: "End users" },
  { key: "sites", label: "Total Sites", icon: "📍", helper: "Locations" },
  { key: "quotations", label: "Total Quotations", icon: "📄", helper: "Proposals" },
  { key: "orders", label: "Total Orders", icon: "📦", helper: "Sales pipeline" },
  { key: "visits", label: "Total Visits", icon: "🚶", helper: "On-site checks" },
  { key: "queries", label: "Total Queries", icon: "❓", helper: "Support requests" },
] as const;

interface DashboardSummaryGridProps {
  summary: DashboardSummary;
}

function DashboardSummaryGrid({ summary }: DashboardSummaryGridProps) {
  return (
    <section className="dashboard-summary-grid" aria-label="Dashboard summary metrics">
      {metricDefinitions.map(({ key, label, icon, helper }) => (
        <SummaryCard
          key={key}
          title={label}
          value={summary[key]}
          icon={icon}
          helper={helper}
        />
      ))}
    </section>
  );
}

export default DashboardSummaryGrid;
