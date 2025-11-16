export const dynamic = "force-dynamic";

export default function RootPage() {
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
                    <p className="text-lg text-zinc-200">
                        ✅ Next.js is working!
                    </p>
                    <p className="mt-4 text-sm text-zinc-400">
                        If you can see this page on Vercel, the deployment is successful.
                    </p>
                </div>
            </div>
        </main>
    );
}

