import type { AiMenuItem } from "./api/engage"

/** Build the AI menu snapshot from whatever product shape the order/menu APIs return. */
export function toAiMenuItems(
  products: { id: string; name: string; price?: number; basePrice?: number; description?: string | null; category?: string | null; categoryName?: string | null; tags?: string[] | null; soldOut?: boolean }[],
): AiMenuItem[] {
  return products
    .filter((p) => !p.soldOut)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price ?? p.basePrice ?? 0),
      category: p.categoryName ?? p.category ?? undefined,
      description: p.description ?? undefined,
      tags: p.tags ?? undefined,
    }))
}
