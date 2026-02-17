"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  autoSnapshots,
  createMatchupWeek,
  getMatchupWeek,
  runWeekScoring,
  upsertSnapshot
} from "../../../../lib/api";
import { getToken } from "../../../../lib/auth-storage";
import type { MatchupWeekDetailResponse } from "../../../../lib/types";

export default function MatchupsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const leagueId = Number(params.id);

  const [weekNumber, setWeekNumber] = useState(1);
  const [weekStartDate, setWeekStartDate] = useState("2026-02-23");
  const [weekEndDate, setWeekEndDate] = useState("2026-02-27");
  const [snapshotTicker, setSnapshotTicker] = useState("AAPL");
  const [snapshotType, setSnapshotType] = useState<"monday_close" | "friday_close">("monday_close");
  const [closePrice, setClosePrice] = useState(100);
  const [detail, setDetail] = useState<MatchupWeekDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace("/auth");
    }
  }, [router, token]);

  async function loadWeek() {
    if (!token || !Number.isFinite(leagueId)) return;
    try {
      const data = await getMatchupWeek(token, leagueId, weekNumber);
      setDetail(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load week");
    }
  }

  async function handleCreateWeek() {
    if (!token || !Number.isFinite(leagueId)) return;
    try {
      await createMatchupWeek(token, leagueId, {
        week_number: weekNumber,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate
      });
      await loadWeek();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create week");
    }
  }

  async function handleSnapshot() {
    if (!token || !Number.isFinite(leagueId)) return;
    try {
      await upsertSnapshot(token, leagueId, weekNumber, {
        ticker: snapshotTicker.toUpperCase(),
        snapshot_type: snapshotType,
        close_price: closePrice
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to store snapshot");
    }
  }

  async function handleScore() {
    if (!token || !Number.isFinite(leagueId)) return;
    try {
      const scored = await runWeekScoring(token, leagueId, weekNumber);
      setDetail(scored);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run scoring");
    }
  }

  async function handleAutoSnapshots() {
    if (!token || !Number.isFinite(leagueId)) return;
    try {
      await autoSnapshots(token, leagueId, weekNumber);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run auto snapshots");
    }
  }

  return (
    <main className="container">
      <header>
        <p className="eyebrow">Matchups</p>
        <h1>League {Number.isFinite(leagueId) ? `#${leagueId}` : ""}</h1>
      </header>

      <section className="card">
        <div className="actions">
          <Link className="button button-secondary" href={`/leagues/${params.id}`}>
            Back to League
          </Link>
          <button className="button" type="button" onClick={loadWeek}>
            Refresh Week
          </button>
        </div>
      </section>

      {error ? <p className="error card">{error}</p> : null}

      <section className="card">
        <h2>Week Setup</h2>
        <div className="form">
          <label>
            Week Number
            <input
              type="number"
              min={1}
              max={52}
              value={weekNumber}
              onChange={(event) => setWeekNumber(Number(event.target.value))}
            />
          </label>
          <label>
            Week Start Date
            <input
              type="date"
              value={weekStartDate}
              onChange={(event) => setWeekStartDate(event.target.value)}
            />
          </label>
          <label>
            Week End Date
            <input type="date" value={weekEndDate} onChange={(event) => setWeekEndDate(event.target.value)} />
          </label>
          <button className="button" type="button" onClick={handleCreateWeek}>
            Create Week
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Snapshots</h2>
        <div className="form">
          <label>
            Ticker
            <input
              type="text"
              maxLength={12}
              value={snapshotTicker}
              onChange={(event) => setSnapshotTicker(event.target.value)}
            />
          </label>
          <label>
            Snapshot Type
            <select value={snapshotType} onChange={(event) => setSnapshotType(event.target.value as typeof snapshotType)}>
              <option value="monday_close">monday_close</option>
              <option value="friday_close">friday_close</option>
            </select>
          </label>
          <label>
            Close Price
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={closePrice}
              onChange={(event) => setClosePrice(Number(event.target.value))}
            />
          </label>
          <button className="button" type="button" onClick={handleSnapshot}>
            Save Snapshot
          </button>
          <button className="button button-secondary" type="button" onClick={handleAutoSnapshots}>
            Auto Snapshot (yfinance)
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Scoring</h2>
        <div className="actions">
          <button className="button" type="button" onClick={handleScore}>
            Run Scoring
          </button>
        </div>
      </section>

      {detail ? (
        <section className="card">
          <h2>Week {detail.week.week_number} Results</h2>
          <p>Status: {detail.week.status}</p>
          <ul className="member-list">
            {detail.results.map((result) => (
              <li className="member-item" key={result.id}>
                <span>
                  {result.home_user_id} vs {result.away_user_id ?? "BYE"}
                </span>
                <span>
                  {result.home_score.toFixed(2)} - {result.away_score.toFixed(2)}
                </span>
                <strong>winner: {result.winner_user_id ?? "tie"}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
