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
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

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
    if (!token || !draftRoom || draftRoom.draft.status !== "live" || isRealtimeConnected) return;
    const interval = setInterval(() => {
      void loadDraft();
    }, 5000);
    return () => clearInterval(interval);
  }, [draftRoom, isRealtimeConnected, loadDraft, token]);

  useEffect(() => {
    if (!token || !Number.isFinite(leagueId)) return;
    const websocketUrl = buildDraftWebsocketUrl(leagueId, token);
    if (!websocketUrl) return;

    const ws = new WebSocket(websocketUrl);

    ws.onopen = () => {
      setIsRealtimeConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as DraftRoomResponse;
        setDraftRoom(payload);
      } catch {
        // Ignore malformed payloads.
      }
    };

    ws.onerror = () => {
      setIsRealtimeConnected(false);
    };

    ws.onclose = () => {
      setIsRealtimeConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [leagueId, token]);

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

  const isMyTurn = !!currentUser && !!draftRoom && draftRoom.current_picker_user_id === currentUser.id;
  const completedPicks = draftRoom?.picks.length ?? 0;
  const totalPicks = draftRoom?.total_picks ?? 0;
  const progress = totalPicks > 0 ? Math.min(100, Math.round((completedPicks / totalPicks) * 100)) : 0;

  return (
    <main className="container app-container phone-canvas">
      <header className="wire-header">
        <Link className="icon-btn" href={`/leagues/${params.id}/dashboard`} aria-label="Back to dashboard">
          ←
        </Link>
        <strong>Draft Room</strong>
        <button className="icon-btn" type="button" onClick={handleStartDraft} aria-label="Start draft">
          ▶
        </button>
      </header>

      {loading ? <p className="muted">Loading draft room...</p> : null}
      {error ? <p className="error card">{error}</p> : null}

      {draftRoom ? (
        <>
          <section className="sheet-card draft-hero">
            <p className="muted">League #{leagueId}</p>
            <h1>{draftRoom.draft.status === "live" ? "Draft is live" : "Draft board ready"}</h1>
            <p className="muted">{isRealtimeConnected ? "Realtime connected" : "Realtime reconnecting..."}</p>
            <div className="draft-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <p className="muted">
              {completedPicks} of {totalPicks} picks made · Round {draftRoom.current_round ?? "-"}
            </p>
          </section>

          <section className="sheet-card">
            <h2>On The Clock</h2>
            <div className="tx-item tx-item-active">
              <span>Current picker</span>
              <strong>{draftRoom.current_picker_user_id ?? "-"}</strong>
            </div>
            <form className="form draft-form" onSubmit={handleSubmitPick}>
              <label>
                Enter ticker
                <input
                  type="text"
                  required
                  maxLength={12}
                  value={ticker}
                  onChange={(event) => setTicker(event.target.value.toUpperCase())}
                  placeholder="AAPL"
                />
              </label>
              <button className="button" type="submit" disabled={!isMyTurn}>
                {isMyTurn ? "Submit Pick" : "Waiting for your turn"}
              </button>
            </form>
          </section>

          <section className="sheet-card">
            <h2>Draft Board</h2>
            {draftRoom.picks.length === 0 ? <p className="muted">No picks yet.</p> : null}
            <ul className="tx-list">
              {draftRoom.picks
                .slice()
                .reverse()
                .slice(0, 14)
                .map((pick) => (
                  <li className="tx-item" key={pick.id}>
                    <span>
                      Pick #{pick.pick_number} · R{pick.round_number}
                    </span>
                    <strong>{pick.ticker}</strong>
                  </li>
                ))}
            </ul>
          </section>
        </>
      ) : null}
    </main>
  );
}

function buildDraftWebsocketUrl(leagueId: number, token: string): string | null {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase) return null;

  const root = apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase;
  const websocketBase = root.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
  return `${websocketBase}/api/leagues/${leagueId}/draft/ws?token=${encodeURIComponent(token)}`;
}
