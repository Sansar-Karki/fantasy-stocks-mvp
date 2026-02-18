"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createTrade, listTrades, me, processDueTrades, respondTrade } from "../../../../lib/api";
import { getToken } from "../../../../lib/auth-storage";
import type { TradeDetailResponse, UserPublic } from "../../../../lib/types";

type TradeTab = "browse" | "mine" | "offers";

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
  const [activeTab, setActiveTab] = useState<TradeTab>("browse");

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
        // Keep loading trade list even if profile request fails.
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
      setActiveTab("mine");
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

  const myTrades = trades.filter((trade) => trade.proposal.proposer_user_id === currentUser?.id);
  const incomingOffers = trades.filter(
    (trade) => trade.proposal.counterparty_user_id === currentUser?.id && trade.proposal.status === "pending"
  );

  return (
    <main className="container app-container phone-canvas">
      <header className="wire-header">
        <Link className="icon-btn" href={`/leagues/${params.id}/dashboard`} aria-label="Back to dashboard">
          ←
        </Link>
        <strong>Trading Center</strong>
        <button className="icon-btn" type="button" onClick={handleProcessDueTrades} aria-label="Process due trades">
          ↻
        </button>
      </header>

      {loading ? <p className="muted">Loading trades...</p> : null}
      {error ? <p className="error card">{error}</p> : null}

      <section className="sheet-card">
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
            <input type="text" value={proposerTickers} onChange={(event) => setProposerTickers(event.target.value)} />
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

      <section className="sheet-card">
        <h2>Trade Activity</h2>
        <div className="tab-row tab-row-sheet" role="tablist" aria-label="Trade tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "browse"}
            className={activeTab === "browse" ? "tab tab-active" : "tab"}
            onClick={() => setActiveTab("browse")}
          >
            Browse
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "mine"}
            className={activeTab === "mine" ? "tab tab-active" : "tab"}
            onClick={() => setActiveTab("mine")}
          >
            My Trades
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "offers"}
            className={activeTab === "offers" ? "tab tab-active" : "tab"}
            onClick={() => setActiveTab("offers")}
          >
            Offers
          </button>
        </div>

        {activeTab === "browse" ? <TradeList trades={trades} currentUserId={currentUser?.id ?? null} onRespond={handleRespond} /> : null}
        {activeTab === "mine" ? (
          <TradeList trades={myTrades} currentUserId={currentUser?.id ?? null} onRespond={handleRespond} emptyText="No outgoing trades yet." />
        ) : null}
        {activeTab === "offers" ? (
          <TradeList
            trades={incomingOffers}
            currentUserId={currentUser?.id ?? null}
            onRespond={handleRespond}
            emptyText="No pending offers for you."
          />
        ) : null}
      </section>
    </main>
  );
}

function TradeList({
  trades,
  currentUserId,
  onRespond,
  emptyText = "No trades yet."
}: {
  trades: TradeDetailResponse[];
  currentUserId: number | null;
  onRespond: (proposalId: number, action: "accept" | "decline") => Promise<void>;
  emptyText?: string;
}) {
  if (trades.length === 0) {
    return <p className="muted">{emptyText}</p>;
  }

  return (
    <ul className="member-list">
      {trades.map((trade) => {
        const isCounterparty = currentUserId === trade.proposal.counterparty_user_id;
        return (
          <li className="member-item trade-item" key={trade.proposal.id}>
            <div>
              <p>
                Trade #{trade.proposal.id} [{trade.proposal.status}]
              </p>
              <p className="muted">
                {trade.proposal.proposer_user_id} {"->"} {trade.proposal.counterparty_user_id}
              </p>
              <p className="muted">{trade.items.map((item) => item.ticker).join(", ") || "No tickers"}</p>
            </div>
            {isCounterparty && trade.proposal.status === "pending" ? (
              <div className="actions">
                <button className="button" type="button" onClick={() => void onRespond(trade.proposal.id, "accept")}>
                  Accept
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => void onRespond(trade.proposal.id, "decline")}
                >
                  Decline
                </button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
