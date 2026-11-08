import { env } from "../../config/env"
import { exactMember, type Contact } from "../kiosk"
import { http } from "./http"
import { itemsOf, num, recs, str, type Raw } from "./be/util"

/** A member found at the kiosk. `id` is their user id: what an order carries so it earns points and shows in their history. */
export interface KioskMember { id: string; fullName: string; points: number; tier: string }

interface Row { userId: string; fullName: string; email: string; phone: string | null; points: number; tier: string }

const toRow = (c: Raw): Row => ({ userId: str(c.userId) || str(c.id), fullName: str(c.fullName), email: str(c.email), phone: str(c.phone) || null, points: num(c.pointsBalance), tier: str(c.tier) })

/** Demo members for mock mode. */
const DEMO: Row[] = [
  { userId: "c-demo-1", fullName: "Nguyễn Văn An", email: "an.nguyen@example.com", phone: "0901234567", points: 120, tier: "Silver" },
  { userId: "c-demo-2", fullName: "Trần Thị Bình", email: "binh.tran@example.com", phone: "0912345678", points: 35, tier: "Member" },
]

export const kioskApi = {
  /**
   * Looks the member up at this brand (staff endpoint, `GET /customers?search=`) and keeps only an exact phone or email match.
   * A phone is searched without its leading 0 so a number saved as +84… is found too.
   */
  async findMember(contact: Contact): Promise<KioskMember | null> {
    const rows = env.useMock
      ? DEMO
      : recs(itemsOf(await http.get<Raw[]>("/customers", { query: { search: contact.kind === "phone" ? contact.value.slice(1) : contact.value, pageSize: 5 } }))).map(toRow)
    const m = exactMember(rows, contact)
    return m ? { id: m.userId, fullName: m.fullName, points: m.points, tier: m.tier } : null
  },
}
