import { motion } from "framer-motion";
import { Search, Star, Camera, ClipboardCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { branches, regionFilters } from "../lib";

export function AuditChecklist() {
  const branch = branches[0];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Branch search */}
      <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 bg-card">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search branches..." className="flex-1 border-0 p-0 h-auto text-sm shadow-none focus-visible:ring-0" />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {regionFilters.map((f, i) => (
          <Button key={f} variant={i === 0 ? "default" : "outline"} size="sm" className="rounded-full text-xs">
            {f}
          </Button>
        ))}
      </div>

      {/* Branch Details */}
      <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
        <div className="flex items-center justify-between mb-1">
          <p className="label-uppercase text-primary">BRANCH DETAILS</p>
          <span className="text-xs text-muted-foreground">ID: #{branch.id}</span>
        </div>
        <h3 className="text-base font-semibold">{branch.name}</h3>
        <p className="text-xs text-muted-foreground">{branch.address}</p>
      </div>

      {/* Kitchen Hygiene */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h3 className="text-sm font-semibold uppercase">Kitchen Hygiene</h3>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm">1. Lantai dapur dalam kondisi bersih dan tidak berminyak?</p>
            <Checkbox />
          </div>
          <div>
            <p className="text-sm mb-2">2. Suhu freezer penyimpanan ayam?</p>
            <div className="flex items-center gap-2">
              <Input type="text" defaultValue="-18" className="w-16 text-sm font-mono-data text-center" />
              <span className="text-sm text-muted-foreground">°C</span>
            </div>
          </div>
          <div>
            <p className="text-sm mb-2">3. Upload foto bukti kebersihan area cooking</p>
            <button className="w-full border-2 border-dashed border-border rounded-xl py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
              <Camera className="h-4 w-4" />
              Take or Upload Photo
            </button>
          </div>
        </div>
      </div>

      {/* Service Quality */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h3 className="text-sm font-semibold uppercase">Service Quality</h3>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4 space-y-4">
          <div>
            <p className="text-sm mb-2">1. Kecepatan pelayanan kasir & keramahan</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="h-6 w-6 fill-warning text-warning cursor-pointer" />
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm mb-2">2. Catatan Tambahan</p>
            <Textarea placeholder="Tuliskan temuan audit disini..." className="min-h-[80px]" />
          </div>
        </div>
      </div>

      <Button className="w-full h-12">
        <ClipboardCheck className="h-4 w-4 mr-2" /> Submit Audit
      </Button>
      <Button variant="outline" className="w-full h-12">
        <Plus className="h-4 w-4 mr-2" /> Start New Audit Session
      </Button>
    </motion.div>
  );
}
