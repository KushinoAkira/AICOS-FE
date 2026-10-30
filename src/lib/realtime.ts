/**
 * Real-time channels of the gateway (SignalR): /hubs/orders for customers and tables, /hubs/kitchen for the bar and cashier screens of a branch.
 * A hub only says "something changed": the screens refetch the affected queries. While a hub is not connected the screens keep polling,
 * so a dropped connection costs freshness, never correctness.
 */
import { useEffect, useState } from "react"
import { HubConnection, HubConnectionBuilder, HttpTransportType, LogLevel } from "@microsoft/signalr"
import { useQueryClient, type QueryKey } from "@tanstack/react-query"
import { useAuth } from "../context/AuthContext"
import { env } from "../config/env"
import { API_BASE_URL } from "./api/http"
import { tokenStore } from "./api/tokenStore"
import { guestSessionToken } from "./api/be/orders"

/** Poll interval for a screen: slow while its hub is connected, the given fast interval otherwise. */
export const pollWhile = (connected: boolean, fastMs: number) => (connected ? 60_000 : fastMs)

const hubUrl = (path: string) => `${new URL(API_BASE_URL).origin}${path}`

interface ChannelOptions {
  path: string
  /** Query string parameters of the connection (the guest session token). */
  query?: () => Promise<Record<string, string>>
  /** Server messages that mean "refetch". */
  events: string[]
  /** Called after every (re)connection, for hubs that need a join call. */
  onConnected?: (connection: HubConnection) => Promise<void>
  invalidate: QueryKey[]
  enabled: boolean
  /** Changes when the channel has to be rebuilt (another table, another user). */
  scope: string
}

function useChannel({ path, query, events, onConnected, invalidate, enabled, scope }: ChannelOptions): boolean {
  const qc = useQueryClient()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled || env.useMock) return
    let disposed = false
    let connection: HubConnection | null = null
    const refresh = () => invalidate.forEach((queryKey) => void qc.invalidateQueries({ queryKey }))

    void (async () => {
      try {
        const params = new URLSearchParams(query ? await query() : {}).toString()
        if (disposed) return
        connection = new HubConnectionBuilder()
          .withUrl(`${hubUrl(path)}${params ? `?${params}` : ""}`, {
            accessTokenFactory: () => tokenStore.get()?.accessToken ?? "",
            transport: HttpTransportType.WebSockets,
            skipNegotiation: true,
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
          .configureLogging(LogLevel.None)
          .build()
        for (const name of events) connection.on(name, refresh)
        connection.onreconnecting(() => setConnected(false))
        connection.onreconnected(async () => {
          try { await onConnected?.(connection!) } catch { return }
          setConnected(true)
          refresh()
        })
        connection.onclose(() => setConnected(false))
        await connection.start()
        await onConnected?.(connection)
        if (disposed) return
        setConnected(true)
        refresh()
      } catch {
        if (!disposed) setConnected(false)
      }
    })()

    return () => {
      disposed = true
      setConnected(false)
      void connection?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, scope, path])

  return connected
}

/** The orders of one table, pushed to every guest of that table (and the table's close). Returns whether the channel is connected. */
export function useGuestRealtime(qrToken: string): boolean {
  return useChannel({
    path: "/hubs/orders",
    query: async () => ({ sessionToken: await guestSessionToken(qrToken) }),
    events: ["OrderChanged", "SessionClosed"],
    invalidate: [["guest", qrToken, "orders"]],
    enabled: qrToken !== "",
    scope: `guest:${qrToken}`,
  })
}

/** The signed-in customer's own orders and notifications. */
export function useMemberRealtime(): boolean {
  const { user } = useAuth()
  return useChannel({
    path: "/hubs/orders",
    events: ["OrderChanged"],
    invalidate: [["mine"], ["notices"]],
    enabled: user?.role === "Customer",
    scope: `member:${user?.id ?? ""}`,
  })
}

/** Bar and cashier screens of the user's branch: new tickets, ticket status changes, orders ready for pickup. */
export function useBranchRealtime(): boolean {
  const { user } = useAuth()
  const role = user?.role
  const branchId = user?.branchId
  const joins = [
    ...(role === "Barista" || role === "BranchManager" ? ["JoinKitchenGroup"] : []),
    ...(role === "Cashier" || role === "BranchManager" ? ["JoinPosGroup"] : []),
  ]
  return useChannel({
    path: "/hubs/kitchen",
    events: ["ReceiveKitchenTicket", "TicketStatusChanged", "OrderReadyForPickup"],
    onConnected: async (connection) => {
      for (const method of joins) await connection.invoke(method, branchId)
    },
    invalidate: [["orders"], ["tables"], ["payments"]],
    enabled: !!branchId && joins.length > 0,
    scope: `branch:${role}:${branchId}`,
  })
}
