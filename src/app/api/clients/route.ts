import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const repairs = await prisma.repair.findMany({
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
