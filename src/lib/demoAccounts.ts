import { env } from "../config/env"

export interface DemoAccount { label: string; login: string; password: string }

/**
 * One-tap sign-in for the local demo accounts. The passwords come from the git-ignored `.env.local` and never from the source,
 * so an account whose password is not set simply has no button.
 */
const all = (): DemoAccount[] => [
  { label: "Quản trị nền tảng", login: "admin@aicos.local", password: env.demoAdminPassword },
  { label: "Quản trị thương hiệu", login: "owner@demo.local", password: env.demoPassword },
  { label: "Quản lý chi nhánh", login: "manager@demo.local", password: env.demoPassword },
  { label: "Thu ngân", login: "cashier@demo.local", password: env.demoPassword },
  { label: "Pha chế", login: "barista@demo.local", password: env.demoPassword },
  { label: "Khách hàng", login: "customer@demo.local", password: env.demoPassword },
]

export const demoAccounts = () => (env.demo ? all().filter((a) => a.password) : [])

export const demoCustomer = () => demoAccounts().find((a) => a.login === "customer@demo.local")
