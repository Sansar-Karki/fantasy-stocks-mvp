"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getDraftRoom, getLatestMatchupWeek, getLeague, getRoster, me } from "../../../../lib/api";
import { getToken } from "../../../../lib/auth-storage";
import type { DraftRoomResponse, LeagueDetailResponse, MatchupWeekDetailResponse, RosterResponse } from "../../../../lib/types";

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
      const [meResult, leagueResult, draftResult, rosterResult, latestWeekResult] =
        await Promise.allSettled([
          me(token),
          getLeague(token, leagueId),
          getDraftRoom(token, leagueId),
          getRoster(token, leagueId),
          getLatestMatchupWeek(token, leagueId)
        ]);

      if (meResult.status === "fulfilled") {
        setCurrentUserId(meResult.value.id);
      }

      setData({
        league: leagueResult.status === "fulfilled" ? leagueResult.value : null,
        draft: draftResult.status === "fulfilled" ? draftResult.value : null,
        roster: rosterResult.status === "fulfilled" ? rosterResult.value : null,
        latestWeek: latestWeekResult.status === "fulfilled" ? latestWeekResult.value : null
      });

      if (leagueResult.status === "rejected") {
        throw new Error("Unable to load league details");
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [leagueId, router, token]);

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

  return (
    <main className="container">
      <header>
        <p className="eyebrow">League Dashboard</p>
        <h1>{data.league?.league.name ?? "League"}</h1>
      </header>

      <section className="card">
        <div className="actions">
          <Link className="button button-secondary" href={`/leagues/${params.id}`}>
            Back to League
          </Link>
          <Link className="button button-secondary" href={`/leagues/${params.id}/draft`}>
            Draft Room
          </Link>
          <Link className="button button-secondary" href={`/leagues/${params.id}/roster`}>
            Roster
          </Link>
          <Link className="button button-secondary" href={`/leagues/${params.id}/matchups`}>
            Matchups
          </Link>
          <Link className="button button-secondary" href={`/leagues/${params.id}/trades`}>
            Trades
          </Link>
          <Link className="button button-secondary" href={`/leagues/${params.id}/playoffs`}>
            Playoffs
          </Link>
        </div>
      </section>

      {loading ? <p>Loading dashboard...</p> : null}
      {error ? <p className="error card">{error}</p> : null}

      <section className="card">
        <h2>Draft Status</h2>
        {data.draft ? (
          <>
            <p>Status: {data.draft.draft.status}</p>
            <p>
              Pick: {Math.min(data.draft.draft.current_pick_number, data.draft.total_picks)} / {data.draft.total_picks}
            </p>
            <p>Current round: {data.draft.current_round ?? "-"}</p>
            <p>Total picks made: {data.draft.picks.length}</p>
          </>
        ) : (
          <p className="muted">Draft not started yet.</p>
        )}
      </section>

      <section className="card">
        <h2>Roster State</h2>
        {data.roster ? (
          <>
            <p>Active: {data.roster.active.length}</p>
            <p>Bench: {data.roster.bench.length}</p>
            <p>
              Active tickers: {data.roster.active.map((slot) => slot.ticker).join(", ") || "-"}
            </p>
          </>
        ) : (
          <p className="muted">Roster not available yet.</p>
        )}
      </section>

      <section className="card">
        <h2>Latest Matchup Result</h2>
        {data.latestWeek ? (
          <>
            <p>
              Week {data.latestWeek.week.week_number} ({data.latestWeek.week.status})
            </p>
            {data.latestWeek.results.length === 0 ? <p className="muted">No pairings yet.</p> : null}
            <ul className="member-list">
              {data.latestWeek.results.map((result) => (
                <li
                  className={
                    currentUserId &&
                    (result.home_user_id === currentUserId || result.away_user_id === currentUserId)
                      ? "member-item member-item-highlight"
                      : "member-item"
                  }
                  key={result.id}
                >
                  <span>
                    {result.home_user_id} vs {result.away_user_id ?? "BYE"}
                  </span>
                  <span>
                    {result.home_score.toFixed(2)} - {result.away_score.toFixed(2)}
                  </span>
                  <strong>
                    winner: {result.winner_user_id ?? "tie"}
                    {currentUserId &&
                    (result.home_user_id === currentUserId || result.away_user_id === currentUserId)
                      ? " (you)"
                      : ""}
                  </strong>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="muted">No matchup week yet.</p>
        )}
      </section>
    </main>
  );
}
