import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { DashboardSummary } from "../types/dashboard.types";

const ENTITY_COLORS = [
  "#2B62D6", // Customers - Royal Blue
  "#2F5B9E", // Drivers - Steel Blue
  "#6885AB", // Clients - Slate Blue
  "#616F89", // Contractors - Muted Slate
  "#434C78", // Employees - Deep Indigo
  "#323A66", // Companies - Dark Navy
];

const formatTooltipValue = (
  value: number | string | ReadonlyArray<number | string> | undefined,
) => {
  const numericValue = Array.isArray(value)
    ? Number(value[0] ?? 0)
    : Number(value ?? 0);

  return [new Intl.NumberFormat().format(numericValue), "Total"];
};

interface EntityDistributionChartProps {
  summary: DashboardSummary | null;
}

function EntityDistributionChart({
  summary,
}: EntityDistributionChartProps) {
  if (!summary) {
    return <div className="chart-empty">Waiting for entity data...</div>;
  }

  const allEntities = [
    { name: "Customers", value: summary.customers, color: ENTITY_COLORS[0] },
    { name: "Drivers", value: summary.drivers, color: ENTITY_COLORS[1] },
    { name: "Clients", value: summary.clients, color: ENTITY_COLORS[2] },
    { name: "Contractors", value: summary.contractors, color: ENTITY_COLORS[3] },
    { name: "Employees", value: summary.employees, color: ENTITY_COLORS[4] },
    { name: "Companies", value: summary.companies, color: ENTITY_COLORS[5] },
  ];

  const entityData = allEntities.filter((item) => item.value > 0);
  const totalEntities = entityData.reduce((acc, cur) => acc + cur.value, 0);

  if (!entityData.length) {
    return (
      <div className="chart-empty">
        No entity counts are available yet.
      </div>
    );
  }

  return (
    <div className="entity-chart-layout">
      <div className="entity-donut-wrapper">
        <ResponsiveContainer width="100%" height={235}>
          <PieChart>
            <Pie
              data={entityData}
              nameKey="name"
              dataKey="value"
              innerRadius={54}
              outerRadius={92}
              paddingAngle={1.5}
              stroke="#121c33"
              strokeWidth={2}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return (
                  <text
                    x={x}
                    y={y}
                    fill="#ffffff"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={11}
                    fontWeight={600}
                  >
                    {value}
                  </text>
                );
              }}
              labelLine={false}
            >
              {entityData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={entry.color} />
              ))}
            </Pie>

            <Tooltip
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
          </PieChart>
        </ResponsiveContainer>

        <div className="entity-donut-center">
          <span>{new Intl.NumberFormat().format(totalEntities)}</span>
        </div>
      </div>

      <div className="entity-legend-table">
        <div className="entity-legend-header">
          <span>Entity</span>
          <span>Count</span>
        </div>
        <div className="entity-legend-rows">
          {allEntities.map((item) => (
            <div key={item.name} className="entity-legend-row">
              <div className="entity-legend-name">
                <span
                  className="entity-legend-dot"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name}</span>
              </div>
              <span className="entity-legend-count">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EntityDistributionChart;