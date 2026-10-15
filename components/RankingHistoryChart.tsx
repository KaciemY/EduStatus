
"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PortalInfo = {
  id: number;
  name: string;
};

type HistoryPoint = {
  checkedAt: string;
  [key: string]: string | number;
};

export default function RankingHistoryChart() {
  const [portals, setPortals] = useState<PortalInfo[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [days, setDays] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const response = await fetch("/api/ranking-history", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Nie udało się pobrać historii.");
        }

        const data = await response.json();

        if (!cancelled) {
          setPortals(data.portals ?? []);
          setHistory(data.history ?? []);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("Nie udało się załadować historii rankingu.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const filteredHistory = history
    .filter((point) => new Date(point.checkedAt).getTime() >= cutoff)
    .map((point) => ({
      ...point,
      label: new Date(point.checkedAt).toLocaleString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

  const colors = [
    "#818cf8",
    "#34d399",
    "#fb923c",
    "#f472b6",
    "#38bdf8",
    "#facc15",
    "#c084fc",
    "#fb7185",
    "#a3e635",
    "#2dd4bf",
  ];

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">
            EduStatus • Analityka
          </p>
          <h2 className="mt-2 text-xl font-bold">
            Historia pozycji portali
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Niższa pozycja na wykresie oznacza lepszy wynik.
          </p>
        </div>

        <select
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          aria-label="Zakres historii"
        >
          <option value={1}>Ostatnie 24 godziny</option>
          <option value={7}>Ostatnie 7 dni</option>
          <option value={30}>Ostatnie 30 dni</option>
        </select>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-[var(--muted)]">
          Ładowanie historii...
        </p>
      ) : error ? (
        <p role="alert" className="py-12 text-center text-sm text-red-400">
          {error}
        </p>
      ) : filteredHistory.length < 2 ? (
        <div className="py-12 text-center">
          <p className="font-semibold">Zbieramy dane do wykresu</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Potrzebujemy co najmniej dwóch pomiarów w wybranym okresie.
            Historia będzie coraz bardziej przydatna wraz z kolejnymi pomiarami.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredHistory}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  minTickGap={35}
                />
                <YAxis
                  reversed
                  allowDecimals={false}
                  domain={[1, "auto"]}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  label={{
                    value: "Pozycja",
                    angle: -90,
                    position: "insideLeft",
                    fill: "var(--muted)",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface)",
                    borderColor: "var(--border)",
                    borderRadius: 12,
                    color: "var(--foreground)",
                  }}
                  labelFormatter={(_, payload) => {
                    const timestamp = payload?.[0]?.payload?.checkedAt;
                    return typeof timestamp === "string"
                      ? new Date(timestamp).toLocaleString("pl-PL")
                      : "";
                  }}
                  formatter={(value, name) => [
                    value == null ? "Brak pomiaru" : `Miejsce ${value}`,
                    portals.find((portal) => String(portal.id) === String(name))
                      ?.name ?? String(name),
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    portals.find((portal) => String(portal.id) === String(value))
                      ?.name ?? String(value)
                  }
                />
                {portals.map((portal, index) => (
                  <Line
                    key={portal.id}
                    type="monotone"
                    dataKey={String(portal.id)}
                    name={String(portal.id)}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-3 text-xs text-[var(--muted)]">
            Pozycje są wyliczane na podstawie zapisanych czasów odpowiedzi.
            Brak punktu oznacza brak poprawnego pomiaru portalu w danym
            momencie.
          </p>
        </>
      )}
    </section>
  );
}
