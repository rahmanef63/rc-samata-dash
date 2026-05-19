"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_AXIS_COLOR, CHART_GRID_COLOR } from "@/shared/constants";

export type LineSeries = {
  dataKey: string;
  name: string;
  color: string;
  strokeDasharray?: string;
};

export type ReferenceMark = {
  y: number;
  label: string;
  color: string;
  strokeDasharray?: string;
};

interface MultiLineChartProps {
  data: Record<string, number | string>[];
  series: LineSeries[];
  height?: number;
  xKey?: string;
  yFormatter?: (n: number) => string;
  tooltipFormatter?: (value: number, name: string) => string;
  references?: ReferenceMark[];
  showLegend?: boolean;
}

export function MultiLineChart({
  data,
  series,
  height = 240,
  xKey = "label",
  yFormatter,
  tooltipFormatter,
  references = [],
  showLegend = true,
}: MultiLineChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis dataKey={xKey} tick={{ fontSize: 10 }} stroke={CHART_AXIS_COLOR} />
          <YAxis
            tick={{ fontSize: 10 }}
            stroke={CHART_AXIS_COLOR}
            tickFormatter={yFormatter}
            width={56}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_GRID_COLOR}` }}
            formatter={(value: number, name: string) => [
              tooltipFormatter ? tooltipFormatter(value, name) : (yFormatter ? yFormatter(value) : value),
              name,
            ]}
          />
          {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />}
          {references.map((ref, i) => (
            <ReferenceLine
              key={i}
              y={ref.y}
              stroke={ref.color}
              strokeDasharray={ref.strokeDasharray ?? "4 4"}
              label={{
                value: ref.label,
                position: "right",
                fill: ref.color,
                fontSize: 10,
              }}
            />
          ))}
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.strokeDasharray}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
