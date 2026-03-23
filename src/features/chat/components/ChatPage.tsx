"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Bot, Send, Plus, Loader2, AlertCircle, MessageSquare, Trash2, Settings,
  History, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAiChat } from "@/features/ai/hooks";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const FALLBACK_SYSTEM_PROMPT = `Kamu adalah AI Assistant untuk RC Samata Gowa (franchise Rocket Chicken).
Kamu membantu pemilik/owner memahami data bisnis: omzet, expense, stok, cashflow, HPP, dan laporan keuangan.
Jawab dalam Bahasa Indonesia yang profesional dan ringkas. Gunakan angka dan data jika relevan.`;

const suggestions = [
  "Apa itu food cost dan berapa target idealnya?",
  "Bagaimana cara mengurangi waste di restoran?",
  "Jelaskan cara menghitung HPP produk",
  "Tips meningkatkan omzet harian",
];

export default function ChatPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<Id<"aiChatSessions"> | null>(null);
  const [input, setInput] = useState("");
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sessions = useQuery(api.features.ai.queries.listChatSessions);
  const aiConfig = useQuery(api.features.ai.queries.getAiConfig);
  const createSession = useMutation(api.features.ai.mutations.createChatSession);
  const deleteSession = useMutation(api.features.ai.mutations.deleteChatSession);

  const activeProvider = aiConfig?.provider ?? null;
  const activeInstruction = aiConfig?.instruction ?? null;
  const enabledTools = aiConfig?.tools ?? [];

  // Build system prompt from active instruction + enabled tools
  const systemPrompt = activeInstruction?.content || FALLBACK_SYSTEM_PROMPT;

  const { messages, isLoading, error, clearError, sendMessage } = useAiChat(sessionId);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleNewSession = useCallback(async () => {
    const id = await createSession({ systemPrompt });
    setSessionId(id);
    setInput("");
    setShowMobileHistory(false);
    inputRef.current?.focus();
  }, [createSession, systemPrompt]);

  // Pending message for newly created sessions
  const pendingMsgRef = useRef<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    if (!activeProvider) {
      toast.error("Belum ada AI provider. Konfigurasi di Pengaturan → AI Provider.");
      return;
    }

    const msg = input;
    setInput("");

    if (!sessionId) {
      pendingMsgRef.current = msg;
      const sid = await createSession({ systemPrompt });
      setSessionId(sid);
      return;
    }

    await sendMessage(msg, systemPrompt);
  }, [input, isLoading, activeProvider, sessionId, createSession, sendMessage, systemPrompt]);

  // Send pending message after session is created
  useEffect(() => {
    if (sessionId && pendingMsgRef.current) {
      const msg = pendingMsgRef.current;
      pendingMsgRef.current = null;
      sendMessage(msg, systemPrompt);
    }
  }, [sessionId, sendMessage, systemPrompt]);

  const handleDeleteSession = async (sid: Id<"aiChatSessions">) => {
    await deleteSession({ sessionId: sid });
    if (sessionId === sid) {
      setSessionId(null);
    }
    toast.success("Chat dihapus.");
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleSelectSession = (sid: Id<"aiChatSessions">) => {
    setSessionId(sid);
    setShowMobileHistory(false);
  };

  // Navigate to adjacent sessions
  const currentIndex = sessions?.findIndex((s) => s._id === sessionId) ?? -1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < (sessions?.length ?? 0) - 1;

  const goPrev = () => {
    if (canGoPrev && sessions) setSessionId(sessions[currentIndex - 1]._id);
  };
  const goNext = () => {
    if (canGoNext && sessions) setSessionId(sessions[currentIndex + 1]._id);
  };

  const noProvider = !activeProvider;

  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] md:h-[calc(100dvh-3.5rem)]">
      {/* Sidebar - Session List (desktop) */}
      <div className="hidden md:flex flex-col w-64 border-r border-border bg-card/50">
        <div className="p-3 border-b border-border">
          <Button size="sm" className="w-full rounded-lg" onClick={handleNewSession}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Chat Baru
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions?.map((s: { _id: Id<"aiChatSessions">; title: string }) => (
            <div
              key={s._id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                sessionId === s._id
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-muted-foreground"
              }`}
              onClick={() => setSessionId(s._id)}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{s.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteSession(s._id); }}
                className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {sessions?.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Belum ada chat</p>
          )}
        </div>
        {/* Desktop: enabled tools indicator */}
        {enabledTools.length > 0 && (
          <div className="p-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              {enabledTools.length} skills aktif
            </p>
          </div>
        )}
      </div>

      {/* Mobile History Drawer */}
      <AnimatePresence>
        {showMobileHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setShowMobileHistory(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-card z-50 md:hidden flex flex-col shadow-xl"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <History className="h-4 w-4" /> Riwayat Chat
                </h2>
                <button onClick={() => setShowMobileHistory(false)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="p-3">
                <Button size="sm" className="w-full rounded-lg" onClick={handleNewSession}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Chat Baru
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sessions?.map((s: { _id: Id<"aiChatSessions">; title: string; createdAt: string }) => (
                  <div
                    key={s._id}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${
                      sessionId === s._id
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                    onClick={() => handleSelectSession(s._id)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{s.title}</span>
                      <span className="text-[10px] opacity-60">
                        {new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSession(s._id); }}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {sessions?.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Belum ada chat</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!sessionId || messages.length === 0 ? (
            /* Empty state */
            <div className="h-full flex flex-col items-center justify-center p-4 gap-4">
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
                <h2 className="text-lg font-semibold mb-1">Chat AI Assistant</h2>
                {noProvider ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Konfigurasi AI provider terlebih dahulu untuk mulai chat.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/operation/settings")}
                    >
                      <Settings className="h-3.5 w-3.5 mr-1" /> Buka Pengaturan
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Tanya apapun tentang bisnis — omzet, expense, stok, dan insight lainnya.
                    </p>
                    {enabledTools.length > 0 && (
                      <p className="text-[10px] text-muted-foreground/60">
                        {enabledTools.length} skills aktif: {enabledTools.map((t) => t.name).join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>

              {!noProvider && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap justify-center gap-2 max-w-md"
                >
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestion(s)}
                      className="px-3 py-1.5 text-xs rounded-full border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          ) : (
            /* Message List */
            <div className="max-w-3xl mx-auto p-4 space-y-4">
              {messages.map((msg: { _id?: string; role: string; content: string; model?: string }, i: number) => (
                <motion.div
                  key={msg._id || i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card shadow-card"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.model && msg.role === "assistant" && (
                      <p className="text-[10px] mt-1.5 opacity-50">{msg.model}</p>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-card shadow-card rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/5 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="flex-1">{error}</p>
                  <button onClick={clearError} className="text-xs underline">
                    Tutup
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-border bg-card/80 p-3 safe-area-bottom">
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            {/* Mobile: History + New Chat + Nav buttons */}
            <div className="flex items-center gap-1 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-10 w-10"
                onClick={() => setShowMobileHistory(true)}
                title="Riwayat chat"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-9 w-9"
                onClick={goPrev}
                disabled={!canGoPrev}
                title="Chat sebelumnya"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-9 w-9"
                onClick={goNext}
                disabled={!canGoNext}
                title="Chat berikutnya"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl h-10 w-10"
                onClick={handleNewSession}
                title="Chat baru"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder={noProvider ? "Konfigurasi AI provider di Pengaturan..." : "Tanya sesuatu..."}
              disabled={noProvider}
              aria-label="Chat input"
              className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow disabled:opacity-50"
            />
            <Button
              size="icon"
              className="rounded-xl shrink-0 h-10 w-10"
              disabled={!input.trim() || isLoading || noProvider}
              onClick={handleSubmit}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {activeProvider && (
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              {activeProvider.displayName} · {activeProvider.defaultModel}
              {activeInstruction ? ` · ${activeInstruction.name}` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
