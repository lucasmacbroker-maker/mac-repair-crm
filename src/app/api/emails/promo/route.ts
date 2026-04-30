import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { sendPromoEmail } from "@/lib/email";
import { after } from "next/server";

export async function POST(request: Request) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { recipients, subject, introText, products } = body as {
    recipients: { email: string; firstName: string }[];
    subject: string;
    introText: string;
    products: { name: string; description: string; price: number }[];
  };

  if (!recipients?.length || !subject || !products?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  after(async () => {
    await sendPromoEmail(recipients, subject, introText, products);
  });

  return NextResponse.json({ sent: recipients.length });
}
