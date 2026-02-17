import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <header>
        <p className="eyebrow">Fantasy Stocks MVP</p>
        <h1>Build Console</h1>
        <p>Day 2 complete on backend. Use the frontend flow to auth and manage leagues.</p>
      </header>

      <section className="card">
        <h2>Start Here</h2>
        <div className="actions">
          <Link className="button" href="/auth">
            Register / Login
          </Link>
          <Link className="button button-secondary" href="/leagues">
            Go to Leagues
          </Link>
        </div>
      </section>
    </main>
  );
}
