export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "published"
      ? "bg-emerald-100 text-emerald-800"
      : status === "pending"
        ? "bg-amber-100 text-amber-800"
        : status === "rejected" || status === "removed"
          ? "bg-red-100 text-red-800"
          : "bg-black/10 text-black/70";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
}
