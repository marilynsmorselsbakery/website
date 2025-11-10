import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-display font-bold text-morselCocoa mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-morselBrown mb-4">
          Oops! This page doesn&apos;t exist
        </h2>
        <p className="text-morselBrown/70 mb-8">
          Looks like this cookie crumbled away. Let&apos;s get you back to something sweet!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="rounded-md bg-morselGold px-6 py-3 text-white transition hover:bg-morselGold/90"
          >
            Go Home
          </Link>
          <Link
            href="/shop"
            className="rounded-md border border-morselGold/60 px-6 py-3 text-morselBrown transition hover:border-morselGold hover:bg-morselGold/10"
          >
            Shop Cookies
          </Link>
        </div>
      </div>
    </div>
  );
}

