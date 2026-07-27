import type { Product } from "@/lib/products";
import { getProductImageSource } from "../lib/product-images";

const SITE_URL = "https://marilynsmorsels.com";

export function buildProductSchemas(products: Product[]) {
  return products.map((product) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: new URL(getProductImageSource(product.id), SITE_URL).toString(),
    description: product.description,
    category: product.category === "cookie" ? "Cookies" : "Cookie Dough",
    brand: {
      "@type": "Brand",
      name: "Marilyn's Morsels Bakery",
    },
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      name: variant.packLabel,
      priceCurrency: "USD",
      price: (variant.priceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      url: "https://marilynsmorsels.com/shop",
      seller: {
        "@type": "Organization",
        name: "Marilyn's Morsels Bakery",
      },
    })),
  }));
}
