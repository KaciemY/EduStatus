
import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { portals } from "@/lib/portals";


type HistoryEntry = {
  id: number;
  name: string;
  url: string;
  status: "online" | "unknown";
  httpStatus: number | null;
  responseTime: number;
  checkedAt: string;
};

type HistoryStore = Record<string, HistoryEntry[]>;

const HISTORY_LIMIT = 100;

async function saveHistory(results: HistoryEntry[]) {
  const directory = join(process.cwd(), "data");
  const filePath = join(directory, "history.json");

  await mkdir(directory, { recursive: true });

  let history: HistoryStore = {};

  try {
    const content = await readFile(filePath, "utf8");
    history = JSON.parse(content) as HistoryStore;
  } catch {
    // Plik historii jeszcze nie istnieje.
  }

  for (const result of results) {
    const key = String(result.id);
    const previousEntries = history[key] ?? [];

    history[key] = [...previousEntries, result].slice(-HISTORY_LIMIT);
  }

  await writeFile(filePath, JSON.stringify(history, null, 2), "utf8");
}

export async function GET() {
  const results: HistoryEntry[] = await Promise.all(
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

  try {
    await saveHistory(results);
  } catch (error) {
    console.error("Błąd zapisu historii:", error);
  }

  return NextResponse.json({
    success: true,
    count: results.length,
    results,
  });
}
