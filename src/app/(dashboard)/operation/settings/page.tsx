"use client";

import { Settings as SettingsIcon } from "lucide-react";
import { SettingsPanel } from "@/features/settings";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={SettingsIcon}
        title="Pengaturan"
        description="Profil, AI config, izin notifikasi, seed master data, dan preferensi aplikasi."
      />
      <SettingsPanel />
    </div>
  );
}
