from fastapi.testclient import TestClient


def _register_and_get_token(client: TestClient, email: str, username: str) -> str:
    response = client.post(
        "/api/auth/register",
        json={"email": email, "username": username, "password": "Password123"},
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def test_admin_controls_and_playoff_flow(client: TestClient) -> None:
    owner = _register_and_get_token(client, "p_owner@example.com", "p_owner")
    league = client.post(
        "/api/leagues",
        headers={"Authorization": f"Bearer {owner}"},
        json={"name": "Playoff League", "max_members": 6},
    ).json()

    m2 = _register_and_get_token(client, "p2@example.com", "ply2")
    m3 = _register_and_get_token(client, "p3@example.com", "ply3")
    m4 = _register_and_get_token(client, "p4@example.com", "ply4")

    for token in (m2, m3, m4):
        join = client.post(
            "/api/leagues/join",
            headers={"Authorization": f"Bearer {token}"},
            json={"invite_code": league["invite_code"]},
        )
        assert join.status_code == 200

    season = client.patch(
        f"/api/leagues/{league['id']}/season",
        headers={"Authorization": f"Bearer {owner}"},
        json={"season_status": "regular"},
    )
    assert season.status_code == 200
    assert season.json()["season_status"] == "regular"

    deadline = client.patch(
        f"/api/leagues/{league['id']}/trade-deadline",
        headers={"Authorization": f"Bearer {owner}"},
        json={"trade_deadline": "2026-12-31"},
    )
    assert deadline.status_code == 200

    bracket = client.post(
        f"/api/leagues/{league['id']}/playoffs/generate",
        headers={"Authorization": f"Bearer {owner}"},
    )
    assert bracket.status_code == 201
    matches = bracket.json()["matches"]
    assert len(matches) == 2

    semifinal1 = matches[0]
    semifinal2 = matches[1]

    r1a = client.post(
        f"/api/leagues/{league['id']}/playoffs/matches/{semifinal1['id']}/result",
        headers={"Authorization": f"Bearer {owner}"},
        json={"winner_user_id": semifinal1["home_user_id"]},
    )
    assert r1a.status_code == 200

    r1b = client.post(
        f"/api/leagues/{league['id']}/playoffs/matches/{semifinal2['id']}/result",
        headers={"Authorization": f"Bearer {owner}"},
        json={"winner_user_id": semifinal2["home_user_id"]},
    )
    assert r1b.status_code == 200
    finals_view = r1b.json()
    final_matches = [m for m in finals_view["matches"] if m["round_number"] == 2]
    assert len(final_matches) == 1

    final = final_matches[0]
    final_result = client.post(
        f"/api/leagues/{league['id']}/playoffs/matches/{final['id']}/result",
        headers={"Authorization": f"Bearer {owner}"},
        json={"winner_user_id": final["home_user_id"]},
    )
    assert final_result.status_code == 200
    assert final_result.json()["champion_user_id"] == final["home_user_id"]

    league_detail = client.get(
        f"/api/leagues/{league['id']}",
        headers={"Authorization": f"Bearer {owner}"},
    )
    assert league_detail.status_code == 200
    assert league_detail.json()["league"]["season_status"] == "complete"
