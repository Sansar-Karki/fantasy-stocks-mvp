"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { markOnboardingComplete } from "../../../lib/auth-storage";

const slides = [
  {
    title: "Welcome to Fantasy Stocks",
    body: "Compete with friends in weekly stock competitions and push for league glory.",
    emoji: "🏆"
  },
  {
    title: "Draft Your Team",
    body: "Pick 8 stocks in a live snake draft. Every ticker can only be drafted once.",
    emoji: "📊"
  },
  {
    title: "Weekly Matchups",
    body: "Your 5 active stocks face an opponent every week. Highest return wins.",
    emoji: "⚔️"
  },
  {
    title: "Trade and Win",
    body: "Swap stocks, set lineups, and make a playoff run for the championship.",
    emoji: "🚀"
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const isLast = useMemo(() => index === slides.length - 1, [index]);

  function finish() {
    markOnboardingComplete();
    router.replace("/app/home");
  }

  return (
    <div className="container phone-canvas onboarding-wrap">
      <section className="card onboarding-card">
        <div className="onboarding-emoji" aria-hidden="true">
          {slides[index].emoji}
        </div>
        <h1>{slides[index].title}</h1>
        <p className="muted">{slides[index].body}</p>

        <div className="onboarding-dots" role="tablist" aria-label="Onboarding progress">
          {slides.map((slide, dotIndex) => (
            <button
              key={slide.title}
              className={dotIndex === index ? "dot dot-active" : "dot"}
              type="button"
              onClick={() => setIndex(dotIndex)}
              aria-label={`Go to slide ${dotIndex + 1}`}
            />
          ))}
        </div>

        <div className="actions">
          <button className="button button-secondary" type="button" onClick={finish}>
            Skip
          </button>
          {isLast ? (
            <button className="button" type="button" onClick={finish}>
              Get Started
            </button>
          ) : (
            <button className="button" type="button" onClick={() => setIndex((prev) => prev + 1)}>
              Next
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
