import type { UseQueryResult } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { ApiError } from "../../lib/api/http"
import { ErrorState, LoadingState } from "./States"

/** Loading / error (with retry) wrapper for a React Query result. */
export function QueryBoundary<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  if (query.isPending) return <LoadingState />
  if (query.isError) {
    const net = query.error instanceof ApiError && query.error.isNetwork
    return <ErrorState title={net ? "Không thể kết nối máy chủ" : "Không tải được dữ liệu"} description={query.error.message} onRetry={() => void query.refetch()} />
  }
  return <>{children(query.data)}</>
}
