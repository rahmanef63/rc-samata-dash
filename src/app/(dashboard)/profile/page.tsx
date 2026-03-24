"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Mail, Shield } from "lucide-react";

export default function ProfilePage() {
  const user = useQuery(api.users.current);

  if (user === undefined) {
    return (
      <div className="p-6 space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-20 w-20 rounded-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h2 className="text-xl font-semibold">Please log in to view your profile</h2>
      </div>
    );
  }

  const initials = user.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
    : "U";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">User Profile</h1>
      
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 pb-2">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.image} alt={user.name || "User"} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1 mt-0">
            <CardTitle className="text-2xl">{user.name || "Unnamed User"}</CardTitle>
            <p className="text-muted-foreground flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {user.email || "No email provided"}
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Account ID</p>
                <p className="text-sm text-muted-foreground">{user._id}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
