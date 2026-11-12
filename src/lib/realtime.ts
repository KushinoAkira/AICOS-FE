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
import { API_BASE_URL, freshAccessToken } from "./api/http"
import { guestSessionToken } from "./api/be/orders"

/** Poll interval for a screen: slow while its hub is connected, the given fast interval otherwise. */
export const pollWhile = (connected: boolean, fastMs: number) => (connected ? 60_000 : fastMs)

const hubUrl = (path: string) => `${new URL(API_BASE_URL).origin}${path}`

interface ChannelOptions {
  path: string
  /** Query string parameters of the connection (the guest session token); `epoch` counts the restarts. */
  query?: (epoch: number) => Promise<Record<string, string>>
  /** Server messages after which the connection is rebuilt (the table session it follows has ended). */
  restartOn?: string[]
  /** Server messages that mean "refetch". */
  events: string[]
  /** Called after every (re)connection, for hubs that need a join call. */
  onConnected?: (connection: HubConnection) => Promise<void>
  invalidate: QueryKey[]
  enabled: boolean
  /** Changes when the channel has to be rebuilt (another table, another user). */
  scope: string
}

function useChannel({ path, query, restartOn = [], events, onConnected, invalidate, enabled, scope }: ChannelOptions): boolean {
  const qc = useQueryClient()
  const [connected, setConnected] = useState(false)
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    if (!enabled || env.useMock) return
    let disposed = false
    let connection: HubConnection | null = null
    const refresh = () => invalidate.forEach((queryKey) => void qc.invalidateQueries({ queryKey }))

    void (async () => {
      try {
        const params = new URLSearchParams(query ? await query(epoch) : {}).toString()
        if (disposed) return
        connection = new HubConnectionBuilder()
          .withUrl(`${hubUrl(path)}${params ? `?${params}` : ""}`, {
            accessTokenFactory: freshAccessToken,
            transport: HttpTransportType.WebSockets,
            skipNegotiation: true,
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
          .configureLogging(LogLevel.None)
          .build()
        for (const name of events) connection.on(name, refresh)
        for (const name of restartOn) connection.on(name, () => setEpoch((n) => n + 1))
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
  }, [enabled, scope, path, epoch])

  return connected
}

/** The orders of one table, pushed to every guest of that table (and the table's close). Returns whether the channel is connected. */
export function useGuestRealtime(qrToken: string): boolean {
  return useChannel({
    path: "/hubs/orders",
    // After the table session ended, the next connection scans the table again: the old session's group never gets new orders.
    query: async (epoch) => ({ sessionToken: await guestSessionToken(qrToken, epoch > 0) }),
    events: ["OrderChanged", "SessionClosed"],
    restartOn: ["SessionClosed"],
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
    events: ["ReceiveKitchenTicket", "TicketStatusChanged", "OrderReadyForPickup", "TableBillRequested", "PaymentSucceeded"],
    onConnected: async (connection) => {
      for (const method of joins) await connection.invoke(method, branchId)
    },
    invalidate: [["orders"], ["tables"], ["payments"]],
    enabled: !!branchId && joins.length > 0,
    scope: `branch:${role}:${branchId}`,
  })
}
