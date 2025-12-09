import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-11-17.clover" as Stripe.LatestApiVersion,
    })
  : null;

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = createSupabaseServiceRoleClient();
  const productIds = session.metadata?.productIds ?? null;
  const supabaseUserId = session.metadata?.supabase_user_id ?? null;

  try {
    await supabase.from("orders").insert({
      id: session.id,
      supabase_user_id: supabaseUserId,
      product_ids: productIds,
      amount_total: session.amount_total ?? null,
      currency: session.currency ?? null,
      payment_status: session.payment_status ?? session.status ?? null,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to persist order from webhook", error);
  }
}

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    console.error("Stripe webhook configuration is missing");
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Stripe webhook signature verification failed", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
    }
  } catch (error) {
    console.error("Stripe webhook handler error", error);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

