import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Clients from repairs
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

  const map = new Map<string, {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    repairCount: number;
    source: string;
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
        source: "repair",
      });
    }
  }

  // Imported clients (only add those not already from repairs)
  const imported = await prisma.client.findMany({ orderBy: { name: "asc" } });
  for (const c of imported) {
    const email = c.email.toLowerCase().trim();
    if (map.has(email)) continue;
    const parts = c.name.trim().split(/\s+/);
    const firstName = parts[0] ?? c.name;
    const lastName = parts.slice(1).join(" ");
    map.set(email, {
      firstName,
      lastName,
      email: c.email,
      phone: c.phone,
      repairCount: 0,
      source: "import",
    });
  }

  const clients = Array.from(map.values()).sort((a, b) =>
    (a.lastName || a.firstName).localeCompare(b.lastName || b.firstName),
  );

  return NextResponse.json({ clients });
}
