import type { ReactNode } from "react"
import { Link } from "react-router"
import AuthHero from "./AuthHero"
import { useBrand } from "../context/BrandContext"

/** The AICOS mark, or the brand's own logo and name when the page is on a brand's address. */
export function Logo({ linked = false }: { linked?: boolean } = {}) {
  const b = useBrand()
  const mark = b.kind === "ready" ? (
    <div className="flex items-center gap-2">
      {b.brand.logoUrl ? <img src={b.brand.logoUrl} alt="" className="h-9 w-9 rounded-[10px] object-contain" /> : <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-terracotta font-serif text-lg text-white">{b.brand.name.charAt(0)}</span>}
      <span className="font-serif text-2xl font-medium text-espresso">{b.brand.name}</span>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
        <ellipse cx="16" cy="16" rx="11" ry="14" fill="var(--color-terracotta)" />
        <path d="M16 4 Q18.5 16 16 28" stroke="var(--color-espresso)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
      <span className="font-serif text-[1.75rem] font-medium tracking-tight text-espresso">AICOS</span>
    </div>
  )
  if (!linked) return mark
  return <Link to="/" aria-label="Về trang chủ AICOS">{mark}</Link>
}

/** Shared frame for the sign-in / reset screens. `hero` adds the photo panel on desktop. */
export function AuthShell({
  title,
  subtitle,
  hero,
  children,
}: {
  title?: string
  subtitle?: string
  hero?: boolean
  children: ReactNode
}) {
  return (
    <div className="relative flex min-h-screen bg-bg-base">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 lg:hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in srgb, var(--color-terracotta) 18%, transparent), transparent 70%)",
        }}
      />
      {hero && <AuthHero />}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10"><Logo linked /></div>
          {title && <h1 className="mb-2 font-serif text-3xl font-medium text-text-primary">{title}</h1>}
          {subtitle && <p className={`text-sm leading-relaxed text-text-secondary ${title ? "mb-8" : "mb-8 -mt-2"}`}>{subtitle}</p>}
          {children}
          <p className="mt-12 text-center text-xs text-text-secondary">© {new Date().getFullYear()} AICOS</p>
        </div>
      </div>
    </div>
  )
}
