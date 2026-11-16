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

interface OperationsBarChartProps {
  summary: DashboardSummary | null;
}

function OperationsBarChart({ summary }: OperationsBarChartProps) {
  if (!summary) {
    return <div className="chart-empty">Waiting for operational data...</div>;
  }

  const operationsData = [
    { name: "Sites", value: summary.sites, fill: "url(#opBlueGrad)" },
    { name: "Quotations", value: summary.quotations, fill: "url(#opSlateGrad)" },
    { name: "Orders", value: summary.orders, fill: "url(#opGoldGrad)" },
    { name: "Visits", value: summary.visits, fill: "url(#opBlueGrad)" },
    { name: "Queries", value: summary.queries, fill: "url(#opSlateGrad)" },
  ].filter((item) => item.value > 0);

  if (!operationsData.length) {
    return (
      <div className="chart-empty">
        No operational counts are available yet.
      </div>
    );
  }

  return (
    <div className="chart-surface">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={operationsData}
          margin={{ top: 22, right: 12, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="opBlueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B6EE8" stopOpacity={1} />
              <stop offset="100%" stopColor="#1D336B" stopOpacity={0.85} />
            </linearGradient>
            <linearGradient id="opSlateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94A7C4" stopOpacity={1} />
              <stop offset="100%" stopColor="#3A4C6B" stopOpacity={0.85} />
            </linearGradient>
            <linearGradient id="opGoldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#DFC69B" stopOpacity={1} />
              <stop offset="100%" stopColor="#5C5243" stopOpacity={0.85} />
            </linearGradient>
          </defs>

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

          <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={46}>
            {operationsData.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.fill} />
            ))}
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

export default OperationsBarChart;