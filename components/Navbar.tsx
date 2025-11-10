"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import logoSquare from "@/assets/clear-logo-square.png";
import { useSupabaseClient, useSupabaseSession } from "@/components/SupabaseSessionProvider";
import { useCart } from "@/components/CartProvider";
import CartDrawer from "@/components/CartDrawer";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const router = useRouter();
  const session = useSupabaseSession();
  const supabase = useSupabaseClient();
  const { itemCount } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      router.refresh();
      router.push("/");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleCheckout = async () => {
    setIsCartOpen(false);
    if (!session) {
      router.push("/login?redirectTo=/shop");
      return;
    }
    router.push("/checkout");
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full border-b transition-all duration-200 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md border-morselGold/30 shadow-sm"
            : "bg-white/80 backdrop-blur border-morselGold/20"
        }`}
      >
        <nav className="max-w-6xl mx-auto flex items-center justify-between py-4 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={logoSquare}
              alt="Marilyn's Morsels"
              width={40}
              height={40}
              className="h-8 w-8 md:h-10 md:w-10"
              priority
            />
            <span className="text-xl font-display font-semibold tracking-tight">
              Marilyn&apos;s <span className="text-morselGold">Morsels</span>
            </span>
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/shop" className="hover:text-morselGold transition-colors duration-150">
              Shop
            </Link>
            <Link href="/about" className="hover:text-morselGold transition-colors duration-150">
              About
            </Link>
            <Link href="/bulk-orders" className="hover:text-morselGold transition-colors duration-150">
              Bulk Orders
            </Link>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative hover:text-morselGold transition-colors duration-150"
              aria-label="Open cart"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-morselGold text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </button>
            {session ? (
              <>
                <Link href="/account" className="hover:text-morselGold transition-colors duration-150">
                  Account
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="rounded-md border border-morselGold/60 px-3 py-1 transition hover:border-morselGold hover:bg-morselGold/10 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-morselGold transition-colors duration-150">
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-morselGold px-3 py-1 text-white transition hover:bg-morselGold/90"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleCheckout}
      />
    </>
  );
}
