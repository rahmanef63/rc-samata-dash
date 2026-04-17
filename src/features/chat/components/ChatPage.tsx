"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  Bot, Send, Plus, Loader2, AlertCircle, MessageSquare, Trash2, Settings,
  History, X, ChevronLeft, ChevronRight, Image as ImageIcon, FileText, Search, Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAiChat } from "@/features/ai/hooks";
import { ChatVisualRenderer, type AiVisualBlock } from "@/features/ai-visual";
import type { AiChatMessage } from "@/features/ai/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sessions = useQuery(api.features.ai.queries.listChatSessions);
  const aiConfig = useQuery(api.features.ai.queries.getAiConfig);
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const createSession = useMutation(api.features.ai.mutations.createChatSession);
  const deleteSession = useMutation(api.features.ai.mutations.deleteChatSession);

  const activeProvider = aiConfig?.provider ?? null;
  const activeInstruction = aiConfig?.instruction ?? null;
  const enabledTools = aiConfig?.tools ?? [];
  const branchId = branches?.[0]?._id;

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
    if (inputRef.current) inputRef.current.style.height = "auto";

    if (!sessionId) {
      pendingMsgRef.current = msg;
      const sid = await createSession({ systemPrompt });
      setSessionId(sid);
      return;
    }

    await sendMessage(msg, systemPrompt, branchId);
  }, [input, isLoading, activeProvider, sessionId, createSession, sendMessage, systemPrompt, branchId]);

  // Send pending message after session is created
  useEffect(() => {
    if (sessionId && pendingMsgRef.current) {
      const msg = pendingMsgRef.current;
      pendingMsgRef.current = null;
      sendMessage(msg, systemPrompt, branchId);
    }
  }, [sessionId, sendMessage, systemPrompt, branchId]);

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

  const filteredSessions = sessions?.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  // Navigate to adjacent sessions
  // Filter index based on raw sessions list or filtered? Usually raw list for logical chronological order
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
      <div className="hidden md:flex flex-col w-72 border-r border-border bg-card/50">
        <div className="p-3 border-b border-border shadow-sm z-10">
          <Button className="w-full rounded-xl shadow-sm mb-3" onClick={handleNewSession}>
            <Plus className="h-4 w-4 mr-2" /> Buat Chat Baru
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Cari chat sesi..."
              className="w-full h-9 bg-secondary rounded-lg pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredSessions.map((s: { _id: Id<"aiChatSessions">; title: string }) => (
            <div
              key={s._id}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-all ${
                sessionId === s._id
                  ? "bg-primary/10 text-primary font-medium shadow-sm"
                  : "hover:bg-muted text-muted-foreground"
              }`}
              onClick={() => setSessionId(s._id)}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1">{s.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteSession(s._id); }}
                className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 p-1 rounded-md transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {filteredSessions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              {searchQuery ? "Sesi tidak ditemukan" : "Belum ada chat"}
            </p>
          )}
        </div>
        {/* Desktop: status indicators */}
        {(enabledTools.length > 0 || aiConfig?.ragEnabled) && (
          <div className="p-3 border-t border-border bg-muted/20 space-y-1">
            {enabledTools.length > 0 && (
              <p className="text-[10px] text-muted-foreground font-medium flex items-center justify-center gap-1">
                <Bot className="h-3 w-3" /> {enabledTools.length} skills aktif
              </p>
            )}
            {aiConfig?.ragEnabled && (
              <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium flex items-center justify-center gap-1">
                <Database className="h-3 w-3" /> RAG aktif
              </p>
            )}
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
              className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
              onClick={() => setShowMobileHistory(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[80%] max-w-sm bg-card z-50 md:hidden flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Riwayat Chat
                </h2>
                <button onClick={() => setShowMobileHistory(false)} className="p-1 rounded-full hover:bg-muted">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              
              <div className="p-4 border-b border-border shadow-sm z-10">
                <Button className="w-full rounded-xl shadow-sm mb-3" onClick={handleNewSession}>
                  <Plus className="h-4 w-4 mr-2" /> Chat Baru
                </Button>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="text"
                    placeholder="Cari chat sesi..."
                    className="w-full h-10 bg-secondary rounded-xl pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                {filteredSessions.map((s: { _id: Id<"aiChatSessions">; title: string; createdAt: string }) => (
                  <div
                    key={s._id}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer text-sm transition-all ${
                      sessionId === s._id
                        ? "bg-primary/10 text-primary font-medium border border-primary/20"
                        : "hover:bg-muted focus:bg-muted text-muted-foreground border border-transparent"
                    }`}
                    onClick={() => handleSelectSession(s._id)}
                  >
                    <div className={`p-2 rounded-lg ${sessionId === s._id ? 'bg-primary/20' : 'bg-secondary'}`}>
                      <MessageSquare className={`h-4 w-4 ${sessionId === s._id ? 'text-primary' : ''}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="truncate block font-medium">{s.title}</span>
                      <span className="text-[11px] opacity-70">
                        {new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSession(s._id); }}
                      className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 p-2 rounded-lg shrink-0 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {filteredSessions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 opacity-60">
                    <MessageSquare className="h-8 w-8 mb-2" />
                    <p className="text-sm">{searchQuery ? "Sesi tidak ditemukan" : "Belum ada riwayat chat"}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative bg-background/50">
        
        {/* Chat Top Header (Mobile & Compact Desktop) */}
        <div className="h-14 border-b border-border bg-card/80 glass px-2 md:px-4 flex items-center justify-between z-10 sticky top-0 shrink-0">
          <div className="flex items-center gap-1 md:hidden">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-primary" onClick={() => setShowMobileHistory(true)}>
              <History className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-primary" onClick={handleNewSession}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex-1 line-clamp-1 sm:text-center text-left text-sm font-semibold truncate px-2 md:hidden">
            {sessions?.find((s) => s._id === sessionId)?.title || "Chat Baru"}
          </div>

          {!sessionId && <div className="hidden md:block text-sm font-semibold text-muted-foreground mr-auto">Memulai Sesi Chat</div>}
          {sessionId && <div className="hidden md:block text-sm font-semibold truncate mr-auto">
            {sessions?.find((s) => s._id === sessionId)?.title || "Chat Baru"}
          </div>}

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg disabled:opacity-30 border-border shadow-sm" onClick={goPrev} disabled={!canGoPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg disabled:opacity-30 border-border shadow-sm" onClick={goNext} disabled={!canGoNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto w-full custom-scrollbar">
          {!sessionId || messages.length === 0 ? (
            /* Empty state */
            <div className="h-full flex flex-col items-center justify-center p-4 gap-6 max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center shadow-sm"
              >
                <Bot className="h-10 w-10 text-primary" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center max-w-md"
              >
                <h2 className="text-xl font-bold mb-2 tracking-tight">Chat AI Assistant</h2>
                {noProvider ? (
                  <div className="space-y-4 mt-6">
                    <p className="text-sm text-muted-foreground">
                      Konfigurasi AI provider terlebih dahulu untuk mulai chat.
                    </p>
                    <Button
                      className="rounded-xl shadow-sm"
                      onClick={() => router.push("/operation/settings")}
                    >
                      <Settings className="h-4 w-4 mr-2" /> Buka Pengaturan
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Tanya apapun tentang bisnis — omzet, expense, stok, dan insight lainnya.
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Didukung AI - dapat membuat kesalahan. Verifikasi keputusan penting dengan data laporan Anda.
                    </p>
                  </div>
                )}
              </motion.div>

              {!noProvider && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col w-full gap-2 px-4 md:px-0 mt-2"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSuggestion(s)}
                        className="p-3.5 text-sm text-left rounded-xl border border-border/50 bg-card hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all active:scale-[0.98] shadow-sm flex items-center gap-3"
                      >
                        <MessageSquare className="h-4 w-4 opacity-70" />
                        <span className="flex-1 line-clamp-2">{s}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            /* Message List */
            <div className="max-w-3xl mx-auto p-4 space-y-6 lg:px-8 pb-8">
              {messages.map((msg: AiChatMessage & { _id?: string }, i: number) => (
                <motion.div
                  key={msg._id || i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`rounded-[20px] px-5 py-3.5 max-w-[85%] md:max-w-[75%] font-medium ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground shadow-md rounded-tr-sm"
                          : "bg-card shadow-sm border border-border/50 rounded-tl-sm text-card-foreground leading-relaxed"
                      }`}
                    >
                      <p className="text-[15px] whitespace-pre-wrap">{msg.content}</p>
                      {msg.model && msg.role === "assistant" && (
                        <div className="flex items-center gap-1.5 mt-3 opacity-40 font-normal">
                          <Bot className="h-3 w-3" />
                          <p className="text-[10px] uppercase tracking-wider">{msg.model}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {msg.role === "assistant" && Array.isArray(msg.visuals) && msg.visuals.length > 0 ? (
                    <ChatVisualRenderer visuals={msg.visuals as AiVisualBlock[]} />
                  ) : null}
                </motion.div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-card shadow-sm border border-border/50 rounded-[20px] rounded-tl-sm px-5 py-4 min-w-[240px] space-y-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      <p className="text-sm font-semibold text-foreground">AI sedang memproses data</p>
                    </div>
                    <progress className="w-full h-2 overflow-hidden rounded-full bg-muted [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary" />
                    <p className="text-xs text-muted-foreground">
                      Menunggu jawaban final dari Convex atau model AI.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-3 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl p-4 shadow-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="flex-1 font-medium">{error}</p>
                  <button onClick={clearError} className="text-xs bg-background/50 hover:bg-background px-3 py-1.5 rounded-lg border border-destructive/20 transition-colors">
                    Tutup
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-border bg-card/80 glass p-3 md:p-4 safe-area-bottom w-full shrink-0">
          <div className="flex items-end gap-2 max-w-4xl mx-auto w-full relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  title="Lampiran dan unggahan"
                  aria-label="Lampiran dan unggahan"
                  className="h-[46px] w-[46px] rounded-2xl shrink-0 shadow-sm border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all hidden sm:flex"
                >
                  <Plus className="h-5 w-5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 mb-2 rounded-xl p-1.5 shadow-xl border-border/60">
                <DropdownMenuItem className="py-2.5 px-3 rounded-lg cursor-pointer hover:bg-primary/5 focus:bg-primary/5">
                  <ImageIcon className="h-4 w-4 mr-3 text-emerald-500" /> 
                  <span className="font-medium text-sm">Upload Gambar</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="py-2.5 px-3 rounded-lg cursor-pointer hover:bg-primary/5 focus:bg-primary/5">
                  <FileText className="h-4 w-4 mr-3 text-blue-500" /> 
                  <span className="font-medium text-sm">Upload File PDF</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1 relative bg-secondary/80 border border-border/50 rounded-[20px] focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 focus-within:bg-card transition-all shadow-sm">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    title="Lampiran dan unggahan"
                    aria-label="Lampiran dan unggahan"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 sm:hidden p-2 text-muted-foreground hover:text-foreground z-10"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 mb-2 rounded-xl p-1.5 shadow-xl sm:hidden">
                  <DropdownMenuItem className="py-2.5 px-3 rounded-lg cursor-pointer">
                    <ImageIcon className="h-4 w-4 mr-3 text-emerald-500" /> 
                    <span className="font-medium">Upload Gambar</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="py-2.5 px-3 rounded-lg cursor-pointer">
                    <FileText className="h-4 w-4 mr-3 text-blue-500" /> 
                    <span className="font-medium">Upload File PDF</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                    if (inputRef.current) inputRef.current.style.height = "auto";
                  }
                }}
                placeholder={noProvider ? "Konfigurasi AI provider..." : "Tanya sesuatu..."}
                disabled={noProvider}
                className="w-full bg-transparent px-4 py-3.5 sm:pl-5 pl-11 text-[15px] outline-none resize-none min-h-[46px] max-h-[150px] overflow-y-auto custom-scrollbar disabled:opacity-50 font-medium placeholder:font-normal leading-relaxed"
                rows={1}
              />
            </div>

            <Button
              size="icon"
              className={`rounded-2xl shrink-0 h-[46px] w-[46px] transition-all shadow-sm flex items-center justify-center ${
                input.trim() && !isLoading 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95" 
                  : "bg-secondary text-muted-foreground cursor-not-allowed opacity-80"
              }`}
              disabled={!input.trim() || isLoading || noProvider}
              onClick={() => {
                handleSubmit();
                if (inputRef.current) inputRef.current.style.height = "auto";
              }}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <Send className="h-5 w-5 ml-0.5" />
              )}
            </Button>
          </div>
          {isLoading && (
            <div className="max-w-4xl mx-auto mt-3">
              <progress className="w-full h-1.5 overflow-hidden rounded-full bg-muted [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary" />
            </div>
          )}
          {activeProvider && (
            <div className="space-y-1.5 mt-2.5">
              <p className="text-[10px] text-muted-foreground text-center font-medium opacity-60">
                ⚡ {activeProvider.displayName} {activeProvider.defaultModel ? `· ${activeProvider.defaultModel}` : ""}
                {activeInstruction ? ` · ${activeInstruction.name}` : ""}
              </p>
              <p className="text-[10px] text-muted-foreground text-center opacity-70">
                AI dapat membuat kesalahan. Gunakan sebagai asisten analisis, bukan satu-satunya sumber keputusan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
