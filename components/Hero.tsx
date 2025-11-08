"use client";

import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden mt-16">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-morselCream via-morselCream/95 to-morselCream/90 z-10" />
        <div className="absolute inset-0 bg-black/30 z-10" />
        {/* Placeholder for cookie image - replace with actual photo */}
        <div className="w-full h-full bg-gradient-to-br from-morselGoldLight/20 via-morselCream to-morselGold/10" />
        {/* Temporary placeholder text - remove when image is added */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <p className="text-morselBrown/20 text-sm">Cookie photography placeholder</p>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-6xl mx-auto px-4 w-full">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-6 text-white drop-shadow-lg">
            Small-batch cookies,{" "}
            <span className="text-morselGoldLight">still warm in spirit.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/95 mb-8 font-body max-w-xl drop-shadow-md">
            Baked fresh in a licensed home kitchen with real butter, premium chocolate, and zero shortcuts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/shop"
              className="px-8 py-4 bg-morselCocoa text-white text-base font-semibold rounded-full shadow-button hover:shadow-button-hover hover:scale-[1.02] transition-all duration-200 text-center"
            >
              Shop Cookies
            </Link>
            <Link
              href="/bulk-orders"
              className="px-8 py-4 bg-white/95 text-morselCocoa text-base font-semibold rounded-full shadow-button hover:shadow-button-hover hover:scale-[1.02] transition-all duration-200 text-center border-2 border-white/50"
            >
              Order for Events
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
