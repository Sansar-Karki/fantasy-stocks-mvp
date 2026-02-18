"use client";

import Link from "next/link";

const trending = [
  { ticker: "NVDA", name: "NVIDIA Corp.", move: "+5.2%", sector: "Tech", cap: "$2.2T" },
  { ticker: "AAPL", name: "Apple Inc.", move: "+1.8%", sector: "Tech", cap: "$3.8T" },
  { ticker: "TSLA", name: "Tesla Inc.", move: "+3.8%", sector: "Auto", cap: "$850B" }
];

export default function ExplorePage() {
  return (
    <div className="container app-container phone-canvas">
      <header className="topbar">
        <div>
          <p className="muted">Stock Research</p>
          <h1>Explore</h1>
        </div>
      </header>

      <section className="sheet-card">
        <label>
          Search Stocks
          <input type="text" placeholder="AAPL, TSLA, NVIDIA..." />
        </label>
      </section>

      <section className="sheet-card">
        <div className="section-head">
          <h2>Trending Today</h2>
          <span className="muted">Live</span>
        </div>
        <ul className="tx-list">
          {trending.map((stock) => (
            <li key={stock.ticker} className="tx-item">
              <div>
                <strong>
                  {stock.ticker} {stock.move}
                </strong>
                <p className="muted">
                  {stock.name} · {stock.sector} · {stock.cap}
                </p>
              </div>
              <Link className="tx-link" href="/app/home">
                View
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="sheet-card">
        <h2>Top Gainers (Week)</h2>
        <p className="muted">NVDA +12.4% · AMD +9.8% · TSLA +8.3%</p>
      </section>
    </div>
  );
}
