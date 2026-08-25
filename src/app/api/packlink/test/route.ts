import { NextResponse } from "next/server";

const PACKLINK_API = "https://api.packlink.com/v1";
const API_KEY = process.env.PACKLINK_API_KEY || "";

export async function GET() {

  try {
    // Test: get account info / available services for a standard FR→FR shipment
    const res = await fetch(
      `${PACKLINK_API}/services?from[zip]=94140&from[country]=FR&to[zip]=75001&to[country]=FR&packages[0][weight]=2&packages[0][width]=35&packages[0][height]=7&packages[0][length]=25&source=PR`,
      { headers: { Authorization: API_KEY } }
    );

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    return NextResponse.json({ status: res.status, ok: res.ok, data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
