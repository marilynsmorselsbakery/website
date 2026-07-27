import type { Product } from "@/lib/products";
import { buildProductSchemas } from "./product-schema-data";

interface ProductSchemaProps {
  products: Product[];
}

/**
 * Emits one Product JSON-LD per flavor, with an offers[] array per variant.
 * Used in server components (app/shop/page.tsx) — not client-rendered.
 * Schema spec: https://schema.org/Product
 */
export default function ProductSchema({ products }: ProductSchemaProps) {
  const schemas = buildProductSchemas(products);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
    />
  );
}
