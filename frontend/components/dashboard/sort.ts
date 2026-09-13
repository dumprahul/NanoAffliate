import { parsePriceValue } from "@/lib/format";
import type { ProductWithSeller } from "@/lib/types";

export type SortKey = "newest" | "price-asc" | "price-desc" | "title";

export function sortProducts(products: ProductWithSeller[], sort: SortKey): ProductWithSeller[] {
  const copy = [...products];
  switch (sort) {
    case "newest":
      return copy.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "price-asc":
    case "price-desc": {
      const dir = sort === "price-asc" ? 1 : -1;
      return copy.sort((a, b) => {
        const pa = parsePriceValue(a.price_display);
        const pb = parsePriceValue(b.price_display);
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1; // unpriced items sort last regardless of direction
        if (pb === null) return -1;
        return (pa - pb) * dir;
      });
    }
  }
}
