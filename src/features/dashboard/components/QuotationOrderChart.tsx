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

interface QuotationOrderChartProps {
  summary: DashboardSummary | null;
}

function QuotationOrderChart({ summary }: QuotationOrderChartProps) {
  if (!summary) {
    return <div className="chart-empty">Waiting for quotation and order totals…</div>;
  }

  const comparisonData = [
    { name: "Quotations", value: summary.quotations },
    { name: "Orders", value: summary.orders },
  ];

  if (comparisonData.every((item) => item.value === 0)) {
    return <div className="chart-empty">Quotation and order totals are not available yet.</div>;
  }

  return (
    <div className="chart-surface">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={comparisonData} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip formatter={formatTooltipValue} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#0f766e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default QuotationOrderChart;
