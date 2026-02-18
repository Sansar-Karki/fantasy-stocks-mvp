import type {
  AuthResponse,
  DraftRoomResponse,
  LeagueDetailResponse,
  LeaguePublic,
  MarketQuote,
  MarketSearchResult,
  MatchupWeekDetailResponse,
  MatchupWeekPublic,
  LeagueStandingsResponse,
  PlayoffBracketResponse,
  RosterResponse,
  TradeDetailResponse
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const error = await response.json();
      if (typeof error.detail === "string") message = error.detail;
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function register(payload: {
  email: string;
  username: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function me(token: string): Promise<AuthResponse["user"]> {
  return request<AuthResponse["user"]>("/auth/me", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createLeague(
  token: string,
  payload: { name: string; max_members: number }
): Promise<LeaguePublic> {
  return request<LeaguePublic>("/leagues", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function joinLeague(token: string, invite_code: string): Promise<LeaguePublic> {
  return request<LeaguePublic>("/leagues/join", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ invite_code })
  });
}

export function listLeagues(token: string): Promise<LeaguePublic[]> {
  return request<LeaguePublic[]>("/leagues", {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getLeague(token: string, leagueId: number): Promise<LeagueDetailResponse> {
  return request<LeagueDetailResponse>(`/leagues/${leagueId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function startDraft(
  token: string,
  leagueId: number,
  pickSeconds = 60
): Promise<DraftRoomResponse["draft"]> {
  return request<DraftRoomResponse["draft"]>(`/leagues/${leagueId}/draft/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pick_seconds: pickSeconds })
  });
}

export function getDraftRoom(token: string, leagueId: number): Promise<DraftRoomResponse> {
  return request<DraftRoomResponse>(`/leagues/${leagueId}/draft`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function submitDraftPick(
  token: string,
  leagueId: number,
  ticker: string
): Promise<DraftRoomResponse> {
  return request<DraftRoomResponse>(`/leagues/${leagueId}/draft/picks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ticker })
  });
}

export function getRoster(token: string, leagueId: number): Promise<RosterResponse> {
  return request<RosterResponse>(`/leagues/${leagueId}/roster`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function updateLineup(
  token: string,
  leagueId: number,
  activeTickers: string[]
): Promise<RosterResponse> {
  return request<RosterResponse>(`/leagues/${leagueId}/roster/lineup`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ active_tickers: activeTickers })
  });
}

export function createMatchupWeek(
  token: string,
  leagueId: number,
  payload: { week_number: number; week_start_date: string; week_end_date: string }
): Promise<MatchupWeekPublic> {
  return request<MatchupWeekPublic>(`/leagues/${leagueId}/matchups/weeks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function getMatchupWeek(
  token: string,
  leagueId: number,
  weekNumber: number
): Promise<MatchupWeekDetailResponse> {
  return request<MatchupWeekDetailResponse>(`/leagues/${leagueId}/matchups/weeks/${weekNumber}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getLatestMatchupWeek(
  token: string,
  leagueId: number
): Promise<MatchupWeekDetailResponse> {
  return request<MatchupWeekDetailResponse>(`/leagues/${leagueId}/matchups/latest`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function upsertSnapshot(
  token: string,
  leagueId: number,
  weekNumber: number,
  payload: { ticker: string; snapshot_type: "monday_close" | "friday_close"; close_price: number }
): Promise<{ message: string }> {
  return request<{ message: string }>(`/leagues/${leagueId}/matchups/weeks/${weekNumber}/snapshots`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function runWeekScoring(
  token: string,
  leagueId: number,
  weekNumber: number
): Promise<MatchupWeekDetailResponse> {
  return request<MatchupWeekDetailResponse>(`/leagues/${leagueId}/matchups/weeks/${weekNumber}/score`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function autoSnapshots(
  token: string,
  leagueId: number,
  weekNumber: number
): Promise<{ stored: number }> {
  return request<{ stored: number }>(`/leagues/${leagueId}/matchups/weeks/${weekNumber}/snapshots/auto`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function listTrades(
  token: string,
  leagueId: number,
  statusFilter?: string
): Promise<TradeDetailResponse[]> {
  const query = statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : "";
  return request<TradeDetailResponse[]>(`/leagues/${leagueId}/trades${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function createTrade(
  token: string,
  leagueId: number,
  payload: {
    counterparty_user_id: number;
    proposer_tickers: string[];
    counterparty_tickers: string[];
  }
): Promise<TradeDetailResponse> {
  return request<TradeDetailResponse>(`/leagues/${leagueId}/trades`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

export function respondTrade(
  token: string,
  leagueId: number,
  proposalId: number,
  action: "accept" | "decline"
): Promise<TradeDetailResponse> {
  return request<TradeDetailResponse>(`/leagues/${leagueId}/trades/${proposalId}/respond`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action })
  });
}

export function processDueTrades(token: string, leagueId: number): Promise<{ processed: number }> {
  return request<{ processed: number }>(`/leagues/${leagueId}/trades/process-due`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getStandings(token: string, leagueId: number): Promise<LeagueStandingsResponse> {
  return request<LeagueStandingsResponse>(`/leagues/${leagueId}/standings`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function updateSeasonStatus(
  token: string,
  leagueId: number,
  season_status: "setup" | "regular" | "playoffs" | "complete" | "paused"
): Promise<LeaguePublic> {
  return request<LeaguePublic>(`/leagues/${leagueId}/season`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ season_status })
  });
}

export function updateTradeDeadline(
  token: string,
  leagueId: number,
  trade_deadline: string | null
): Promise<LeaguePublic> {
  return request<LeaguePublic>(`/leagues/${leagueId}/trade-deadline`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ trade_deadline })
  });
}

export function kickMember(token: string, leagueId: number, memberUserId: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/leagues/${leagueId}/members/${memberUserId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function generatePlayoffBracket(token: string, leagueId: number): Promise<PlayoffBracketResponse> {
  return request<PlayoffBracketResponse>(`/leagues/${leagueId}/playoffs/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function getPlayoffBracket(token: string, leagueId: number): Promise<PlayoffBracketResponse> {
  return request<PlayoffBracketResponse>(`/leagues/${leagueId}/playoffs`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function recordPlayoffResult(
  token: string,
  leagueId: number,
  matchId: number,
  winnerUserId: number
): Promise<PlayoffBracketResponse> {
  return request<PlayoffBracketResponse>(`/leagues/${leagueId}/playoffs/matches/${matchId}/result`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ winner_user_id: winnerUserId })
  });
}

export function searchMarket(query: string, limit = 8): Promise<MarketSearchResult[]> {
  const q = encodeURIComponent(query);
  return request<MarketSearchResult[]>(`/market/search?q=${q}&limit=${limit}`);
}

export function getMarketQuote(ticker: string): Promise<MarketQuote> {
  return request<MarketQuote>(`/market/${encodeURIComponent(ticker)}`);
}
