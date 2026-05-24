"use client";

import { Users } from "lucide-react";
import { StaffOverview } from "@/features/hr";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Users}
        title="Staff (HR)"
        description="Karyawan operasional terpisah dari users (login). SV WA bisa exist tanpa akun login. Setiap tx baru bisa di-tag paidBy / receivedBy staff."
      />
      <StaffOverview />
    </div>
  );
}
