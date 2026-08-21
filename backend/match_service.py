"""Server-authoritative, action-only match service.

The first production slice validates classic chess actions with python-chess. Quantum
matches can be created behind the same contract, but action submission stays closed
until the shared TypeScript core adapter is enabled; accepting unchecked quantum
state would violate the authoritative boundary this service establishes.
"""

from __future__ import annotations

import secrets
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import chess


class MatchServiceError(RuntimeError):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


@dataclass
class MatchRecord:
    id: str
    code: str
    ruleset_id: str
    mode: str
    status: str
    players: dict[str, str | None]
    initial_seconds: int
    increment_seconds: int
    remaining: dict[str, float]
    version: int = 0
    events: list[dict[str, Any]] = field(default_factory=list)
    action_ids: dict[str, dict[str, Any]] = field(default_factory=dict)
    board: chess.Board | None = None
    turn_started_monotonic: float = field(default_factory=time.monotonic)
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())


class MatchRepository:
    def __init__(self, *, quantum_actions_enabled: bool = False) -> None:
        self.quantum_actions_enabled = quantum_actions_enabled
        self._matches: dict[str, MatchRecord] = {}
        self._codes: dict[str, str] = {}
        self._lock = threading.RLock()

    def create_or_join(self, actor: str, linked_account: bool, payload: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            join_code = payload.get("joinCode")
            if join_code:
                match_id = self._codes.get(str(join_code).upper())
                if not match_id:
                    raise MatchServiceError(404, "MATCH_NOT_FOUND", "Match code not found")
                match = self._matches[match_id]
                open_color = "w" if match.players["w"] is None else "b" if match.players["b"] is None else None
                if open_color is None and actor not in match.players.values():
                    raise MatchServiceError(409, "MATCH_FULL", "Match already has two players")
                if actor not in match.players.values():
                    match.players[open_color] = actor
                    match.status = "playing"
                    match.turn_started_monotonic = time.monotonic()
                color = "w" if match.players["w"] == actor else "b"
                return self._public_match(match, color)

            ruleset_id = payload["rulesetId"]
            mode = payload["mode"]
            if mode == "competitive":
                if not linked_account:
                    raise MatchServiceError(403, "ACCOUNT_REQUIRED", "Competitive play requires a linked account")
                if ruleset_id != "quantum-coherence":
                    raise MatchServiceError(422, "INVALID_QUEUE", "The first competitive queue uses quantum coherence")
                time_control = payload.get("timeControl") or {}
                if time_control.get("initialSeconds") != 600 or time_control.get("incrementSeconds") != 5:
                    raise MatchServiceError(422, "INVALID_TIME_CONTROL", "Competitive time control is fixed at 10+5")

            color = payload.get("color", "random")
            if color == "random":
                color = "w" if secrets.randbelow(2) == 0 else "b"
            opponent_color = "b" if color == "w" else "w"
            time_control = payload.get("timeControl") or {"initialSeconds": 600, "incrementSeconds": 0}
            initial_seconds = int(time_control.get("initialSeconds", 600))
            increment_seconds = int(time_control.get("incrementSeconds", 0))
            match = MatchRecord(
                id=str(uuid.uuid4()),
                code=self._new_code(),
                ruleset_id=ruleset_id,
                mode=mode,
                status="waiting",
                players={color: actor, opponent_color: None},
                initial_seconds=initial_seconds,
                increment_seconds=increment_seconds,
                remaining={"w": float(initial_seconds), "b": float(initial_seconds)},
                board=chess.Board() if ruleset_id == "classic" else None,
            )
            self._matches[match.id] = match
            self._codes[match.code] = match.id
            return self._public_match(match, color)

    def apply_action(self, match_id: str, actor: str, payload: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            match = self._matches.get(match_id)
            if match is None:
                raise MatchServiceError(404, "MATCH_NOT_FOUND", "Match not found")
            if actor not in match.players.values():
                raise MatchServiceError(403, "NOT_A_PLAYER", "Only players can submit actions")
            action_id = payload["actionId"]
            if action_id in match.action_ids:
                return {**match.action_ids[action_id], "duplicate": True}
            if match.status != "playing":
                raise MatchServiceError(409, "MATCH_NOT_PLAYING", "The match is not active")
            if int(payload["expectedVersion"]) != match.version:
                raise MatchServiceError(409, "STALE_VERSION", f"Expected version {match.version}")

            actor_color = "w" if match.players["w"] == actor else "b"
            expected_color = "w" if match.version % 2 == 0 else "b"
            if actor_color != expected_color:
                raise MatchServiceError(409, "NOT_YOUR_TURN", "It is not this player's turn")

            if match.ruleset_id == "classic":
                self._apply_classic(match, payload["action"])
            elif not self.quantum_actions_enabled:
                raise MatchServiceError(
                    409,
                    "RULESET_NOT_ACTIVE",
                    "Authoritative quantum actions remain behind their release flag",
                )
            else:
                raise MatchServiceError(501, "QUANTUM_CORE_REQUIRED", "Shared quantum core adapter is not installed")

            self._advance_clock(match, actor_color)
            match.version += 1
            event = {
                "version": match.version,
                "actionId": action_id,
                "actorColor": actor_color,
                "action": payload["action"],
                "serverTimestamp": datetime.now(UTC).isoformat(),
                "clocks": {"white": round(match.remaining["w"], 3), "black": round(match.remaining["b"], 3)},
            }
            match.events.append(event)
            match.action_ids[action_id] = event
            return {**event, "duplicate": False}

    def events_after(self, match_id: str, actor: str, after_version: int) -> dict[str, Any]:
        with self._lock:
            match = self._matches.get(match_id)
            if match is None:
                raise MatchServiceError(404, "MATCH_NOT_FOUND", "Match not found")
            if actor not in match.players.values():
                raise MatchServiceError(403, "NOT_A_PLAYER", "Match events are private")
            return {
                "matchId": match.id,
                "currentVersion": match.version,
                "events": [event for event in match.events if event["version"] > after_version],
            }

    def _apply_classic(self, match: MatchRecord, action: dict[str, Any]) -> None:
        if match.board is None:
            raise MatchServiceError(500, "STATE_UNAVAILABLE", "Classic board is unavailable")
        from_square = str(action.get("from", ""))
        to_square = str(action.get("to", ""))
        promotion = str(action.get("promotion", ""))
        uci = f"{from_square}{to_square}{promotion}"
        try:
            move = chess.Move.from_uci(uci)
        except ValueError as exc:
            raise MatchServiceError(422, "ILLEGAL_ACTION", "Malformed chess action") from exc
        if move not in match.board.legal_moves:
            raise MatchServiceError(422, "ILLEGAL_ACTION", "Illegal chess action")
        match.board.push(move)
        if match.board.is_game_over():
            match.status = "finished"

    def _advance_clock(self, match: MatchRecord, actor_color: str) -> None:
        now = time.monotonic()
        elapsed = max(0.0, now - match.turn_started_monotonic)
        match.remaining[actor_color] = max(0.0, match.remaining[actor_color] - elapsed)
        if match.remaining[actor_color] <= 0:
            match.status = "finished"
        else:
            match.remaining[actor_color] += match.increment_seconds
        match.turn_started_monotonic = now

    def _new_code(self) -> str:
        alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        while True:
            code = "".join(secrets.choice(alphabet) for _ in range(6))
            if code not in self._codes:
                return code

    @staticmethod
    def _public_match(match: MatchRecord, player_color: str) -> dict[str, Any]:
        return {
            "id": match.id,
            "code": match.code,
            "rulesetId": match.ruleset_id,
            "mode": match.mode,
            "status": match.status,
            "playerColor": player_color,
            "version": match.version,
            "timeControl": {
                "initialSeconds": match.initial_seconds,
                "incrementSeconds": match.increment_seconds,
            },
        }

