import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { pettyCashRequests, itemVariants } from "../lib";
import type { PettyCashRequest } from "../types";
import { toast } from "sonner";

export function DashboardPettyCashRequests() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<PettyCashRequest | null>(null);

  const handleApprove = (req: PettyCashRequest) => {
    toast.success(`"${req.title}" telah disetujui`);
    setSelected(null);
  };

  const handleReject = (req: PettyCashRequest) => {
    toast.error(`"${req.title}" telah ditolak`);
    setSelected(null);
  };

  return (
    <>
      <motion.div variants={itemVariants} className="bg-card rounded-xl shadow-card p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Petty Cash Requests</h2>
          <button onClick={() => navigate("/petty-cash")} className="text-xs text-primary font-medium hover:underline">
            <StatusBadge status="pending">3 Action Required</StatusBadge>
          </button>
        </div>
        <div className="space-y-3">
          {pettyCashRequests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => setSelected(req)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{req.title}</p>
                  <p className="text-xs text-muted-foreground">{req.requester}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono-data font-medium">{req.amount}</p>
                <StatusBadge status={req.status} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Petty Cash Request</DialogTitle>
            <DialogDescription>{selected?.title}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pemohon</span>
                <span className="font-medium">{selected.requester}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jumlah</span>
                <span className="font-mono-data font-semibold">{selected.amount}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={selected.status} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => selected && handleReject(selected)}>Reject</Button>
            <Button onClick={() => selected && handleApprove(selected)}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
