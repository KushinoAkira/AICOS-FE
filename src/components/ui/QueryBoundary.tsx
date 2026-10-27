import type { UseQueryResult } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { env } from "../../config/env"
import { ApiError } from "../../lib/api/http"
import { ErrorState, LoadingState } from "./States"

/** Loading / error (with retry) wrapper for a React Query result. */
export function QueryBoundary<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  if (query.isPending) return <LoadingState />
  if (query.isError) {
    const net = query.error instanceof ApiError && query.error.isNetwork
    const title = net
      ? (env.useMock ? "Không tải được dữ liệu giả lập" : "Không thể kết nối máy chủ")
      : "Không tải được dữ liệu"
    return <ErrorState title={title} description={query.error.message} onRetry={() => void query.refetch()} />
  }
  return <>{children(query.data)}</>
}
