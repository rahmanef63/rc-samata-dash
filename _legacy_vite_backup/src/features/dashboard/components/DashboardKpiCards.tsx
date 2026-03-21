import { DollarSign, Wallet, AlertTriangle, TrendingUp, Receipt, Moon, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { KpiCard } from "@/components/ui/kpi-card";

const kpiItems = [
  { icon: DollarSign, label: "Omzet Hari Ini", value: "Rp 16.8M", badge: "+8.2%", badgeColor: "success" as const, path: "/finance" },
  { icon: TrendingUp, label: "Net Cash to Owner", value: "Rp 14.2M", badge: "Verified", badgeColor: "success" as const, path: "/report" },
  { icon: Receipt, label: "Expense Bulan Ini", value: "Rp 6.9M", badge: "+5.2%", badgeColor: "warning" as const, path: "/expenses" },
  { icon: AlertTriangle, label: "Outstanding Payable", value: "Rp 4.9M", badge: "2 overdue", badgeColor: "destructive" as const, path: "/payables" },
  { icon: Wallet, label: "Petty Cash Saldo", value: "Rp 393k", badge: "1 pending", badgeColor: "warning" as const, path: "/petty-cash" },
  { icon: Moon, label: "Setoran Malam", value: "Rp 7.2M", badge: "Submitted", badgeColor: "primary" as const, path: "/closing" },
  { icon: Package, label: "Low Stock Items", value: "3 items", badge: "Restock!", badgeColor: "destructive" as const, path: "/inventory" },
  { icon: DollarSign, label: "Selisih Kas", value: "-Rp 20k", badge: "Alert", badgeColor: "destructive" as const, path: "/closing" },
];

export function DashboardKpiCards() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {kpiItems.map((item) => (
        <KpiCard
          key={item.label}
          icon={<item.icon className="h-5 w-5 text-primary" />}
          label={item.label}
          value={item.value}
          badge={item.badge}
          badgeColor={item.badgeColor}
          onClick={() => navigate(item.path)}
        />
      ))}
    </div>
  );
}
