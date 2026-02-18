export type UserPublic = {
  id: number;
  email: string;
  username: string;
  bio: string | null;
  favorite_stock: string | null;
  is_active: boolean;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: UserPublic;
};

export type LeaguePublic = {
  id: number;
  name: string;
  invite_code: string;
  owner_id: number;
  max_members: number;
  season_status: string;
  trade_deadline: string | null;
  created_at: string;
};

export type LeagueMemberPublic = {
  id: number;
  league_id: number;
  user_id: number;
  display_name: string;
  wins: number;
  losses: number;
  created_at: string;
};

export type LeagueDetailResponse = {
  league: LeaguePublic;
  members: LeagueMemberPublic[];
};

export type DraftPublic = {
  id: number;
  league_id: number;
  status: string;
  total_rounds: number;
  pick_seconds: number;
  current_pick_number: number;
  current_pick_started_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type DraftPickPublic = {
  id: number;
  draft_id: number;
  league_id: number;
  user_id: number;
  pick_number: number;
  round_number: number;
  ticker: string;
  created_at: string;
};

export type DraftRoomResponse = {
  draft: DraftPublic;
  current_picker_user_id: number | null;
  current_round: number | null;
  total_picks: number;
  picks: DraftPickPublic[];
};

export type RosterSlotPublic = {
  id: number;
  league_id: number;
  user_id: number;
  ticker: string;
  slot_type: string;
  draft_pick_id: number | null;
  acquired_at: string;
  updated_at: string;
};

export type RosterResponse = {
  active: RosterSlotPublic[];
  bench: RosterSlotPublic[];
};

export type MatchupWeekPublic = {
  id: number;
  league_id: number;
  week_number: number;
  status: string;
  week_start_date: string;
  week_end_date: string;
  created_at: string;
};

export type MatchupResultPublic = {
  id: number;
  matchup_week_id: number;
  league_id: number;
  home_user_id: number;
  away_user_id: number | null;
  home_score: number;
  away_score: number;
  winner_user_id: number | null;
  scored_at: string | null;
};

export type MatchupWeekDetailResponse = {
  week: MatchupWeekPublic;
  results: MatchupResultPublic[];
};

export type TradeProposalPublic = {
  id: number;
  league_id: number;
  proposer_user_id: number;
  counterparty_user_id: number;
  status: string;
  created_at: string;
  responded_at: string | null;
  effective_at: string | null;
  processed_at: string | null;
};

export type TradeItemPublic = {
  id: number;
  proposal_id: number;
  league_id: number;
  sending_user_id: number;
  receiving_user_id: number;
  ticker: string;
};

export type TradeDetailResponse = {
  proposal: TradeProposalPublic;
  items: TradeItemPublic[];
};

export type LeagueStandingRow = {
  user_id: number;
  display_name: string;
  wins: number;
  losses: number;
};

export type LeagueStandingsResponse = {
  league_id: number;
  rows: LeagueStandingRow[];
};

export type PlayoffMatchPublic = {
  id: number;
  league_id: number;
  round_number: number;
  matchup_number: number;
  home_user_id: number;
  away_user_id: number;
  winner_user_id: number | null;
  status: string;
  created_at: string;
};

export type PlayoffBracketResponse = {
  league_id: number;
  matches: PlayoffMatchPublic[];
  champion_user_id: number | null;
};

export type MarketSearchResult = {
  ticker: string;
  name: string;
  exchange: string | null;
};

export type MarketQuote = {
  ticker: string;
  name: string;
  current_price: number | null;
  daily_change_percent: number | null;
  market_cap: number | null;
  sector: string | null;
  pe_ratio: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
};
