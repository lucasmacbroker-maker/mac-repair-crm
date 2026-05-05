import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const service = searchParams.get("service");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const needsCallback = searchParams.get("needsCallback");
    const followUpToday = searchParams.get("followUpToday");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (service) where.service = service;
    if (priority) where.priority = priority;
    if (needsCallback === "true") where.needsCallback = true;
    if (followUpToday === "true") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.nextFollowUp = { gte: today, lt: tomorrow };
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const prospects = await prisma.prospect.findMany({
      where,
      include: {
        notes: { orderBy: { createdAt: "desc" }, take: 1 },
        attachments: { orderBy: { createdAt: "desc" } },
        _count: { select: { notes: true } },
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json(prospects);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json();
    const {
      firstName, lastName, email, phone, company, position,
      linkedinUrl, source, service, priority,
      firstContactDate, lastInteraction, nextFollowUp, conversionDeadline,
      needsCallback, revenuePotential,
    } = body;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Nom et prénom requis" }, { status: 400 });
    }

    const prospect = await prisma.prospect.create({
      data: {
        firstName,
        lastName,
        email: email || "",
        phone: phone || "",
        company: company || "",
        position: position || "",
        linkedinUrl: linkedinUrl || "",
        source: source || "LinkedIn",
        service: service || "REPAIR",
        priority: priority || "MEDIUM",
        firstContactDate: firstContactDate ? new Date(firstContactDate) : null,
        lastInteraction: lastInteraction ? new Date(lastInteraction) : null,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
        conversionDeadline: conversionDeadline ? new Date(conversionDeadline) : null,
        needsCallback: needsCallback || false,
        revenuePotential: revenuePotential || 0,
      },
      include: { notes: true, attachments: true, _count: { select: { notes: true } } },
    });

    return NextResponse.json(prospect, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
