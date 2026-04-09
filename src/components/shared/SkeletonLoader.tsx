// Componente de skeleton loader reutilizable

export function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
    </div>
  )
}

export function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="bg-gray-100 rounded" style={{ height: `${height}px` }}>
        <div className="flex items-end justify-around h-full p-4 gap-2">
          {[60, 80, 45, 90, 70, 55, 85].map((height, i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-t w-full"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SkeletonFilters() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 rounded w-40"></div>
          <div className="h-10 bg-gray-200 rounded w-40"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 rounded w-64"></div>
          <div className="h-10 bg-gray-200 rounded w-52"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    </div>
  )
}
