import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "../context/AuthContext"
import { branchesApi, type BranchDto } from "../lib/api/identity"
import {
  BRANCH_CHANGE_EVENT,
  clearActiveBranchId,
  getActiveBranchId,
  setActiveBranchId,
} from "../lib/branch"

/**
 * Resolves which branch staff screens operate on (BR-05).
 * - Branch Manager / Cashier / Barista: locked to `user.branchId` (JWT). No switcher.
 * - Brand Admin: may pick any branch of their tenant (session).
 * - Super Admin: no branch scope.
 */
export function useActiveBranch() {
  const { user, role } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(() => getActiveBranchId())

  useEffect(() => {
    const sync = () => setSessionId(getActiveBranchId())
    window.addEventListener(BRANCH_CHANGE_EVENT, sync)
    return () => window.removeEventListener(BRANCH_CHANGE_EVENT, sync)
  }, [])

  const locked = role === "branchManager" || role === "cashier" || role === "barista"
  const canSwitch = role === "brandAdmin"

  // Lock session storage to the account branch so X-Branch cannot drift for staff.
  useEffect(() => {
    if (locked && user?.branchId) {
      setActiveBranchId(user.branchId)
    }
    if (locked && !user?.branchId) {
      clearActiveBranchId()
    }
  }, [locked, user?.branchId])

  const branches = useQuery({
    queryKey: ["branches", "active", role, user?.branchId],
    queryFn: branchesApi.listActive,
    enabled: (canSwitch || locked) && !!user,
    staleTime: 60_000,
    retry: 1,
  })

  // Drop Brand Admin session pick if it is not in this tenant's list.
  useEffect(() => {
    if (!canSwitch || !sessionId || !branches.data) return
    if (!branches.data.some((b) => b.id === sessionId)) clearActiveBranchId()
  }, [canSwitch, sessionId, branches.data])

  const branchId = locked ? (user?.branchId ?? null) : canSwitch ? sessionId : null

  const branch: BranchDto | null = useMemo(() => {
    if (!branchId || !branches.data) return null
    return branches.data.find((b) => b.id === branchId) ?? null
  }, [branchId, branches.data])

  function select(id: string) {
    if (!canSwitch) return
    if (branches.data && !branches.data.some((b) => b.id === id)) return
    setActiveBranchId(id)
  }

  function clear() {
    if (!canSwitch) return
    clearActiveBranchId()
  }

  return {
    branchId,
    branch,
    branches: branches.data ?? [],
    branchesLoading: branches.isPending,
    canSwitch,
    locked,
    needsSelection: canSwitch && !branchId,
    select,
    clear,
  }
}
