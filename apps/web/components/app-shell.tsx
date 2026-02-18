"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { getToken, hasCompletedOnboarding } from "../lib/auth-storage";

const tabs = [
  { href: "/app/home", label: "Home", icon: "home" },
  { href: "/app/leagues", label: "Leagues", icon: "leagues" },
  { href: "/app/explore", label: "Explore", icon: "explore" },
  { href: "/app/profile", label: "Profile", icon: "profile" }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const showTabs = pathname !== "/app/onboarding";

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    if (pathname === "/app/onboarding") return;
    if (!hasCompletedOnboarding()) {
      router.replace("/app/onboarding");
    }
  }, [pathname, router]);

  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>
      {showTabs ? (
        <nav className="tabbar" aria-label="Primary">
          {tabs.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                className={active ? "tablink tablink-active" : "tablink"}
                href={tab.href}
                aria-current={active ? "page" : undefined}
              >
                <TabIcon name={tab.icon} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}

function TabIcon({ name }: { name: "home" | "leagues" | "explore" | "profile" }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 3.5 10.1v10.4h6.2v-6.4h4.6v6.4h6.2V10.1L12 3Z" />
      </svg>
    );
  }

  if (name === "leagues") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5.5h16v4.1H4V5.5Zm0 5.9h10.1v4.1H4v-4.1Zm12 0H20v8.1h-4v-8.1ZM4 17.3h10.1v2.2H4v-2.2Z" />
      </svg>
    );
  }

  if (name === "explore") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m15.8 4.1 4.1 4.1-7.8 7.8-4.6 1.6 1.6-4.6 6.7-6.7Z" />
        <path d="M6 6h5v2H8v9h9v-3h2v5H6V6Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.1a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4Zm0 10.8c4.4 0 8 2.4 8 5.3v.7H4v-.7c0-2.9 3.6-5.3 8-5.3Z" />
    </svg>
  );
}
