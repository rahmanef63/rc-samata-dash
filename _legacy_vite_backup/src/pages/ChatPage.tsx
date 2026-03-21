import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Bot, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const suggestions = [
  "Berapa omzet hari ini?",
  "Tampilkan expense terbesar bulan ini",
  "Ada berapa item low stock?",
  "Ringkasan cashflow minggu ini",
];

export default function ChatPage() {
  const [input, setInput] = useState("");

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100dvh-3.5rem-4rem)] md:h-[calc(100dvh-3.5rem)]">
        {/* Chat area */}
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
            className="text-center"
          >
            <h2 className="text-lg font-semibold mb-1">Chat AI Assistant</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Tanya apapun tentang bisnis Anda — omzet, expense, stok, dan lainnya.
            </p>
          </motion.div>

          {/* Quick suggestions */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2 max-w-sm"
          >
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="px-3 py-1.5 text-xs rounded-full border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors active:scale-95"
              >
                {s}
              </button>
            ))}
          </motion.div>
        </div>

        {/* Input bar */}
        <div className="border-t border-border bg-card/80 glass p-3 safe-area-bottom">
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya sesuatu..."
              className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
            <Button size="icon" className="rounded-xl shrink-0 h-10 w-10" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
