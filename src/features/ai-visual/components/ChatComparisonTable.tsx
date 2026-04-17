"use client";

import type { AiComparisonTableVisualBlock } from "@/features/ai-visual/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ChatComparisonTableProps {
  block: AiComparisonTableVisualBlock;
}

export function ChatComparisonTable({ block }: ChatComparisonTableProps) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{block.title}</h3>
        {block.subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{block.subtitle}</p> : null}
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
          {block.rows.map((row, index) => (
            <TableRow key={`${row.join("-")}-${index}`}>
              {row.map((cell, cellIndex) => (
                <TableCell key={`${cell}-${cellIndex}`}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {block.summary ? <p className="text-xs text-muted-foreground mt-3">{block.summary}</p> : null}
    </div>
  );
}
