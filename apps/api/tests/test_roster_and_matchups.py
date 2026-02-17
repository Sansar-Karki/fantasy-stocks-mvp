from fastapi.testclient import TestClient


def _register_and_get_token(client: TestClient, email: str, username: str) -> str:
    response = client.post(
        "/api/auth/register",
        json={"email": email, "username": username, "password": "Password123"},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def _create_league(client: TestClient, token: str, name: str = "Core League") -> dict:
    response = client.post(
        "/api/leagues",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": name, "max_members": 6},
    )
    assert response.status_code == 201
    return response.json()


def _full_two_user_draft(
    client: TestClient, league_id: int, owner_token: str, member_token: str
) -> tuple[list[str], list[str]]:
    start = client.post(
        f"/api/leagues/{league_id}/draft/start",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"pick_seconds": 30},
    )
    assert start.status_code == 201

    owner_tickers: list[str] = []
    member_tickers: list[str] = []

    for i in range(16):
        room = client.get(
            f"/api/leagues/{league_id}/draft",
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert room.status_code == 200
        current_picker = room.json()["current_picker_user_id"]

        ticker = f"T{i:02d}"
        if current_picker == 1:
            token = owner_token
            owner_tickers.append(ticker)
        else:
            token = member_token
            member_tickers.append(ticker)

        pick = client.post(
            f"/api/leagues/{league_id}/draft/picks",
            headers={"Authorization": f"Bearer {token}"},
            json={"ticker": ticker},
        )
        assert pick.status_code == 200

    return owner_tickers, member_tickers


def test_draft_populates_roster_active_and_bench(client: TestClient) -> None:
    owner = _register_and_get_token(client, "r_owner@example.com", "r_owner")
    league = _create_league(client, owner)
    member = _register_and_get_token(client, "r_member@example.com", "r_member")

    join = client.post(
        "/api/leagues/join",
        headers={"Authorization": f"Bearer {member}"},
        json={"invite_code": league["invite_code"]},
    )
    assert join.status_code == 200

    _full_two_user_draft(client, league["id"], owner, member)

    owner_roster = client.get(
        f"/api/leagues/{league['id']}/roster",
        headers={"Authorization": f"Bearer {owner}"},
    )
    assert owner_roster.status_code == 200
    owner_payload = owner_roster.json()
    assert len(owner_payload["active"]) == 5
    assert len(owner_payload["bench"]) == 3


def test_lineup_lock_window_enforced(client: TestClient, monkeypatch) -> None:
    from app.api import roster as roster_api

    owner = _register_and_get_token(client, "l_owner@example.com", "l_owner")
    league = _create_league(client, owner)
    member = _register_and_get_token(client, "l_member@example.com", "l_member")
    join = client.post(
        "/api/leagues/join",
        headers={"Authorization": f"Bearer {member}"},
        json={"invite_code": league["invite_code"]},
    )
    assert join.status_code == 200

    owner_tickers, _ = _full_two_user_draft(client, league["id"], owner, member)

    monkeypatch.setattr(roster_api, "is_lineup_edit_window", lambda: False)
    locked = client.post(
        f"/api/leagues/{league['id']}/roster/lineup",
        headers={"Authorization": f"Bearer {owner}"},
        json={"active_tickers": owner_tickers[:5]},
    )
    assert locked.status_code == 400

    monkeypatch.setattr(roster_api, "is_lineup_edit_window", lambda: True)
    unlocked = client.post(
        f"/api/leagues/{league['id']}/roster/lineup",
        headers={"Authorization": f"Bearer {owner}"},
        json={"active_tickers": owner_tickers[3:8]},
    )
    assert unlocked.status_code == 200
    payload = unlocked.json()
    assert len(payload["active"]) == 5
    assert len(payload["bench"]) == 3


def test_matchup_scoring_from_snapshots(client: TestClient) -> None:
    owner = _register_and_get_token(client, "m_owner@example.com", "m_owner")
    league = _create_league(client, owner)
    member = _register_and_get_token(client, "m_member@example.com", "m_member")
    join = client.post(
        "/api/leagues/join",
        headers={"Authorization": f"Bearer {member}"},
        json={"invite_code": league["invite_code"]},
    )
    assert join.status_code == 200

    owner_tickers, member_tickers = _full_two_user_draft(client, league["id"], owner, member)

    create_week = client.post(
        f"/api/leagues/{league['id']}/matchups/weeks",
        headers={"Authorization": f"Bearer {owner}"},
        json={"week_number": 1, "week_start_date": "2026-02-23", "week_end_date": "2026-02-27"},
    )
    assert create_week.status_code == 201

    # Owner tickers gain 10%, member tickers gain 5%.
    for ticker in owner_tickers[:5]:
        monday = client.post(
            f"/api/leagues/{league['id']}/matchups/weeks/1/snapshots",
            headers={"Authorization": f"Bearer {owner}"},
            json={"ticker": ticker, "snapshot_type": "monday_close", "close_price": 100},
        )
        friday = client.post(
            f"/api/leagues/{league['id']}/matchups/weeks/1/snapshots",
            headers={"Authorization": f"Bearer {owner}"},
            json={"ticker": ticker, "snapshot_type": "friday_close", "close_price": 110},
        )
        assert monday.status_code == 201
        assert friday.status_code == 201

    for ticker in member_tickers[:5]:
        monday = client.post(
            f"/api/leagues/{league['id']}/matchups/weeks/1/snapshots",
            headers={"Authorization": f"Bearer {owner}"},
            json={"ticker": ticker, "snapshot_type": "monday_close", "close_price": 100},
        )
        friday = client.post(
            f"/api/leagues/{league['id']}/matchups/weeks/1/snapshots",
            headers={"Authorization": f"Bearer {owner}"},
            json={"ticker": ticker, "snapshot_type": "friday_close", "close_price": 105},
        )
        assert monday.status_code == 201
        assert friday.status_code == 201

    scored = client.post(
        f"/api/leagues/{league['id']}/matchups/weeks/1/score",
        headers={"Authorization": f"Bearer {owner}"},
    )
    assert scored.status_code == 200
    payload = scored.json()
    assert payload["week"]["status"] == "scored"
    assert len(payload["results"]) == 1
    assert payload["results"][0]["winner_user_id"] == 1

    standings = client.get(
        f"/api/leagues/{league['id']}/standings",
        headers={"Authorization": f"Bearer {owner}"},
    )
    assert standings.status_code == 200
    rows = standings.json()["rows"]
    assert rows[0]["wins"] == 1
    assert rows[1]["losses"] == 1


def test_get_latest_matchup_week(client: TestClient) -> None:
    owner = _register_and_get_token(client, "latest_owner@example.com", "latest_owner")
    league = _create_league(client, owner)
    member = _register_and_get_token(client, "latest_member@example.com", "latest_member")
    join = client.post(
        "/api/leagues/join",
        headers={"Authorization": f"Bearer {member}"},
        json={"invite_code": league["invite_code"]},
    )
    assert join.status_code == 200

    create_week = client.post(
        f"/api/leagues/{league['id']}/matchups/weeks",
        headers={"Authorization": f"Bearer {owner}"},
        json={"week_number": 2, "week_start_date": "2026-03-02", "week_end_date": "2026-03-06"},
    )
    assert create_week.status_code == 201

    latest = client.get(
        f"/api/leagues/{league['id']}/matchups/latest",
        headers={"Authorization": f"Bearer {owner}"},
    )
    assert latest.status_code == 200
    payload = latest.json()
    assert payload["week"]["week_number"] == 2


def test_auto_snapshots_endpoint(client: TestClient, monkeypatch) -> None:
    from app.api import matchups as matchups_api

    owner = _register_and_get_token(client, "auto_owner@example.com", "auto_owner")
    league = _create_league(client, owner)
    member = _register_and_get_token(client, "auto_member@example.com", "auto_member")
    join = client.post(
        "/api/leagues/join",
        headers={"Authorization": f"Bearer {member}"},
        json={"invite_code": league["invite_code"]},
    )
    assert join.status_code == 200

    _full_two_user_draft(client, league["id"], owner, member)

    create_week = client.post(
        f"/api/leagues/{league['id']}/matchups/weeks",
        headers={"Authorization": f"Bearer {owner}"},
        json={"week_number": 3, "week_start_date": "2026-03-09", "week_end_date": "2026-03-13"},
    )
    assert create_week.status_code == 201

    monkeypatch.setattr(matchups_api, "fetch_close_price_for_date", lambda ticker, d: 100.0)
    auto = client.post(
        f"/api/leagues/{league['id']}/matchups/weeks/3/snapshots/auto",
        headers={"Authorization": f"Bearer {owner}"},
    )
    assert auto.status_code == 201
    assert auto.json()["stored"] > 0
