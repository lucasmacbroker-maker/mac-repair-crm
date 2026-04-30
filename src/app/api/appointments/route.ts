import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const repairs = await prisma.repair.findMany({
      where: {
        repairType: "LOCAL",
        appointmentDate: {
          not: null,
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
        status: { not: "CLOSED" },
      },
      select: {
        id: true,
        clientFirstName: true,
        clientLastName: true,
        clientPhone: true,
        macModel: true,
        faultType: true,
        status: true,
        priority: true,
        appointmentDate: true,
        technician: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { appointmentDate: "asc" },
    });

    return NextResponse.json(repairs);
  } catch (error) {
    console.error("List appointments error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
