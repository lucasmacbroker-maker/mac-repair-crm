import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const repairs = await db.repair.findMany({
    select: {
      clientFirstName: true,
      clientLastName: true,
      clientEmail: true,
      clientPhone: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Deduplicate by email, keep most recent repair info
  const map = new Map<string, {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    repairCount: number;
    lastRepair: Date;
  }>();

  for (const r of repairs) {
    const email = r.clientEmail.toLowerCase().trim();
    if (!email) continue;
    if (map.has(email)) {
      map.get(email)!.repairCount++;
    } else {
      map.set(email, {
        firstName: r.clientFirstName,
        lastName: r.clientLastName,
        email: r.clientEmail,
        phone: r.clientPhone,
        repairCount: 1,
        lastRepair: r.createdAt,
      });
    }
  }

  const clients = Array.from(map.values()).sort((a, b) =>
    a.lastName.localeCompare(b.lastName),
  );

  return NextResponse.json({ clients });
}
