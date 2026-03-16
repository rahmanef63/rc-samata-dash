import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from "recharts";
import { formatRp } from "@/shared/lib";
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

export function WaterfallChart({ data, title, subtitle, height = 220, headerRight }: WaterfallChartProps) {
  // Transform data for waterfall: each bar needs a base (invisible) + visible part
  let cumulative = 0;
  const chartData = data.map((item, i) => {
    const isTotal = i === data.length - 1;
    const base = isTotal ? 0 : Math.min(cumulative, cumulative + item.value);
    const barValue = isTotal ? item.value : Math.abs(item.value);
    if (!isTotal) cumulative += item.value;
    return {
      name: item.name,
      base,
      bar: barValue,
      rawValue: item.value,
      isPositive: item.value >= 0,
      isTotal,
    };
  });

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
          <BarChart data={chartData} barCategoryGap="20%">
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke={CHART_AXIS_COLOR} />
            <YAxis tickFormatter={formatRp} tick={{ fontSize: 10 }} stroke={CHART_AXIS_COLOR} />
            <Tooltip
              formatter={(value: number, name: string, props: any) => {
                const raw = props.payload.rawValue;
                return [`Rp ${(Math.abs(raw) / 1000000).toFixed(1)}M`, raw >= 0 ? "Inflow" : "Outflow"];
              }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_GRID_COLOR}` }}
            />
            <ReferenceLine y={0} stroke={CHART_GRID_COLOR} />
            {/* Invisible base */}
            <Bar dataKey="base" stackId="waterfall" fill="transparent" />
            {/* Visible bar */}
            <Bar dataKey="bar" stackId="waterfall" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.isTotal
                      ? "hsl(var(--info))"
                      : entry.isPositive
                      ? "hsl(var(--success))"
                      : "hsl(var(--destructive))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
