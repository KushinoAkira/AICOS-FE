import type { ReactNode } from "react"
import { Link } from "react-router"
import { Logo, PlatformLogo } from "./AuthShell"
import { PAGE_PATHS } from "../router/pages"
import { C } from "../lib/tokens"
import { protectOrphans } from "../lib/typography"

function CupMark() {
  return (
    <svg width="220" height="240" viewBox="0 0 360 400" aria-hidden className="mx-auto max-w-full">
      <g fill="none" stroke={C.creamText} strokeWidth="7" strokeLinecap="round">
        <path className="ch-steam" d="M140 120 C 120 90, 160 70, 140 40" />
        <path className="ch-steam-2" d="M180 124 C 160 94, 200 74, 180 44" />
        <path className="ch-steam-3" d="M220 120 C 200 90, 240 70, 220 40" />
      </g>
      <path d="M70 150 H290 V240 C290 300 250 340 180 340 C110 340 70 300 70 240 Z" fill={C.creamText} />
      <path d="M290 175 H322 C346 175 346 250 306 262 L286 266" fill="none" stroke={C.creamText} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="180" cy="150" rx="110" ry="16" fill="#7A4A32" />
      <ellipse cx="180" cy="150" rx="90" ry="10" fill="#4E2E1F" />
      <path d="M96 215 H264" stroke={C.roast} strokeWidth="10" strokeLinecap="round" />
      <g transform="translate(180 268)">
        <ellipse rx="19" ry="26" fill={C.roast} />
        <path d="M0 -26 C -9 -9, 9 9, 0 26" stroke={C.creamText} strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/** Shared shell for customer login / register — ink panel + cream form (Warm Roast tokens). */
export function CustomerAuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-bg-base">
      <aside className="relative hidden w-5/12 overflow-hidden bg-ink text-on-dark lg:flex xl:w-6/12">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-ink-lift" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-ink-lift/70" />
        <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
          <Link to={PAGE_PATHS["order-start"]} aria-label="AICOS" className="self-start">
            <PlatformLogo tone="light" layout="horizontal" />
          </Link>
          <div className="my-10">
            <CupMark />
          </div>
          <div>
            <p className="type-title text-3xl text-on-dark">
              Quán nào cũng là <em className="text-terracotta italic">quán&nbsp;quen</em>
            </p>
            <p className="type-body mt-5 max-w-md text-on-dark-muted">
              {protectOrphans("Một tài khoản cho mọi thương hiệu cà phê trên AICOS — đặt mang đi, quét QR tại bàn, tích điểm riêng từng quán.")}
            </p>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 lg:hidden">
            <Link to={PAGE_PATHS["order-start"]} aria-label="Về trang chủ khách hàng" className="inline-flex">
              <Logo />
            </Link>
          </div>
          <h1 className="type-title mb-4 text-[1.85rem] text-text-primary sm:text-[2rem]">{title}</h1>
          <p className="type-body mb-12 text-text-secondary">{subtitle}</p>
          {children}
          {footer}
        </div>
      </div>
    </div>
  )
}

export const customerAuthInputClass =
  "w-full rounded-[10px] border border-border bg-surface px-4 py-3.5 text-sm text-text-primary outline-none transition-colors focus:border-terracotta"

/** Terracotta fill + cream label — meets contrast better than brown-on-terracotta. */
export const customerAuthPrimaryBtn =
  "mt-2 w-full rounded-full bg-terracotta py-3.5 text-[15px] font-semibold text-on-espresso transition-colors hover:bg-clay disabled:cursor-not-allowed disabled:bg-border-strong disabled:text-on-espresso/80"
