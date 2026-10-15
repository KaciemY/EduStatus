
import { NextResponse } from "next/server";
import { portals } from "@/lib/portals";

type CheckResult = {
  id: number;
  name: string;
  url: string;
  status: "online" | "unknown";
  httpStatus: number | null;
  responseTime: number;
  checkedAt: string;
};

export async function GET() {
  const results: CheckResult[] = await Promise.all(
    portals.map(async (portal) => {
      const start = Date.now();

      try {
        const response = await fetch(portal.url, {
          method: "GET",
          cache: "no-store",
          redirect: "follow",
          signal: AbortSignal.timeout(8000),
          headers: {
            "User-Agent": "EduStatus-Monitor/1.0",
          },
        });

        return {
          id: portal.id,
          name: portal.name,
          url: portal.url,
          status: response.ok ? "online" : "unknown",
          httpStatus: response.status,
          responseTime: Date.now() - start,
          checkedAt: new Date().toISOString(),
        };
      } catch {
        return {
          id: portal.id,
          name: portal.name,
          url: portal.url,
          status: "unknown",
          httpStatus: null,
          responseTime: Date.now() - start,
          checkedAt: new Date().toISOString(),
        };
      }
    })
  );

  return NextResponse.json({
    success: true,
    count: results.length,
    results,
  });
}
