import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;
    if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // Dynamic import to avoid build issues with pdf-parse
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    const text: string = data.text || "";

    // Chronopost tracking number patterns from Packlink labels
    // Format: 2 letters + 9 digits + 2 letters (e.g. XS474454248FR)
    const pattern = /\b([A-Z]{2}\d{9}[A-Z]{2})\b/g;
    const matches = [...text.matchAll(pattern)].map(m => m[1]);

    // Filter common false positives
    const valid = matches.filter(m =>
      !["ENDSTREAM", "STARTXREF"].includes(m)
    );

    if (valid.length > 0) {
      return NextResponse.json({ tracking: valid[0] });
    }

    return NextResponse.json({ tracking: null });
  } catch (error) {
    console.error("Extract tracking error:", error);
    return NextResponse.json({ tracking: null });
  }
}
