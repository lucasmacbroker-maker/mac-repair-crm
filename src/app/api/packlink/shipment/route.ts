import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const PACKLINK_API = "https://api.packlink.com/v1";
const API_KEY = process.env.PACKLINK_API_KEY || "";

const ATELIER = {
  name: "Mac Place",
  surname: "",
  company: "Mac Place",
  street1: "5, rue Paul Vaillant Couturier",
  city: "Maisons Alfort",
  zip: "94700",
  country: "FR",
  phone: "07 82 71 21 23",
  email: "contact@macplace.fr",
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const {
    clientName,
    clientSurname,
    clientPhone,
    clientEmail,
    clientStreet,
    clientCity,
    clientZip,
    weight = 2,
    width = 35,
    height = 7,
    length = 25,
    serviceId = "ACI_CHRONOPOST_18_S2H",
    contentValue = 500,
    direction = "inbound", // inbound = client→atelier, outbound = atelier→client
  } = body;

  const ATELIER_PHONE = "0782712123";

  const clientAddress = {
    name: clientName || "",
    surname: clientSurname || "",
    street1: clientStreet || "",
    city: clientCity || "",
    zip: clientZip || "",
    country: "FR",
    phone: (clientPhone || "").replace(/[\s.]/g, ""),
    email: clientEmail || "",
  };

  const atelierAddr = { ...ATELIER, phone: ATELIER_PHONE };
  const fromAddr = direction === "inbound" ? clientAddress : atelierAddr;
  const toAddr   = direction === "inbound" ? atelierAddr   : clientAddress;

  const payload = {
    additional_data: {},
    from: fromAddr,
    to: toAddr,
    packages: [{ weight, width, height, length }],
    carrier_product_id: serviceId,
    content: "Ordinateur portable Mac - réparation",
    content_value: contentValue,
    source: "PR",
  };

  console.log("[Packlink] POST payload:", JSON.stringify(payload));

  const res = await fetch(`${PACKLINK_API}/shipments`, {
    method: "POST",
    headers: {
      Authorization: API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log("[Packlink] response status:", res.status, "body:", text);
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    const messages = (data as { messages?: string[] }).messages;
    const msg = messages?.join(", ") || (data as { message?: string }).message || text;
    return NextResponse.json({ error: msg || "Erreur Packlink", details: data }, { status: res.status });
  }

  return NextResponse.json(data);
}

// GET /api/packlink/shipment?ref=XXX  →  download label PDF (proxy to avoid CORS + expose key)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  if (!ref) return NextResponse.json({ error: "ref manquant" }, { status: 400 });

  const res = await fetch(`${PACKLINK_API}/shipments/${ref}/labels`, {
    headers: { Authorization: API_KEY },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: "Erreur Packlink", details: text }, { status: res.status });
  }

  const data = await res.json() as { labels?: string[] };

  // labels is an array of base64-encoded PDFs
  if (!data.labels || data.labels.length === 0) {
    // Sometimes labels aren't ready yet — return the reference so UI can poll
    return NextResponse.json({ pending: true, ref });
  }

  // Decode first label and stream as PDF
  const pdfBuffer = Buffer.from(data.labels[0], "base64");
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bordereau-${ref}.pdf"`,
    },
  });
}
