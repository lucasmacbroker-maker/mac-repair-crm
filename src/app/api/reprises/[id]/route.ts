import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/auth";

const userSelect = { select: { id: true, firstName: true, lastName: true } };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;

  const buyback = await prisma.buyback.findUnique({
    where: { id },
    include: {
      notes: { include: { user: userSelect }, orderBy: { createdAt: "desc" } },
      statusChanges: { include: { user: userSelect }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!buyback) return NextResponse.json({ error: "Reprise introuvable" }, { status: 404 });

  // L'IBAN chiffré ne quitte pas le serveur ; il s'affiche via /iban, à la demande.
  const { ibanEncrypted, ...safe } = buyback;
  return NextResponse.json({ ...safe, hasIban: Boolean(ibanEncrypted) });
}

/** Champs modifiables depuis la fiche reprise. */
const EDITABLE_TEXT = [
  "clientFirstName",
  "clientLastName",
  "clientEmail",
  "clientPhone",
  "clientAddress",
  "clientCity",
  "clientPostalCode",
  "serialNumber",
  "inboundTracking",
  "carrier",
  "trackingLink",
  "labelUrl",
] as const;

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  for (const key of EDITABLE_TEXT) {
    if (typeof body[key] === "string") data[key] = body[key].trim();
  }
  if ("appointmentDate" in body) data.appointmentDate = body.appointmentDate ? new Date(body.appointmentDate) : null;
  if (typeof body.finalAmount === "number" && body.finalAmount >= 0) data.finalAmount = body.finalAmount;

  try {
    const buyback = await prisma.buyback.update({ where: { id }, data });
    const { ibanEncrypted, ...safe } = buyback;
    return NextResponse.json({ ...safe, hasIban: Boolean(ibanEncrypted) });
  } catch {
    return NextResponse.json({ error: "Reprise introuvable" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!requireRole(user.role, "SUPER_ADMIN")) return NextResponse.json({ error: "Accès réservé à l'administrateur" }, { status: 403 });
  const { id } = await params;
  try {
    await prisma.buyback.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Reprise introuvable" }, { status: 404 });
  }
}
