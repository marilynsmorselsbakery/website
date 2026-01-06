"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useSupabaseClient, useSupabaseSession } from "@/components/SupabaseSessionProvider";

export default function SignupPage() {
  const session = useSupabaseSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabaseClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace("/account");
    }
  }, [router, session]);

  if (session) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    const redirectTo = searchParams.get("redirectTo") || "/account";
    const emailRedirectTo = `${baseUrl}${redirectTo}`;

    const {
      data: { session: newSession },
      error,
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (newSession) {
      router.refresh();
      const redirectTo = searchParams.get("redirectTo") || "/account";
      router.replace(redirectTo);
      return;
    }

    setInfoMessage("Please check your email to complete your sign-up.");
    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-lg border border-morselGold/30 bg-white/90 p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold text-center">Create Your Account</h1>
        {infoMessage ? (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {infoMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        ) : null}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-morselGold/40 px-3 py-2 focus:border-morselGold focus:outline-none focus:ring"
              autoComplete="email"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-morselGold/40 px-3 py-2 focus:border-morselGold focus:outline-none focus:ring"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-md border border-morselGold/40 px-3 py-2 focus:border-morselGold focus:outline-none focus:ring"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-morselGold py-2 text-white transition hover:bg-morselGold/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Creating account..." : "Sign up"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-morselBrown/70">
          Already have an account?{" "}
          <Link href="/login" className="text-morselGold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

