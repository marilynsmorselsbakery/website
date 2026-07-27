import { describe, expect, it } from "vitest";
import { buildProductSchemas } from "./product-schema-data";
import type { Product } from "@/lib/products";

const product: Product = {
  id: "chocolate_chip",
  flavor: "chocolate_chip",
  name: "Old Fashion Chocolate Chip",
  description: "Classic cookies.",
  category: "cookie",
  variants: [
    {
      sku: "cc-6",
      stripeProductId: "prod_123",
      stripePriceId: "price_123",
      packSize: "6",
      packLabel: "Half-Dozen",
      priceCents: 1_300,
    },
  ],
};

describe("Product schema data", () => {
  it("adds the mapped product photo as an absolute image URL", () => {
    const [schema] = buildProductSchemas([product]);

    expect(schema.image).toMatch(/^https:\/\/marilynsmorsels\.com\//);
    expect(schema.image).toContain("chocolate-chip-baked");
  });

  it("preserves the product offer data", () => {
    const [schema] = buildProductSchemas([product]);

    expect(schema.offers).toHaveLength(1);
    expect(schema.offers[0]).toMatchObject({
      name: "Half-Dozen",
      priceCurrency: "USD",
      price: "13.00",
      availability: "https://schema.org/InStock",
    });
  });
});
