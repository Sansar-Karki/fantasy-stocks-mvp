"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getLatestMatchupWeek, listLeagues, me } from "../../../lib/api";
import { getToken } from "../../../lib/auth-storage";
import type { LeaguePublic, MatchupResultPublic, MatchupWeekDetailResponse, UserPublic } from "../../../lib/types";

type LeagueWeekSummary = {
  league: LeaguePublic;
  weekNumber: number | null;
  myScore: number;
  opponentScore: number;
  status: "winning" | "losing" | "tied";
};

export default function AppHomePage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);

  const [user, setUser] = useState<UserPublic | null>(null);
  const [leagues, setLeagues] = useState<LeagueWeekSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!token) {
        router.replace("/auth");
        return;
      }

      try {
        const [currentUser, myLeagues] = await Promise.all([me(token), listLeagues(token)]);
        setUser(currentUser);

        const snapshots = await Promise.allSettled(
          myLeagues.map(async (league) => {
            const latest = await getLatestMatchupWeek(token, league.id);
            return summarizeLeagueWeek(currentUser.id, league, latest);
          })
        );

        const built = snapshots
          .filter((row): row is PromiseFulfilledResult<LeagueWeekSummary> => row.status === "fulfilled")
          .map((row) => row.value);

        setLeagues(built);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [router, token]);

  return (
    <div className="container app-container phone-canvas">
      <header className="wire-header">
        <button className="icon-btn" type="button" aria-label="Menu">
          ☰
        </button>
        <strong>Fantasy Stocks</strong>
        <Link className="icon-btn" href="/app/profile" aria-label="Profile">
          👤
        </Link>
      </header>

      <section className="sheet-card">
        <h1>Welcome back, {user?.username ?? "Trader"}!</h1>
        <p className="muted">Your leagues and matchups in one place.</p>
      </section>

      {isLoading ? <p className="muted">Loading dashboard...</p> : null}
      {error ? <p className="error card">{error}</p> : null}

      {!isLoading && leagues.length === 0 ? (
        <section className="sheet-card empty-state">
          <h2>You&apos;re not in any leagues yet</h2>
          <p className="muted">Create a new league or join with invite code.</p>
          <div className="actions">
            <Link className="button" href="/app/leagues">
              Create League
            </Link>
            <Link className="button button-secondary" href="/app/leagues">
              Join League
            </Link>
          </div>
        </section>
      ) : null}

      {leagues.map((item) => (
        <section key={item.league.id} className="sheet-card league-card-wire">
          <p className="muted">📊 {item.league.name}</p>
          <strong>
            Week {item.weekNumber ?? "-"}: {item.myScore.toFixed(2)}% vs {item.opponentScore.toFixed(2)}%
          </strong>
          <p className={item.status === "winning" ? "up" : item.status === "losing" ? "down" : "muted"}>
            {item.status === "winning" ? "Winning" : item.status === "losing" ? "Losing" : "Tied"}
          </p>
          <div className="actions">
            <Link className="button button-secondary" href={`/leagues/${item.league.id}/matchups`}>
              View Matchup
            </Link>
            <Link className="button" href={`/leagues/${item.league.id}`}>
              League Home
            </Link>
          </div>
        </section>
      ))}
    </div>
  );
}

function summarizeLeagueWeek(
  currentUserId: number,
  league: LeaguePublic,
  latest: MatchupWeekDetailResponse
): LeagueWeekSummary {
  const mine = latest.results.find(
    (result) => result.home_user_id === currentUserId || result.away_user_id === currentUserId
  );

  if (!mine) {
    return {
      league,
      weekNumber: latest.week.week_number,
      myScore: 0,
      opponentScore: 0,
      status: "tied"
    };
  }

  const detail = scoreDetails(mine, currentUserId);
  let status: "winning" | "losing" | "tied" = "tied";
  if (detail.myScore > detail.opponentScore) status = "winning";
  if (detail.myScore < detail.opponentScore) status = "losing";

  return {
    league,
    weekNumber: latest.week.week_number,
    myScore: detail.myScore,
    opponentScore: detail.opponentScore,
    status
  };
}

function scoreDetails(result: MatchupResultPublic, currentUserId: number) {
  const isHome = result.home_user_id === currentUserId;
  return {
    myScore: isHome ? result.home_score : result.away_score,
    opponentScore: isHome ? result.away_score : result.home_score
  };
}
