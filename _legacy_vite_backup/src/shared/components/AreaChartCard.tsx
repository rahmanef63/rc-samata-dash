import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_PRIMARY_COLOR, CHART_GRID_COLOR, CHART_AXIS_COLOR } from "@/shared/constants";
import { formatRp } from "@/shared/lib";

interface AreaChartCardProps {
  data: { label: string; value: number }[];
  dataKey?: string;
  labelKey?: string;
  title: string;
  subtitle?: string;
  height?: number;
  gradientId?: string;
  showGrid?: boolean;
  showYAxis?: boolean;
  showTooltip?: boolean;
  tooltipLabel?: string;
  headerRight?: React.ReactNode;
}

export function AreaChartCard({
  data,
  title,
  subtitle,
  height = 200,
  gradientId = "sharedGrad",
  showGrid = true,
  showYAxis = true,
  showTooltip = true,
  tooltipLabel = "Value",
  headerRight,
}: AreaChartCardProps) {
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
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_PRIMARY_COLOR} stopOpacity={0.2} />
                <stop offset="95%" stopColor={CHART_PRIMARY_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />}
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke={CHART_AXIS_COLOR} />
            {showYAxis && <YAxis tickFormatter={formatRp} tick={{ fontSize: 11 }} stroke={CHART_AXIS_COLOR} />}
            {showTooltip && (
              <Tooltip
                formatter={(value: number) => [`Rp ${(value / 1000000).toFixed(1)}M`, tooltipLabel]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${CHART_GRID_COLOR}` }}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke={CHART_PRIMARY_COLOR}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
