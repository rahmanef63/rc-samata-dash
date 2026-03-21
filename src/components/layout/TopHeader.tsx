"use client";

import { Bell, ChevronDown, Search, Sun, Moon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

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
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark((prev) => !prev);
  };

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center justify-between border-b border-border bg-card/80 glass px-4 safe-area-top">
      <div className="flex items-center gap-3">
        {!isMobile && <SidebarTrigger />}
        {isMobile && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-xs">R</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold leading-tight">
                {getGreeting()} 👋
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {formatDate()}
              </span>
            </div>
          </div>
        )}
        {!isMobile && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold">Owner Overview</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{formatDate()}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {!isMobile && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground mr-2 hover:bg-accent transition-colors cursor-pointer">
            <span>Rocket Chicken - Sudirman Central</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </div>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={toggleDark}>
          {isDark ? (
            <Sun className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Moon className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
          <Search className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg relative">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary ring-2 ring-card" />
        </Button>
        {!isMobile && (
          <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center ml-1 ring-2 ring-border">
            <span className="text-xs text-navy-foreground font-medium">IM</span>
          </div>
        )}
      </div>
    </header>
  );
}
