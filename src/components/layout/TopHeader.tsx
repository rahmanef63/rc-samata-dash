"use client";

import { Bell, Search, Sun, Moon, User, LogOut, Settings, Filter } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/shared/components";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat Pagi";
  if (h < 15) return "Selamat Siang";
  if (h < 18) return "Selamat Sore";
  return "Selamat Malam";
}

function formatDate() {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function TopHeader() {
  const isMobile = useIsMobile();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const theme = window.localStorage.getItem("theme");
    return theme === "dark" || (!theme && document.documentElement.classList.contains("dark"));
  });
  const [searchOpen, setSearchOpen] = useState(false);
  
  const user = useQuery(api.users.current);
  const { signOut } = useAuthActions();
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const toggleDark = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
    : "R";

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center justify-between border-b border-border bg-card/80 glass px-4 safe-area-top">
      <div className="flex items-center gap-3">
        {!isMobile && <SidebarTrigger />}
        {isMobile && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-xs">{userInitials[0] || 'R'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold leading-tight">
                {getGreeting()}, {user?.name?.split(' ')[0] || ''} 👋
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {formatDate()}
              </span>
            </div>
          </div>
        )}
        {!isMobile && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold">{user?.name ? `Selamat datang, ${user.name}` : "Ringkasan Owner"}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{formatDate()}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Date scope — desktop: inline, mobile: sheet trigger */}
        {!isMobile ? (
          <div className="flex items-center gap-1.5 mr-2">
            <DateRangePicker />
          </div>
        ) : (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Filter periode">
                <Filter className="h-4 w-4 text-muted-foreground" />
              </Button>
            </SheetTrigger>
            <SheetContent side="top" className="space-y-4">
              <SheetHeader>
                <SheetTitle>Filter Data</SheetTitle>
                <SheetDescription>
                  Pilih periode untuk seluruh halaman.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Periode</p>
                  <DateRangePicker className="w-full" />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Search */}
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setSearchOpen(true)}>
          <Search className="h-4 w-4 text-muted-foreground" />
        </Button>

        <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
          <CommandInput placeholder="Ketik perintah atau cari halaman..." />
          <CommandList>
            <CommandEmpty>Tidak ada hasil.</CommandEmpty>
            <CommandGroup heading="Halaman">
              <CommandItem onSelect={() => { router.push("/"); setSearchOpen(false); }}>
                Dashboard
              </CommandItem>
              <CommandItem onSelect={() => { router.push("/profile"); setSearchOpen(false); }}>
                Profil
              </CommandItem>
              <CommandItem onSelect={() => { router.push("/finance/expenses"); setSearchOpen(false); }}>
                Pengeluaran
              </CommandItem>
              <CommandItem onSelect={() => { router.push("/report"); setSearchOpen(false); }}>
                Laporan
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Pengaturan">
              <CommandItem onSelect={() => { router.push("/profile"); setSearchOpen(false); }}>
                Pengaturan Akun
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        {/* Theme */}
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={toggleDark}>
          {isDark ? (
            <Moon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Sun className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg relative">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-primary ring-2 ring-card" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
              <span className="font-semibold text-sm">Pantau aktivitas terbaru</span>
              <span className="text-xs text-muted-foreground">Peringatan operasional dan update sistem akan muncul di sini.</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        {!isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 rounded-full ml-1 p-0 ring-2 ring-border overflow-hidden cursor-pointer">
                <Avatar className="h-full w-full">
                  <AvatarImage src={user?.image} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-navy text-navy-foreground text-xs font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || "user@example.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="mr-2 h-4 w-4" />
                <span>Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Pengaturan</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Keluar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
