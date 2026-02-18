"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createLeague, joinLeague, listLeagues, me } from "../../../lib/api";
import { getToken } from "../../../lib/auth-storage";
import type { LeaguePublic, UserPublic } from "../../../lib/types";

export default function AppLeaguesPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [user, setUser] = useState<UserPublic | null>(null);
  const [leagues, setLeagues] = useState<LeaguePublic[]>([]);
  const [leagueName, setLeagueName] = useState("My League");
  const [maxMembers, setMaxMembers] = useState(6);
  const [inviteCode, setInviteCode] = useState("");
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
        setLeagues(myLeagues);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leagues");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [router, token]);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    try {
      await createLeague(token, { name: leagueName, max_members: maxMembers });
      const fresh = await listLeagues(token);
      setLeagues(fresh);
      setLeagueName("My League");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create league");
    }
  }

  async function onJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    try {
      await joinLeague(token, inviteCode.toUpperCase());
      const fresh = await listLeagues(token);
      setLeagues(fresh);
      setInviteCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join league");
    }
  }

  return (
    <div className="container app-container phone-canvas">
      <header className="wire-header">
        <Link className="icon-btn" href="/app/home" aria-label="Back">
          ←
        </Link>
        <strong>My Leagues</strong>
        <span className="icon-btn" aria-hidden="true">
          {user ? "👤" : " "}
        </span>
      </header>

      {isLoading ? <p className="muted">Loading leagues...</p> : null}
      {error ? <p className="error card">{error}</p> : null}

      <section className="sheet-card">
        <h2>Create League</h2>
        <form className="form" onSubmit={onCreate}>
          <label>
            League Name
            <input value={leagueName} onChange={(event) => setLeagueName(event.target.value)} required />
          </label>
          <label>
            Maximum Members (free limit 6)
            <input
              type="number"
              min={2}
              max={12}
              value={maxMembers}
              onChange={(event) => setMaxMembers(Number(event.target.value))}
            />
          </label>
          <button className="button" type="submit">
            Create League
          </button>
        </form>
      </section>

      <section className="sheet-card">
        <h2>Join League</h2>
        <form className="form" onSubmit={onJoin}>
          <label>
            Invite Code
            <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} required />
          </label>
          <button className="button button-secondary" type="submit">
            Join League
          </button>
        </form>
      </section>

      <section className="sheet-card">
        <h2>League Cards</h2>
        {leagues.length === 0 ? <p className="muted">No leagues yet.</p> : null}
        <ul className="tx-list">
          {leagues.map((league) => (
            <li key={league.id} className="tx-item league-row">
              <div>
                <strong>{league.name}</strong>
                <p className="muted">
                  {league.invite_code} · {league.season_status}
                </p>
              </div>
              <div className="actions">
                <Link className="tx-link" href={`/leagues/${league.id}/dashboard`}>
                  Draft/Lobby
                </Link>
                <Link className="tx-link" href={`/leagues/${league.id}/playoffs`}>
                  Playoffs
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
