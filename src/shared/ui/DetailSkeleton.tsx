import { Skeleton } from './Skeleton'

/**
 * Mirrors the dossier geometry — a square portrait beside a stack of fields,
 * with a roster underneath — so nothing shifts when the data lands.
 */
export function DetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <Skeleton className="aspect-square w-full rounded-none" />
        <div className="space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}
