import { ApiError } from "../http"
import type { LineInput } from "../orders"
import { recs, str, type Raw } from "./util"

/**
 * What a label on the screen means for the backend. Filled whenever a menu or the product list is loaded (table QR, takeaway, POS):
 * `productId|kind|label` -> option id, and option id -> kind + label.
 */
const optionIdByLabel = new Map<string, string>()
const optionById = new Map<string, { kind: string; label: string }>()

export function indexOptions(product: Raw) {
  for (const group of recs(product.optionGroups)) {
    const kind = str(group.kind).toLowerCase()
    for (const option of recs(group.options)) {
      optionIdByLabel.set(`${str(product.id)}|${kind}|${str(option.name)}`, str(option.id))
      optionById.set(str(option.id), { kind, label: str(option.name) })
    }
  }
}

export const optionOf = (id: string) => optionById.get(id)

/** The option ids of a cart line, so the server prices the size that was chosen. A label the menu no longer offers is refused instead of being dropped silently. */
export function optionIdsOf(l: LineInput): string[] {
  const chosen: [string, string][] = [["size", l.size], ["sugar", l.sugar], ["ice", l.ice], ...(l.toppings ?? []).map((t): [string, string] => ["topping", t])]
  return chosen.filter(([, label]) => label).map(([kind, label]) => {
    const id = optionIdByLabel.get(`${l.productId}|${kind}|${label}`)
    if (!id) throw new ApiError(422, `Lựa chọn "${label}" không còn trong thực đơn. Hãy tải lại trang rồi chọn lại.`, "option_unknown")
    return id
  })
}
