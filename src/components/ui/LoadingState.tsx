export default function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--foreground)]" />
        <p className="text-[13px] text-[var(--muted-foreground)]">Loading...</p>
      </div>
    </div>
  );
}
