import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return NextResponse.json({ error: "STRIPE_SECRET_KEY manquante dans les env vars" });

    const body = new URLSearchParams({
      "payment_method_types[0]": "card",
      "customer_email": "test@test.com",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][product_data][name]": "Test réparation",
      "line_items[0][price_data][unit_amount]": "100",
      "line_items[0][quantity]": "1",
      "mode": "payment",
      "success_url": "https://mac-repair-crm-lucasmacbroker.vercel.app/test",
      "cancel_url": "https://mac-repair-crm-lucasmacbroker.vercel.app/test",
    });

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await res.json();

    return NextResponse.json({
      status: res.status,
      ok: res.ok,
      keyPrefix: key.slice(0, 12) + "...",
      stripeResponse: data,
    });
  } catch (err) {
    return NextResponse.json({ exception: String(err) });
  }
}
