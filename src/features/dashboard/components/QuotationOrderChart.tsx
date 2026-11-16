import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardSummary } from "../types/dashboard.types";

const formatTooltipValue = (
  value: number | string | ReadonlyArray<number | string> | undefined,
) => {
  const numericValue = Array.isArray(value)
    ? Number(value[0] ?? 0)
    : Number(value ?? 0);

  return [new Intl.NumberFormat().format(numericValue), "Total"];
};

interface QuotationOrderChartProps {
  summary: DashboardSummary | null;
}

function QuotationOrderChart({ summary }: QuotationOrderChartProps) {
  if (!summary) {
    return (
      <div className="chart-empty">
        Waiting for quotation and order totals...
      </div>
    );
  }

  const comparisonData = [
    { name: `Total Quotations (${summary.quotations})`, value: summary.quotations },
    { name: `Total Orders (${summary.orders})`, value: summary.orders },
  ];

  if (comparisonData.every((item) => item.value === 0)) {
    return (
      <div className="chart-empty">
        Quotation and order totals are not available yet.
      </div>
    );
  }

  return (
    <div className="chart-surface">
      <div className="qo-custom-legend">
        <span>
          <i style={{ background: "#2E62D6" }} />
          Total Quotations ({summary.quotations})
        </span>
        <span>
          <i style={{ background: "#D7BC8D" }} />
          Total Orders ({summary.orders})
        </span>
      </div>

      <ResponsiveContainer width="100%" height={215}>
        <BarChart
          data={comparisonData}
          margin={{ top: 20, right: 16, left: -20, bottom: 5 }}
          barGap={24}
        >
          <CartesianGrid
            stroke="rgba(148, 163, 184, 0.12)"
            vertical={false}
          />

          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.25)" }}
            tick={{ fill: "#cbd5e1", fontSize: 11 }}
            dy={8}
          />

          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.25)" }}
            tick={{ fill: "#8896ab", fontSize: 11 }}
          />

          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            formatter={formatTooltipValue}
            contentStyle={{
              backgroundColor: "#141d33",
              borderRadius: "8px",
              border: "1px solid #354363",
              color: "#f1f5f9",
              fontSize: "12px",
            }}
            itemStyle={{ color: "#f1f5f9" }}
          />

          <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={58}>
            <Cell fill="#2E62D6" />
            <Cell fill="#D7BC8D" />
            <LabelList
              dataKey="value"
              position="top"
              fill="#e2e8f0"
              fontSize={12}
              fontWeight={600}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default QuotationOrderChart;