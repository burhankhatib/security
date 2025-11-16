"use client";

import { useState } from "react";

interface CrawlModalProps {
  onCrawlComplete: () => void;
}

export default function CrawlModal({ onCrawlComplete }: CrawlModalProps) {
  const [status, setStatus] = useState<"idle" | "crawling" | "success" | "error">("idle");
  const [progress, setProgress] = useState("");
  const [chunksAdded, setChunksAdded] = useState(0);

  const startCrawl = async () => {
    setStatus("crawling");
    setProgress("Initializing crawl system...");

    try {
      // Step 1: Crawl the website
      setProgress("Crawling website pages...");
      const crawlResponse = await fetch("/api/admin/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          addToKnowledge: true,
          forceRefresh: true 
        }),
      });

      const crawlData = await crawlResponse.json();

      if (!crawlData.success) {
        throw new Error(crawlData.error || "Crawl failed");
      }

      // Multi-source API returns totalChunksAdded
      const chunks = crawlData.totalChunksAdded || 0;
      setChunksAdded(chunks);

      if (chunks === 0) {
        throw new Error("No content was extracted from the website. Please check the crawl source.");
      }

      setProgress(`Successfully crawled ${chunks} content chunks!`);
      
      // Wait a moment to show success message
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStatus("success");
      onCrawlComplete();
    } catch (error) {
      console.error("Crawl error:", error);
      setStatus("error");
      setProgress(error instanceof Error ? error.message : "An unknown error occurred");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-black p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-zinc-100">
            Welcome to Sentinel
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Security Intelligence Agent
          </p>
        </div>

        {status === "idle" && (
          <>
            <div className="mb-6 space-y-3 text-sm text-zinc-300">
              <p>
                Before we begin, I need to crawl and index the knowledge base to provide you with accurate, source-based answers.
              </p>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <p className="text-xs text-emerald-400">
                  ✓ This only needs to happen once<br />
                  ✓ Takes about 10-20 seconds<br />
                  ✓ Data is cached for fast access
                </p>
              </div>
            </div>
            <button
              onClick={startCrawl}
              className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-slate-900 transition hover:bg-zinc-200"
            >
              Start Knowledge Base Setup
            </button>
          </>
        )}

        {status === "crawling" && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
            <p className="text-center text-sm text-zinc-300">{progress}</p>
            {chunksAdded > 0 && (
              <p className="text-center text-xs text-emerald-400">
                {chunksAdded} chunks processed
              </p>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm text-red-400">{progress}</p>
            </div>
            <button
              onClick={startCrawl}
              className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-slate-900 transition hover:bg-zinc-200"
            >
              Try Again
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                <span className="text-2xl">✓</span>
              </div>
            </div>
            <p className="text-sm text-zinc-300">
              Knowledge base ready with {chunksAdded} content chunks!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

