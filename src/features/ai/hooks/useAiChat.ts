"use client";

import { useState, useCallback } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { AiChatMessage } from "../types";

export function useAiChat(sessionId: Id<"aiChatSessions"> | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messages = useQuery(
    api.features.ai.queries.getChatMessages,
    sessionId ? { sessionId } : "skip"
  );

  const addMessage = useMutation(api.features.ai.mutations.addChatMessage);
  const chatCompletion = useAction(api.features.ai.actions.chatCompletion);

  const sendMessage = useCallback(
    async (content: string, systemPrompt?: string, branchId?: Id<"branches">) => {
      if (!sessionId || !content.trim()) return;

      setError(null);
      setIsLoading(true);

      try {
        // Store user message
        await addMessage({ sessionId, role: "user", content });

        // Build message history for API
        const history: AiChatMessage[] = [];
        if (systemPrompt) {
          history.push({ role: "system", content: systemPrompt });
        }
        if (messages) {
          for (const m of messages) {
            history.push({ role: m.role, content: m.content });
          }
        }
        history.push({ role: "user", content });

        // Call AI with RAG enabled by default
        const result = await chatCompletion({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          useRag: true,
          branchId,
        });

        // Store assistant response
        await addMessage({
          sessionId,
          role: "assistant",
          content: result.content,
          model: result.model,
          tokenUsage: result.tokenUsage,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal mengirim pesan.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, messages, addMessage, chatCompletion]
  );

  return {
    messages: messages || [],
    isLoading,
    error,
    clearError: () => setError(null),
    sendMessage,
  };
}
