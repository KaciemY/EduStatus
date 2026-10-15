
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { portals } from "@/lib/portals";

type HistoryEntry = {
  id: number;
  name: string;
  status: "online" | "unknown";
  responseTime: number;
  checkedAt: string;
};

type HistoryStore = Record<string, HistoryEntry[]>;

export async function GET() {
  try {
    const filePath = join(process.cwd(), "data", "history.json");
    const content = await readFile(filePath, "utf8");
    const history = JSON.parse(content) as HistoryStore;

    const timeline = new Map<string, Record<string, number | string>>();

    const timestamps = [
      ...new Set(
        Object.values(history)
          .flat()
          .map((entry) => entry.checkedAt)
      ),
    ].sort();

    for (const timestamp of timestamps) {
      const snapshot: Record<string, number | string> = {
        checkedAt: timestamp,
      };

      const measurements = portals
        .map((portal) => {
          const entry = (history[String(portal.id)] ?? []).find(
            (item) => item.checkedAt === timestamp
          );

          return entry?.status === "online"
            ? { id: portal.id, responseTime: entry.responseTime }
            : null;
        })
        .filter(
          (entry): entry is { id: number; responseTime: number } =>
            entry !== null
        )
        .sort((a, b) => a.responseTime - b.responseTime);

      measurements.forEach((entry, index) => {
        snapshot[String(entry.id)] = index + 1;
      });

      timeline.set(timestamp, snapshot);
    }

    return NextResponse.json({
      success: true,
      portals: portals.map(({ id, name }) => ({ id, name })),
      history: [...timeline.values()].slice(-100),
    });
  } catch {
    return NextResponse.json({
      success: true,
      portals: portals.map(({ id, name }) => ({ id, name })),
      history: [],
    });
  }
}
