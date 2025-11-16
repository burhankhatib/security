"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export default function HomePage() {
  const [input, setInput] = useState("");
  const [crawlStatus, setCrawlStatus] = useState<{
    loading: boolean;
    ready: boolean;
    message: string;
  }>({ loading: true, ready: false, message: "Loading knowledge base..." });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/agent" }),
    []
  );

  const { messages, sendMessage, status, stop, error, clearError, regenerate } =
    useChat({
      id: "security-agent",
      transport,
    });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTo({
        top: conversationRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, status]);

  const assistantActive = useMemo(() => messages.some((msg) => msg.role === "assistant"), [messages]);

  // Auto-crawl on page load with cache
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    let mounted = true;

    const initializeCrawl = async () => {
      try {
        // Check cache status first
        const checkResponse = await fetch("/api/crawl/check");
        const checkData = await checkResponse.json();

        if (checkData.cacheValid && mounted) {
          setCrawlStatus({
            loading: false,
            ready: true,
            message: `Ready (cached ${checkData.cacheAgeMinutes}m ago)`,
          });
          return;
        }

        // Cache expired or doesn't exist - trigger crawl
        if (mounted) {
          setCrawlStatus({
            loading: true,
            ready: false,
            message: "Crawling website...",
          });
        }

        const crawlResponse = await fetch("/api/admin/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addToKnowledge: true }),
        });

        const crawlData = await crawlResponse.json();

        if (mounted) {
          if (crawlData.success) {
            setCrawlStatus({
              loading: false,
              ready: true,
              message: `Ready (${crawlData.knowledgeBase?.chunksAdded || 0} chunks)`,
            });
          } else {
            setCrawlStatus({
              loading: false,
              ready: false,
              message: "You can still ask questions",
            });
          }
        }
      } catch (error) {
        if (mounted) {
          setCrawlStatus({
            loading: false,
            ready: false,
            message: "You can still ask questions",
          });
        }
        console.error("Crawl initialization error:", error);
      }
    };

    void initializeCrawl();

    return () => {
      mounted = false;
    };
  }, []);

  const submitMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) {
      return;
    }

    await sendMessage({ text: trimmed });
    setInput("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMessage();
  };

  const handleRetry = async () => {
    if (messages.length === 0) return;
    await regenerate();
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setCrawlStatus({
      loading: true,
      ready: false,
      message: "Refreshing website content...",
    });

    try {
      const crawlResponse = await fetch("/api/admin/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addToKnowledge: true, forceRefresh: true }),
      });

      const crawlData = await crawlResponse.json();

      if (crawlData.success) {
        setCrawlStatus({
          loading: false,
          ready: true,
          message: crawlData.knowledgeBase?.chunksAdded
            ? `Ready (${crawlData.knowledgeBase.chunksAdded} chunks loaded)`
            : `Ready (${crawlData.pageCount || 0} pages crawled)`,
        });
      } else {
        setCrawlStatus({
          loading: false,
          ready: false,
          message: crawlData.error || "Refresh failed. Check console for details.",
        });
      }
    } catch (error) {
      console.error("Manual refresh error:", error);
      setCrawlStatus({
        loading: false,
        ready: false,
        message: "Refresh failed. Check console for details.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-black via-slate-950 to-black px-4 py-6 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="flex items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              SENTINEL
            </h1>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span
                className={`h-1.5 w-1.5 rounded-full ${crawlStatus.ready
                  ? "bg-emerald-400"
                  : crawlStatus.loading || isRefreshing
                    ? "bg-yellow-400 animate-pulse"
                    : "bg-zinc-500"
                  }`}
              />
              <span>{crawlStatus.message}</span>
            </div>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || crawlStatus.loading}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            title="Refresh knowledge base"
          >
            {isRefreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </header>

        <section className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur" style={{ height: 'calc(100vh - 140px)' }}>
          <div
            ref={conversationRef}
            className="flex-1 space-y-4 overflow-y-auto px-6 py-6"
          >
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-md text-center text-zinc-400">
                  <p className="text-base font-medium text-zinc-200">
                    Ask me anything about security
                  </p>
                  <p className="mt-2 text-sm">
                    I have access to the latest information and can help with security questions, best practices, and recommendations.
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user"
                    ? "bg-white text-slate-900"
                    : "bg-black/60 text-zinc-100 border border-white/10"
                    }`}
                >
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <p key={index} className="whitespace-pre-line text-sm leading-6">
                          {part.text}
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}

            {isStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-black/60 text-zinc-100 border border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-zinc-400">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-black/40 px-4 py-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {error && (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-red-600/50 bg-red-600/10 px-3 py-2 text-sm text-red-200">
                  <span className="text-xs">{error.message}</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      void handleRetry();
                    }}
                    className="rounded-lg border border-red-500/40 px-2 py-1 text-xs text-red-200 transition hover:bg-red-500/10"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submitMessage();
                    }
                  }}
                  placeholder="Ask me anything about security..."
                  className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 transition focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                  rows={3}
                  disabled={isStreaming}
                />

                <div className="flex flex-col gap-2">
                  {!isStreaming ? (
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="h-10 w-20 rounded-lg bg-white text-sm font-medium text-slate-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-zinc-400"
                    >
                      Send
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        void stop();
                      }}
                      className="h-10 w-20 rounded-lg border border-white/20 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-zinc-500">
                Press Enter to send • Shift+Enter for new line
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
