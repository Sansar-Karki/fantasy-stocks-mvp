"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createTrade, listTrades, me, processDueTrades, respondTrade } from "../../../../lib/api";
import { getToken } from "../../../../lib/auth-storage";
import type { TradeDetailResponse, UserPublic } from "../../../../lib/types";

export default function TradesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const leagueId = Number(params.id);

  const [currentUser, setCurrentUser] = useState<UserPublic | null>(null);
  const [trades, setTrades] = useState<TradeDetailResponse[]>([]);
  const [counterpartyUserId, setCounterpartyUserId] = useState(2);
  const [proposerTickers, setProposerTickers] = useState("");
  const [counterpartyTickers, setCounterpartyTickers] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTrades = useCallback(async () => {
    if (!token || !Number.isFinite(leagueId)) return;
    try {
      const data = await listTrades(token, leagueId);
      setTrades(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trades");
    } finally {
      setLoading(false);
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
      } catch {
        // Keep loading trade list even if me fails.
      }

      await loadTrades();
    }

    void bootstrap();
  }, [leagueId, loadTrades, router, token]);

  async function handleCreateTrade(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !Number.isFinite(leagueId)) return;

    const proposer = proposerTickers
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    const counterparty = counterpartyTickers
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);

    try {
      await createTrade(token, leagueId, {
        counterparty_user_id: counterpartyUserId,
        proposer_tickers: proposer,
        counterparty_tickers: counterparty
      });
      setProposerTickers("");
      setCounterpartyTickers("");
      await loadTrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trade");
    }
  }

  async function handleRespond(proposalId: number, action: "accept" | "decline") {
    if (!token || !Number.isFinite(leagueId)) return;
    try {
      await respondTrade(token, leagueId, proposalId, action);
      await loadTrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to respond to trade");
    }
  }

  async function handleProcessDueTrades() {
    if (!token || !Number.isFinite(leagueId)) return;
    try {
      await processDueTrades(token, leagueId);
      await loadTrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process due trades");
    }
  }

  return (
    <main className="container">
      <header>
        <p className="eyebrow">Trades</p>
        <h1>League {Number.isFinite(leagueId) ? `#${leagueId}` : ""}</h1>
      </header>

      <section className="card">
        <div className="actions">
          <Link className="button button-secondary" href={`/leagues/${params.id}`}>
            Back to League
          </Link>
          <button className="button" type="button" onClick={handleProcessDueTrades}>
            Process Due Trades
          </button>
        </div>
      </section>

      {loading ? <p>Loading trades...</p> : null}
      {error ? <p className="error card">{error}</p> : null}

      <section className="card">
        <h2>Propose Trade</h2>
        <form className="form" onSubmit={handleCreateTrade}>
          <label>
            Counterparty User ID
            <input
              type="number"
              min={1}
              value={counterpartyUserId}
              onChange={(event) => setCounterpartyUserId(Number(event.target.value))}
            />
          </label>
          <label>
            Your Tickers (comma-separated)
            <input
              type="text"
              value={proposerTickers}
              onChange={(event) => setProposerTickers(event.target.value)}
            />
          </label>
          <label>
            Their Tickers (comma-separated)
            <input
              type="text"
              value={counterpartyTickers}
              onChange={(event) => setCounterpartyTickers(event.target.value)}
            />
          </label>
          <button className="button" type="submit">
            Send Proposal
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Trade Feed</h2>
        {trades.length === 0 ? <p className="muted">No trades yet.</p> : null}
        <ul className="member-list">
          {trades.map((trade) => {
            const isCounterparty = currentUser?.id === trade.proposal.counterparty_user_id;
            return (
              <li className="member-item" key={trade.proposal.id}>
                <div>
                  <p>
                    Trade #{trade.proposal.id} [{trade.proposal.status}]
                  </p>
                  <p className="muted">
                    {trade.proposal.proposer_user_id} {"->"} {trade.proposal.counterparty_user_id}
                  </p>
                  <p className="muted">{trade.items.map((item) => item.ticker).join(", ")}</p>
                </div>
                {isCounterparty && trade.proposal.status === "pending" ? (
                  <div className="actions">
                    <button className="button" type="button" onClick={() => handleRespond(trade.proposal.id, "accept")}>
                      Accept
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => handleRespond(trade.proposal.id, "decline")}
                    >
                      Decline
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
