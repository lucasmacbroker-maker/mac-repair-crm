import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { BUYBACK_SETUP_STATEMENTS } from "@/lib/buyback-setup";

/** Indique si les tables du module Reprises existent. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const rows = await prisma.$queryRaw<{ name: string | null }[]>`SELECT to_regclass('"Buyback"')::text AS name`;
  return NextResponse.json({ ready: Boolean(rows[0]?.name) });
}

/**
 * Crée les tables du module Reprises (une seule fois, réservé à l'administrateur).
 * Uniquement des créations : aucune table existante n'est modifiée.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!requireRole(user.role, "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
  }
  try {
    for (const sql of BUYBACK_SETUP_STATEMENTS) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.info(`[BUYBACK] tables créées par ${user.email}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[BUYBACK] création des tables impossible :", e);
    return NextResponse.json({ error: `Création impossible : ${(e as Error).message}` }, { status: 500 });
  }
}
