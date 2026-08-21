"""Supabase access-token verification for the versioned API.

The Auth `/user` endpoint verifies both current asymmetric tokens and legacy HS256
tokens without putting a signing secret in this service. A short cache avoids a
network round-trip on every action while remaining below normal JWT lifetimes.
"""

from __future__ import annotations

import hashlib
import os
import threading
import time
from dataclasses import dataclass

import httpx


class AuthenticationError(RuntimeError):
    pass


@dataclass(frozen=True)
class VerifiedIdentity:
    user_id: str
    is_anonymous: bool


class SupabaseTokenVerifier:
    def __init__(self) -> None:
        self.base_url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")
        self.cache_seconds = max(15, min(int(os.getenv("AUTH_CACHE_SECONDS", "120")), 300))
        self._cache: dict[str, tuple[float, VerifiedIdentity]] = {}
        self._lock = threading.Lock()

    @property
    def configured(self) -> bool:
        return bool(self.base_url and self.publishable_key)

    def verify(self, token: str) -> VerifiedIdentity:
        if not self.configured:
            raise AuthenticationError("Supabase token verification is not configured")
        fingerprint = hashlib.sha256(token.encode()).hexdigest()
        now = time.monotonic()
        with self._lock:
            cached = self._cache.get(fingerprint)
            if cached and cached[0] > now:
                return cached[1]

        try:
            response = httpx.get(
                f"{self.base_url}/auth/v1/user",
                headers={
                    "apikey": self.publishable_key,
                    "Authorization": f"Bearer {token}",
                },
                timeout=3.0,
            )
        except httpx.HTTPError as exc:
            raise AuthenticationError("Authentication service is unavailable") from exc
        if response.status_code != 200:
            raise AuthenticationError("Invalid or expired access token")
        payload = response.json()
        user_id = payload.get("id")
        if not isinstance(user_id, str) or not user_id:
            raise AuthenticationError("Authentication response has no user id")
        identity = VerifiedIdentity(
            user_id=user_id,
            is_anonymous=bool(payload.get("is_anonymous", False)),
        )
        with self._lock:
            self._cache[fingerprint] = (now + self.cache_seconds, identity)
            if len(self._cache) > 1024:
                self._cache = {
                    key: value for key, value in self._cache.items() if value[0] > now
                }
        return identity


token_verifier = SupabaseTokenVerifier()

