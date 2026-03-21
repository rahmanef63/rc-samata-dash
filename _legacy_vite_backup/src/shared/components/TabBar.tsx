import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface TabBarProps<T extends string> {
  tabs: readonly T[];
  activeTab: T;
  onTabChange: (tab: T) => void;
}

export function TabBar<T extends string>({ tabs, activeTab, onTabChange }: TabBarProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = tabRefs.current.get(activeTab);
    if (el && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = el.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - containerRect.left + containerRef.current.scrollLeft,
        width: tabRect.width,
      });
      // Scroll active tab into view
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeTab]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex flex-wrap gap-0.5 pb-0 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            ref={(el) => { if (el) tabRefs.current.set(tab, el); }}
            onClick={() => onTabChange(tab)}
            className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
        <motion.div
          className="absolute bottom-0 h-0.5 bg-primary rounded-full"
          animate={{ left: indicatorStyle.left, width: indicatorStyle.width }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
        />
      </div>
    </div>
  );
}
