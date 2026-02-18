import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="landing-wire">
      <header className="lp-topnav">
        <div className="lp-brand">Fantasy Stocks</div>
        <div className="lp-search" role="search">
          <span aria-hidden="true">⌕</span>
          <input type="text" value="Search leagues, strategies, tickers" readOnly />
        </div>
        <div className="actions">
          <Link className="lp-btn lp-btn-dark" href="/auth">
            Log in
          </Link>
          <Link className="lp-btn" href="/auth">
            Sign up
          </Link>
        </div>
      </header>

      <section className="lp-hero wire-hero" id="how">
        <h1>
          Get your next
          <br />
          <span>winning league idea</span>
        </h1>
        <p>Fantasy sports mechanics with real stock data in a mobile-first PWA.</p>
      </section>

      <section className="wire-board" aria-label="Feature board">
        <article className="wire-pin">
          <h3>Live Weekly Matchups</h3>
          <p>See portfolio vs portfolio scoring and win by total percent return.</p>
        </article>
        <article className="wire-pin">
          <h3>Draft Room</h3>
          <p>Snake draft with turn order, timers, and a shared board.</p>
        </article>
        <article className="wire-pin">
          <h3>Trading Center</h3>
          <p>Propose and process trades with clear weekly lock windows.</p>
        </article>
        <article className="wire-pin">
          <h3>Playoff Brackets</h3>
          <p>Generate seeded brackets and advance to a league champion.</p>
        </article>
      </section>

      <section className="lp-feature-list" id="features">
        <article className="lp-feature">
          <div className="lp-feature-media lp-feature-media-mock" aria-hidden="true">
            <div className="lp-chip">League Dashboard</div>
            <div className="lp-bars">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="lp-feature-copy">
            <h2>Built for iOS PWA</h2>
            <p>Install to home screen and use native-feeling bottom tabs across iPhone sizes.</p>
            <Link className="lp-btn lp-btn-dark" href="/auth">
              Start Playing
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
