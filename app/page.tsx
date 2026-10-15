
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Portal } from "@/lib/portals";
import { useTheme } from "@/components/ThemeProvider";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const statusInfo = {
  online: {
    label: "Działa",
    dot: "bg-emerald-400",
    badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-500 dark:text-emerald-300",
  },
  maintenance: {
    label: "Przerwa techniczna",
    dot: "bg-amber-400",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  },
  unknown: {
    label: "Nieznany",
    dot: "bg-slate-400",
    badge: "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-300",
  },
};
type MonitoredPortal = Portal & {
  httpStatus: number | null;
  checkedAt: string | null;
};

type CheckResult = {
  id: number;
  status: "online" | "unknown";
  httpStatus: number | null;
  responseTime: number;
  checkedAt: string;
};

type HistoryEntry = {
  id: number;
  name: string;
  url: string;
  status: "online" | "unknown";
  httpStatus: number | null;
  responseTime: number;
  checkedAt: string;
};

export default function Home() {
  
const [portals, setPortals] = useState<MonitoredPortal[]>([]);
const [loading, setLoading] = useState(true);
const [checking, setChecking] = useState(false);
const [notifications, setNotifications] = useState<
  { id: number; message: string; type: "error" | "success" }[]
>([]);
const previousStatuses = useRef<Record<number, string>>({});
const hasCompletedFirstCheck = useRef(false);
const [error, setError] = useState("");
const [lastChecked, setLastChecked] = useState<string | null>(null);
const [expandedPortalId, setExpandedPortalId] = useState<number | null>(null);
const [historyByPortal, setHistoryByPortal] = useState<Record<number, HistoryEntry[]>>({});
const [historyLoading, setHistoryLoading] = useState<number | null>(null);
const [historyErrors, setHistoryErrors] = useState<Record<number, string>>({});
const { theme, toggleTheme } = useTheme();


const checkPortals = useCallback(async () => {
  setChecking(true);
  setError("");

  try {
    const [portalsResponse, checkResponse] = await Promise.all([
      fetch("/api/portals", { cache: "no-store" }),
      fetch("/api/check", { cache: "no-store" }),
    ]);

    if (!portalsResponse.ok || !checkResponse.ok) {
      throw new Error("Nie udało się pobrać danych.");
    }

    const portalData: {
      success: boolean;
      count: number;
      portals: Portal[];
    } = await portalsResponse.json();

    const checkData: {
      success: boolean;
      count: number;
      results: CheckResult[];
    } = await checkResponse.json();

    const resultsById = new Map(
      checkData.results.map((result) => [result.id, result])
    );

    const monitoredPortals: MonitoredPortal[] =
      portalData.portals.map((portal) => {
        const result = resultsById.get(portal.id);

        return {
          ...portal,
          status: result?.status ?? "unknown",
          responseTime: result?.responseTime ?? null,
          httpStatus: result?.httpStatus ?? null,
          checkedAt: result?.checkedAt ?? null,
        };
      });
const newNotifications: {
  id: number;
  message: string;
  type: "error" | "success";
}[] = [];

if (hasCompletedFirstCheck.current) {
  for (const portal of monitoredPortals) {
    const previousStatus = previousStatuses.current[portal.id];

    if (previousStatus === "online" && portal.status !== "online") {
      newNotifications.push({
        id: portal.id,
        message: `${portal.name} przestał odpowiadać poprawnie.`,
        type: "error",
      });
    } else if (
      previousStatus !== "online" &&
      previousStatus !== undefined &&
      portal.status === "online"
    ) {
      newNotifications.push({
        id: portal.id,
        message: `${portal.name} ponownie działa poprawnie.`,
        type: "success",
      });
    }
  }
}

previousStatuses.current = Object.fromEntries(
  monitoredPortals.map((portal) => [portal.id, portal.status])
);

hasCompletedFirstCheck.current = true;

if (newNotifications.length > 0) {
  setNotifications((previous) =>
    [...newNotifications, ...previous].slice(0, 5)
  );
}

setPortals(monitoredPortals);
setLastChecked(new Date().toISOString());
  } catch {
    setError("Nie udało się sprawdzić portali. Spróbuj ponownie.");
  } finally {
    setLoading(false);
    setChecking(false);
  }
}, []);

useEffect(() => {
  void checkPortals();

  const interval = setInterval(() => {
    void checkPortals();
  }, 60_000);

  return () => clearInterval(interval);
}, [checkPortals]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Wszystkie");
  const [filter, setFilter] = useState("Wszystkie");


const filteredPortals = useMemo(() => {
  return portals.filter((portal) => {
    const matchesSearch = `${portal.name} ${portal.description}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "Wszystkie" || portal.category === category;

    const matchesStatus =
      filter === "Wszystkie" ||
      (filter === "Działa" && portal.status === "online") ||
      (filter === "Przerwa techniczna" &&
        portal.status === "maintenance") ||
      (filter === "Nieznany" && portal.status === "unknown");

    return matchesSearch && matchesCategory && matchesStatus;
  });
}, [portals, search, category, filter]);

const onlineCount = portals.filter(
  (portal) => portal.status === "online"
).length;

const toggleHistory = async (portalId: number) => {
  if (expandedPortalId === portalId) {
    setExpandedPortalId(null);
    return;
  }

  setExpandedPortalId(portalId);

  if (historyByPortal[portalId] !== undefined) {
    return;
  }

  setHistoryLoading(portalId);
  setHistoryErrors((previous) => ({
    ...previous,
    [portalId]: "",
  }));

  try {
    const response = await fetch(`/api/history?id=${portalId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Nie udało się pobrać historii.");
    }

    const data: {
      success: boolean;
      history: HistoryEntry[];
    } = await response.json();

    setHistoryByPortal((previous) => ({
      ...previous,
      [portalId]: data.history,
    }));
  } catch {
    setHistoryErrors((previous) => ({
      ...previous,
      [portalId]: "Nie udało się pobrać historii.",
    }));
  } finally {
    setHistoryLoading(null);
  }
};

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      
<header className="border-b border-[var(--border)]">
  <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
    <a href="#" className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-lg font-black shadow-lg shadow-indigo-500/20">
        E
      </div>

      <div>
        <p className="text-lg font-bold tracking-tight">
          Edu<span className="text-indigo-400">Status</span>
        </p>
        <p className="text-xs text-[var(--muted)]">
          Monitoring portali edukacyjnych
        </p>
      </div>
    </a>

    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] sm:flex">
        <span className="h-2 w-2 rounded-full bg-indigo-400" />
        Wersja demonstracyjna
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={
          theme === "dark"
            ? "Włącz jasny motyw"
            : "Włącz ciemny motyw"
        }
        title={theme === "dark" ? "Jasny motyw" : "Ciemny motyw"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-lg transition hover:bg-[var(--surface-secondary)]"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
    </div>
  </div>
</header>


      <section className="mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8 sm:pt-16">
        
{loading && (
  <p className="mb-4 text-sm text-[var(--muted)]">
    Ładowanie portali...
  </p>
)}

{error && (
  <p role="alert" className="mb-4 text-sm text-red-400">
    {error}
  </p>
)}
{notifications.length > 0 && (
  <div className="mb-6 space-y-3" aria-live="polite">
    {notifications.map((notification, index) => (
      <div
        key={`${notification.id}-${index}`}
        role="status"
        className={`flex items-center justify-between gap-4 rounded-xl border p-4 text-sm ${
          notification.type === "error"
            ? "border-red-400/30 bg-red-400/10 text-red-500 dark:text-red-300"
            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
        }`}
      >
        <p>
          <span className="mr-2">
            {notification.type === "error" ? "⚠️" : "✓"}
          </span>
          {notification.message}
        </p>

        <button
          type="button"
          onClick={() =>
            setNotifications((previous) =>
              previous.filter((_, i) => i !== index)
            )
          }
          aria-label="Zamknij powiadomienie"
          className="shrink-0 rounded-lg px-2 py-1 text-lg transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          ×
        </button>
      </div>
    ))}
  </div>
)}
        <div className="mb-10 max-w-3xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-indigo-400">
            Wszystko w jednym miejscu
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Twoje portale.
            <br />
            <span className="text-[var(--muted)]">Jeden status.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            Sprawdź dostępność dzienników elektronicznych i platform
            studenckich bez otwierania każdego portalu osobno.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Monitorowane portale"
            value={String(portals.length)}
            detail="Portale w katalogu"
          />
          <StatCard
            label="Dostępne"
            value={String(onlineCount)}
            detail="Odpowiedziały kodem HTTP 2xx"
            accent="text-emerald-400"
          />
          <StatCard
            label="Wymagają uwagi"
            value={String(
              portals.filter((p) => p.status !== "online").length
            )}
            detail="Przerwa lub brak danych"
            accent="text-amber-400"
          />
        </div>

        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold">Katalog portali</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Znajdź interesującą Cię platformę.
            </p>
          </div>
          <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void checkPortals()}
            disabled={checking}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
        {checking && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}

        {checking ? "Sprawdzanie..." : "Sprawdź ponownie"}
      </button>

            <p className="text-xs text-[var(--muted)]">
              {lastChecked
              ? `Ostatnie sprawdzenie: ${new Date(lastChecked).toLocaleTimeString("pl-PL")}`
              : "Oczekiwanie na pierwszy pomiar"}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Szukaj portalu..."
              aria-label="Szukaj portalu"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-indigo-400 sm:w-64"
            />

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Kategoria portalu"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-indigo-400"
            >
              <option>Wszystkie</option>
              <option>Szkoły</option>
              <option>Uczelnie</option>
            </select>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Status portalu"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] outline-none focus:border-indigo-400"
            >
              <option>Wszystkie</option>
              <option>Działa</option>
              <option>Przerwa techniczna</option>
              <option>Nieznany</option>
            </select>
          </div>
        </div>

        
<div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
  {[0, 1].map((column) => (
    <div key={column} className="flex min-w-0 flex-col items-stretch gap-4">

      {filteredPortals
        .filter((_, index) => index % 2 === column)
        .map((portal) => {
            const status = statusInfo[portal.status];


            return (
              <article
                key={portal.id}
                className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-indigo-400/60 hover:shadow-xl hover:shadow-indigo-500/5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-white p-1">
                    <img
                      src={portal.iconUrl}
                      alt={`Ikona ${portal.name}`}
                      className="h-full w-full rounded-lg object-contain"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
  />
</div>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{portal.name}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {portal.description}
                      </p>
                      <span className="mt-3 inline-block rounded-md bg-[var(--surface-secondary)] px-2 py-1 text-xs text-[var(--muted)]">
                        {portal.category}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium ${status.badge}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${status.dot} ${
                      portal.status === "online"
                      ? "animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                      : ""
                    }`}
                    />
                    <span className="hidden sm:inline">{status.label}</span>
                    <span className="sm:hidden">
                      {portal.status === "online"
                        ? "Online"
                        : portal.status === "maintenance"
                          ? "Przerwa"
                          : "Brak danych"}
                    </span>
                  </span>
                </div>

                <div className="my-5 border-t border-[var(--border)]" />

                <div className="flex items-center justify-between gap-3">
                  
                <div>
                    <p className="text-xs text-[var(--muted)]">
                    Czas odpowiedzi
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                    {portal.responseTime !== null
                    ? `${portal.responseTime} ms`
                    : "Brak pomiaru"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      HTTP: {portal.httpStatus ?? "Brak odpowiedzi"}
                   </p>
              </div>
                  <a
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:border-indigo-400/60 hover:bg-indigo-500/10 hover:text-indigo-500 dark:hover:text-indigo-300"
                  >
                    Otwórz portal ↗
                  </a>
                </div>

                
<div className="mt-5 border-t border-[var(--border)] pt-4">
  <button
    type="button"
    onClick={() => void toggleHistory(portal.id)}
    aria-expanded={expandedPortalId === portal.id}
    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-medium text-indigo-400 transition hover:bg-[var(--surface-secondary)]"
  >
    <span>Historia monitoringu</span>
    <span>
      {expandedPortalId === portal.id ? "− Ukryj" : "+ Rozwiń"}
    </span>
  </button>

  <div
    className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out ${
      expandedPortalId === portal.id
        ? "mt-3 grid-rows-[1fr] opacity-100"
        : "mt-0 grid-rows-[0fr] opacity-0"
    }`}
    aria-hidden={expandedPortalId !== portal.id}
  >
    <div className="min-h-0 overflow-hidden">
      {expandedPortalId === portal.id && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
          {historyLoading === portal.id ? (
            <p className="text-sm text-[var(--muted)]">
              Ładowanie historii...
            </p>
          ) : historyErrors[portal.id] ? (
            <div>
              <p className="text-sm text-red-400">
                {historyErrors[portal.id]}
              </p>
              <button
                type="button"
                onClick={() => {
                  setHistoryByPortal((previous) => {
                    const next = { ...previous };
                    delete next[portal.id];
                    return next;
                  });
                  setHistoryErrors((previous) => {
                    const next = { ...previous };
                    delete next[portal.id];
                    return next;
                  });
                  void toggleHistory(portal.id);
                }}
                className="mt-2 text-sm text-indigo-300 hover:text-indigo-200"
              >
                Spróbuj ponownie
              </button>
            </div>
          ) : !historyByPortal[portal.id]?.length ? (
            <p className="text-sm text-[var(--muted)]">
              Brak zapisanych pomiarów.
            </p>
          ) : (
            <>
              
              <p className="mb-3 text-xs text-[var(--muted)]">
                Ostatnie {historyByPortal[portal.id].length} pomiarów
              </p>

              {/* Statystyki dostępności */}
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-xs text-[var(--muted)]">
                    Dostępność (uptime)
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-400">
                    {Math.round(
                      (historyByPortal[portal.id].filter(
                        (entry) => entry.status === "online"
                      ).length /
                        historyByPortal[portal.id].length) *
                        100
                    )}
                    %
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-xs text-[var(--muted)]">
                    Średni czas odpowiedzi
                  </p>
                  <p className="mt-2 text-2xl font-bold text-indigo-400">
                    {Math.round(
                      historyByPortal[portal.id].reduce(
                        (sum, entry) => sum + entry.responseTime,
                        0
                      ) / historyByPortal[portal.id].length
                    )}{" "}
                    <span className="text-sm font-normal">ms</span>
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-xs text-[var(--muted)]">
                    Nieudane pomiary
                  </p>
                  <p className="mt-2 text-2xl font-bold text-red-400">
                    {historyByPortal[portal.id].filter(
                      (entry) => entry.status !== "online"
                    ).length}
                  </p>
                </div>
              </div>

              <div className="mb-5">
                <p className="mb-3 text-sm font-medium text-[var(--foreground)]">
                  Czas odpowiedzi
                </p>


                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={historyByPortal[portal.id].map((entry) => ({
                        time: new Date(entry.checkedAt).toLocaleTimeString(
                          "pl-PL",
                          { hour: "2-digit", minute: "2-digit" }
                        ),
                        responseTime: entry.responseTime,
                      }))}
                      margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        stroke="var(--border)"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="time"
                        tick={{ fill: "var(--muted)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={20}
                      />
                      <YAxis
                        tick={{ fill: "var(--muted)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                        tickFormatter={(value) => `${value} ms`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          color: "var(--foreground)",
                        }}
                        labelStyle={{ color: "var(--foreground)" }}
                        formatter={(value) => [`${value} ms`, "Czas odpowiedzi"]}
                        labelFormatter={(label) => `Godzina: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="responseTime"
                        name="Czas odpowiedzi"
                        stroke="#818cf8"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, fill: "#a5b4fc" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <p className="mt-2 text-xs text-[var(--muted)]">
                  Niżej położone punkty oznaczają krótszy czas odpowiedzi.
                </p>
              </div>

              <div className="space-y-3">
                {[...historyByPortal[portal.id]]
                  .reverse()
                  .map((entry, index) => (
                    <div
                      key={`${entry.checkedAt}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p
                          className={
                            entry.status === "online"
                              ? "text-sm font-medium text-emerald-400"
                              : "text-sm font-medium text-[var(--muted)]"
                          }
                        >
                          {entry.status === "online"
                            ? "Działa"
                            : "Brak poprawnej odpowiedzi"}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {new Date(entry.checkedAt).toLocaleString("pl-PL")}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {entry.responseTime} ms
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          HTTP: {entry.httpStatus ?? "Brak odpowiedzi"}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  </div>
</div>


              </article>
            );
          })}
      </div>
    ))}
</div>

        {!loading && !error && filteredPortals.length === 0 && (

          <div className="rounded-2xl border border-dashed border-[var(--border)] py-16 text-center">
            <p className="font-semibold">Nie znaleziono portali</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Zmień wyszukiwanie lub wybierz inny filtr.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setCategory("Wszystkie");
                setFilter("Wszystkie");
              }}
              className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold hover:bg-indigo-400"
            >
              Wyczyść filtry
            </button>
          </div>
        )}

        <p className="mt-8 rounded-xl border border-indigo-400/15 bg-indigo-400/[0.04] p-4 text-xs leading-6 text-[var(--muted)]">
  Statusy pochodzą z automatycznego sprawdzania odpowiedzi HTTP.
  Pomiar nie gwarantuje poprawnego działania logowania ani wszystkich
  funkcji portalu. Wyniki są odświeżane co 60 sekund.
        </p>
      </section>
      <footer className="border-t border-[var(--border)] px-5 py-6 text-center text-xs text-[var(--muted)]">
        EduStatus · Projekt open source · Wersja rozwojowa
      </footer>
    </main>
  );
}
function StatCard({
  label,
  value,
  detail,
  accent = "text-[var(--foreground)]",
}: {
  label: string;
  value: string;
  detail: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors duration-200">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className={`mt-3 text-3xl font-bold tracking-tight ${accent}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-[var(--muted)]">{detail}</p>
    </div>
  );
}