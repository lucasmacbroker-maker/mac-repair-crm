import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function createPaymentSession(params: {
  repairId: string;
  clientEmail: string;
  macModel: string;
  faultType: string;
  finalCost: number; // TTC en euros
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: params.clientEmail,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Réparation ${params.macModel}`,
            description: `Panne : ${params.faultType} — Garantie 12 mois incluse`,
          },
          unit_amount: Math.round(params.finalCost * 100), // centimes
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { repairId: params.repairId },
  });

  if (!session.url) throw new Error("Stripe session URL manquante");
  return session.url;
}
