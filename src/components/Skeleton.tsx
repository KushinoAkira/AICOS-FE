interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ width = "100%", height = "16px", className = "", style }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  )
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: "1px solid #E6DCCB" }}>
      <Skeleton width={32} height={32} style={{ borderRadius: "50%", flexShrink: 0 }} />
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} height={14} style={{ flex: i === 0 ? 2 : 1 }} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="p-6 rounded-2xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
      <Skeleton width="40%" height={14} style={{ marginBottom: "12px" }} />
      <Skeleton width="65%" height={32} style={{ marginBottom: "8px" }} />
      <Skeleton width="30%" height={12} />
    </div>
  )
}
