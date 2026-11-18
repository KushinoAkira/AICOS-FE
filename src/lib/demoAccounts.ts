import { env } from "../config/env"

export interface DemoAccount { label: string; login: string; password: string }

/**
 * One-tap sign-in for the local demo accounts. The passwords come from the git-ignored `.env.local` and never from the source,
 * so an account whose password is not set simply has no button.
 */
const all = (): DemoAccount[] => [
  { label: "Quản trị nền tảng", login: "admin@aicos.local", password: env.demoAdminPassword },
  { label: "Quản trị thương hiệu", login: "owner@caphenha.local", password: env.demoPassword },
  { label: "Quản lý chi nhánh", login: "manager@caphenha.local", password: env.demoPassword },
  { label: "Thu ngân", login: "cashier@caphenha.local", password: env.demoPassword },
  { label: "Pha chế", login: "barista@caphenha.local", password: env.demoPassword },
  { label: "Khách hàng", login: "khach@demo.local", password: env.demoCustomerPassword || env.demoPassword },
]

export const demoAccounts = () => (env.demo ? all().filter((a) => a.password) : [])

export const demoCustomer = () => demoAccounts().find((a) => a.login === "khach@demo.local")
