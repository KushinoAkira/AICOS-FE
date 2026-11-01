import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"

type FloorPublishedDetail = { branchId: string; floorId: string }
type TableStatusDetail = { branchId: string; tableId: string; status: string }

/**
 * Mock SignalR bridge: floorDb dispatches window events; this hook invalidates
 * react-query caches so viewers refresh without a real hub.
 */
export function useFloorRealtime(branchId: string | null | undefined) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!branchId) return

    const onPublished = (e: Event) => {
      const d = (e as CustomEvent<FloorPublishedDetail>).detail
      if (!d || d.branchId !== branchId) return
      void qc.invalidateQueries({ queryKey: ["floors", branchId] })
      void qc.invalidateQueries({ queryKey: ["floor-layout", d.floorId] })
    }

    const onTableStatus = (e: Event) => {
      const d = (e as CustomEvent<TableStatusDetail>).detail
      if (!d || d.branchId !== branchId) return
      void qc.invalidateQueries({ queryKey: ["tables", branchId] })
      void qc.invalidateQueries({ queryKey: ["tables"] })
    }

    window.addEventListener("aicos:floor-published", onPublished)
    window.addEventListener("aicos:table-status", onTableStatus)
    return () => {
      window.removeEventListener("aicos:floor-published", onPublished)
      window.removeEventListener("aicos:table-status", onTableStatus)
    }
  }, [branchId, qc])
}
