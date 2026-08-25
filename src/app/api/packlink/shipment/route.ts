import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const PACKLINK_API = "https://api.packlink.com/v1";
const API_KEY = process.env.PACKLINK_API_KEY || "";

// Fixed destination relay: Consigne Franprix Alfortville, 90 Rue Paul Vaillant Couturier
const DESTINATION_RELAY = {
  id: "3408X",
  name: "Consigne Franprix Alfortville",
  street1: "90 Rue Paul Vaillant Couturier",
  city: "Alfortville",
  zip: "94140",
  country: "FR",
};

const ATELIER_PHONE = "0782712123";

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
    contentValue = 500,
  } = body;

  const clientAddress = {
    name: clientName || "",
    surname: clientSurname || "",
    street1: clientStreet || "",
    city: clientCity || "",
    zip: clientZip || "",
    country: "FR",
    phone: (clientPhone || "").replace(/[\s.()\-]/g, "").replace(/^0/, "33"),
    email: clientEmail || "",
  };

  // For Chrono Relais 13 (relay→relay):
  // - from: client's address (they drop off at nearest Chronopost relay)
  // - to: our fixed relay point (Consigne Franprix Alfortville)
  const payload = {
    additional_data: {},
    from: clientAddress,
    to: {
      name: "Mac",
      surname: "Place",
      company: "Mac Place",
      street1: DESTINATION_RELAY.street1,
      city: DESTINATION_RELAY.city,
      zip: DESTINATION_RELAY.zip,
      country: "FR",
      phone: ATELIER_PHONE,
      email: "contact@macplace.fr",
    },
    packages: [{ weight, width: 35, height: 7, length: 25 }],
    carrier_product_id: "ACI_CHRONOPOST_RELAIS_13_S2S",
    service_point_to: {
      id: DESTINATION_RELAY.id,
      name: DESTINATION_RELAY.name,
      street1: DESTINATION_RELAY.street1,
      city: DESTINATION_RELAY.city,
      zip: DESTINATION_RELAY.zip,
      country: DESTINATION_RELAY.country,
    },
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
    const msg = messages?.join(", ") || (data as { message?: string }).message || JSON.stringify(data).slice(0, 300);
    return NextResponse.json({ error: msg || "Erreur Packlink", details: data }, { status: res.status });
  }

  return NextResponse.json(data);
}

// GET /api/packlink/shipment?ref=XXX  →  download label PDF
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

  if (!data.labels || data.labels.length === 0) {
    return NextResponse.json({ pending: true, ref });
  }

  const pdfBuffer = Buffer.from(data.labels[0], "base64");
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bordereau-${ref}.pdf"`,
    },
  });
}
