"use client";

import { Bot, Table2 } from "lucide-react";
import type { AiVisualBlock } from "@/features/ai-visual/types";
import { AreaChartCard } from "@/shared/components/AreaChartCard";
import { PieChartCard } from "@/shared/components/PieChartCard";
import { WaterfallChart } from "@/shared/components/WaterfallChart";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChatComparisonTable } from "./ChatComparisonTable";
import { ChatActionList } from "./ChatActionList";

interface ChatVisualRendererProps {
  visuals: AiVisualBlock[];
}

function toneToBadgeColor(tone?: "default" | "success" | "warning" | "destructive") {
  if (tone === "warning") return "warning";
  if (tone === "destructive") return "destructive";
  if (tone === "success") return "success";
  return "primary";
}

export function ChatVisualRenderer({ visuals }: ChatVisualRendererProps) {
  return (
    <div className="space-y-3 max-w-[85%] md:max-w-[75%] ml-11">
      {visuals.map((block, index) => {
        if (block.type === "chart") {
          if (block.variant === "area") {
            return (
              <AreaChartCard
                key={`${block.type}-${index}`}
                title={block.title}
                subtitle={block.subtitle}
                data={block.data.map((item) => ({
                  label: String(item.label ?? "-"),
                  value: Number(item.value ?? 0),
                }))}
                fitRange
              />
            );
          }

          if (block.variant === "pie") {
            return (
              <PieChartCard
                key={`${block.type}-${index}`}
                title={block.title}
                subtitle={block.subtitle}
                data={block.data.map((item) => ({
                  name: String(item.name ?? "-"),
                  value: Number(item.value ?? 0),
                  color: String(item.color ?? "#3b82f6"),
                }))}
              />
            );
          }

          return (
            <WaterfallChart
              key={`${block.type}-${index}`}
              title={block.title}
              subtitle={block.subtitle}
              data={block.data.map((item) => ({
                name: String(item.name ?? "-"),
                value: Number(item.value ?? 0),
              }))}
            />
          );
        }

        if (block.type === "kpi_cards") {
          return (
            <div key={`${block.type}-${index}`} className="bg-card border border-border/60 rounded-2xl shadow-sm p-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold">{block.title}</h3>
                {block.subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{block.subtitle}</p> : null}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {block.items.map((item, itemIndex) => (
                  <KpiCard
                    key={`${item.label}-${itemIndex}`}
                    icon={<Bot className="h-5 w-5 text-primary" />}
                    label={item.label}
                    value={item.value}
                    badge={item.badge}
                    badgeColor={toneToBadgeColor(item.tone)}
                  />
                ))}
              </div>
            </div>
          );
        }

        if (block.type === "comparison_table") {
          return <ChatComparisonTable key={`${block.type}-${index}`} block={block} />;
        }

        if (block.type === "action_list") {
          return <ChatActionList key={`${block.type}-${index}`} block={block} />;
        }

        return (
          <div key={`${block.type}-${index}`} className="bg-card border border-border/60 rounded-2xl shadow-sm p-4">
            <div className="mb-3 flex items-center gap-2">
              <Table2 className="h-4 w-4 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">{block.title}</h3>
                {block.subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{block.subtitle}</p> : null}
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  {block.columns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {block.rows.map((row, rowIndex) => (
                  <TableRow key={`${row.join("-")}-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <TableCell key={`${cell}-${cellIndex}`}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </div>
  );
}
