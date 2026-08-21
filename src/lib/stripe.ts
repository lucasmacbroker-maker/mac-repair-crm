export async function createPaymentSession(params: {
  repairId: string;
  clientEmail: string;
  macModel: string;
  faultType: string;
  finalCost: number; // TTC en euros
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY manquante");

  const body = new URLSearchParams({
    "payment_method_types[0]": "card",
    "customer_email": params.clientEmail,
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][product_data][name]": `Réparation ${params.macModel}`,
    "line_items[0][price_data][product_data][description]": `Panne : ${params.faultType} — Garantie 12 mois incluse`,
    "line_items[0][price_data][unit_amount]": String(Math.round(params.finalCost * 100)),
    "line_items[0][quantity]": "1",
    "mode": "payment",
    "success_url": params.successUrl,
    "cancel_url": params.cancelUrl,
    "metadata[repairId]": params.repairId,
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await res.json() as { url?: string; error?: { message: string } };

  if (!res.ok || data.error) {
    throw new Error(`Stripe error: ${data.error?.message ?? res.status}`);
  }

  if (!data.url) throw new Error("Stripe session URL manquante");
  return data.url;
}
