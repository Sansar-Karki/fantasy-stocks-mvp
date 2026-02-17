from fastapi.testclient import TestClient


def _register_and_get_token(client: TestClient, email: str, username: str) -> str:
    response = client.post(
        "/api/auth/register",
        json={"email": email, "username": username, "password": "Password123"},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def test_create_league_requires_auth(client: TestClient) -> None:
    response = client.post("/api/leagues", json={"name": "My League", "max_members": 6})
    assert response.status_code == 401


def test_create_and_list_league(client: TestClient) -> None:
    token = _register_and_get_token(client, "owner@example.com", "owner")
    headers = {"Authorization": f"Bearer {token}"}

    create_response = client.post(
        "/api/leagues",
        headers=headers,
        json={"name": "Alpha League", "max_members": 6},
    )
    assert create_response.status_code == 201
    payload = create_response.json()
    assert payload["name"] == "Alpha League"
    assert payload["owner_id"] == 1
    assert len(payload["invite_code"]) >= 6

    list_response = client.get("/api/leagues", headers=headers)
    assert list_response.status_code == 200
    leagues = list_response.json()
    assert len(leagues) == 1
    assert leagues[0]["name"] == "Alpha League"


def test_join_and_get_league(client: TestClient) -> None:
    owner_token = _register_and_get_token(client, "owner2@example.com", "owner2")
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    league_response = client.post(
        "/api/leagues",
        headers=owner_headers,
        json={"name": "Beta League", "max_members": 6},
    )
    assert league_response.status_code == 201
    league = league_response.json()

    member_token = _register_and_get_token(client, "member@example.com", "member")
    member_headers = {"Authorization": f"Bearer {member_token}"}

    join_response = client.post(
        "/api/leagues/join",
        headers=member_headers,
        json={"invite_code": league["invite_code"]},
    )
    assert join_response.status_code == 200
    assert join_response.json()["id"] == league["id"]

    detail_response = client.get(f"/api/leagues/{league['id']}", headers=member_headers)
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["league"]["name"] == "Beta League"
    assert len(detail_payload["members"]) == 2


def test_join_same_league_twice_fails(client: TestClient) -> None:
    owner_token = _register_and_get_token(client, "owner3@example.com", "owner3")
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    league_response = client.post(
        "/api/leagues",
        headers=owner_headers,
        json={"name": "Gamma League", "max_members": 6},
    )
    invite_code = league_response.json()["invite_code"]

    member_token = _register_and_get_token(client, "member2@example.com", "member2")
    member_headers = {"Authorization": f"Bearer {member_token}"}
    first_join = client.post(
        "/api/leagues/join",
        headers=member_headers,
        json={"invite_code": invite_code},
    )
    assert first_join.status_code == 200

    second_join = client.post(
        "/api/leagues/join",
        headers=member_headers,
        json={"invite_code": invite_code},
    )
    assert second_join.status_code == 400
    assert second_join.json()["detail"] == "Already in league"
