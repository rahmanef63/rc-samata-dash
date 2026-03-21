"use client";

import { MoreHorizontal } from "lucide-react";

export default function MorePage() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <MoreHorizontal className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold mb-1">More Options</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Additional settings, reports, and tools. Coming soon.
      </p>
    </div>
  );
}
