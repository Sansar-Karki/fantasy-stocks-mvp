"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { login, register } from "../../lib/api";
import { setToken } from "../../lib/auth-storage";

type Mode = "register" | "login";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("register");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result =
        mode === "register"
          ? await register({ email, username, password })
          : await login({ email, password });

      setToken(result.access_token);
      router.push("/leagues");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="container">
      <header>
        <p className="eyebrow">Authentication</p>
        <h1>{mode === "register" ? "Create your account" : "Log into your account"}</h1>
      </header>

      <section className="card">
        <div className="tab-row">
          <button
            className={mode === "register" ? "tab tab-active" : "tab"}
            onClick={() => setMode("register")}
            type="button"
          >
            Register
          </button>
          <button
            className={mode === "login" ? "tab tab-active" : "tab"}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
        </div>

        <form className="form" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {mode === "register" ? (
            <label>
              Username
              <input
                type="text"
                required
                minLength={3}
                maxLength={40}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
          ) : null}

          <label>
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <button className="button" type="submit" disabled={isLoading}>
            {isLoading ? "Please wait..." : mode === "register" ? "Create Account" : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
