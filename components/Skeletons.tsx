// LARAPLAY — Skeleton loaders avec shimmer (V2 §11)
// Usage: pendant chargement async, jamais d'écran vide.

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`shrink-0 w-[180px] sm:w-[220px] md:w-[280px] lg:w-[300px] rounded-md overflow-hidden bg-[var(--bg-elevated)] ${className}`}
    >
      <div className="aspect-video skeleton-shimmer" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 w-4/5 skeleton-shimmer rounded" />
        <div className="h-2 w-2/5 skeleton-shimmer rounded" />
      </div>
    </div>
  );
}

export function RowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <section className="mb-12">
      <div className="px-4 md:px-12 mb-4">
        <div className="h-6 w-48 skeleton-shimmer rounded" />
      </div>
      <div className="flex gap-3 overflow-hidden px-4 md:px-12 py-4">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <section className="relative w-full aspect-video max-h-[85vh] min-h-[480px] bg-[var(--bg-main)] -mt-[72px]">
      <div className="absolute inset-0 skeleton-shimmer" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />
      <div className="absolute inset-0 flex items-end pb-16 md:pb-24 z-10">
        <div className="max-w-3xl px-4 md:px-12 space-y-4">
          <div className="h-12 w-2/3 skeleton-shimmer rounded" />
          <div className="h-4 w-3/4 skeleton-shimmer rounded" />
          <div className="flex gap-3">
            <div className="h-11 w-32 skeleton-shimmer rounded" />
            <div className="h-11 w-32 skeleton-shimmer rounded" />
          </div>
        </div>
      </div>
    </section>
  );
}
