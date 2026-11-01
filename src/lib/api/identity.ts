import { http, type PagedResponse } from "./http"
import { env } from "../../config/env"
import { beAuthApi, beBranchesApi, beUsersApi } from "./be/identity"
import { tokenStore, type StoredSession } from "./tokenStore"

/** Role names issued by the backend (AicosRoles). */
/**
 * Roles as the backend sends them today (legacy names) plus the proposal-v2 names the backend
 * will adopt (SuperAdmin, BrandAdmin, BranchManager, Barista). The web app only reasons about
 * the v2 roles - see `normalizeRole` in `router/roles.ts`.
 */
export type ApiRole =
  | "SystemAdmin"
  | "Manager"
  | "Cashier"
  | "WarehouseStaff"
  | "AiBusinessAssistant"
  | "Customer"
  | "Guest"
  | "SuperAdmin"
  | "BrandAdmin"
  | "BranchManager"
  | "Barista"
export type UserStatus = "Active" | "Locked"
export type BranchStatus = "Active" | "Suspended"

export interface UserDto {
  id: string
  fullName: string
  email: string
  username: string | null
  phone: string | null
  role: ApiRole
  branchId: string | null
  status: UserStatus
  mustChangePassword: boolean
  lockoutEndUtc: string | null
  lastLoginAtUtc: string | null
  createdAtUtc: string
  updatedAtUtc: string | null
}

export interface BranchDto {
  id: string
  name: string
  address: string | null
  phone: string | null
  /** "HH:mm:ss" */
  openingTime: string | null
  closingTime: string | null
  status: BranchStatus
  createdAtUtc: string
  updatedAtUtc: string | null
}

export interface BranchInput {
  name: string
  address?: string
  phone?: string
  /** "HH:mm" - openingTime and closingTime must be sent together. */
  openingTime?: string
  closingTime?: string
}

export interface UserInput {
  fullName: string
  email: string
  username?: string
  phone?: string
  role: ApiRole
  branchId?: string | null
}

const BASE = "/identity"

export type LoginOpts = {
  /** Path slug for `POST /api/v1/{slug}/auth/login` (staff). */
  tenantSlug?: string | null
  /** Super Admin portal — `POST /api/v1/admin/auth/login`. */
  admin?: boolean
}

const mockAuthApi = {
  async login(login: string, password: string, opts: LoginOpts = {}): Promise<StoredSession> {
    const path = opts.admin
      ? "/admin/auth/login"
      : opts.tenantSlug
        ? `/${opts.tenantSlug}/auth/login`
        : `${BASE}/auth/login`
    const session = await http.post<StoredSession>(path, { login, password }, { anonymous: true })
    tokenStore.set(session)
    return session
  },
  register: (body: { fullName: string; email: string; phone?: string; password: string; confirmPassword: string }) =>
    http.post<UserDto>(`${BASE}/auth/register`, body, { anonymous: true }),
  async logout(): Promise<void> {
    const session = tokenStore.get()
    tokenStore.clear()
    if (session) await http.post<void>(`${BASE}/auth/logout`, { refreshToken: session.refreshToken }, { anonymous: true }).catch(() => undefined)
  },
  me: () => http.get<UserDto>(`${BASE}/auth/me`),
  changePassword: (body: { currentPassword: string; newPassword: string; confirmNewPassword: string }) =>
    http.post<void>(`${BASE}/auth/change-password`, body),
  forgotPassword: (email: string) => http.post<{ message: string; devToken?: string }>(`${BASE}/auth/forgot-password`, { email }, { anonymous: true }),
  /** Link flow (featureFlags.resetMethod = "link"). For the OTP flow send `code` instead of `token`. */
  resetPassword: (body: { token: string; code?: string; newPassword: string; confirmNewPassword: string }) =>
    http.post<{ message: string }>(`${BASE}/auth/reset-password`, body, { anonymous: true }),
}

const mockBranchesApi = {
  list: (q: { search?: string; status?: BranchStatus; page?: number; pageSize?: number } = {}) =>
    http.get<PagedResponse<BranchDto>>(`${BASE}/branches`, { query: q }),
  listActive: () => http.get<BranchDto[]>(`${BASE}/branches/active`),
  get: (id: string) => http.get<BranchDto>(`${BASE}/branches/${id}`),
  create: (body: BranchInput) => http.post<BranchDto>(`${BASE}/branches`, body),
  update: (id: string, body: BranchInput) => http.put<BranchDto>(`${BASE}/branches/${id}`, body),
  changeStatus: (id: string, status: BranchStatus) => http.patch<BranchDto>(`${BASE}/branches/${id}/status`, { status }),
}

const mockUsersApi = {
  list: (q: { search?: string; role?: string; status?: UserStatus; branchId?: string; page?: number; pageSize?: number } = {}) =>
    http.get<PagedResponse<UserDto>>(`${BASE}/users`, { query: q }),
  get: (id: string) => http.get<UserDto>(`${BASE}/users/${id}`),
  create: (body: UserInput & { password: string }) => http.post<UserDto>(`${BASE}/users`, body),
  update: (id: string, body: UserInput) => http.put<UserDto>(`${BASE}/users/${id}`, body),
  changeStatus: (id: string, status: UserStatus) => http.patch<UserDto>(`${BASE}/users/${id}/status`, { status }),
  remove: (id: string) => http.delete<void>(`${BASE}/users/${id}`),
}

/** Mock data in demo mode (VITE_USE_MOCK=true), the real gateway otherwise. */
export const authApi: typeof mockAuthApi = env.useMock ? mockAuthApi : beAuthApi
export const branchesApi: typeof mockBranchesApi = env.useMock ? mockBranchesApi : beBranchesApi
export const usersApi: typeof mockUsersApi = env.useMock ? mockUsersApi : beUsersApi
