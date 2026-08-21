"""Contract tests for the versioned local-first API."""

import os
import uuid
from datetime import UTC, datetime, timedelta

os.environ.setdefault("SKIP_STOCKFISH", "1")

import pytest
from fastapi.testclient import TestClient

import server
from backend.api_v1 import academy_repository


@pytest.fixture
def client():
    academy_repository.reset()
    with TestClient(server.app) as test_client:
        yield test_client


def guest_headers(guest_id: str = "guest_contract_123") -> dict[str, str]:
    return {"X-Guest-Id": guest_id}


def attempt_event(guest_id: str = "guest_contract_123") -> dict:
    started = datetime.now(UTC) - timedelta(minutes=2)
    return {
        "id": str(uuid.uuid4()),
        "guestId": guest_id,
        "lessonId": "classic-board-lesson",
        "contentVersion": "2026.1",
        "startedAt": started.isoformat(),
        "completedAt": datetime.now(UTC).isoformat(),
        "answerIndex": 0,
        "correct": True,
        "hintsUsed": 0,
        "actionsTaken": 1,
        "score": 100,
        "validatedOnline": False,
    }


def test_progress_sync_is_idempotent_and_recalculates_mastery(client):
    event = attempt_event()
    payload = {"course": "classic", "events": [event]}

    first = client.post("/api/v1/progress/sync", json=payload, headers=guest_headers())
    assert first.status_code == 200
    assert first.json()["acceptedEventIds"] == [event["id"]]
    assert first.json()["mastery"]["classic.board"]["mastery"] == 30.0

    duplicate = client.post("/api/v1/progress/sync", json=payload, headers=guest_headers())
    assert duplicate.status_code == 200
    assert duplicate.json()["acceptedEventIds"] == []
    assert duplicate.json()["duplicateEventIds"] == [event["id"]]
    assert duplicate.json()["mastery"]["classic.board"]["attempts"] == 1


def test_guest_cannot_sync_another_guest_event(client):
    response = client.post(
        "/api/v1/progress/sync",
        json={"events": [attempt_event("different_guest_123")]},
        headers=guest_headers(),
    )
    assert response.status_code == 403
    assert response.json()["code"] == "EVENT_OWNERSHIP_MISMATCH"


def test_daily_challenge_is_shared_and_attempt_is_scored_server_side(client):
    first = client.get("/api/v1/daily/2026-08-11?course=quantum")
    second = client.get("/api/v1/daily/2026-08-11?course=quantum")
    assert first.status_code == 200
    assert first.json() == second.json()

    attempt = {
        "attemptId": str(uuid.uuid4()),
        "lessonId": first.json()["lessonId"],
        "answerIndex": 1,
        "hintsUsed": 0,
        "actionsTaken": 1,
        "durationMs": 12000,
    }
    submitted = client.post(
        "/api/v1/daily/2026-08-11/attempts",
        json=attempt,
        headers=guest_headers(),
    )
    assert submitted.status_code == 200
    assert submitted.json()["validatedOnline"] is True
    assert submitted.json()["score"] == 100


def test_profile_export_and_delete_are_scoped_to_actor(client):
    event = attempt_event()
    client.post(
        "/api/v1/progress/sync",
        json={"events": [event]},
        headers=guest_headers(),
    )
    exported = client.get("/api/v1/profile/export", headers=guest_headers())
    assert exported.status_code == 200
    assert len(exported.json()["progressEvents"]) == 1

    deleted = client.delete("/api/v1/profile", headers=guest_headers())
    assert deleted.status_code == 204
    after = client.get("/api/v1/profile/export", headers=guest_headers())
    assert after.json()["progressEvents"] == []


def test_classic_match_accepts_actions_not_snapshots(client):
    creator = guest_headers("guest_white_player")
    opponent = guest_headers("guest_black_player")
    create_payload = {
        "rulesetId": "classic",
        "mode": "casual",
        "color": "w",
        "timeControl": {"initialSeconds": 600, "incrementSeconds": 0},
    }
    created = client.post("/api/v1/matches", json=create_payload, headers=creator)
    assert created.status_code == 200
    match = created.json()

    joined = client.post(
        "/api/v1/matches",
        json={**create_payload, "joinCode": match["code"]},
        headers=opponent,
    )
    assert joined.status_code == 200
    assert joined.json()["playerColor"] == "b"

    action_id = str(uuid.uuid4())
    move = {
        "actionId": action_id,
        "expectedVersion": 0,
        "action": {"from": "e2", "to": "e4"},
        "clientTimestamp": datetime.now(UTC).isoformat(),
    }
    applied = client.post(f"/api/v1/matches/{match['id']}/actions", json=move, headers=creator)
    assert applied.status_code == 200
    assert applied.json()["version"] == 1

    duplicate = client.post(f"/api/v1/matches/{match['id']}/actions", json=move, headers=creator)
    assert duplicate.status_code == 200
    assert duplicate.json()["duplicate"] is True

    events = client.get(
        f"/api/v1/matches/{match['id']}/events?afterVersion=0",
        headers=opponent,
    )
    assert events.status_code == 200
    assert events.json()["events"][0]["action"] == {"from": "e2", "to": "e4"}
    assert "state" not in events.json()["events"][0]


def test_competitive_queue_requires_linked_account(client):
    response = client.post(
        "/api/v1/matches",
        json={
            "rulesetId": "quantum-coherence",
            "mode": "competitive",
            "color": "random",
            "timeControl": {"initialSeconds": 600, "incrementSeconds": 5},
        },
        headers=guest_headers(),
    )
    assert response.status_code == 403
    assert response.json()["code"] == "ACCOUNT_REQUIRED"


def test_quantum_coach_is_deterministic_without_a_generative_model(client):
    payload = {
        "rulesetId": "quantum-coherence",
        "seed": "shared-seed",
        "legalActions": [
            {"action": {"kind": "quantum", "pieceId": "wn1"}, "evaluation": 12, "probability": 0.5},
            {"action": {"kind": "classical", "pieceId": "wp1"}, "evaluation": 20, "probability": 1},
        ],
    }
    first = client.post("/api/v1/coach/evaluate", json=payload, headers=guest_headers())
    second = client.post("/api/v1/coach/evaluate", json=payload, headers=guest_headers())
    assert first.status_code == 200
    assert first.json() == second.json()
    assert first.json()["candidates"][0]["score"] == 20


def test_finished_replays_require_account_and_are_idempotent(client, monkeypatch):
    replay_id = str(uuid.uuid4())
    replay = {
        "schemaVersion": 1,
        "id": replay_id,
        "createdAt": datetime.now(UTC).isoformat(),
        "rulesetId": "classic",
        "opponentMode": "local",
        "result": {"result": "draw"},
        "actions": [
            {"kind": "classic", "from": "e2", "to": "e4", "san": "e4"},
        ],
    }

    guest = client.post(
        "/api/v1/replays/sync",
        json={"replays": [replay]},
        headers=guest_headers(),
    )
    assert guest.status_code == 403

    monkeypatch.setenv("TRUST_AUTH_PROXY", "1")
    linked_headers = {"X-Profile-Id": str(uuid.uuid4())}
    first = client.post(
        "/api/v1/replays/sync",
        json={"replays": [replay]},
        headers=linked_headers,
    )
    assert first.status_code == 200
    assert first.json()["acceptedReplayIds"] == [replay_id]

    duplicate = client.post(
        "/api/v1/replays/sync",
        json={"replays": [replay]},
        headers=linked_headers,
    )
    assert duplicate.status_code == 200
    assert duplicate.json()["duplicateReplayIds"] == [replay_id]

    exported = client.get("/api/v1/profile/export", headers=linked_headers)
    assert exported.status_code == 200
    assert exported.json()["finishedReplays"][0]["actions"][0].get("description") is None


def test_analytics_is_opt_in_and_rejects_board_state(client):
    payload = {
        "id": str(uuid.uuid4()),
        "consent": True,
        "anonymousSessionId": str(uuid.uuid4()),
        "route": "classic",
        "lessonId": "classic-board-lesson",
        "concept": "classic.board",
        "durationMs": 32000,
        "score": 85,
        "hintLevel": 1,
    }
    accepted = client.post("/api/v1/analytics/events", json=payload)
    assert accepted.status_code == 202
    assert accepted.json()["accepted"] is True

    missing_consent = client.post(
        "/api/v1/analytics/events",
        json={key: value for key, value in payload.items() if key != "consent"},
    )
    assert missing_consent.status_code == 422

    invasive = client.post(
        "/api/v1/analytics/events",
        json={**payload, "id": str(uuid.uuid4()), "boardState": {"fen": "private"}},
    )
    assert invasive.status_code == 422
