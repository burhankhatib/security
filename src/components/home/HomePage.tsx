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
  }>({ loading: true, ready: false, message: "Initializing..." });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const conversationRef = useRef<HTMLDivElement>(null);

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

  // Auto-crawl on page load
  useEffect(() => {
    let mounted = true;

    const initializeCrawl = async () => {
      try {
        // Check cache status first
        const checkResponse = await fetch("/api/crawl/check");
        const checkData = await checkResponse.json();

        if (checkData.cacheValid) {
          if (mounted) {
            setCrawlStatus({
              loading: false,
              ready: true,
              message: `Ready (using cached data from ${checkData.cacheAgeMinutes} minutes ago)`,
            });
          }
          return;
        }

        // Cache expired or doesn't exist - trigger crawl
        if (mounted) {
          setCrawlStatus({
            loading: true,
            ready: false,
            message: "Loading website content...",
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
              message: crawlData.cached
                ? `Ready (using cached data)`
                : `Ready (${crawlData.knowledgeBase?.chunksAdded || 0} chunks loaded)`,
            });
          } else {
            setCrawlStatus({
              loading: false,
              ready: false,
              message: "Content loading failed. You can still ask questions.",
            });
          }
        }
      } catch (error) {
        if (mounted) {
          setCrawlStatus({
            loading: false,
            ready: false,
            message: "Content loading failed. You can still ask questions.",
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
    <main className="flex min-h-screen w-full items-center justify-center bg-linear-to-b from-black via-slate-950 to-black px-4 py-10 text-zinc-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-3 text-center sm:text-left">
          <p className="text-sm tracking-[0.35em] text-zinc-500">SENTINEL</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Security Intelligence Agent
          </h1>
          <p className="text-base text-zinc-400 sm:max-w-xl">
            Ask anything about securing your applications. Sentinel delivers clear, actionable guidance—no distractions, just the essentials.
          </p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span
                className={`h-1.5 w-1.5 rounded-full ${crawlStatus.ready
                  ? "bg-emerald-400/80 animate-pulse"
                  : crawlStatus.loading || isRefreshing
                    ? "bg-yellow-400/80 animate-pulse"
                    : "bg-zinc-500/60"
                  }`}
              />
              <span>{crawlStatus.message}</span>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing || crawlStatus.loading}
              className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              title="Force refresh crawl and clear previous data"
            >
              {isRefreshing ? "Refreshing..." : "Refresh Crawl"}
            </button>
          </div>
        </header>

        <section className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
          <div
            ref={conversationRef}
            className="flex-1 space-y-6 overflow-y-auto px-6 py-8 text-left"
          >
            {messages.length === 0 && (
              <div className="mx-auto max-w-lg text-center text-zinc-400">
                <p className="text-lg font-medium text-zinc-200">
                  “Security isn&apos;t a checkbox—it&apos;s a strategy.”
                </p>
                <p className="mt-4 text-sm leading-7">
                  Ask about vulnerability assessments, hardening steps, secure SDLC practices, or incident readiness plans. Sentinel keeps things straightforward and focused on what matters.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-3xl px-5 py-4 text-sm leading-relaxed shadow-lg shadow-black/10 backdrop-blur-sm transition-all ${message.role === "user"
                    ? "bg-white text-slate-900"
                    : "bg-black/60 text-zinc-100 border border-white/10"
                    }`}
                >
                  <p className="mb-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
                    {message.role === "user" ? "You" : "Sentinel"}
                  </p>
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <p key={index} className="whitespace-pre-line text-sm leading-7 text-inherit">
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
                <div className="max-w-[80%] rounded-3xl px-5 py-4 bg-black/60 text-zinc-100 border border-white/10 shadow-lg shadow-black/10 backdrop-blur-sm">
                  <p className="mb-3 text-xs uppercase tracking-[0.3em] text-zinc-500">Sentinel</p>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400/80 animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-emerald-400/80 animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-emerald-400/80 animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-zinc-400">Analyzing and generating response...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-black/40 px-6 py-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {error && (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-600/50 bg-red-600/10 px-4 py-3 text-sm text-red-200">
                  <span>{error.message}</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      void handleRetry();
                    }}
                    className="rounded-full border border-red-500/40 px-3 py-1 text-xs font-medium uppercase tracking-wide text-red-200 transition hover:bg-red-500/10"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-zinc-500">
                <span
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${isStreaming
                    ? "bg-emerald-400/80 shadow-[0_0_12px_rgba(74,222,128,0.6)] animate-pulse"
                    : assistantActive
                      ? "bg-emerald-400/80 shadow-[0_0_8px_rgba(74,222,128,0.4)]"
                      : "bg-zinc-500/60"
                    }`}
                />
                {isStreaming
                  ? "Generating secure guidance"
                  : assistantActive
                    ? "Ready for your next question"
                    : "Begin with any security scenario"}
              </div>

              <div className="flex items-end gap-3">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submitMessage();
                    }
                  }}
                  placeholder="Describe the environment or challenge you want to secure..."
                  className="min-h-[120px] flex-1 resize-none rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-zinc-100 transition focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  disabled={isStreaming}
                />

                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={!input.trim() || isStreaming}
                    className="h-12 w-32 rounded-full bg-white text-sm font-semibold tracking-wide text-slate-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-zinc-400"
                  >
                    Send
                  </button>
                  {isStreaming && (
                    <button
                      type="button"
                      onClick={() => {
                        void stop();
                      }}
                      className="h-12 w-32 rounded-full border border-white/20 text-sm font-medium tracking-wide text-zinc-200 transition hover:bg-white/10"
                    >
                      Stop
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-zinc-500">
                Sentinel uses OpenAI&apos;s `gpt-5-mini` model via Vercel AI SDK. Responses are optimized for concise, actionable cybersecurity insight.
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
