import re

for filename in ["convex/features/reports/analytics.ts", "convex/features/reports/kpiAnalytics.ts"]:
    with open(filename, "r") as f:
        content = f.read()
    
    # fix filter params
    content = re.sub(r'\.filter\(\(s\)', r'.filter((s: any)', content)
    content = re.sub(r'\.filter\(\(h\)', r'.filter((h: any)', content)
    content = re.sub(r'\.filter\(\(c\)', r'.filter((c: any)', content)
    content = re.sub(r'\.filter\(\(d\)', r'.filter((d: any)', content)
    content = re.sub(r'\.filter\(\(k\)', r'.filter((k: any)', content)
    content = re.sub(r'\.filter\(\(ca\)', r'.filter((ca: any)', content)
    
    with open(filename, "w") as f:
        f.write(content)

