"use client";

import { motion } from "framer-motion";
import { ChevronRight, Globe, Moon, Shield, LogOut, Settings as SettingsIcon, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { currentUser, permissions, appSettings } from "../lib";

const iconMap: Record<string, React.ElementType> = {
  Settings: SettingsIcon,
  Bell,
  Globe,
  Moon,
  Shield,
};

export function SettingsPanel() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-base font-semibold mb-3">Profile Management</h2>
        <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-navy flex items-center justify-center">
            <span className="text-lg text-navy-foreground font-semibold">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-semibold">{currentUser.name}</p>
            <p className="text-sm text-muted-foreground">{currentUser.role} · ID: {currentUser.id}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3">Permissions & Access</h2>
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

      <div>
        <h2 className="text-base font-semibold mb-3">App Settings</h2>
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
          <div className="flex items-center gap-4 p-4">
            <LogOut className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">Sign Out</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
