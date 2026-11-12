/**
 * The QR code posted at a branch (counter, door, window): it opens the public menu of the brand with that branch already chosen,
 * `/b/<brand code>?branch=<branch id>`. Different from a table QR, which starts a dine-in session at one table.
 */
import { publicBase } from "./tableBatch"

export function branchOrderLink(brandCode: string, branchId: string, base: string = publicBase()): string {
  return `${base.replace(/\/+$/, "")}/b/${encodeURIComponent(brandCode)}?branch=${encodeURIComponent(branchId)}`
}

/** The signed-in account's brand code: the token has the brand id, the public brand list maps it to the code used in links. */
export function brandCodeOf(brands: { id: string; slug: string }[], tenantId: string | null | undefined): string | null {
  return (tenantId && brands.find((b) => b.id.toLowerCase() === tenantId.toLowerCase())?.slug) || null
}

/** Brand id of the signed-in staff account, read from the access token (`tenant_id` claim). */
export function tenantIdOfToken(accessToken: string | null | undefined): string | null {
  try {
    const part = accessToken?.split(".")[1]
    if (!part) return null
    const json = JSON.parse(decodeURIComponent(escape(atob(part.replace(/-/g, "+").replace(/_/g, "/")))))
    return typeof json.tenant_id === "string" ? json.tenant_id : null
  } catch {
    return null
  }
}
