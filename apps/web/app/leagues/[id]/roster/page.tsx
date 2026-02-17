"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getRoster, updateLineup } from "../../../../lib/api";
import { getToken } from "../../../../lib/auth-storage";
import type { RosterResponse } from "../../../../lib/types";

export default function RosterPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const leagueId = Number(params.id);

  const [roster, setRoster] = useState<RosterResponse | null>(null);
  const [selectedActive, setSelectedActive] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!token) {
        router.replace("/auth");
        return;
      }
      if (!Number.isFinite(leagueId)) {
        setError("Invalid league id");
        setLoading(false);
        return;
      }

      try {
        const data = await getRoster(token, leagueId);
        setRoster(data);
        setSelectedActive(data.active.map((slot) => slot.ticker));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load roster");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [leagueId, router, token]);

  function toggleTicker(ticker: string) {
    setSelectedActive((prev) => {
      if (prev.includes(ticker)) {
        return prev.filter((item) => item !== ticker);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, ticker];
    });
  }

  async function saveLineup() {
    if (!token || !Number.isFinite(leagueId)) return;
    try {
      const updated = await updateLineup(token, leagueId, selectedActive);
      setRoster(updated);
      setSelectedActive(updated.active.map((slot) => slot.ticker));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update lineup");
    }
  }

  const allSlots = roster ? [...roster.active, ...roster.bench] : [];

  return (
    <main className="container">
      <header>
        <p className="eyebrow">Roster</p>
        <h1>League {Number.isFinite(leagueId) ? `#${leagueId}` : ""}</h1>
      </header>

      <section className="card">
        <div className="actions">
          <Link className="button button-secondary" href={`/leagues/${params.id}`}>
            Back to League
          </Link>
          <button className="button" type="button" onClick={saveLineup}>
            Save Lineup ({selectedActive.length}/5)
          </button>
        </div>
      </section>

      {loading ? <p>Loading roster...</p> : null}
      {error ? <p className="error card">{error}</p> : null}

      {roster ? (
        <section className="card">
          <h2>Select 5 Active Stocks</h2>
          <ul className="member-list">
            {allSlots.map((slot) => {
              const checked = selectedActive.includes(slot.ticker);
              return (
                <li className="member-item" key={slot.id}>
                  <label className="inline-label">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTicker(slot.ticker)}
                    />
                    <span>{slot.ticker}</span>
                  </label>
                  <span className="muted">current: {slot.slot_type}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
