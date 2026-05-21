"use client";

import { Users } from "lucide-react";
import { UserRolesAdmin } from "@/features/auth/UserRolesAdmin";
import { PageHeader } from "@/shared/components";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Users}
        title="Manajemen User"
        description="Kelola role karyawan: owner, admin, staff, supervisor. Akses fitur tergantung role."
      />
      <UserRolesAdmin />
    </div>
  );
}
