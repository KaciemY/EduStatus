
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");
  const id = Number(idParam);

  if (!idParam || !Number.isInteger(id) || id < 1) {
    return NextResponse.json(
      { success: false, error: "Nieprawidłowe ID portalu." },
      { status: 400 }
    );
  }

  try {
    const filePath = join(process.cwd(), "data", "history.json");
    const content = await readFile(filePath, "utf8");
    const history = JSON.parse(content) as Record<string, unknown>;

    return NextResponse.json({
      success: true,
      history: Array.isArray(history[String(id)])
        ? history[String(id)]
        : [],
    });
  } catch {
    return NextResponse.json({
      success: true,
      history: [],
    });
  }
}
