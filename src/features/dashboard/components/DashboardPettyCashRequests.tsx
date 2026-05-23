"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { itemVariants } from "@/shared/constants";
import { formatRpFull } from "@/shared/lib";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function DashboardPettyCashRequests() {
  const router = useRouter();

  const pettyCashData = useQuery(
    api.features.pettyCash.queries.listByBranch,
    {},
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filter pending requests
  const pendingRequests = (pettyCashData ?? []).filter(
    (r) => r.status === "requested" || r.status === "approved",
  );

  const selected = pettyCashData?.find((r) => r._id === selectedId);

  if (!pettyCashData) {
    return (
      <motion.div variants={itemVariants} className="bg-card rounded-xl shadow-card p-4 md:p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </motion.div>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <motion.div variants={itemVariants} className="bg-card rounded-xl shadow-card p-4 md:p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Permintaan Petty Cash</h2>
          <button onClick={() => router.push("/finance/petty-cash")} className="text-xs text-primary font-medium hover:underline">
            Lihat Semua
          </button>
        </div>
        <p className="text-sm text-muted-foreground py-3 text-center">
          Tidak ada permintaan petty cash yang menunggu persetujuan.
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div variants={itemVariants} className="bg-card rounded-xl shadow-card p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Permintaan Petty Cash</h2>
          <button onClick={() => router.push("/finance/petty-cash")} className="text-xs text-primary font-medium hover:underline">
            <StatusBadge status="pending">{pendingRequests.length} perlu tindakan</StatusBadge>
          </button>
        </div>
        <div className="space-y-3">
          {pendingRequests.slice(0, 3).map((req) => (
            <div
              key={req._id}
              className="flex items-center justify-between p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => setSelectedId(req._id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{req.purposeCategory}</p>
                  <p className="text-xs text-muted-foreground">{req.requestDate}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono-data font-medium">{formatRpFull(req.requestedAmount)}</p>
                <StatusBadge status={req.status} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelectedId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Permintaan Petty Cash</DialogTitle>
            <DialogDescription>{selected?.purposeCategory}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tanggal</span>
                <span className="font-medium">{selected.requestDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jumlah Diminta</span>
                <span className="font-mono-data font-semibold">{formatRpFull(selected.requestedAmount)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={selected.status} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              toast.error(`"${selected?.purposeCategory}" ditolak`);
              setSelectedId(null);
            }}>Tolak</Button>
            <Button onClick={() => {
              toast.success(`"${selected?.purposeCategory}" disetujui`);
              setSelectedId(null);
            }}>Setujui</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
