"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { generatePlayoffBracket, getPlayoffBracket, recordPlayoffResult } from "../../../../lib/api";
import { getToken } from "../../../../lib/auth-storage";
import type { PlayoffBracketResponse } from "../../../../lib/types";

export default function PlayoffsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const leagueId = Number(params.id);

  const [bracket, setBracket] = useState<PlayoffBracketResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBracket = useCallback(async () => {
    if (!token || !Number.isFinite(leagueId)) return;
    try {
      const data = await getPlayoffBracket(token, leagueId);
      setBracket(data);
      setError(null);
    } catch (err) {
      setBracket(null);
      setError(err instanceof Error ? err.message : "Failed to load bracket");
    } finally {
      setLoading(false);
    }
  }, [leagueId, token]);

  useEffect(() => {
    if (!token) {
      router.replace("/auth");
      return;
    }
    void loadBracket();
  }, [leagueId, loadBracket, router, token]);

  async function handleGenerate() {
    if (!token || !Number.isFinite(leagueId)) return;
    try {
      const data = await generatePlayoffBracket(token, leagueId);
      setBracket(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate bracket");
    }
  }

  async function handleRecord(matchId: number, winnerUserId: number) {
    if (!token || !Number.isFinite(leagueId)) return;
    try {
      const data = await recordPlayoffResult(token, leagueId, matchId, winnerUserId);
      setBracket(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record result");
    }
  }

  return (
    <main className="container">
      <header>
        <p className="eyebrow">Playoffs</p>
        <h1>League {Number.isFinite(leagueId) ? `#${leagueId}` : ""}</h1>
      </header>

      <section className="card">
        <div className="actions">
          <Link className="button button-secondary" href={`/leagues/${params.id}`}>
            Back to League
          </Link>
          <button className="button" type="button" onClick={handleGenerate}>
            Generate Bracket
          </button>
          <button className="button button-secondary" type="button" onClick={loadBracket}>
            Refresh
          </button>
        </div>
      </section>

      {loading ? <p>Loading playoffs...</p> : null}
      {error ? <p className="error card">{error}</p> : null}

      {bracket ? (
        <section className="card">
          <h2>Bracket</h2>
          {bracket.champion_user_id ? <p>Champion: user {bracket.champion_user_id}</p> : null}
          <ul className="member-list">
            {bracket.matches.map((match) => (
              <li className="member-item" key={match.id}>
                <div>
                  <p>
                    R{match.round_number} M{match.matchup_number} [{match.status}]
                  </p>
                  <p className="muted">
                    {match.home_user_id} vs {match.away_user_id}
                  </p>
                </div>
                <div className="actions">
                  <button className="button" type="button" onClick={() => handleRecord(match.id, match.home_user_id)}>
                    Home Wins
                  </button>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => handleRecord(match.id, match.away_user_id)}
                  >
                    Away Wins
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
