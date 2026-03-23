"use client";

import { motion } from "framer-motion";
import { ChevronRight, Globe, Moon, Shield, LogOut, Settings as SettingsIcon, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { AiProviderConfig, AiToolsConfig, AiInstructionsConfig } from "@/features/ai";

const permissions = [
  { label: "Supervisor Access", description: "Akses penuh ke semua fitur dan data", enabled: true, iconName: "Shield" },
  { label: "Real-time Alerts", description: "Notifikasi otomatis untuk anomali data", enabled: false, iconName: "Bell" },
];

const appSettings = [
  { label: "Bahasa", value: "Indonesia", iconName: "Globe" },
  { label: "Tema", value: "Sistem", iconName: "Moon" },
];

const iconMap: Record<string, React.ElementType> = {
  Settings: SettingsIcon,
  Bell,
  Globe,
  Moon,
  Shield,
};

export function SettingsPanel() {
  const { signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/landing");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Profile */}
      <div>
        <h2 className="text-base font-semibold mb-3">Profil</h2>
        <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg text-primary font-semibold">RC</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold">Owner RC Samata</p>
            <p className="text-sm text-muted-foreground">
              {isAuthenticated ? "Terautentikasi" : "Tidak terautentikasi"} · Cabang Samata Gowa
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* AI Provider Config */}
      <AiProviderConfig />

      {/* AI Tools & Skills */}
      <AiToolsConfig />

      {/* AI Custom Instructions */}
      <AiInstructionsConfig />

      {/* Permissions */}
      <div>
        <h2 className="text-base font-semibold mb-3">Izin & Akses</h2>
        <div className="space-y-3">
          {permissions.map((perm) => {
            const IconComp = iconMap[perm.iconName] || SettingsIcon;
            return (
              <div key={perm.label} className="bg-card rounded-xl shadow-card p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  perm.enabled ? "bg-primary/10" : "bg-warning/10"
                }`}>
                  <IconComp className={`h-4 w-4 ${perm.enabled ? "text-primary" : "text-warning"}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{perm.label}</p>
                  <p className="text-xs text-muted-foreground">{perm.description}</p>
                </div>
                <Switch defaultChecked={perm.enabled} />
              </div>
            );
          })}
        </div>
      </div>

      {/* App Settings */}
      <div>
        <h2 className="text-base font-semibold mb-3">Pengaturan Aplikasi</h2>
        <div className="bg-card rounded-xl shadow-card divide-y divide-border">
          {appSettings.map((item) => {
            const IconComp = iconMap[item.iconName] || Globe;
            return (
              <div key={item.label} className="flex items-center gap-4 p-4">
                <IconComp className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm">{item.label}</span>
                {item.value && <span className="text-sm text-muted-foreground">{item.value}</span>}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            );
          })}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-4 p-4 w-full text-left hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">Sign Out</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
