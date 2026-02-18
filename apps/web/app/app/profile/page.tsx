"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { listLeagues, me } from "../../../lib/api";
import { clearToken, getToken } from "../../../lib/auth-storage";
import type { LeaguePublic, UserPublic } from "../../../lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [user, setUser] = useState<UserPublic | null>(null);
  const [leagues, setLeagues] = useState<LeaguePublic[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        setError(err instanceof Error ? err.message : "Failed to load profile");
      }
    }

    void load();
  }, [router, token]);

  function handleLogout() {
    clearToken();
    router.push("/auth");
  }

  const completedSeasons = leagues.filter((league) => league.season_status === "complete").length;
  const memberSince = user ? new Date(user.created_at).toLocaleDateString() : "—";

  return (
    <div className="container app-container phone-canvas">
      <header className="topbar">
        <div>
          <p className="muted">Account</p>
          <h1>Profile</h1>
        </div>
      </header>

      {error ? <p className="error card">{error}</p> : null}

      <section className="sheet-card profile-card">
        <div className="profile-avatar">👤</div>
        <strong>@{user?.username ?? "username"}</strong>
        <p className="muted">{user?.bio ?? "Stock market enthusiast"}</p>
        <p className="muted">Favorite: {user?.favorite_stock ?? "Not set"}</p>
      </section>

      <section className="sheet-card">
        <h2>Track Record</h2>
        {leagues.length === 0 ? (
          <p className="muted">No league history yet. Join or create your first league to start a record.</p>
        ) : (
          <ul className="tx-list">
            <li className="tx-item">
              <span>Leagues Joined</span>
              <strong>{leagues.length}</strong>
            </li>
            <li className="tx-item">
              <span>Completed Seasons</span>
              <strong>{completedSeasons}</strong>
            </li>
            <li className="tx-item">
              <span>Member Since</span>
              <strong>{memberSince}</strong>
            </li>
          </ul>
        )}
      </section>

      <section className="sheet-card">
        <h2>Settings</h2>
        <div className="actions">
          <Link className="button button-secondary" href="/app/settings">
            Notification Settings
          </Link>
          <button className="button button-secondary" type="button" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </section>
    </div>
  );
}
