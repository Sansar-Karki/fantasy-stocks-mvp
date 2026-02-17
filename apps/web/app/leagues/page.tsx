"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createLeague, joinLeague, listLeagues, me } from "../../lib/api";
import { clearToken, getToken } from "../../lib/auth-storage";
import type { LeaguePublic, UserPublic } from "../../lib/types";

export default function LeaguesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [leagues, setLeagues] = useState<LeaguePublic[]>([]);
  const [newLeagueName, setNewLeagueName] = useState("My League");
  const [newLeagueMaxMembers, setNewLeagueMaxMembers] = useState(6);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const token = useMemo(() => getToken(), []);

  useEffect(() => {
    async function load() {
      if (!token) {
        router.replace("/auth");
        return;
      }

      try {
        const currentUser = await me(token);
        const myLeagues = await listLeagues(token);
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

  async function handleCreateLeague(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError(null);

    try {
      await createLeague(token, { name: newLeagueName, max_members: newLeagueMaxMembers });
      const myLeagues = await listLeagues(token);
      setLeagues(myLeagues);
      setNewLeagueName("My League");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create league");
    }
  }

  async function handleJoinLeague(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setError(null);

    try {
      await joinLeague(token, inviteCode.toUpperCase());
      const myLeagues = await listLeagues(token);
      setLeagues(myLeagues);
      setInviteCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join league");
    }
  }

  function handleLogout() {
    clearToken();
    router.push("/auth");
  }

  if (isLoading) {
    return (
      <main className="container">
        <p>Loading leagues...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="stack-sm">
        <p className="eyebrow">Leagues</p>
        <h1>Welcome {user?.username ?? "Trader"}</h1>
        <p className="muted">Create a league, join with invite code, then open a league to access Dashboard, Draft, Roster, Trades, Matchups, and Playoffs.</p>
        <div className="actions">
          <button className="button button-secondary" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {error ? <p className="error card">{error}</p> : null}

      <section className="card">
        <h2>Create League</h2>
        <form className="form" onSubmit={handleCreateLeague}>
          <label>
            League Name
            <input
              type="text"
              required
              minLength={3}
              maxLength={120}
              value={newLeagueName}
              onChange={(event) => setNewLeagueName(event.target.value)}
            />
          </label>

          <label>
            Max Members
            <input
              type="number"
              min={2}
              max={12}
              value={newLeagueMaxMembers}
              onChange={(event) => setNewLeagueMaxMembers(Number(event.target.value))}
            />
          </label>

          <button className="button" type="submit">
            Create
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Join League</h2>
        <form className="form" onSubmit={handleJoinLeague}>
          <label>
            Invite Code
            <input
              type="text"
              required
              minLength={6}
              maxLength={12}
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
            />
          </label>
          <button className="button" type="submit">
            Join
          </button>
        </form>
      </section>

      <section className="card">
        <h2>My Leagues</h2>
        {leagues.length === 0 ? <p>No leagues yet.</p> : null}
        <ul className="league-list">
          {leagues.map((league) => (
            <li key={league.id} className="league-item">
              <div>
                <strong>{league.name}</strong>
                <p className="muted">Invite code: {league.invite_code}</p>
              </div>
              <Link className="button button-secondary" href={`/leagues/${league.id}`}>
                View
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
