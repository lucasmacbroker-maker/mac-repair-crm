import { NextResponse } from "next/server";

const PACKLINK_API = "https://api.packlink.com/v1";
const API_KEY = process.env.PACKLINK_API_KEY || "";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "services";

  try {
    if (mode === "points") {
      // Search relay points near 94700 Maisons-Alfort for Chrono Relais 13
      const res = await fetch(
        `${PACKLINK_API}/service-points?source=ACI_CHRONOPOST_RELAIS_13_S2S&zip=94700&country=FR`,
        { headers: { Authorization: API_KEY } }
      );
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      return NextResponse.json({ status: res.status, ok: res.ok, mode: "points", data });
    }

    // Default: list available services
    const res = await fetch(
      `${PACKLINK_API}/services?from[zip]=94140&from[country]=FR&to[zip]=75001&to[country]=FR&packages[0][weight]=2&packages[0][width]=35&packages[0][height]=7&packages[0][length]=25&source=PR`,
      { headers: { Authorization: API_KEY } }
    );
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return NextResponse.json({ status: res.status, ok: res.ok, mode: "services", data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
