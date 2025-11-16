export const dynamic = "force-dynamic";

export default function RootPage() {
    const timestamp = new Date().toISOString();
    
    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-black via-slate-950 to-black px-4 py-10 text-zinc-100">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 text-center">
                <header className="flex flex-col gap-3">
                    <p className="text-sm tracking-[0.35em] text-zinc-500">SENTINEL</p>
                    <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                        Security Intelligence Agent
                    </h1>
                    <p className="text-base text-zinc-400">
                        Testing deployment on Vercel...
                    </p>
                </header>
                
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
                    <p className="text-lg text-zinc-200 mb-4">
                        ✅ Next.js is working!
                    </p>
                    <p className="text-sm text-zinc-400 mb-4">
                        If you can see this page on Vercel, the deployment is successful.
                    </p>
                    <div className="text-xs text-zinc-500 mt-6 border-t border-white/10 pt-4">
                        <p>Deployment timestamp: {timestamp}</p>
                        <p className="mt-2">Page route: /</p>
                        <p className="mt-2">Framework: Next.js 16.0.1</p>
                        <p className="mt-2">Rendering: Dynamic (SSR)</p>
                    </div>
                    <div className="mt-6 flex flex-col gap-2">
                        <a 
                            href="/api/health" 
                            className="text-sm text-emerald-400 hover:text-emerald-300 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            → Check API Health Endpoint
                        </a>
                        <a 
                            href="/studio" 
                            className="text-sm text-blue-400 hover:text-blue-300 underline"
                        >
                            → Open Sanity Studio (if configured)
                        </a>
                    </div>
                </div>
            </div>
        </main>
    );
}

