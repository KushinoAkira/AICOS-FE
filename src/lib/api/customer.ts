import { http } from "./http"
import { itemsOf, num, rec, recs, str, type Raw } from "./be/util"

export interface Preferences {
  sugarPercent: number | null
  ice: string | null
  favoriteToppings: string[]
  notes: string | null
}

export interface MyVoucher {
  id: string
  code: string
  discountLabel: string
  minOrderAmount: number
  expiresAtUtc: string
  usable: boolean
}

/** The signed-in customer at the chosen brand. */
export const customerApi = {
  async preferences(): Promise<Preferences> {
    const p = rec(await http.get<Raw>("/customers/me/preferences"))
    return {
      sugarPercent: p.sugarPercent === null || p.sugarPercent === undefined ? null : num(p.sugarPercent),
      ice: str(p.ice) || null,
      favoriteToppings: Array.isArray(p.favoriteToppings) ? (p.favoriteToppings as string[]) : [],
      notes: str(p.notes) || null,
    }
  },
  savePreferences: (body: Preferences) => http.put<Raw>("/customers/me/preferences", body),
  async vouchers(): Promise<MyVoucher[]> {
    return recs(itemsOf(await http.get<Raw[]>("/customers/me/vouchers"))).map((v) => ({
      id: str(v.id),
      code: str(v.code),
      discountLabel: str(v.discountType) === "Percent" ? `Giảm ${num(v.value)}%` : `Giảm ${new Intl.NumberFormat("vi-VN").format(num(v.value))} đ`,
      minOrderAmount: num(v.minOrderAmount),
      expiresAtUtc: str(v.expiresAtUtc),
      usable: str(v.status) === "Active" && v.isExpired !== true,
    }))
  },
}
