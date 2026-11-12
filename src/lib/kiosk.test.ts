import { describe, expect, it } from "vitest"
import { exactMember, greetingName, isKioskOrder, kioskBranches, maskContact, readContact } from "./kiosk"

describe("readContact", () => {
  it("reads Vietnamese mobile numbers in the usual ways people type them", () => {
    expect(readContact("0901234567")).toEqual({ kind: "phone", value: "0901234567" })
    expect(readContact("090 123 4567")).toEqual({ kind: "phone", value: "0901234567" })
    expect(readContact("+84 901.234.567")).toEqual({ kind: "phone", value: "0901234567" })
    expect(readContact("84901234567")).toEqual({ kind: "phone", value: "0901234567" })
  })
  it("reads an email in lower case", () => {
    expect(readContact("  An.Nguyen@Example.com ")).toEqual({ kind: "email", value: "an.nguyen@example.com" })
  })
  it("refuses what is neither", () => {
    expect(readContact("")).toBeNull()
    expect(readContact("12345")).toBeNull()
    expect(readContact("an@")).toBeNull()
    expect(readContact("Nguyen")).toBeNull()
  })
})

describe("exactMember", () => {
  const rows = [
    { id: "1", email: "an@example.com", phone: "+84901234567" },
    { id: "2", email: "binh@example.com", phone: "0912345678" },
    { id: "3", email: "chi@example.com", phone: null },
  ]
  it("matches the phone whatever way it was saved", () => {
    expect(exactMember(rows, { kind: "phone", value: "0901234567" })?.id).toBe("1")
    expect(exactMember(rows, { kind: "phone", value: "0912345678" })?.id).toBe("2")
  })
  it("matches the email exactly, ignoring case", () => {
    expect(exactMember([{ id: "x", email: "An@Example.com", phone: null }], { kind: "email", value: "an@example.com" })?.id).toBe("x")
  })
  it("gives nothing for a partial match or for two accounts with the same number", () => {
    expect(exactMember(rows, { kind: "phone", value: "0901234560" })).toBeNull()
    expect(exactMember([...rows, { id: "4", email: "d@example.com", phone: "0901234567" }], { kind: "phone", value: "0901234567" })).toBeNull()
  })
})

describe("what the kiosk shows about a member", () => {
  it("greets with the given name only", () => {
    expect(greetingName("Nguyễn Văn An")).toBe("An")
    expect(greetingName("  Bình ")).toBe("Bình")
  })
  it("masks the phone and email", () => {
    expect(maskContact({ kind: "phone", value: "0901234567" })).toBe("090•••4567")
    expect(maskContact({ kind: "email", value: "an.nguyen@gmail.com" })).toBe("a•••@gmail.com")
  })
})

describe("isKioskOrder", () => {
  const base = { channel: "dine-in" as const, tableCode: "", paymentStatus: "Unpaid" as const, status: "Pending" as const }
  it("is an unpaid order for here without a table", () => {
    expect(isKioskOrder(base)).toBe(true)
  })
  it("leaves out table orders, takeaway, paid and cancelled orders", () => {
    expect(isKioskOrder({ ...base, tableCode: "T1" })).toBe(false)
    expect(isKioskOrder({ ...base, channel: "takeaway" })).toBe(false)
    expect(isKioskOrder({ ...base, paymentStatus: "Paid" })).toBe(false)
    expect(isKioskOrder({ ...base, status: "Cancelled" })).toBe(false)
  })
})

describe("kioskBranches", () => {
  const all = [{ id: "b1" }, { id: "b2" }, { id: "b3" }]
  it("lets a brand admin order for every branch", () => {
    expect(kioskBranches(all, { role: "brandAdmin", branchId: null }).map((b) => b.id)).toEqual(["b1", "b2", "b3"])
  })
  it("keeps a cashier or manager to the branch of their account, as the server does", () => {
    expect(kioskBranches(all, { role: "cashier", branchId: "b2" }).map((b) => b.id)).toEqual(["b2"])
    expect(kioskBranches(all, { role: "branchManager", branchId: "b9" })).toEqual([])
    expect(kioskBranches(all, { role: "cashier", branchId: null })).toEqual([])
  })
})
