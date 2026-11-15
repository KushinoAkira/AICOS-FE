import { env } from "../../config/env"
import { http } from "./http"
import { num, rec, recs, str, bool, type Raw } from "./be/util"

export interface AssociationRule {
  id: string
  branchId: string | null
  antecedentNames: string
  consequentNames: string
  support: number
  confidence: number
  lift: number
  transactionCount: number
  minedAtUtc: string
  voucherCreated: boolean
}

export interface AprioriRunResult {
  basketCount: number
  ruleCount: number
  promotedCount: number
}

const toRule = (r: Raw): AssociationRule => ({
  id: str(r.id),
  branchId: r.branchId ? str(r.branchId) : null,
  antecedentNames: str(r.antecedentNames),
  consequentNames: str(r.consequentNames),
  support: num(r.support),
  confidence: num(r.confidence),
  lift: num(r.lift),
  transactionCount: num(r.transactionCount),
  minedAtUtc: str(r.minedAtUtc),
  voucherCreated: bool(r.voucherCreated),
})

const mockRules: AssociationRule[] = [
  {
    id: "demo-rule-1",
    branchId: null,
    antecedentNames: "Trà sữa",
    consequentNames: "Bánh ngọt",
    support: 0.22,
    confidence: 0.71,
    lift: 1.85,
    transactionCount: 120,
    minedAtUtc: new Date().toISOString(),
    voucherCreated: true,
  },
]

const beApi = {
  listRules: async () => recs(await http.get<Raw[]>("/orders/analytics/association-rules")).map(toRule),
  run: async () => {
    const r = rec(await http.post<Raw>("/orders/analytics/apriori/run", {}))
    return { basketCount: num(r.basketCount), ruleCount: num(r.ruleCount), promotedCount: num(r.promotedCount) } satisfies AprioriRunResult
  },
}

const mockApi = {
  listRules: async () => mockRules,
  run: async (): Promise<AprioriRunResult> => ({ basketCount: 48, ruleCount: mockRules.length, promotedCount: 1 }),
}

export const aprioriApi = env.useMock ? mockApi : beApi
