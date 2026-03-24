import re

for filename in ["convex/features/reports/analytics.ts", "convex/features/reports/kpiAnalytics.ts"]:
    with open(filename, "r") as f:
        content = f.read()
    
    # fix reduce params
    content = re.sub(r'\.reduce\(\(s, item\)', r'.reduce((s: number, item: any)', content)
    content = re.sub(r'\.reduce\(\(s, h\)', r'.reduce((s: number, h: any)', content)
    content = re.sub(r'\.reduce\(\(s, c\)', r'.reduce((s: number, c: any)', content)
    content = re.sub(r'\.reduce\(\(s, i\)', r'.reduce((s: number, i: any)', content)
    content = re.sub(r'\.reduce\(\(s, d\)', r'.reduce((s: number, d: any)', content)
    
    with open(filename, "w") as f:
        f.write(content)

with open("src/features/analytics/components/AnalyticsPage.tsx", "r") as f:
    content = f.read()

# Fix ReportDataBrowser pass null
old_line = '{activeTab === "Data Browser" && <ReportDataBrowser reportId={isAll ? null : reportId} />}'
new_line = '{activeTab === "Data Browser" && (isAll ? <div className="p-8 text-center text-muted-foreground bg-card rounded-2xl border">Data Browser tidak tersedia untuk mode "Semua Laporan". Pilih satu laporan spesifik.</div> : <ReportDataBrowser reportId={reportId as any} />)}'
content = content.replace(old_line, new_line)

with open("src/features/analytics/components/AnalyticsPage.tsx", "w") as f:
    f.write(content)
