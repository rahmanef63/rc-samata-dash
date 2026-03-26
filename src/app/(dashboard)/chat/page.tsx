import { preloadQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import ChatPage from "@/features/chat/components/ChatPage";

export default async function Page() {
  const [preloadedAiConfig, preloadedSessions] = await Promise.all([
    preloadQuery(api.features.ai.queries.getAiConfig),
    preloadQuery(api.features.ai.queries.listChatSessions),
  ]);

  return (
    <ChatPage
      preloadedAiConfig={preloadedAiConfig}
      preloadedSessions={preloadedSessions}
    />
  );
}
