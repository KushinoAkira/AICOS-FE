export { PageFrame as PlatformPage } from "../../components/PageFrame"

export const PLAN_NAME = (plans: { id: string; name: string }[], id: string) => plans.find((p) => p.id === id)?.name ?? id
