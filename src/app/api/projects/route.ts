import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const projects = await prisma.project.findMany({
      include: {
        tasks: {
          orderBy: { position: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { title, description, color } = await request.json();
    if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

    const project = await prisma.project.create({
      data: {
        title,
        description: description || "",
        color: color || "#0071e3",
      },
      include: { tasks: true },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
