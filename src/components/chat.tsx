'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Send,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { useChat } from "@ai-sdk/react"
import { cn } from '@/lib/utils'
import { DefaultChatTransport } from 'ai'
import { mapChatHistory } from '@/lib/ai'
import useChatHistory from '@/hooks/chat/useChatHistory'
import { Input } from './ui/input'
import { MarkdownRenderer } from './pages/chat/MarkdownRender'
import { toast } from 'sonner'
import { Button } from './ui/Button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import SourceRender from './pages/chat/SourceRender'

export function FloatingAIChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')

  const { data: messages, refetch, isLoading } = useChatHistory()
  const {
    messages: chatMessages, sendMessage,
    stop, status,
    setMessages
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }),
    // onFinish: () => {
    //   refetch();
    // },
    messages: mapChatHistory(messages),

  });
  useEffect(() => {
    if (!isLoading && messages) {
      setMessages(mapChatHistory(messages));
    }
  }, [messages, isLoading, setMessages]);
  const deleteChat = async () => {
    try {
      const res = await fetch('/api/chat', {
        method: "DELETE",
        credentials: "include"
      })
      if (res.ok) {
        toast.success("Berhasil hapus chat")
        refetch()
        setMessages([])
        return
      }
      toast.error("Gagal hapus chat")
    } catch (error) {
      console.error(error)
      toast.error('Terjadi kesalahan')
    }
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "absolute pointer-events-auto cursor-pointer bottom-6 right-6 z-50",
          "flex size-14 items-center justify-center",
          "rounded-full bg-white text-primary-foreground",
          "shadow-lg shadow-black/20",
          "transition-all duration-200",
          "hover:scale-105 hover:shadow-xl",
        )}
        aria-label="Open AI assistant"
      >
        <Sparkles className="size-6 text-blue-500" />
      </button>

      {/* Chat window */}
      {open && (
        <div
          className={cn(
            "pointer-events-auto absolute bottom-6 right-6 z-50 flex flex-col",
            "h-[min(580px,calc(100vh-48px))] w-[380px] max-w-[calc(100vw-48px)]",
            "overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/50 backdrop-blur-xl",
            "dark:border-slate-800 dark:bg-slate-950/50",
            "shadow-[0_20px_50px_rgba(8,_112,_184,_0.12)]",
            "transition-all duration-300"
          )}
        >

          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-slate-900">
            {/* Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                  <Bot className="size-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-none">
                    AI Assistant
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                {messages.length > 0 &&
                  <button
                    type="button"
                    onClick={deleteChat}
                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100 transition-colors"
                    title="Delete chat"
                  >
                    <Trash2 className="size-5 text-red-500" />
                  </button>}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                  title="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((m: any) => {
                const text = m.parts
                  ?.filter((p: any) => p.type === "text")
                  .map((p: any) => p.text)
                  .join("");

                const isUser = m.role === "user";

                const reasoning = m.parts
                  ?.filter((p: any) => p.type === "reasoning")
                  .map((p: any) => p.text)
                  .join("");

                const isStreaming = status === "streaming";
                const tools = m.toolInvocations ?? [];

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex min-w-0 w-full",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "flex min-w-0 max-w-full flex-col",
                        isUser ? "items-end" : "items-start"
                      )}
                    >
                      {/* Message bubble */}
                      <div
                        className={cn(
                          "min-w-0 max-w-[90%] overflow-hidden rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-all",
                          isUser
                            ? "bg-blue-600 text-white rounded-br-xs font-normal"
                            : "bg-slate-100 text-slate-800 rounded-bl-xs dark:bg-slate-800 dark:text-slate-100 border border-slate-200/50 dark:border-slate-700/50"
                        )}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap break-words">
                            {text}
                          </p>
                        ) : (
                          <div className="flex min-w-0 max-w-full flex-col gap-2">
                            {/* Reasoning */}
                            {reasoning && (
                              <Collapsible
                                defaultOpen
                                className="min-w-0 max-w-full rounded-lg"
                              >
                                <CollapsibleTrigger className="flex w-full min-w-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="min-w-0 font-medium">
                                    {isStreaming ? "Thinking..." : "Thought process"}
                                  </span>
                                </CollapsibleTrigger>

                                <CollapsibleContent className="min-w-0 max-w-full">
                                  <div className="mt-2 max-h-60 overflow-y-auto break-words whitespace-pre-wrap border-l-2 border-slate-300 pl-3 text-xs leading-relaxed text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    {reasoning}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}

                            {/* Final answer */}
                            {text && (
                              <MarkdownRenderer content={text} />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Tool executions - outside message bubble */}
                      {!isUser && tools.length > 0 && (
                        <div className="mt-1.5 w-full min-w-0 space-y-0.5 px-1">
                          {tools.map((tool: any, idx: number) => (
                            <SourceRender
                              key={tool.id ?? idx}
                              executionHistories={tool}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Streaming / thinking indicator */}
              {status === "submitted" && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-xs px-3.5 py-2 text-xs bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input section */}
            <div className="border-t border-slate-100 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!input || input.trim().length === 0) return;
                  sendMessage(
                    { text: input },
                    {
                      body: {
                        text: input,
                      },
                    }
                  );
                  setInput("");
                }}
                className="flex w-full items-center gap-2"
              >
                <Input
                  placeholder="Ask something..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-sm focus-visible:ring-2 focus-visible:ring-blue-600"
                  disabled={status === "streaming"}
                />

                {status === "streaming" ? (
                  <Button
                    type="button"
                    size="icon"
                    onClick={stop}
                    className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 shrink-0"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!input || input.trim().length === 0}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shrink-0 transition-all active:scale-95"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
