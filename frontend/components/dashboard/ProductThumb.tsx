import Image from "next/image";
import {
  Archive,
  Armchair,
  Lamp,
  Package,
  ShoppingCart,
  Sofa,
  Table2,
} from "lucide-react";

/**
 * The backend's `image_url` column is nullable and, in practice, usually
 * empty for manually-entered affiliate products. Rather than hide that or
 * fake a photo, this renders a deliberate placeholder keyed off the title —
 * consistent with the site's own no-photography, line-art visual language.
 */
function iconForTitle(title: string) {
  const t = title.toLowerCase();
  if (t.includes("chair")) return Armchair;
  if (t.includes("sofa") || t.includes("couch")) return Sofa;
  if (t.includes("cabinet") || t.includes("storage") || t.includes("shelv")) return Archive;
  if (t.includes("cart")) return ShoppingCart;
  if (t.includes("lamp") || t.includes("light")) return Lamp;
  if (t.includes("table") || t.includes("desk")) return Table2;
  return Package;
}

export function ProductThumb({
  title,
  imageUrl,
  className = "",
}: {
  title: string;
  imageUrl: string | null;
  className?: string;
}) {
  if (imageUrl) {
    return (
      <div className={`relative overflow-hidden bg-surface ${className}`}>
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-[700ms] ease-[var(--ease-expo)] group-hover:scale-[1.02]"
          unoptimized
        />
      </div>
    );
  }

  const Icon = iconForTitle(title);
  return (
    <div
      className={`hatch-soft flex items-center justify-center border border-line-soft bg-surface ${className}`}
    >
      <Icon size={30} strokeWidth={1.15} className="text-line-soft" />
    </div>
  );
}
