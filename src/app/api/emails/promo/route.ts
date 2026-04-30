import { NextResponse, after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendPromoEmail } from "@/lib/email";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
