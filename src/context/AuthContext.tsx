import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { authApi, type UserDto } from "../lib/api/identity"
import { tokenStore } from "../lib/api/tokenStore"
import { HOME_PAGE } from "../router/rbac"
import { normalizeRole, type Role } from "../router/roles"
import { brandChanged, clearRememberedBrand } from "../lib/brand"
import type { Page } from "../router/pages"

export function webRoleOf(user: UserDto | null): Role | null {
  return normalizeRole(user)
}

export function homePageOf(user: UserDto): Page {
  const role = normalizeRole(user)
  // A customer account belongs to no brand: the first thing to do is pick one.
  if (role === "customer" && !tokenStore.get()?.activeBrandCode) return "customer-brands"
  return role ? HOME_PAGE[role] : "login"
}
interface AuthContextValue {
  user: UserDto | null
  role: Role | null
  isAuthenticated: boolean
  login: (login: string, password: string) => Promise<UserDto>
  /** Creates the customer account and signs them in at once. */
  signUp: (body: { fullName: string; email: string; password: string; confirmPassword: string }) => Promise<UserDto>
  /** Only for an account still pending from the time sign-up needed an emailed code. */
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

  const login = useCallback(async (loginName: string, password: string) => {
    const session = await authApi.login(loginName.trim(), password)
    setUser(session.user)
    return session.user
  }, [])

  const signUp = useCallback(async (body: { fullName: string; email: string; password: string; confirmPassword: string }) => {
    const session = await authApi.register(body)
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
    setUser(null)
  }, [])

  const selectBrand = useCallback(async (target: { code?: string; tenantId?: string }) => {
    const session = await authApi.selectBrand(target)
    setUser(session.user)
    brandChanged()
    return session.user
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    clearRememberedBrand()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, role: webRoleOf(user), isAuthenticated: user !== null, login, signUp, verifySignUp, selectBrand, updateProfile, deleteMyData, googleLogin, logout }),
    [user, login, signUp, verifySignUp, selectBrand, updateProfile, deleteMyData, googleLogin, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
