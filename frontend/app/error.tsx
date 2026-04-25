"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-black/70">{error.message}</p>
      <button type="button" className="mt-6 rounded-lg bg-[var(--vrr-teal)] px-4 py-2 text-white" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
