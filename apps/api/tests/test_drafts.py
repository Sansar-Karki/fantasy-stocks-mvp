from fastapi.testclient import TestClient


def _register_and_get_token(client: TestClient, email: str, username: str) -> str:
    response = client.post(
        "/api/auth/register",
        json={"email": email, "username": username, "password": "Password123"},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def _create_league(client: TestClient, token: str, name: str = "Draft League") -> dict:
    response = client.post(
        "/api/leagues",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": name, "max_members": 6},
    )
    assert response.status_code == 201
    return response.json()


def test_owner_can_start_draft(client: TestClient) -> None:
    owner_token = _register_and_get_token(client, "d_owner@example.com", "d_owner")
    league = _create_league(client, owner_token)

    second_token = _register_and_get_token(client, "d_member@example.com", "d_member")
    join = client.post(
        "/api/leagues/join",
        headers={"Authorization": f"Bearer {second_token}"},
        json={"invite_code": league["invite_code"]},
    )
    assert join.status_code == 200

    start = client.post(
        f"/api/leagues/{league['id']}/draft/start",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"pick_seconds": 45},
    )
    assert start.status_code == 201
    payload = start.json()
    assert payload["league_id"] == league["id"]
    assert payload["status"] == "live"
    assert payload["current_pick_number"] == 1


def test_non_owner_cannot_start_draft(client: TestClient) -> None:
    owner_token = _register_and_get_token(client, "d_owner2@example.com", "d_owner2")
    league = _create_league(client, owner_token)

    second_token = _register_and_get_token(client, "d_member2@example.com", "d_member2")
    join = client.post(
        "/api/leagues/join",
        headers={"Authorization": f"Bearer {second_token}"},
        json={"invite_code": league["invite_code"]},
    )
    assert join.status_code == 200

    start = client.post(
        f"/api/leagues/{league['id']}/draft/start",
        headers={"Authorization": f"Bearer {second_token}"},
        json={"pick_seconds": 45},
    )
    assert start.status_code == 403


def test_draft_pick_turn_enforced_and_duplicate_blocked(client: TestClient) -> None:
    owner_token = _register_and_get_token(client, "d_owner3@example.com", "d_owner3")
    league = _create_league(client, owner_token)

    member_token = _register_and_get_token(client, "d_member3@example.com", "d_member3")
    join = client.post(
        "/api/leagues/join",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"invite_code": league["invite_code"]},
    )
    assert join.status_code == 200

    start = client.post(
        f"/api/leagues/{league['id']}/draft/start",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"pick_seconds": 45},
    )
    assert start.status_code == 201

    # First turn belongs to owner because owner is first member.
    out_of_turn = client.post(
        f"/api/leagues/{league['id']}/draft/picks",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"ticker": "AAPL"},
    )
    assert out_of_turn.status_code == 400
    assert out_of_turn.json()["detail"] == "Not your turn"

    owner_pick = client.post(
        f"/api/leagues/{league['id']}/draft/picks",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"ticker": "AAPL"},
    )
    assert owner_pick.status_code == 200
    assert owner_pick.json()["draft"]["current_pick_number"] == 2

    member_duplicate = client.post(
        f"/api/leagues/{league['id']}/draft/picks",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"ticker": "AAPL"},
    )
    assert member_duplicate.status_code == 400
    assert member_duplicate.json()["detail"] == "Ticker already drafted"


def test_draft_room_shows_current_picker(client: TestClient) -> None:
    owner_token = _register_and_get_token(client, "d_owner4@example.com", "d_owner4")
    league = _create_league(client, owner_token)

    member_token = _register_and_get_token(client, "d_member4@example.com", "d_member4")
    join = client.post(
        "/api/leagues/join",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"invite_code": league["invite_code"]},
    )
    assert join.status_code == 200

    start = client.post(
        f"/api/leagues/{league['id']}/draft/start",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"pick_seconds": 45},
    )
    assert start.status_code == 201

    room = client.get(
        f"/api/leagues/{league['id']}/draft",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert room.status_code == 200
    payload = room.json()
    assert payload["current_round"] == 1
    assert payload["current_picker_user_id"] == 1
    assert payload["total_picks"] == 16
