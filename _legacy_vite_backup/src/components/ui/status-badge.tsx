import { ReactNode } from "react";

type StatusType = string;

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-info/10 text-info",
  approved: "bg-warning/10 text-warning",
  settled: "bg-success text-success-foreground",
  completed: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  pending: "bg-warning/10 text-warning",
  review: "bg-info/10 text-info",
  paid: "bg-success/10 text-success",
  overdue: "bg-destructive/10 text-destructive",
  partial: "bg-warning/10 text-warning",
  open: "bg-info/10 text-info",
  disbursed: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
  requested: "bg-info/10 text-info",
  recorded: "bg-success/10 text-success",
  pending_settlement: "bg-warning/10 text-warning",
  verified: "bg-success/10 text-success",
  stable: "bg-success/10 text-success",
  low: "bg-warning/10 text-warning",
  critical: "bg-destructive/10 text-destructive",
  branch_to_owner: "bg-primary/10 text-primary",
  owner_to_branch: "bg-info/10 text-info",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  settled: "Settled",
  completed: "Completed",
  rejected: "Rejected",
  pending: "Pending",
  review: "Review",
  paid: "Paid",
  overdue: "Overdue",
  partial: "Partial",
  open: "Open",
  disbursed: "Disbursed",
  closed: "Closed",
  requested: "Requested",
  recorded: "Recorded",
  pending_settlement: "Pending Settlement",
  verified: "Verified",
  stable: "Stable",
  low: "Low",
  critical: "Critical",
  branch_to_owner: "→ Owner",
  owner_to_branch: "→ Branch",
};

interface StatusBadgeProps {
  status: StatusType;
  children?: ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  const style = statusStyles[normalizedStatus] || "bg-muted text-muted-foreground";
  const label = statusLabels[normalizedStatus] || status;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${style}`}>
      {(normalizedStatus === "submitted" || normalizedStatus === "requested") && <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse-dot" />}
      {(normalizedStatus === "pending" || normalizedStatus === "pending_settlement") && <span className="w-1.5 h-1.5 rounded-full bg-warning" />}
      {(normalizedStatus === "approved" || normalizedStatus === "paid" || normalizedStatus === "completed" || normalizedStatus === "settled" || normalizedStatus === "verified") && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
      {(normalizedStatus === "rejected" || normalizedStatus === "overdue" || normalizedStatus === "critical") && <span className="w-1.5 h-1.5 rounded-full bg-destructive" />}
      {children || label}
    </span>
  );
}
