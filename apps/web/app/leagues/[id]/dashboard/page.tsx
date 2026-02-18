"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getDraftRoom, getLatestMatchupWeek, getLeague, getRoster, me } from "../../../../lib/api";
import { getToken } from "../../../../lib/auth-storage";
import type { DraftRoomResponse, LeagueDetailResponse, MatchupWeekDetailResponse, RosterResponse } from "../../../../lib/types";

type LobbyTab = "chat" | "watchlist" | "info";

type DashboardData = {
  league: LeagueDetailResponse | null;
  draft: DraftRoomResponse | null;
  roster: RosterResponse | null;
  latestWeek: MatchupWeekDetailResponse | null;
};

export default function LeagueDashboardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const leagueId = Number(params.id);

  const [data, setData] = useState<DashboardData>({
    league: null,
    draft: null,
    roster: null,
    latestWeek: null
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<LobbyTab>("chat");
  const [watchlistInput, setWatchlistInput] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);

  const loadDashboard = useCallback(async () => {
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
      const [meResult, leagueResult, draftResult, rosterResult, latestWeekResult] = await Promise.allSettled([
        me(token),
        getLeague(token, leagueId),
        getDraftRoom(token, leagueId),
        getRoster(token, leagueId),
        getLatestMatchupWeek(token, leagueId)
      ]);

      if (meResult.status === "fulfilled") {
        setCurrentUserId(meResult.value.id);
      }

      const roster = rosterResult.status === "fulfilled" ? rosterResult.value : null;
      setData({
        league: leagueResult.status === "fulfilled" ? leagueResult.value : null,
        draft: draftResult.status === "fulfilled" ? draftResult.value : null,
        roster,
        latestWeek: latestWeekResult.status === "fulfilled" ? latestWeekResult.value : null
      });

      if (leagueResult.status === "rejected") {
        throw new Error("Unable to load league details");
      }

      if (watchlist.length === 0 && roster) {
        const seed = [...roster.active, ...roster.bench].map((slot) => slot.ticker).slice(0, 5);
        if (seed.length > 0) {
          setWatchlist(Array.from(new Set(seed)));
        }
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [leagueId, router, token, watchlist.length]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!token || !Number.isFinite(leagueId)) return;
    const interval = setInterval(() => {
      void loadDashboard();
    }, 10000);
    return () => clearInterval(interval);
  }, [leagueId, loadDashboard, token]);

  function addWatchlistTicker(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = watchlistInput.trim().toUpperCase();
    if (!cleaned || watchlist.includes(cleaned)) return;
    setWatchlist((current) => [...current, cleaned]);
    setWatchlistInput("");
  }

  function removeWatchlistTicker(ticker: string) {
    setWatchlist((current) => current.filter((item) => item !== ticker));
  }

  const activeCount = data.roster?.active.length ?? 0;
  const benchCount = data.roster?.bench.length ?? 0;

  return (
    <main className="container app-container phone-canvas">
      <header className="wire-header">
        <Link className="icon-btn" href={`/leagues/${params.id}`} aria-label="Back to league">
          ←
        </Link>
        <strong>{data.league?.league.name ?? "League Lobby"}</strong>
        <Link className="icon-btn" href={`/leagues/${params.id}/draft`} aria-label="Open draft room">
          ⏱
        </Link>
      </header>

      {loading ? <p className="muted">Loading dashboard...</p> : null}
      {error ? <p className="error card">{error}</p> : null}

      <section className="sheet-card dashboard-grid">
        <article className="dashboard-tile">
          <p className="muted">Draft Status</p>
          <strong>{data.draft ? data.draft.draft.status : "not-started"}</strong>
          <p className="muted">
            Pick {data.draft ? Math.min(data.draft.draft.current_pick_number, data.draft.total_picks) : 0} /{" "}
            {data.draft?.total_picks ?? 0}
          </p>
        </article>
        <article className="dashboard-tile">
          <p className="muted">Roster State</p>
          <strong>
            {activeCount} active · {benchCount} bench
          </strong>
          <p className="muted">Lineup health at a glance</p>
        </article>
        <article className="dashboard-tile">
          <p className="muted">Latest Matchup</p>
          <strong>{data.latestWeek ? `Week ${data.latestWeek.week.week_number}` : "No week yet"}</strong>
          <p className="muted">{data.latestWeek?.week.status ?? "setup"}</p>
        </article>
      </section>

      <section className="sheet-card">
        <h2>League Lobby</h2>
        <div className="tab-row tab-row-sheet" role="tablist" aria-label="League lobby tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "chat"}
            className={activeTab === "chat" ? "tab tab-active" : "tab"}
            onClick={() => setActiveTab("chat")}
          >
            Chat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "watchlist"}
            className={activeTab === "watchlist" ? "tab tab-active" : "tab"}
            onClick={() => setActiveTab("watchlist")}
          >
            Watchlist
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "info"}
            className={activeTab === "info" ? "tab tab-active" : "tab"}
            onClick={() => setActiveTab("info")}
          >
            Info
          </button>
        </div>

        {activeTab === "chat" ? (
          <div className="lobby-panel">
            <ul className="tx-list">
              <li className="tx-item">
                <span>Commissioner Bot</span>
                <strong>Draft board opens at 8:00 PM ET.</strong>
              </li>
              <li className="tx-item">
                <span>League Feed</span>
                <strong>Trading window closes on deadline day.</strong>
              </li>
              <li className="tx-item">
                <span>System</span>
                <strong>Live chat backend is next; this is UI scaffolding.</strong>
              </li>
            </ul>
          </div>
        ) : null}

        {activeTab === "watchlist" ? (
          <div className="lobby-panel stack-sm">
            <form className="form-inline" onSubmit={addWatchlistTicker}>
              <input
                type="text"
                placeholder="Add ticker (AAPL)"
                value={watchlistInput}
                onChange={(event) => setWatchlistInput(event.target.value)}
                maxLength={12}
              />
              <button className="button" type="submit">
                Add
              </button>
            </form>
            {watchlist.length === 0 ? <p className="muted">No watchlist tickers yet.</p> : null}
            <div className="chip-row">
              {watchlist.map((ticker) => (
                <button key={ticker} type="button" className="watch-chip" onClick={() => removeWatchlistTicker(ticker)}>
                  {ticker} ×
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === "info" ? (
          <div className="lobby-panel">
            <ul className="tx-list">
              <li className="tx-item">
                <span>Invite Code</span>
                <strong>{data.league?.league.invite_code ?? "-"}</strong>
              </li>
              <li className="tx-item">
                <span>Season Status</span>
                <strong>{data.league?.league.season_status ?? "setup"}</strong>
              </li>
              <li className="tx-item">
                <span>Members</span>
                <strong>{data.league?.members.length ?? 0}</strong>
              </li>
            </ul>
          </div>
        ) : null}
      </section>

      <section className="sheet-card">
        <h2>Latest Matchup Result</h2>
        {data.latestWeek ? (
          <ul className="member-list">
            {data.latestWeek.results.map((result) => (
              <li
                className={
                  currentUserId && (result.home_user_id === currentUserId || result.away_user_id === currentUserId)
                    ? "member-item member-item-highlight"
                    : "member-item"
                }
                key={result.id}
              >
                <span>
                  {result.home_user_id} vs {result.away_user_id ?? "BYE"}
                </span>
                <strong>
                  {result.home_score.toFixed(2)} - {result.away_score.toFixed(2)}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No matchup week yet.</p>
        )}
      </section>

      <section className="sheet-card">
        <div className="actions">
          <Link className="button button-secondary" href={`/leagues/${params.id}/draft`}>
            Open Draft Room
          </Link>
          <Link className="button button-secondary" href={`/leagues/${params.id}/roster`}>
            Manage Roster
          </Link>
          <Link className="button button-secondary" href={`/leagues/${params.id}/trades`}>
            Trading Center
          </Link>
        </div>
      </section>
    </main>
  );
}
