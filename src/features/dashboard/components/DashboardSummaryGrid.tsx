import {
  Building2,
  Users,
  Car,
  Wrench,
  Handshake,
  UserRound,
  MapPin,
  FileText,
  FileCheck2,
  Eye,
  MessageCircle,
} from "lucide-react";

import SummaryCard from "./SummaryCard";
import type { DashboardSummary } from "../types/dashboard.types";

const metricDefinitions = [
  { key: "companies", label: "Total Companies", icon: Building2 },
  { key: "employees", label: "Total Employees", icon: Users },
  { key: "drivers", label: "Total Drivers", icon: Car },
  { key: "contractors", label: "Total Contractors", icon: Wrench },
  { key: "clients", label: "Total Clients", icon: Handshake },
  { key: "customers", label: "Total Customers", icon: UserRound },
  { key: "sites", label: "Total Sites", icon: MapPin },
  { key: "quotations", label: "Total Quotations", icon: FileText },
  { key: "orders", label: "Total Orders", icon: FileCheck2 },
  { key: "visits", label: "Total Visits", icon: Eye },
  { key: "queries", label: "Total Queries", icon: MessageCircle },
] as const;

interface DashboardSummaryGridProps {
  summary: DashboardSummary;
}

function DashboardSummaryGrid({ summary }: DashboardSummaryGridProps) {
  return (
    <section
      className="dashboard-summary-grid"
      aria-label="Dashboard summary metrics"
    >
      {metricDefinitions.map(({ key, label, icon: Icon }) => (
        <SummaryCard
          key={key}
          title={label}
          value={summary[key]}
          icon={<Icon size={20} strokeWidth={1.6} />}
        />
      ))}
    </section>
  );
}

export default DashboardSummaryGrid;