"""Shared CEO email helpers — single source of truth.

Read from `CEO_EMAILS` env var (comma-separated list, lowercased on load).
Falls back to a sensible default so we never accidentally lock out the founder.
"""
import os
from typing import Set

_DEFAULT = ("cassiusflixvault@gmail.com", "cassius@flixvault.com", "cassiusgamergrid@gmail.com")


def ceo_emails() -> Set[str]:
    raw = (os.environ.get("CEO_EMAILS") or "").strip()
    if not raw:
        return set(_DEFAULT)
    parts = [p.strip().lower() for p in raw.split(",") if p.strip()]
    return set(parts) if parts else set(_DEFAULT)


def is_ceo_email(email: str) -> bool:
    return (email or "").lower() in ceo_emails()
