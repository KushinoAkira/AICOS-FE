import { useTranslation } from "react-i18next"
import { Button } from "../../components/ui"

function Shell({ code, title, body, onHome }: { code: string; title: string; body: string; onHome: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-6 text-center">
      <p className="font-serif text-6xl text-terracotta">{code}</p>
      <h1 className="mt-4 font-serif text-2xl text-text-primary">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">{body}</p>
      <Button className="mt-6" onClick={onHome}>{t("errors.home")}</Button>
    </div>
  )
}

export function Forbidden({ onHome }: { onHome: () => void }) {
  const { t } = useTranslation()
  return <Shell code="403" title={t("errors.forbiddenTitle")} body={t("errors.forbiddenBody")} onHome={onHome} />
}

export function NotFound({ onHome }: { onHome: () => void }) {
  const { t } = useTranslation()
  return <Shell code="404" title={t("errors.notFoundTitle")} body={t("errors.notFoundBody")} onHome={onHome} />
}
