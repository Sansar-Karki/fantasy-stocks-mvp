"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getDraftRoom, me, startDraft, submitDraftPick } from "../../../../lib/api";
import { getToken } from "../../../../lib/auth-storage";
import type { DraftRoomResponse, UserPublic } from "../../../../lib/types";

export default function DraftRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const token = useMemo(() => getToken(), []);

  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const [draftRoom, setDraftRoom] = useState<DraftRoomResponse | null>(null);
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const leagueId = Number(params.id);

  const loadDraft = useCallback(async () => {
    if (!token || !Number.isFinite(leagueId)) return;
    try {
      const room = await getDraftRoom(token, leagueId);
      setDraftRoom(room);
      setError(null);
    } catch (err) {
      setDraftRoom(null);
      setError(err instanceof Error ? err.message : "Failed to load draft room");
    }
  }, [leagueId, token]);

  useEffect(() => {
    async function bootstrap() {
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
        const user = await me(token);
        setCurrentUser(user);
        await loadDraft();
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [leagueId, loadDraft, router, token]);

  useEffect(() => {
    if (!token || !draftRoom || draftRoom.draft.status !== "live") return;
    const interval = setInterval(() => {
      void loadDraft();
    }, 5000);
    return () => clearInterval(interval);
  }, [draftRoom, loadDraft, token]);

  async function handleStartDraft() {
    if (!token || !Number.isFinite(leagueId)) return;
    try {
      await startDraft(token, leagueId, 60);
      await loadDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start draft");
    }
  }

  async function handleSubmitPick(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !Number.isFinite(leagueId)) return;

    try {
      const room = await submitDraftPick(token, leagueId, ticker.toUpperCase());
      setDraftRoom(room);
      setTicker("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit pick");
    }
  }

  const isMyTurn =
    !!currentUser && !!draftRoom && draftRoom.current_picker_user_id === currentUser.id;

  return (
    <main className="container">
      <header>
        <p className="eyebrow">Draft Room</p>
        <h1>League {Number.isFinite(leagueId) ? `#${leagueId}` : ""}</h1>
      </header>

      <section className="card">
        <div className="actions">
          <Link className="button button-secondary" href={`/leagues/${params.id}`}>
            Back to League
          </Link>
          <button className="button" type="button" onClick={handleStartDraft}>
            Start Draft
          </button>
        </div>
      </section>

      {loading ? <p>Loading...</p> : null}
      {error ? <p className="error card">{error}</p> : null}

      {draftRoom ? (
        <>
          <section className="card">
            <h2>Draft Status</h2>
            <p>Status: {draftRoom.draft.status}</p>
            <p>
              Current pick: {Math.min(draftRoom.draft.current_pick_number, draftRoom.total_picks)} /{" "}
              {draftRoom.total_picks}
            </p>
            <p>Current round: {draftRoom.current_round ?? "-"}</p>
            <p>Current picker user id: {draftRoom.current_picker_user_id ?? "-"}</p>
          </section>

          <section className="card">
            <h2>Make Pick</h2>
            <form className="form" onSubmit={handleSubmitPick}>
              <label>
                Ticker
                <input
                  type="text"
                  required
                  maxLength={12}
                  value={ticker}
                  onChange={(event) => setTicker(event.target.value.toUpperCase())}
                />
              </label>
              <button className="button" type="submit" disabled={!isMyTurn}>
                {isMyTurn ? "Submit Pick" : "Waiting for your turn"}
              </button>
            </form>
          </section>

          <section className="card">
            <h2>Picks</h2>
            {draftRoom.picks.length === 0 ? <p>No picks yet.</p> : null}
            <ul className="member-list">
              {draftRoom.picks.map((pick) => (
                <li className="member-item" key={pick.id}>
                  <span>
                    #{pick.pick_number} (R{pick.round_number})
                  </span>
                  <strong>{pick.ticker}</strong>
                  <span className="muted">user {pick.user_id}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}
