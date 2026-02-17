from datetime import date, datetime, timezone

from fastapi.testclient import TestClient


def _register_and_get_token(client: TestClient, email: str, username: str) -> str:
    response = client.post(
        "/api/auth/register",
        json={"email": email, "username": username, "password": "Password123"},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def _create_league(client: TestClient, token: str, name: str = "Trade League") -> dict:
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
        current_picker = room.json()["current_picker_user_id"]
        ticker = f"TR{i:02d}"
        if current_picker == 1:
            owner_tickers.append(ticker)
            token = owner_token
        else:
            member_tickers.append(ticker)
            token = member_token

        pick = client.post(
            f"/api/leagues/{league_id}/draft/picks",
            headers={"Authorization": f"Bearer {token}"},
            json={"ticker": ticker},
        )
        assert pick.status_code == 200

    return owner_tickers, member_tickers


def test_create_accept_and_process_trade(client: TestClient, monkeypatch) -> None:
    from app.api import trades as trades_api

    owner = _register_and_get_token(client, "trade_owner@example.com", "trade_owner")
    league = _create_league(client, owner)
    member = _register_and_get_token(client, "trade_member@example.com", "trade_member")

    join = client.post(
        "/api/leagues/join",
        headers={"Authorization": f"Bearer {member}"},
        json={"invite_code": league["invite_code"]},
    )
    assert join.status_code == 200

    owner_tickers, member_tickers = _full_two_user_draft(client, league["id"], owner, member)

    create = client.post(
        f"/api/leagues/{league['id']}/trades",
        headers={"Authorization": f"Bearer {owner}"},
        json={
            "counterparty_user_id": 2,
            "proposer_tickers": [owner_tickers[0]],
            "counterparty_tickers": [member_tickers[0]],
        },
    )
    assert create.status_code == 201
    proposal_id = create.json()["proposal"]["id"]

    monkeypatch.setattr(trades_api, "next_saturday_utc", lambda: datetime.now(timezone.utc))
    accept = client.post(
        f"/api/leagues/{league['id']}/trades/{proposal_id}/respond",
        headers={"Authorization": f"Bearer {member}"},
        json={"action": "accept"},
    )
    assert accept.status_code == 200
    assert accept.json()["proposal"]["status"] == "accepted"

    process = client.post(
        f"/api/leagues/{league['id']}/trades/process-due",
        headers={"Authorization": f"Bearer {owner}"},
    )
    assert process.status_code == 200
    assert process.json()["processed"] == 1

    owner_roster = client.get(
        f"/api/leagues/{league['id']}/roster",
        headers={"Authorization": f"Bearer {owner}"},
    ).json()
    owner_tickers_after = {slot["ticker"] for slot in owner_roster["active"] + owner_roster["bench"]}
    assert member_tickers[0] in owner_tickers_after


def test_trade_deadline_blocks_new_proposals(client: TestClient) -> None:
    owner = _register_and_get_token(client, "td_owner@example.com", "td_owner")
    league = client.post(
        "/api/leagues",
        headers={"Authorization": f"Bearer {owner}"},
        json={"name": "Deadline League", "max_members": 6, "trade_deadline": str(date(2026, 1, 1))},
    ).json()

    member = _register_and_get_token(client, "td_member@example.com", "td_member")
    join = client.post(
        "/api/leagues/join",
        headers={"Authorization": f"Bearer {member}"},
        json={"invite_code": league["invite_code"]},
    )
    assert join.status_code == 200

    _full_two_user_draft(client, league["id"], owner, member)

    create = client.post(
        f"/api/leagues/{league['id']}/trades",
        headers={"Authorization": f"Bearer {owner}"},
        json={
            "counterparty_user_id": 2,
            "proposer_tickers": ["TR00"],
            "counterparty_tickers": ["TR01"],
        },
    )
    assert create.status_code == 400
    assert "deadline" in create.json()["detail"].lower()
