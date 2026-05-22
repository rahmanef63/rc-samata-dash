"use client";

import { Database, List, Network } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/shared/components";
import { SchemaGraphView } from "@/features/schema-graph/SchemaGraphView";
import { SchemaFlowchart } from "@/features/schema-graph/SchemaFlowchart";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-4">
      <PageHeader
        icon={Database}
        title="Schema Graph"
        description="Visualisasi semua tabel + relasi FK. Flowchart = interactive node graph dengan animasi. List view = scanning detail per-feature."
      />
      <Tabs defaultValue="flowchart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flowchart" className="flex items-center gap-1.5">
            <Network className="h-3.5 w-3.5" />
            Flowchart
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-1.5">
            <List className="h-3.5 w-3.5" />
            List View
          </TabsTrigger>
        </TabsList>
        <TabsContent value="flowchart" className="space-y-4">
          <SchemaFlowchart />
        </TabsContent>
        <TabsContent value="list" className="space-y-4">
          <SchemaGraphView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
