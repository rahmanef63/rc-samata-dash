"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Users, Shield } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";

type Role = "super_admin" | "owner" | "staff";

const ROLE_BADGE: Record<Role, string> = {
  super_admin: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  owner: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  staff: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  owner: "Owner",
  staff: "Staff",
};

export function UserRolesAdmin() {
  const users = useQuery(api.features.auth.queries.listUsersWithRoles);
  const assignRole = useMutation(api.features.auth.mutations.assignRole);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleChange = async (userId: Id<"users">, role: Role) => {
    setSavingId(String(userId));
    try {
      await assignRole({ userId, role });
      toast.success(`Role diubah ke ${ROLE_LABEL[role]}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah role");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 text-primary p-2">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Manajemen User</h1>
          <p className="text-sm text-muted-foreground">
            Atur role per akun. Super Admin saja yang bisa mengubah.
          </p>
        </div>
      </div>

      {users === undefined ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Belum ada user terdaftar.
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {users.map((u) => {
              const initials = (u.name ?? u.email ?? "?")
                .split(" ")
                .map((p) => p[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();
              return (
                <div
                  key={String(u._id)}
                  className="p-3 flex items-center gap-3 hover:bg-muted/30"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    {u.image && <AvatarImage src={u.image} alt={u.name ?? ""} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {u.name ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email ?? "—"}
                    </p>
                  </div>
                  <Badge className={`${ROLE_BADGE[u.role]} text-[10px] uppercase shrink-0 gap-1`}>
                    <Shield className="h-3 w-3" />
                    {ROLE_LABEL[u.role]}
                  </Badge>
                  <Select
                    value={u.role}
                    disabled={savingId === String(u._id)}
                    onValueChange={(v) => handleChange(u._id, v as Role)}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
