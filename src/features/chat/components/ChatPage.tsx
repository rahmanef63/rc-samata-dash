"use client";

import { Bot, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-4rem)] md:h-[calc(100dvh-3.5rem)]">
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
        >
          <Bot className="h-8 w-8 text-primary" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center max-w-sm"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium mb-3">
            <Sparkles className="h-3 w-3" />
            Segera Hadir
          </div>
          <h2 className="text-lg font-semibold mb-1" aria-label="Chat AI Assistant - segera hadir">Chat AI Assistant</h2>
          <p className="text-sm text-muted-foreground">
            Fitur AI Assistant sedang dalam pengembangan. Nantinya Anda bisa bertanya tentang omzet, expense, stok, dan insight bisnis lainnya langsung dari sini.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 max-w-sm"
        >
          {["Berapa omzet hari ini?", "Expense terbesar bulan ini", "Item low stock", "Ringkasan cashflow"].map((s) => (
            <span
              key={s}
              className="px-3 py-1.5 text-xs rounded-full border border-border bg-muted text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
