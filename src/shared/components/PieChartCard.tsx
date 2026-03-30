import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatRp, formatRpFull } from "@/shared/lib";

interface PieChartCardProps {
  data: { name: string; value: number; color: string }[];
  title: string;
  subtitle?: string;
  height?: number;
  headerRight?: React.ReactNode;
}

export function PieChartCard({ data, title, subtitle, height = 220, headerRight }: PieChartCardProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-card rounded-xl shadow-card p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {headerRight}
      </div>
      <div className="flex items-center gap-4" style={{ height }}>
        <div className="flex-1 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, _name, item: { payload?: { name?: string } }) => [
                  formatRpFull(value),
                  item?.payload?.name || "Nilai",
                ]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2 min-w-[110px]">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground truncate">{d.name}</p>
                <p className="text-xs font-semibold font-mono-data">
                  {((d.value / total) * 100).toFixed(0)}% · {formatRp(d.value)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
