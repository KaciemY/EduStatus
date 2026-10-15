
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Portal } from "@/lib/portals";
import RankingHistoryChart from "@/components/RankingHistoryChart";

type RankedPortal = Portal & {
  responseTime: number | null;
};

export default function RankingPage() {
  const [portals, setPortals] = useState<RankedPortal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRanking() {
      try {
        const response = await fetch("/api/portals", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Nie udało się pobrać portali.");
        }

        const data = await response.json();

        const checkResponse = await fetch("/api/check", {
          cache: "no-store",
        });

        if (!checkResponse.ok) {
          throw new Error("Nie udało się pobrać pomiarów.");
        }

        const checkData = await checkResponse.json();

        const results = new Map(
          checkData.results.map(
            (result: {
              id: number;
              status: string;
              responseTime: number;
            }) => [result.id, result]
          )
        );

        const ranked = data.portals.map((portal: Portal) => {
          const result = results.get(portal.id) as
            | { status: string; responseTime: number }
            | undefined;

          return {
            ...portal,
            status: result?.status ?? "unknown",
            responseTime:
              result?.status === "online"
                ? result.responseTime
                : null,
          };
        });

        if (!cancelled) {
          setPortals(ranked);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("Nie udało się załadować rankingu.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRanking();

    return () => {
      cancelled = true;
    };
  }, []);

  const ranking = useMemo(
    () =>
      [...portals].sort((a, b) => {
        if (a.responseTime === null) return 1;
        if (b.responseTime === null) return -1;
        return a.responseTime - b.responseTime;
      }),
    [portals]
  );

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <Link
          href="/"
          className="text-sm text-indigo-400 transition hover:text-indigo-300"
        >
          ← Powrót do dashboardu
        </Link>

        <div className="mb-8 mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-400">
            EduStatus
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Ranking portali
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Zobacz, które portale edukacyjne odpowiadają najszybciej.
            Ranking uwzględnia aktualne pomiary zakończone poprawną
            odpowiedzią.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-sm text-[var(--muted)]">Portale w rankingu</p>
            <p className="mt-3 text-3xl font-bold">{ranking.filter(
              (portal) => portal.responseTime !== null
            ).length}</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-sm text-[var(--muted)]">Najszybszy portal</p>
            <p className="mt-3 truncate text-lg font-bold">
              {ranking.find((portal) => portal.responseTime !== null)?.name ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-sm text-[var(--muted)]">Najlepszy czas</p>
            <p className="mt-3 text-3xl font-bold text-emerald-400">
              {ranking.find((portal) => portal.responseTime !== null)
                ?.responseTime ?? "—"}
              {ranking.some((portal) => portal.responseTime !== null) && (
                <span className="ml-1 text-sm font-normal">ms</span>
              )}
            </p>
          </div>
        </div>

        {loading && (
          <p className="py-8 text-sm text-[var(--muted)]">
            Ładowanie rankingu...
          </p>
        )}

        {error && (
          <p role="alert" className="py-8 text-sm text-red-400">
            {error}
          </p>
        )}

{!loading && !error && (
  <div className="space-y-8">
    <RankingHistoryChart />
    
    {/* PODIUM TOP 3 */}
    <section>
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">
          EduStatus • Ranking
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">
          🏆 Liderzy rankingu
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Trzy portale z najkrótszym czasem odpowiedzi.
        </p>
      </div>

      {ranking.filter((portal) => portal.responseTime !== null).length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-3xl">📡</p>
          <p className="mt-3 font-semibold">Brak aktualnych pomiarów</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Gdy pojawią się wyniki, tutaj zobaczysz podium.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
          {[1, 0, 2].map((position) => {
            const portal = ranking.filter(
              (item) => item.responseTime !== null
            )[position];

            if (!portal) return null;

            const place = position + 1;
            const medal = ["🥇", "🥈", "🥉"][position];
            const accent = [
              "border-amber-400/50 from-amber-400/15 via-[var(--surface)] to-[var(--surface)]",
              "border-slate-400/50 from-slate-400/15 via-[var(--surface)] to-[var(--surface)]",
              "border-orange-500/50 from-orange-500/15 via-[var(--surface)] to-[var(--surface)]",
            ][position];

            return (
              <div
                key={portal.id}
                className={`relative overflow-hidden rounded-3xl border bg-gradient-to-b p-5 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  position === 0
                    ? "md:order-2 md:py-9"
                    : position === 1
                      ? "md:order-1 md:py-6"
                      : "md:order-3 md:py-6"
                } ${accent}`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold">
                    Miejsce {place}
                  </span>
                  <span className="text-3xl" aria-label={`Miejsce ${place}`}>
                    {medal}
                  </span>
                </div>

                <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-white p-3 shadow-sm">
                  <img
                    src={portal.iconUrl}
                    alt=""
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.style.visibility = "hidden";
                    }}
                  />
                </div>

                <h3 className="mt-4 truncate text-lg font-bold">
                  {portal.name}
                </h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {portal.category}
                </p>

                <div className="mt-6 border-t border-[var(--border)] pt-4">
                  <p className="text-xs text-[var(--muted)]">
                    Czas odpowiedzi
                  </p>
                  <p className="mt-1 text-3xl font-black tracking-tight">
                    {portal.responseTime}
                    <span className="ml-1 text-sm font-medium text-[var(--muted)]">
                      ms
                    </span>
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Odpowiada prawidłowo
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>

    {/* POZOSTAŁE PORTALE */}
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Pełny ranking</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Wszystkie monitorowane portale edukacyjne.
            </p>
          </div>
          <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
            {ranking.length} portali
          </span>
        </div>
      </div>

      <div className="hidden grid-cols-[60px_minmax(0,1fr)_140px] gap-4 border-b border-[var(--border)] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)] sm:grid">
        <span>Pozycja</span>
        <span>Portal</span>
        <span className="text-right">Czas odpowiedzi</span>
      </div>

      {ranking.map((portal, index) => {
        const place = index + 1;
        const hasMeasurement = portal.responseTime !== null;

        return (
          <div
            key={portal.id}
            className="flex items-center gap-3 border-b border-[var(--border)] p-4 transition last:border-b-0 hover:bg-[var(--surface-secondary)] sm:grid sm:grid-cols-[60px_minmax(0,1fr)_140px] sm:gap-4 sm:px-5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-sm font-bold sm:h-10 sm:w-10">
              {hasMeasurement ? place : "—"}
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-2">
                <img
                  src={portal.iconUrl}
                  alt=""
                  className="h-full w-full object-contain"
                  onError={(event) => {
                    event.currentTarget.style.visibility = "hidden";
                  }}
                />
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold">{portal.name}</p>
                <p className="mt-1 truncate text-xs text-[var(--muted)]">
                  {portal.category}
                </p>
              </div>
            </div>

            
                <div className="text-right">
                <p className="font-bold">
                    {hasMeasurement ? `${portal.responseTime} ms` : "Brak pomiaru"}
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                    {hasMeasurement ? "Ostatni pomiar" : "Poza rankingiem"}
                </p>

                {hasMeasurement && (
                    <div className="mt-3 h-2 w-28 overflow-hidden rounded-full bg-[var(--surface-secondary)] sm:ml-auto">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${
                        portal.responseTime! <= 300
                            ? "bg-green-500"
                            : portal.responseTime! <= 800
                            ? "bg-yellow-400"
                            : "bg-red-500"
                        }`}
                        style={{
                        width: `${Math.max(
                            5,
                            Math.min(
                            100,
                            (portal.responseTime! /
                                Math.max(
                                ...ranking
                                    .filter((item) => item.responseTime !== null)
                                    .map((item) => item.responseTime!),
                                1
                                )) *
                                100
                            )
                        )}%`,   
                        }}
                    />
                    </div>
                )}
                </div>

            </div>
        );
      })}
    </section>
  </div>
)}
      </section>
    </main>
  );
}
