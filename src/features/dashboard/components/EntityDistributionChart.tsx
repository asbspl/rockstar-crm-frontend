import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { DashboardSummary } from "../types/dashboard.types";

const ENTITY_COLORS = ["#1f3a5f", "#2b6cb0", "#3a86ff", "#7cb8ff", "#5b6c7a", "#9bb7d4"];

const formatTooltipValue = (
  value: number | string | ReadonlyArray<number | string> | undefined,
) => {
  const numericValue = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);

  return [new Intl.NumberFormat().format(numericValue), "Count"] as [string, string];
};

interface EntityDistributionChartProps {
  summary: DashboardSummary | null;
}

function EntityDistributionChart({ summary }: EntityDistributionChartProps) {
  if (!summary) {
    return <div className="chart-empty">Waiting for entity data…</div>;
  }

  const entityData = [
    { name: "Companies", value: summary.companies },
    { name: "Employees", value: summary.employees },
    { name: "Drivers", value: summary.drivers },
    { name: "Contractors", value: summary.contractors },
    { name: "Clients", value: summary.clients },
    { name: "Customers", value: summary.customers },
  ].filter((item) => item.value > 0);

  if (!entityData.length) {
    return <div className="chart-empty">No entity counts are available yet.</div>;
  }

  return (
    <div className="chart-surface">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={entityData}
            nameKey="name"
            dataKey="value"
            innerRadius={48}
            outerRadius={82}
            paddingAngle={2}
            stroke="#f8fafc"
            strokeWidth={2}
            labelLine={false}
          >
            {entityData.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={ENTITY_COLORS[index % ENTITY_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={formatTooltipValue} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default EntityDistributionChart;
