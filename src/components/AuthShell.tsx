import type { ReactNode } from "react"
import { Link } from "react-router"
import aicosLogo from "../assets/aicos-logo.png"
import aicosLogoLight from "../assets/aicos-logo-light.png"
import AuthHero from "./AuthHero"
import { useBrand } from "../context/BrandContext"

type LogoTone = "dark" | "light"
type LogoLayout = "stack" | "horizontal"

/** Official AICOS platform lockup (transparent PNG). `light` = cream mark for dark surfaces. */
export function PlatformLogo({
  className = "h-10 w-auto object-contain",
  tone = "dark",
  layout = "stack",
}: {
  className?: string
  tone?: LogoTone
  /** `horizontal` = mark crop + Literata wordmark for nav (stacked PNG is tall). */
  layout?: LogoLayout
}) {
  const src = tone === "light" ? aicosLogoLight : aicosLogo
  if (layout === "horizontal") {
    const word = tone === "light" ? "text-on-dark" : "text-espresso"
    return (
      <span className={`inline-flex items-center gap-2.5 ${className}`}>
        <img
          src={src}
          alt=""
          aria-hidden
          className="h-8 w-8 shrink-0 object-cover object-[center_12%]"
        />
        <span className={`type-title text-[1.2rem] leading-none tracking-[-0.03em] ${word}`}>AICOS</span>
      </span>
    )
  }
  return <img src={src} alt="AICOS" className={className} />
}

/** @deprecated Prefer `<PlatformLogo tone="light" />` — kept so older call sites keep working. */
export function PlatformLogoOnDark({
  className = "h-10 w-auto object-contain sm:h-11",
}: {
  className?: string
  pillClassName?: string
}) {
  return <PlatformLogo tone="light" className={className} />
}

/** The AICOS mark, or the brand's own logo and name when the page is on a brand's address. */
export function Logo({ linked }: { linked?: boolean } = {}) {
  const b = useBrand()
  const mark = b.kind === "ready" ? (
    <div className="flex items-center gap-2.5">
      {b.brand.logoUrl ? (
        <img src={b.brand.logoUrl} alt="" className="h-9 w-9 rounded-[10px] object-contain" />
      ) : (
        <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-terracotta font-serif text-lg text-white">
          {b.brand.name.charAt(0)}
        </span>
      )}
      <span className="type-title text-xl text-espresso">{b.brand.name}</span>
    </div>
  ) : (
    <PlatformLogo layout="horizontal" />
  )
  if (linked) {
    return (
      <Link to="/" aria-label="Về trang chủ" className="inline-flex rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-espresso">
        {mark}
      </Link>
    )
  }
  return mark
}

/** Shared frame for the sign-in / reset screens. `hero` adds the photo panel on desktop. */
export function AuthShell({ title, subtitle, hero, children }: { title?: string; subtitle?: string; hero?: boolean; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg-base">
      {hero && <AuthHero />}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10"><HomeLogo /></div>
          {title && <h1 className="type-title mb-3 text-[1.75rem] text-text-primary sm:text-[1.85rem]">{title}</h1>}
          {subtitle && <p className={`type-body text-text-secondary ${title ? "mb-10" : "mb-10 mt-2"}`}>{subtitle}</p>}
          {children}
          <p className="mt-12 text-center text-xs tracking-wide text-text-secondary">© {new Date().getFullYear()} AICOS</p>
        </div>
      </div>
    </div>
  )
}

/** The logo as a way back to the home page. Signed-in people land on their own start page (the home page is for visitors). */
export function HomeLogo() {
  return (
    <Link to="/" aria-label="Về trang chủ" className="inline-flex rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-espresso">
      <Logo />
    </Link>
  )
}
