import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSecret, isValidBuybackApiKey, newBuybackReference } from "@/lib/buyback-server";
import { buybackPortalUrl, sendBuybackAdminNotification, sendBuybackConfirmationEmail } from "@/lib/buyback-email";
import { sendSMS } from "@/lib/sms";

/**
 * Réception d'une demande de reprise envoyée par le site reprise.macplace.fr.
 * Appel serveur à serveur, protégé par la clé partagée BUYBACK_API_KEY
 * (en-tête « Authorization: Bearer <clé> »).
 */

interface IncomingBuyback {
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    postalCode?: string;
  };
  mac: {
    family: string;
    model: string;
    configuration?: string;
    configManual?: boolean;
    condition: string;
    fault?: string;
    battery?: string;
    charger?: string;
    serialNumber?: string;
  };
  offerAmount: number;
  dropOff: { mode: "POSTAL" | "LOCAL"; requestedDate?: string | null; requestedSlot?: string | null };
  payment: { iban: string; accountHolder: string };
}

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function validate(b: IncomingBuyback): string | null {
  if (!b?.client || !b.mac || !b.dropOff || !b.payment) return "Corps de requête incomplet";
  if (!str(b.client.firstName) || !str(b.client.lastName)) return "Nom du client manquant";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str(b.client.email))) return "E-mail invalide";
  if (!str(b.client.phone)) return "Téléphone manquant";
  if (!str(b.mac.model) || !str(b.mac.condition)) return "Mac incomplet";
  if (typeof b.offerAmount !== "number" || !(b.offerAmount >= 0) || b.offerAmount > 20000) return "Montant d'offre invalide";
  if (b.dropOff.mode !== "POSTAL" && b.dropOff.mode !== "LOCAL") return "Mode de remise invalide";
  if (b.dropOff.mode === "POSTAL" && (!str(b.client.address) || !str(b.client.postalCode) || !str(b.client.city))) {
    return "Adresse requise pour un envoi postal";
  }
  if (!str(b.payment.iban, 50) || !str(b.payment.accountHolder)) return "Coordonnées bancaires manquantes";
  return null;
}

export async function POST(request: Request) {
  if (!isValidBuybackApiKey(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let body: IncomingBuyback;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const problem = validate(body);
  if (problem) return NextResponse.json({ error: problem }, { status: 422 });

  const iban = str(body.payment.iban, 50).replace(/\s+/g, "").toUpperCase();
  const requestedDate =
    body.dropOff.mode === "LOCAL" && body.dropOff.requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(body.dropOff.requestedDate)
      ? new Date(`${body.dropOff.requestedDate}T12:00:00.000Z`)
      : null;

  const data = {
    clientFirstName: str(body.client.firstName, 100),
    clientLastName: str(body.client.lastName, 100),
    clientEmail: str(body.client.email, 200).toLowerCase(),
    clientPhone: str(body.client.phone, 30),
    clientAddress: str(body.client.address),
    clientCity: str(body.client.city, 100),
    clientPostalCode: str(body.client.postalCode, 10),
    macFamily: str(body.mac.family, 100),
    macModel: str(body.mac.model, 200),
    configuration: str(body.mac.configuration),
    configManual: Boolean(body.mac.configManual),
    condition: str(body.mac.condition, 100),
    fault: str(body.mac.fault, 200),
    battery: str(body.mac.battery, 100),
    charger: str(body.mac.charger, 20),
    serialNumber: str(body.mac.serialNumber, 20).toUpperCase(),
    offerAmount: body.offerAmount,
    dropOffMode: body.dropOff.mode,
    requestedDate,
    requestedSlot: str(body.dropOff.requestedSlot, 60),
    ibanEncrypted: encryptSecret(iban),
    ibanLast4: iban.slice(-4),
    accountHolder: str(body.payment.accountHolder, 150),
  };

  // La référence est unique : on retente en cas de collision (très improbable).
  let buyback = null;
  for (let attempt = 0; attempt < 5 && !buyback; attempt++) {
    try {
      buyback = await prisma.buyback.create({ data: { ...data, reference: newBuybackReference() } });
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  if (!buyback) return NextResponse.json({ error: "Référence indisponible, réessayez" }, { status: 503 });

  const created = buyback;
  after(async () => {
    await sendBuybackConfirmationEmail(created);
    await sendBuybackAdminNotification(created);
    if (created.clientPhone) {
      sendSMS(
        created.clientPhone,
        `Mac Place — Demande de reprise ${created.reference} bien reçue. Suivez-la ici : ${buybackPortalUrl(created.token)} (Ne pas répondre)`,
      ).catch((e) => console.error("[BUYBACK SMS] échec :", e));
    }
  });

  return NextResponse.json(
    { reference: created.reference, token: created.token, portalUrl: buybackPortalUrl(created.token) },
    { status: 201 },
  );
}
