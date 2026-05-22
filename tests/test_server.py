"""Tests del backend FastAPI (CI usa SKIP_STOCKFISH=1)."""

import os

os.environ.setdefault("SKIP_STOCKFISH", "1")

import chess
import pytest
from fastapi.testclient import TestClient

import server
from server import (
    QuantumCastling,
    QuantumPieceInfo,
    QuantumPieceSquare,
    QuantumStatePayload,
    _generate_classical_boards,
    _score_to_eval,
)

START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"


@pytest.fixture
def client():
    with TestClient(server.app) as c:
        yield c


def test_health_without_engine(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "degraded"
    assert data["engine"] is False


def test_eval_invalid_fen(client):
    r = client.post("/api/eval", json={"fen": "not-a-fen"})
    assert r.status_code == 400
    body = r.json()
    assert body["code"] == "BAD_REQUEST"
    assert "error" in body


def test_move_unavailable_without_engine(client):
    r = client.post("/api/move", json={"fen": START_FEN, "difficulty": "medium"})
    assert r.status_code == 503
    assert r.json()["code"] == "ENGINE_UNAVAILABLE"


def test_score_to_eval_centipawns():
    board = chess.Board(START_FEN)
    score = chess.engine.PovScore(chess.engine.Cp(50), chess.WHITE)
    evaluation, mate = _score_to_eval(score)
    assert evaluation == 50.0
    assert mate is None


def test_score_to_eval_mate():
    score = chess.engine.PovScore(chess.engine.Mate(2), chess.WHITE)
    evaluation, mate = _score_to_eval(score)
    assert evaluation == 10000.0
    assert mate == 2


def test_generate_classical_boards_all_classical():
    qs = QuantumStatePayload(
        pieces=[
            QuantumPieceInfo(
                id="wk",
                type="k",
                color="w",
                squares=[QuantumPieceSquare(square="e1", probability=1.0)],
            ),
            QuantumPieceInfo(
                id="bk",
                type="k",
                color="b",
                squares=[QuantumPieceSquare(square="e8", probability=1.0)],
            ),
        ],
        turn="w",
        castling=QuantumCastling(w={"k": False, "q": False}, b={"k": False, "q": False}),
    )
    boards = _generate_classical_boards(qs)
    assert len(boards) == 1
    assert boards[0]["probability"] == pytest.approx(1.0)
    assert "fen" in boards[0]
