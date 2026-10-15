
import { NextResponse } from "next/server";
import { portals } from "@/lib/portals";

export async function GET() {
  return NextResponse.json({
    success: true,
    count: portals.length,
    portals,
  });
}
