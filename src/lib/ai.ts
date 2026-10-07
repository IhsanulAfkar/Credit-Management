
import { TChat } from "@/hooks/chat/useChatHistory"
import { UIMessage } from "ai"
export function mapChatHistory(chats: TChat[]): UIMessage[] {
  return chats.map((chat) => ({
    id: String(chat.id),
    role: chat.role,

    parts: [
      ...(chat.reasoning
        ? [
          {
            type: "reasoning" as const,
            text: chat.reasoning,
          },
        ]
        : []),

      {
        type: "text" as const,
        text: chat.content,
      },
    ],


    toolInvocations: chat.chatExecutionHistories,
  }));
}