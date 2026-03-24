import re

with open("convex/features/reports/analytics.ts", "r") as f:
    content = f.read()

# Add args type
arg_pattern = r'args: { reportId: v\.id\("weeklyReports"\) }'
new_arg = r'args: { reportId: v.optional(v.union(v.id("weeklyReports"), v.literal("all"))), branchId: v.optional(v.id("branches")), timeFilter: v.optional(v.string()) }'
content = re.sub(arg_pattern, new_arg, content)

helper = """
async function fetchData(ctx: any, tableName: string, args: { reportId?: string; branchId?: string; timeFilter?: string }) {
  if (args.reportId && args.reportId !== "all") {
    return ctx.db.query(tableName as any).withIndex("by_report", (q: any) => q.eq("reportId", args.reportId)).collect();
  }
  if (!args.branchId) return [];
  const reports = await ctx.db.query("weeklyReports").withIndex("by_branch", (q: any) => q.eq("branchId", args.branchId as any)).collect();
  let allData: any[] = [];
  for (const r of reports) {
    const data = await ctx.db.query(tableName as any).withIndex("by_report", (q: any) => q.eq("reportId", r._id)).collect();
    allData.push(...data);
  }
  if (args.timeFilter && args.timeFilter !== "all" && allData.length > 0) {
    const now = new Date();
    allData = allData.filter(d => {
      const dVal = d.businessDate || d.periodStart || d.valuationDate || d.weekStart;
      if (!dVal) return true;
      const date = new Date(dVal);
      if (args.timeFilter === "daily") return date.toDateString() === now.toDateString();
      if (args.timeFilter === "weekly") {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        return date >= weekAgo;
      }
      if (args.timeFilter === "monthly") return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      if (args.timeFilter === "quarterly") return Math.floor(now.getMonth() / 3) === Math.floor(date.getMonth() / 3) && date.getFullYear() === now.getFullYear();
      return true;
    });
  }
  return allData;
}
"""

content = content.replace('import { normalizeItemName, matchItemNames } from "../../shared/helpers";', 
                          'import { normalizeItemName, matchItemNames } from "../../shared/helpers";\n' + helper)

# Replace all occurrences of ctx.db.query("...").withIndex("by_report", ...).collect()
fetch_pattern = r'ctx\.db\.query\("([^"]+)"\)\.withIndex\("by_report"[^)]+\)\.collect\(\)'

def replacer(match):
    table = match.group(1)
    return f'fetchData(ctx, "{table}", {{ reportId, branchId, timeFilter }})'

content = re.sub(fetch_pattern, replacer, content)

# Inject branchId and timeFilter into handlers
content = re.sub(r'handler: async \(ctx, { reportId }\) => {', r'handler: async (ctx, { reportId, branchId, timeFilter }) => {', content)

with open("convex/features/reports/analytics.ts", "w") as f:
    f.write(content)
