import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { title, description, status, priority, dueDate, projectId } = await request.json();
    if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

    // Get max position for this project/status column
    const maxPos = await prisma.task.aggregate({
      where: { projectId: projectId || null, status: status || "TODO" },
      _max: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        title,
        description: description || "",
        status: status || "TODO",
        priority: priority || "NORMAL",
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: projectId || null,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
