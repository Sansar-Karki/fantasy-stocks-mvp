"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  getLeague,
  getStandings,
  kickMember,
  updateSeasonStatus,
  updateTradeDeadline
} from "../../../lib/api";
import { getToken } from "../../../lib/auth-storage";
import type { LeagueDetailResponse, LeagueStandingsResponse } from "../../../lib/types";

export default function LeagueDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [leagueDetail, setLeagueDetail] = useState<LeagueDetailResponse | null>(null);
  const [standings, setStandings] = useState<LeagueStandingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tradeDeadline, setTradeDeadline] = useState("");
  const [memberToKick, setMemberToKick] = useState<number>(0);

  const token = useMemo(() => getToken(), []);

  useEffect(() => {
    async function load() {
      if (!token) {
        router.replace("/auth");
        return;
      }

      const leagueId = Number(params.id);
      if (!Number.isFinite(leagueId)) {
        setError("Invalid league id");
        setIsLoading(false);
        return;
      }

      try {
        const [leagueData, standingsData] = await Promise.all([
          getLeague(token, leagueId),
          getStandings(token, leagueId)
        ]);
        setLeagueDetail(leagueData);
        setStandings(standingsData);
        setTradeDeadline(leagueData.league.trade_deadline ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load league");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [params.id, router, token]);

  async function handleSetSeasonStatus(seasonStatus: "setup" | "regular" | "playoffs" | "complete" | "paused") {
    if (!token || !leagueDetail) return;
    try {
      const updated = await updateSeasonStatus(token, leagueDetail.league.id, seasonStatus);
      setLeagueDetail({ ...leagueDetail, league: { ...leagueDetail.league, season_status: updated.season_status } });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update season");
    }
  }

  async function handleSetTradeDeadline() {
    if (!token || !leagueDetail) return;
    try {
      const updated = await updateTradeDeadline(token, leagueDetail.league.id, tradeDeadline || null);
      setLeagueDetail({ ...leagueDetail, league: updated });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update trade deadline");
    }
  }

  async function handleKickMember() {
    if (!token || !leagueDetail || !memberToKick) return;
    try {
      await kickMember(token, leagueDetail.league.id, memberToKick);
      const [leagueData, standingsData] = await Promise.all([
        getLeague(token, leagueDetail.league.id),
        getStandings(token, leagueDetail.league.id)
      ]);
      setLeagueDetail(leagueData);
      setStandings(standingsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to kick member");
    }
  }

  return (
    <main className="container">
      <header>
        <p className="eyebrow">League Detail</p>
        <h1>{leagueDetail?.league.name ?? "League"}</h1>
      </header>

      <section className="card">
        <div className="actions">
          <Link className="button button-secondary" href="/leagues">
            Back to Leagues
          </Link>
          <Link className="button" href={`/leagues/${params.id}/dashboard`}>
            League Dashboard
          </Link>
          <Link className="button button-secondary" href={`/leagues/${params.id}/roster`}>
            Manage Roster
          </Link>
          <Link className="button button-secondary" href={`/leagues/${params.id}/matchups`}>
            Matchups & Scoring
          </Link>
          <Link className="button button-secondary" href={`/leagues/${params.id}/trades`}>
            Trades
          </Link>
          <Link className="button button-secondary" href={`/leagues/${params.id}/playoffs`}>
            Playoffs
          </Link>
          <Link className="button" href={`/leagues/${params.id}/draft`}>
            Open Draft Room
          </Link>
        </div>
      </section>

      {isLoading ? <p>Loading league...</p> : null}
      {error ? <p className="error card">{error}</p> : null}

      {leagueDetail ? (
        <>
          <section className="card">
            <h2>League Info</h2>
            <p>
              Invite code: <strong>{leagueDetail.league.invite_code}</strong>
            </p>
            <p>Max members: {leagueDetail.league.max_members}</p>
            <p>Status: {leagueDetail.league.season_status}</p>
            <p>Trade deadline: {leagueDetail.league.trade_deadline ?? "not set"}</p>
            <div className="actions">
              <button className="button button-secondary" type="button" onClick={() => handleSetSeasonStatus("regular")}>
                Start Regular Season
              </button>
              <button className="button button-secondary" type="button" onClick={() => handleSetSeasonStatus("paused")}>
                Pause Season
              </button>
            </div>
            <div className="form">
              <label>
                Trade Deadline
                <input type="date" value={tradeDeadline} onChange={(event) => setTradeDeadline(event.target.value)} />
              </label>
              <button className="button button-secondary" type="button" onClick={handleSetTradeDeadline}>
                Save Deadline
              </button>
            </div>
          </section>

          <section className="card">
            <h2>Members</h2>
            <ul className="member-list">
              {leagueDetail.members.map((member) => (
                <li key={member.id} className="member-item">
                  <span>{member.display_name}</span>
                  <span className="muted">
                    {member.wins}-{member.losses}
                  </span>
                </li>
              ))}
            </ul>
            <div className="form">
              <label>
                Kick Member User ID
                <input
                  type="number"
                  min={1}
                  value={memberToKick || ""}
                  onChange={(event) => setMemberToKick(Number(event.target.value))}
                />
              </label>
              <button className="button button-secondary" type="button" onClick={handleKickMember}>
                Kick Member
              </button>
            </div>
          </section>

          <section className="card">
            <h2>Standings</h2>
            {standings ? (
              <ul className="member-list">
                {standings.rows.map((row) => (
                  <li key={row.user_id} className="member-item">
                    <span>{row.display_name}</span>
                    <strong>
                      {row.wins}-{row.losses}
                    </strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No standings yet.</p>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
