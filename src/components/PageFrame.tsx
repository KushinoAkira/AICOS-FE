import type { ReactNode } from "react"
import InternalLayout from "./InternalLayout"
import { env } from "../config/env"
import type { Page } from "../App"

interface Props {
  page: Page
  navigate: (p: Page) => void
  title: string
  subtitle?: string
  uc: string
  action?: ReactNode
  children: ReactNode
}

export function PageFrame({ page, navigate, title, subtitle, uc, action, children }: Props) {
  return (
    <InternalLayout activePage={page} navigate={navigate}>
      <div data-uc={uc}>
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-medium text-text-primary">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
            {env.showUcTags && <span className="mt-2 inline-block rounded bg-sand px-2 py-0.5 text-xs text-clay">{uc}</span>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </InternalLayout>
  )
}

