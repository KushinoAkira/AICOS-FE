import { currentBrandSlug } from "../../brand"
import { http, type PagedResponse } from "../http"
import type { BranchDto, BranchInput, BranchStatus, SignUpInput, SignUpPending, UserDto, UserInput, UserStatus } from "../identity"
import { tokenStore, type StoredSession } from "../tokenStore"
import { itemsOf } from "./util"

const BASE = "/identity"

/** Real backend (FE-INTEGRATION-API-REFERENCE section 1). */
export const beAuthApi = {
  async login(login: string, password: string, opts: { tenantSlug?: string | null; admin?: boolean } = {}): Promise<StoredSession> {
    const path = opts.admin
      ? "/admin/auth/login"
      : opts.tenantSlug
        ? `/${opts.tenantSlug}/auth/login`
        : `${BASE}/auth/login`
    const session = await http.post<StoredSession>(path, { login, password }, { anonymous: true })
    tokenStore.set(session)
    return session
  },
  /** One customer account works at every brand; the brand is chosen after signing in (`selectBrand`). */
  /** Registering signs the customer in at once: no email code (the code is kept for the password reset). */
  async register(body: SignUpInput): Promise<StoredSession> {
    const session = await http.post<StoredSession>(`${BASE}/auth/register`, body, { anonymous: true })
    tokenStore.set(session)
    return session
  },
  async verifyRegistration(email: string, code: string): Promise<StoredSession> {
    const session = await http.post<StoredSession>(`${BASE}/auth/register/verify`, { email, code }, { anonymous: true })
    tokenStore.set(session)
    return session
  },
  resendRegistration: (email: string) =>
    http.post<SignUpPending>(`${BASE}/auth/register/resend`, { email }, { anonymous: true }),
  async selectBrand(target: { code?: string; tenantId?: string }): Promise<StoredSession> {
    const session = await http.post<StoredSession>(`${BASE}/auth/select-brand`, { refreshToken: tokenStore.get()?.refreshToken, tenantCode: target.code, tenantId: target.tenantId })
    tokenStore.set(session)
    return session
  },
  async loginWithGoogle(idToken: string): Promise<StoredSession> {
    const session = await http.post<StoredSession>(`${BASE}/auth/google`, { idToken }, { anonymous: true })
    tokenStore.set(session)
    return session
  },
  async logout(): Promise<void> {
    const session = tokenStore.get()
    tokenStore.clear()
    if (session) await http.post<void>(`${BASE}/auth/logout`, { refreshToken: session.refreshToken }, { anonymous: true }).catch(() => undefined)
  },
  me: () => http.get<UserDto>(`${BASE}/auth/me`),
  updateProfile: (body: { fullName: string; phone: string | null; username: string | null }) => http.put<UserDto>(`${BASE}/auth/me`, body),
  deleteMyData: (password: string) => http.post<void>(`${BASE}/auth/me/delete`, { password }),
  changePassword: (body: { currentPassword: string; newPassword: string; confirmNewPassword: string }) =>
    http.post<void>(`${BASE}/auth/change-password`, body),
  forgotPassword: (email: string) =>
    http.post<{ message: string; devToken?: string }>(`${BASE}/auth/forgot-password`, { email }, { anonymous: true }).then((r) => r ?? { message: "ok" }),
  /** The backend resets with the emailed 6-digit code: `token` carries the email, `code` the digits. */
  resetPassword: (body: { token: string; code?: string; newPassword: string; confirmNewPassword: string }) =>
    http.post<{ message: string }>(
      `${BASE}/auth/reset-password`,
      { email: body.token, code: body.code ?? "", newPassword: body.newPassword, confirmNewPassword: body.confirmNewPassword },
      { anonymous: true },
    ),
  /** Step 1 of the reset page: the emailed code is checked first (not used up), then the new password is asked for. */
  verifyResetCode: (email: string, code: string) => http.post<void>(`${BASE}/auth/reset-password/verify`, { email, code }, { anonymous: true }),
}

type List<T> = T[] | PagedResponse<T>

function paged<T>(list: List<T>, page = 1, pageSize = 20): PagedResponse<T> {
  if (!Array.isArray(list)) return list
  return { items: list.slice((page - 1) * pageSize, page * pageSize), page, pageSize, totalCount: list.length }
}

export const beBranchesApi = {
  list: async (q: { search?: string; status?: BranchStatus; page?: number; pageSize?: number } = {}) => {
    const res = await http.get<List<BranchDto>>(`${BASE}/branches`, { query: q })
    if (!Array.isArray(res)) return res
    return paged(res.filter((b) => (!q.search || b.name.toLowerCase().includes(q.search.toLowerCase())) && (!q.status || b.status === q.status)), q.page, q.pageSize)
  },
  listActive: () => http.get<BranchDto[]>(`${BASE}/branches/active`, { anonymous: !tokenStore.get(), query: { tenantCode: currentBrandSlug() } }).then(itemsOf),
  /** Always anonymous, so the brand in the link decides and not the brand of whoever is signed in. */
  listActiveOf: (brandSlug: string) => http.get<BranchDto[]>(`${BASE}/branches/active`, { anonymous: true, query: { tenantCode: brandSlug } }).then(itemsOf),
  get: async (id: string): Promise<BranchDto> => {
    const all = itemsOf(await http.get<List<BranchDto>>(`${BASE}/branches`))
    const found = all.find((b) => b.id === id)
    if (!found) throw new Error("Không tìm thấy chi nhánh")
    return found
  },
  create: (body: BranchInput) => http.post<BranchDto>(`${BASE}/branches`, withSeconds(body)),
  update: (id: string, body: BranchInput) => http.put<BranchDto>(`${BASE}/branches/${id}`, withSeconds(body)),
  changeStatus: (id: string, status: BranchStatus) => http.patch<BranchDto>(`${BASE}/branches/${id}/status`, { status }),
}

/** The API sends and expects `HH:mm:ss`; the form works with `HH:mm`. */
function withSeconds(b: BranchInput): BranchInput {
  const fix = (t?: string) => (t && t.length === 5 ? `${t}:00` : t)
  return { ...b, openingTime: fix(b.openingTime), closingTime: fix(b.closingTime) }
}

export const beUsersApi = {
  list: async (q: { search?: string; role?: string; status?: UserStatus; branchId?: string; page?: number; pageSize?: number } = {}) => {
    const res = await http.get<List<UserDto>>(`${BASE}/users`, { query: q })
    if (!Array.isArray(res)) return res
    const needle = q.search?.toLowerCase()
    const rows = res.filter(
      (u) =>
        (!needle || u.fullName.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle)) &&
        (!q.role || u.role === q.role) && (!q.status || u.status === q.status) && (!q.branchId || u.branchId === q.branchId),
    )
    return paged(rows, q.page, q.pageSize)
  },
  get: async (id: string): Promise<UserDto> => {
    const found = itemsOf(await http.get<List<UserDto>>(`${BASE}/users`)).find((u) => u.id === id)
    if (!found) throw new Error("Không tìm thấy tài khoản")
    return found
  },
  create: (body: UserInput & { password: string }) => http.post<UserDto>(`${BASE}/users`, body),
  update: (id: string, body: UserInput) => http.put<UserDto>(`${BASE}/users/${id}`, body),
  changeStatus: (id: string, status: UserStatus) => http.patch<UserDto>(`${BASE}/users/${id}/status`, { status }),
  remove: (id: string) => http.delete<void>(`${BASE}/users/${id}`),
}
