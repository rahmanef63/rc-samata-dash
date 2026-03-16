import { Home, DollarSign, BarChart3, Bot, Settings, Menu } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useSidebar } from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Finance", url: "/finance", icon: DollarSign },
  { title: "Report", url: "/report", icon: BarChart3 },
  { title: "Chat AI", url: "/chat", icon: Bot },
  { title: "Operation", url: "/operation", icon: Settings },
];

export function BottomNav() {
  const location = useLocation();
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 glass border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.url === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.url);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              className="relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[48px] active:scale-95"
              activeClassName=""
            >
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -inset-1.5 rounded-xl bg-primary/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <item.icon className={`relative h-5 w-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <span className={`text-[10px] font-semibold transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {item.title}
              </span>
            </NavLink>
          );
        })}
        <button
          onClick={toggleSidebar}
          className="relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[48px] active:scale-95"
        >
          <Menu className="h-5 w-5 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">More</span>
        </button>
      </div>
    </nav>
  );
}
