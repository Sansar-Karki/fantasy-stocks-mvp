"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { me } from "../../../lib/api";
import { clearToken, getToken } from "../../../lib/auth-storage";
import type { UserPublic } from "../../../lib/types";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default function SettingsPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);

  const [user, setUser] = useState<UserPublic | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) {
        router.replace("/auth");
        return;
      }

      try {
        const currentUser = await me(token);
        setUser(currentUser);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      }
    }

    void load();
  }, [router, token]);

  function handleLogout() {
    clearToken();
    router.push("/auth");
  }

  return (
    <div className="container app-container phone-canvas">
      <header className="topbar">
        <div>
          <p className="muted">Preferences</p>
          <h1>Settings</h1>
        </div>
        <button className="pill" type="button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {error ? <p className="error card">{error}</p> : null}

      <section className="sheet-card">
        <h2>Profile</h2>
        {user ? (
          <ul className="tx-list">
            <li className="tx-item">
              <span className="muted">Username</span>
              <strong>{user.username}</strong>
            </li>
            <li className="tx-item">
              <span className="muted">Email</span>
              <strong>{user.email}</strong>
            </li>
            <li className="tx-item">
              <span className="muted">Favorite Stock</span>
              <strong>{user.favorite_stock ?? "Not set"}</strong>
            </li>
          </ul>
        ) : (
          <p className="muted">Loading account...</p>
        )}
      </section>

      <section className="sheet-card">
        <h2>Environment</h2>
        <div className="tx-item">
          <span className="muted">API Base URL</span>
          <code>{apiBase}</code>
        </div>
      </section>
    </div>
  );
}
