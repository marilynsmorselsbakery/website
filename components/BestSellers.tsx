import ProductCard from "@/components/ProductCard";
import { products } from "@/lib/products";
import Link from "next/link";

export default function BestSellers() {
  // Show the 12-pack chocolate chip first, then 2 others
  const featured = [
    products.find((p) => p.id === "cc-12"),
    products.find((p) => p.id === "cc-6"),
    products.find((p) => p.id === "bc-12"),
  ].filter(Boolean) as typeof products;

  const tags = ["Best-seller", "Marilyn's Favorite", "Limited Batch"];

  return (
    <section className="bg-white py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-morselCocoa mb-4">
            Best-sellers
          </h2>
          <p className="text-morselBrown/70 text-lg max-w-2xl mx-auto">
            These are the hits. Start here.
          </p>
        </div>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3 mb-10">
          {featured.map((product, index) => (
            <ProductCard key={product.id} product={product} tag={tags[index]} />
          ))}
        </div>
        <div className="text-center">
          <Link
            href="/shop"
            className="inline-block px-8 py-4 bg-morselCocoa text-white text-base font-semibold rounded-full shadow-button hover:shadow-button-hover hover:scale-[1.02] transition-all duration-200"
          >
            View All Cookies
          </Link>
        </div>
      </div>
    </section>
  );
}

