import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { inflateSync, inflateRawSync } from "zlib";

// Chronopost tracking pattern: 2 letters + 9 digits + 2 letters (e.g. XS474454248FR)
const TRACKING_REGEX = /\b([A-Z]{2}\d{9}[A-Z]{2})\b/g;

function findTracking(text: string): string | null {
  const matches = [...text.matchAll(TRACKING_REGEX)].map(m => m[1]);
  const filtered = matches.filter(m => !["ENDSTREAM", "STARTXREF", "FLATEDECODE"].includes(m));
  return filtered[0] ?? null;
}

function extractFromRawPDF(buffer: Buffer): string {
  const texts: string[] = [];

  // Method 1: raw scan (works for uncompressed streams)
  const raw = buffer.toString("latin1");
  texts.push(raw);

  // Method 2: decompress FlateDecode streams
  let pos = 0;
  while (pos < buffer.length) {
    const streamStart = buffer.indexOf(Buffer.from("stream"), pos);
    if (streamStart === -1) break;

    const afterStream = streamStart + 6;
    // Skip \r\n or \n
    const dataStart = buffer[afterStream] === 0x0d ? afterStream + 2 : afterStream + 1;

    const streamEnd = buffer.indexOf(Buffer.from("endstream"), dataStart);
    if (streamEnd === -1) { pos = afterStream; continue; }

    // Check if this stream has FlateDecode in its dictionary
    const dictStart = Math.max(0, streamStart - 300);
    const dict = buffer.slice(dictStart, streamStart).toString("latin1");
    const isFlate = dict.includes("FlateDecode") || dict.includes("Fl\n");

    if (isFlate) {
      const streamData = buffer.slice(dataStart, streamEnd);
      // Try multiple end positions (PDF may have \r\n before endstream)
      const endings = [streamData, buffer.slice(dataStart, streamEnd - 1), buffer.slice(dataStart, streamEnd - 2)];
      for (const data of endings) {
        try {
          const decompressed = inflateSync(data);
          texts.push(decompressed.toString("utf8"));
          break;
        } catch {
          try {
            const decompressed = inflateRawSync(data);
            texts.push(decompressed.toString("utf8"));
            break;
          } catch { /* try next */ }
        }
      }
    }
    pos = streamEnd + 9;
  }

  return texts.join(" ");
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;
    if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // Method 1: try pdf-parse for clean text extraction
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
      const tracking = findTracking(data.text || "");
      if (tracking) return NextResponse.json({ tracking, method: "pdf-parse" });
    } catch { /* fall through to manual extraction */ }

    // Method 2: manual zlib decompression
    const extractedText = extractFromRawPDF(buffer);
    const tracking = findTracking(extractedText);
    if (tracking) return NextResponse.json({ tracking, method: "zlib" });

    return NextResponse.json({ tracking: null });
  } catch (error) {
    console.error("Extract tracking error:", error);
    return NextResponse.json({ tracking: null });
  }
}
