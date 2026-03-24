import re

for filename in ["convex/features/reports/analytics.ts", "convex/features/reports/kpiAnalytics.ts"]:
    with open(filename, "r") as f:
        content = f.read()
    
    # Replace ctx.db.query("productSales").withIndex("by_report", (q) => q.eq("reportId", reportId)).collect()
    pattern = r'ctx\.db\.query\("([^"]+)"\)\.withIndex\("by_report", \(q\) => q\.eq\("reportId", reportId\)\)\.collect\(\)'
    
    def replacer(match):
        return f'fetchData(ctx, "{match.group(1)}", {{ reportId, branchId, timeFilter }})'
        
    content = re.sub(pattern, replacer, content)
    
    # Check if there are any remaining .withIndex("by_report"
    # To fix "const report = await ctx.db.get(reportId as any);" type error
    content = content.replace("const report = await ctx.db.get(reportId as any);", "const report = await ctx.db.get(reportId as any) as any;")
    
    with open(filename, "w") as f:
        f.write(content)

