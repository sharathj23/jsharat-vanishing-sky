"""
visitor_log.py — capture the REAL identity of everyone who opens
"The World After Dark".

Identity resolution (first match wins):
  1. ALB / OIDC JWT  -> header 'x-amzn-oidc-data' is a signed JWT whose payload
     carries the authenticated claims (email / username / preferred_username).
     We base64-decode the payload (read-only; signature is verified upstream by
     the load balancer, so decoding here is safe for logging).
  2. 'x-amzn-oidc-identity' (the OIDC subject) or common SSO proxy headers
     (Midway / Harmony / oauth2-proxy style).
  3. Streamlit native auth (st.user.email) when the app uses st.login().
  4. ?viewer=<alias> query param (for tagging share links).
  5. "anonymous".

This gives real names automatically when the app is deployed behind Midway /
an ALB-OIDC listener / Harmony (all of which inject these headers). On a plain
public Streamlit Cloud app there is no SSO, so use native login or ?viewer=.

Writes to logs/visits.csv AND stdout (visible in the host's log console — which
only the owner can see). All wrapped in try/except so it can never break the UI.
"""

from __future__ import annotations
import base64
import csv
import datetime as _dt
import json
import os
import uuid

_LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
_LOG_FILE = os.path.join(_LOG_DIR, "visits.csv")
_FIELDS = ["timestamp_utc", "session_id", "identity", "name", "source", "ip", "user_agent", "referer"]

# SSO / proxy headers that may carry identity (checked in order, case-insensitive)
_IDENTITY_HEADERS = [
    "x-amzn-oidc-identity",     # ALB OIDC subject
    "x-forwarded-user", "x-forwarded-email", "x-forwarded-preferred-username",
    "x-auth-request-user", "x-auth-request-email",
    "x-remote-user", "remote-user",
    "x-midway-user", "x-user-alias", "x-username",
]


def _now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _get_headers(st) -> dict:
    try:
        return {k.lower(): v for k, v in dict(st.context.headers).items()}
    except Exception:
        return {}


def _b64url_decode(seg: str) -> bytes:
    seg += "=" * (-len(seg) % 4)          # pad
    return base64.urlsafe_b64decode(seg)


def _decode_oidc_jwt(token: str):
    """Read-only decode of the JWT payload to pull identity claims. Returns
    (identity, display_name) or (None, None). Signature NOT verified here —
    the ALB verifies it before forwarding; we only read claims for logging."""
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return None, None
        payload = json.loads(_b64url_decode(parts[1]).decode("utf-8", "replace"))
        ident = (payload.get("email") or payload.get("preferred_username")
                 or payload.get("username") or payload.get("sub"))
        name = payload.get("name") or payload.get("given_name") or ""
        return ident, name
    except Exception:
        return None, None


def _resolve_identity(st, headers: dict):
    """Return (identity, display_name, source)."""
    # 1) ALB/OIDC signed JWT
    if "x-amzn-oidc-data" in headers:
        ident, name = _decode_oidc_jwt(headers["x-amzn-oidc-data"])
        if ident:
            return ident, name, "oidc-jwt"
    # 2) plain SSO/proxy identity headers
    for h in _IDENTITY_HEADERS:
        if headers.get(h):
            return headers[h], "", f"header:{h}"
    # 3) Streamlit native auth
    for attr in ("user", "experimental_user"):
        try:
            u = getattr(st, attr)
            email = getattr(u, "email", None) or (u.get("email") if hasattr(u, "get") else None)
            if email:
                name = getattr(u, "name", "") or ""
                return email, name, "streamlit-auth"
        except Exception:
            pass
    # 4) ?viewer= query param
    try:
        viewer = st.query_params.get("viewer")
        if viewer:
            return viewer, "", "query"
    except Exception:
        pass
    return "anonymous", "", "none"


def _write_row(row: dict):
    os.makedirs(_LOG_DIR, exist_ok=True)
    new = not os.path.exists(_LOG_FILE)
    with open(_LOG_FILE, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=_FIELDS)
        if new:
            w.writeheader()
        w.writerow(row)


def resolve_current_identity(st):
    """Return just the identity string for the current request (no logging)."""
    try:
        return _resolve_identity(st, _get_headers(st))[0]
    except Exception:
        return "anonymous"


def log_visit(st) -> dict:
    """Call once per session. Returns the row that was logged."""
    try:
        if st.session_state.get("_visit_logged"):
            return st.session_state.get("_visit_row", {})

        headers = _get_headers(st)
        identity, name, source = _resolve_identity(st, headers)
        ip = (headers.get("x-forwarded-for", "").split(",")[0].strip()
              or headers.get("x-real-ip", "") or "unknown")

        row = {
            "timestamp_utc": _now(),
            "session_id": uuid.uuid4().hex[:12],
            "identity": identity,
            "name": name,
            "source": source,
            "ip": ip,
            "user_agent": headers.get("user-agent", "unknown")[:300],
            "referer": headers.get("referer", ""),
        }
        _write_row(row)
        print(f"[VISIT] {row['timestamp_utc']} identity={row['identity']} "
              f"name={row['name']!r} ({row['source']}) ip={row['ip']}", flush=True)

        st.session_state["_visit_logged"] = True
        st.session_state["_visit_row"] = row
        return row
    except Exception as e:
        print(f"[VISIT] logging error: {e}", flush=True)
        return {}


def read_recent(limit: int = 200):
    """Most recent visit rows, newest first."""
    try:
        if not os.path.exists(_LOG_FILE):
            return []
        with open(_LOG_FILE, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        return rows[-limit:][::-1]
    except Exception:
        return []
