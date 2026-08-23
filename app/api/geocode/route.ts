import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress, MAPBOX_TOKEN } from "@/lib/mapbox";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Query param 'q' is required." }, { status: 400 });
  }
  if (!MAPBOX_TOKEN) {
    return NextResponse.json(
      { error: "Geocoding is unavailable: MAPBOX_TOKEN is not configured." },
      { status: 501 }
    );
  }
  try {
    const result = await geocodeAddress(query);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Geocoding failed." },
      { status: 502 }
    );
  }
}
