import { Navigate } from "react-router"
import { PAGE_PATHS } from "../../router/pages"

/**
 * Legacy `/{slug}/login` deep link.
 * Staff no longer pick a brand first — accounts already carry tenant/role/branch — so redirect to `/staff-login`.
 */
export default function Login() {
  return <Navigate to={PAGE_PATHS["staff-entry"]} replace />
}
