import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Format non supporté (JPEG, PNG, WebP)" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Fichier trop volumineux (max 8 Mo)" }, { status: 400 });

    const ext = file.name.split(".").pop() || "jpg";
    const blob = await put(`macbooks/${uuidv4()}.${ext}`, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Erreur upload" }, { status: 500 });
  }
}
