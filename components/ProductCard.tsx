"use client";

import { ProductOption } from "@/lib/products";
import Link from "next/link";

interface ProductCardProps {
  product: ProductOption;
  tag?: string;
}

export default function ProductCard({ product, tag }: ProductCardProps) {
  const handleCheckout = async () => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity: 1 }),
    });

    if (!res.ok) {
      alert("Something went wrong starting checkout. Try again.");
      return;
    }

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-morselGold/10 p-6 flex flex-col hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      {tag && (
        <div className="mb-3">
          <span className="inline-block px-2 py-1 text-xs font-semibold bg-morselGold/20 text-morselCocoa rounded-full">
            {tag}
          </span>
        </div>
      )}
      <div className="mb-4 flex-1">
        {/* Product image placeholder */}
        <div className="w-full h-48 bg-gradient-to-br from-morselGoldLight/20 to-morselGold/10 rounded-xl mb-4 flex items-center justify-center">
          <p className="text-xs text-morselBrown/30">Product photo</p>
        </div>
        <h3 className="text-base font-display font-semibold mb-2 text-morselCocoa">
          {product.name}
        </h3>
        <p className="text-sm text-morselBrown/70 mb-4">{product.description}</p>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-morselGold/10">
        <div className="text-xl font-display font-bold text-morselCocoa">
          ${(product.priceCents / 100).toFixed(2)}
        </div>
        <button
          onClick={handleCheckout}
          className="px-5 py-2.5 text-sm font-semibold rounded-full bg-morselCocoa text-white shadow-button hover:shadow-button-hover hover:scale-[1.02] transition-all duration-200"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}
