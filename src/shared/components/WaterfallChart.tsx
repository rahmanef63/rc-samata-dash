import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from "recharts";
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

interface WaterfallChartDatum {
  name: string;
  base: number;
  bar: number;
  rawValue: number;
  isPositive: boolean;
  isTotal: boolean;
}

export function WaterfallChart({ data, title, subtitle, height = 220, headerRight }: WaterfallChartProps) {
  const { items: chartData } = data.reduce<{
    items: WaterfallChartDatum[];
    cumulative: number;
  }>(
    (state, item, index) => {
      const isTotal = index === data.length - 1;
      const base = isTotal ? 0 : Math.min(state.cumulative, state.cumulative + item.value);
      const barValue = isTotal ? item.value : Math.abs(item.value);
      const nextCumulative = isTotal ? state.cumulative : state.cumulative + item.value;

      state.items.push({
        name: item.name,
        base,
        bar: barValue,
        rawValue: item.value,
        isPositive: item.value >= 0,
        isTotal,
      });

      return {
        items: state.items,
        cumulative: nextCumulative,
      };
    },
    { items: [], cumulative: 0 },
  );

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
              formatter={(_value: number, _name: string, props: { payload?: WaterfallChartDatum }) => {
                const raw = props.payload?.rawValue ?? 0;
                return [
                  formatRpFull(raw),
                  props.payload?.isTotal ? "Total Bersih" : raw >= 0 ? "Arus Masuk" : "Arus Keluar",
                ];
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
                      ? "#3b82f6"
                      : entry.isPositive
                      ? "#10b981"
                      : "#ef4444"
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
