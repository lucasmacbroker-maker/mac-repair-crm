import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const macbooks = await prisma.macBookForSale.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(macbooks);
  } catch (error) {
    console.error("List macbooks error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { model, year, specs, condition, originalPrice, promoPrice, status, notes, photos } = await request.json();
    if (!model) return NextResponse.json({ error: "Modèle requis" }, { status: 400 });

    const macbook = await prisma.macBookForSale.create({
      data: {
        model,
        year: year || "",
        specs: specs || "",
        condition: condition || "Très bon état",
        originalPrice: parseFloat(originalPrice) || 0,
        promoPrice: parseFloat(promoPrice) || 0,
        status: status || "AVAILABLE",
        notes: notes || "",
        photos: Array.isArray(photos) ? photos : [],
      },
    });
    return NextResponse.json(macbook, { status: 201 });
  } catch (error) {
    console.error("Create macbook error:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
