"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { login, register } from "../../lib/api";
import { setToken } from "../../lib/auth-storage";

type Mode = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [favoriteStock, setFavoriteStock] = useState("");
  const [bio, setBio] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canSubmitLogin = useMemo(() => email.length > 5 && password.length >= 8, [email, password]);
  const canContinueSignup =
    email.length > 5 && username.trim().length >= 3 && password.length >= 8 && confirmPassword === password;

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitLogin) return;
    setError(null);
    setIsLoading(true);

    try {
      const result = await login({ email, password });
      setToken(result.access_token);
      router.push("/app/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignupFinish() {
    setError(null);
    setIsLoading(true);

    try {
      const result = await register({ email, username, password });
      setToken(result.access_token);
      window.localStorage.setItem("fantasy_profile_draft", JSON.stringify({ favoriteStock, bio }));
      router.push("/app/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="container auth-wrap">
      <section className="auth-hero">
        <p className="eyebrow">Fantasy Stock League</p>
        <h1>Compete with friends. Learn stocks. Win glory.</h1>
      </section>

      <section className="card auth-card">
        <div className="tab-row">
          <button className={mode === "login" ? "tab tab-active" : "tab"} type="button" onClick={() => setMode("login")}>
            Log In
          </button>
          <button
            className={mode === "signup" ? "tab tab-active" : "tab"}
            type="button"
            onClick={() => {
              setMode("signup");
              setStep(1);
            }}
          >
            Sign Up
          </button>
        </div>

        {mode === "login" ? (
          <form className="form" onSubmit={handleLogin}>
            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>

            <label>
              Password
              <div className="password-row">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
                <button type="button" className="inline-action" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {error ? <p className="error">{error}</p> : null}

            <button className="button" type="submit" disabled={!canSubmitLogin || isLoading}>
              {isLoading ? "Please wait..." : "Log In"}
            </button>
          </form>
        ) : (
          <>
            {step === 1 ? (
              <form
                className="form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (canContinueSignup) setStep(2);
                }}
              >
                <p className="muted">Step 1 of 2</p>
                <label>
                  Email
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </label>
                <label>
                  Username
                  <input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} required />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </label>
                <label>
                  Confirm Password
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </label>
                {confirmPassword && confirmPassword !== password ? (
                  <p className="error">Passwords must match.</p>
                ) : null}
                <button className="button" type="submit" disabled={!canContinueSignup}>
                  Continue
                </button>
              </form>
            ) : (
              <div className="form">
                <p className="muted">Step 2 of 2</p>
                <label>
                  Favorite Stock (optional)
                  <input value={favoriteStock} onChange={(event) => setFavoriteStock(event.target.value.toUpperCase())} />
                </label>
                <label>
                  Bio (optional)
                  <textarea
                    rows={4}
                    maxLength={200}
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                  />
                </label>
                <p className="muted">{bio.length}/200 characters</p>
                {error ? <p className="error">{error}</p> : null}
                <div className="actions">
                  <button className="button button-secondary" type="button" onClick={() => setStep(1)}>
                    Back
                  </button>
                  <button className="button" type="button" onClick={handleSignupFinish} disabled={isLoading}>
                    {isLoading ? "Please wait..." : "Finish"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
