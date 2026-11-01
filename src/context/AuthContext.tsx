import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { authApi, type LoginOpts, type UserDto } from "../lib/api/identity"
import { tokenStore } from "../lib/api/tokenStore"
import { clearActiveBranchId } from "../lib/branch"
import { HOME_PAGE } from "../router/rbac"
import { normalizeRole, type Role } from "../router/roles"
import type { Page } from "../router/pages"

export function webRoleOf(user: UserDto | null): Role | null {
  return normalizeRole(user)
}

export function homePageOf(user: UserDto): Page {
  const role = normalizeRole(user)
  return role ? HOME_PAGE[role] : "staff-entry"
}

interface AuthContextValue {
  user: UserDto | null
  role: Role | null
  isAuthenticated: boolean
  login: (login: string, password: string, opts?: LoginOpts) => Promise<UserDto>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(() => tokenStore.get()?.user ?? null)

  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener("aicos:session-expired", onExpired)
    return () => window.removeEventListener("aicos:session-expired", onExpired)
  }, [])

  const login = useCallback(async (loginName: string, password: string, opts?: LoginOpts) => {
    const session = await authApi.login(loginName.trim(), password, opts)
    setUser(session.user)
    return session.user
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    clearActiveBranchId()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, role: webRoleOf(user), isAuthenticated: user !== null, login, logout }),
    [user, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
