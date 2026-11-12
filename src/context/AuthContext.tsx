import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { authApi, type LoginOpts, type UserDto } from "../lib/api/identity"
import { tokenStore } from "../lib/api/tokenStore"
import { clearActiveBranchId } from "../lib/branch"
import { HOME_PAGE } from "../router/rbac"
import { normalizeRole, type Role } from "../router/roles"
import { brandChanged, clearRememberedBrand, setActiveBrandSlug } from "../lib/brand"
import type { Page } from "../router/pages"

export function webRoleOf(user: UserDto | null): Role | null {
  return normalizeRole(user)
}

export function homePageOf(user: UserDto): Page {
  const role = normalizeRole(user)
  // Path-tenant: customers land on the shop picker when no slug is active yet.
  if (role === "customer" && !tokenStore.get()?.activeBrandCode && !tokenStore.get()?.tenantSlug) {
    return "customer-shops"
  }
  return role ? HOME_PAGE[role] : "staff-entry"
}

interface AuthContextValue {
  user: UserDto | null
  role: Role | null
  isAuthenticated: boolean
  login: (login: string, password: string, opts?: LoginOpts) => Promise<UserDto>
  /** Sign-up step 2: the emailed code activates the account and signs the customer in. */
  verifySignUp: (email: string, code: string) => Promise<UserDto>
  /** Saves the signed-in user's own name and phone. */
  updateProfile: (body: { fullName: string; phone: string | null; username: string | null }) => Promise<UserDto>
  /** A customer deletes their personal data: the account is anonymized and the session ends. */
  deleteMyData: (password: string) => Promise<void>
  /** A customer picks the brand to order from (by code from the list, by id from a table QR). */
  selectBrand: (target: { code?: string; tenantId?: string }) => Promise<UserDto>
  /** Sign in (or sign up) with the credential Google hands to the page. */
  googleLogin: (idToken: string) => Promise<UserDto>
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

  const verifySignUp = useCallback(async (email: string, code: string) => {
    const session = await authApi.verifyRegistration(email.trim(), code)
    setUser(session.user)
    return session.user
  }, [])

  const googleLogin = useCallback(async (idToken: string) => {
    const session = await authApi.loginWithGoogle(idToken)
    setUser(session.user)
    return session.user
  }, [])

  const updateProfile = useCallback(async (body: { fullName: string; phone: string | null; username: string | null }) => {
    const next = await authApi.updateProfile(body)
    const session = tokenStore.get()
    if (session) tokenStore.set({ ...session, user: next })
    setUser(next)
    return next
  }, [])

  const deleteMyData = useCallback(async (password: string) => {
    await authApi.deleteMyData(password)
    tokenStore.clear()
    clearRememberedBrand()
    clearActiveBranchId()
    setUser(null)
  }, [])

  const selectBrand = useCallback(async (target: { code?: string; tenantId?: string }) => {
    const session = await authApi.selectBrand(target)
    setUser(session.user)
    if (session.activeBrandCode) setActiveBrandSlug(session.activeBrandCode)
    else if (target.code) setActiveBrandSlug(target.code)
    brandChanged()
    return session.user
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    clearActiveBranchId()
    clearRememberedBrand()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, role: webRoleOf(user), isAuthenticated: user !== null, login, verifySignUp, selectBrand, updateProfile, deleteMyData, googleLogin, logout }),
    [user, login, verifySignUp, selectBrand, updateProfile, deleteMyData, googleLogin, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
