import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardSummary } from "../types/dashboard.types";

const formatTooltipValue = (
  value: number | string | ReadonlyArray<number | string> | undefined,
) => {
  const numericValue = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);

  return [new Intl.NumberFormat().format(numericValue), "Count"] as [string, string];
};

interface OperationsBarChartProps {
  summary: DashboardSummary | null;
}

function OperationsBarChart({ summary }: OperationsBarChartProps) {
  if (!summary) {
    return <div className="chart-empty">Waiting for operational data…</div>;
  }

  const operationsData = [
    { name: "Sites", value: summary.sites },
    { name: "Quotations", value: summary.quotations },
    { name: "Orders", value: summary.orders },
    { name: "Visits", value: summary.visits },
    { name: "Queries", value: summary.queries },
  ].filter((item) => item.value > 0);

  if (!operationsData.length) {
    return <div className="chart-empty">No operational counts are available yet.</div>;
  }

  return (
    <div className="chart-surface">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={operationsData} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip formatter={formatTooltipValue} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#2b6cb0" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default OperationsBarChart;
