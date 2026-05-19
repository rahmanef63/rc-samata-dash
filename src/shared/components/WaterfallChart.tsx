import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine, LabelList } from "recharts";
import { formatRp, formatRpFull } from "@/shared/lib";
import { CHART_AXIS_COLOR, CHART_GRID_COLOR } from "@/shared/constants";

interface WaterfallItem {
  name: string;
  value: number;
}

interface WaterfallChartProps {
  data: WaterfallItem[];
  title: string;
  subtitle?: string;
  height?: number;
  headerRight?: React.ReactNode;
}

const POSITIVE_COLOR = "#10b981";
const NEGATIVE_COLOR = "#ef4444";

export function WaterfallChart({ data, title, subtitle, height = 220, headerRight }: WaterfallChartProps) {
  // Signed bars (positive up, negative down) — simpler than stacked waterfall
  // and renders correctly with zero ReferenceLine in middle of axis.
  const chartData = data.map((item, index) => ({
    name: item.name,
    value: item.value,
    isTotal: index === data.length - 1,
  }));

  return (
    <div className="bg-card rounded-xl shadow-card p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {headerRight}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="20%" margin={{ top: 20, right: 8, bottom: 8, left: 8 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke={CHART_AXIS_COLOR} />
            <YAxis tickFormatter={formatRp} tick={{ fontSize: 10 }} stroke={CHART_AXIS_COLOR} />
            <Tooltip
              formatter={(value: number, _name: string, props: { payload?: { isTotal?: boolean } }) => [
                formatRpFull(value),
                props.payload?.isTotal ? "Total Bersih" : value >= 0 ? "Arus Masuk" : "Arus Keluar",
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_GRID_COLOR}` }}
            />
            <ReferenceLine y={0} stroke={CHART_AXIS_COLOR} strokeWidth={1.5} />
            <Bar dataKey="value" radius={[4, 4, 4, 4]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.value >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR}
                />
              ))}
              <LabelList
                dataKey="value"
                content={(props: { x?: number | string; y?: number | string; width?: number | string; height?: number | string; value?: unknown }) => {
                  const v = typeof props.value === "number" ? props.value : Number(props.value ?? 0);
                  const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2;
                  // Positive: label above bar top. Negative: label below bar bottom.
                  const y = v >= 0
                    ? Number(props.y ?? 0) - 4
                    : Number(props.y ?? 0) + Number(props.height ?? 0) + 12;
                  return (
                    <text
                      x={x}
                      y={y}
                      fontSize={10}
                      fontWeight={600}
                      textAnchor="middle"
                      fill={v >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR}
                    >
                      {formatRpFull(v)}
                    </text>
                  );
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
