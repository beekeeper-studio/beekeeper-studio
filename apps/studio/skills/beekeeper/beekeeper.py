#!/usr/bin/env python3
"""Helper for the Beekeeper Studio Claude skill.

Reads the local AI-server discovery file produced by Beekeeper Studio and
exposes a small CLI that mirrors the HTTP API. Intended to be invoked by the
skill, but works fine as a standalone tool.

Examples
--------
    beekeeper.py info
    beekeeper.py connections
    beekeeper.py connect 3
    beekeeper.py tables 3 --schema public
    beekeeper.py query 3 --sql "SELECT 1"

The discovery file lives at:
  - macOS:   ~/Library/Application Support/beekeeper-studio/ai-server.json
  - Linux:   ~/.config/beekeeper-studio/ai-server.json
  - Windows: %APPDATA%/beekeeper-studio/ai-server.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


def discovery_path() -> Path:
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "beekeeper-studio" / "ai-server.json"
    if os.name == "nt":
        appdata = os.environ.get("APPDATA")
        if not appdata:
            raise RuntimeError("APPDATA not set")
        return Path(appdata) / "beekeeper-studio" / "ai-server.json"
    xdg = os.environ.get("XDG_CONFIG_HOME") or str(Path.home() / ".config")
    return Path(xdg) / "beekeeper-studio" / "ai-server.json"


def load_discovery() -> dict:
    p = discovery_path()
    if not p.exists():
        raise SystemExit(
            f"Beekeeper AI server discovery file not found at {p}.\n"
            "Open Beekeeper Studio -> Tools -> AI Server and click Start server."
        )
    return json.loads(p.read_text())


def call(method: str, path: str, body: dict | None = None, query: dict | None = None) -> Any:
    disc = load_discovery()
    url = f"http://{disc['host']}:{disc['port']}{path}"
    if query:
        url += "?" + urllib.parse.urlencode({k: v for k, v in query.items() if v is not None})
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if disc.get("requireToken", True):
        token = os.environ.get("BEEKEEPER_AI_SERVER_TOKEN")
        if not token:
            raise SystemExit(
                "Beekeeper AI server requires a token but BEEKEEPER_AI_SERVER_TOKEN is not set.\n"
                "Open Beekeeper Studio -> Tools -> AI Server, copy the token from the Overview tab, then run:\n"
                "  export BEEKEEPER_AI_SERVER_TOKEN=<token>"
            )
        req.add_header("Authorization", f"Bearer {token}")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = resp.read()
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {e.code} {e.reason}: {text}")
    except urllib.error.URLError as e:
        raise SystemExit(f"Could not reach Beekeeper AI server at {url}: {e}")
    if not payload:
        return None
    return json.loads(payload)


def main() -> None:
    parser = argparse.ArgumentParser(description="Beekeeper Studio AI server CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("info")
    sub.add_parser("connections")
    sub.add_parser("queries")

    p_q = sub.add_parser("query"); p_q.add_argument("connection_id", type=int); p_q.add_argument("--sql", required=True); p_q.add_argument("--max-rows", type=int)
    p_c = sub.add_parser("connect"); p_c.add_argument("connection_id", type=int)
    p_d = sub.add_parser("disconnect"); p_d.add_argument("connection_id", type=int)
    p_db = sub.add_parser("databases"); p_db.add_argument("connection_id", type=int)
    p_sc = sub.add_parser("schemas"); p_sc.add_argument("connection_id", type=int); p_sc.add_argument("--database")
    p_t = sub.add_parser("tables"); p_t.add_argument("connection_id", type=int); p_t.add_argument("--schema")
    p_col = sub.add_parser("columns"); p_col.add_argument("connection_id", type=int); p_col.add_argument("table"); p_col.add_argument("--schema")
    p_sa = sub.add_parser("sample"); p_sa.add_argument("connection_id", type=int); p_sa.add_argument("table"); p_sa.add_argument("--schema"); p_sa.add_argument("--limit", type=int, default=20)
    p_log = sub.add_parser("log"); p_log.add_argument("--limit", type=int, default=50)

    args = parser.parse_args()
    cmd = args.cmd
    if cmd == "info":
        out = call("GET", "/v1/server/info")
    elif cmd == "connections":
        out = call("GET", "/v1/connections")
    elif cmd == "queries":
        out = call("GET", "/v1/queries")
    elif cmd == "connect":
        out = call("POST", f"/v1/connections/{args.connection_id}/connect")
    elif cmd == "disconnect":
        out = call("POST", f"/v1/connections/{args.connection_id}/disconnect")
    elif cmd == "databases":
        out = call("GET", f"/v1/connections/{args.connection_id}/databases")
    elif cmd == "schemas":
        out = call("GET", f"/v1/connections/{args.connection_id}/schemas", query={"database": args.database})
    elif cmd == "tables":
        out = call("GET", f"/v1/connections/{args.connection_id}/tables", query={"schema": args.schema})
    elif cmd == "columns":
        out = call("GET", f"/v1/connections/{args.connection_id}/tables/{urllib.parse.quote(args.table)}/columns", query={"schema": args.schema})
    elif cmd == "sample":
        out = call("GET", f"/v1/connections/{args.connection_id}/tables/{urllib.parse.quote(args.table)}/sample", query={"schema": args.schema, "limit": args.limit})
    elif cmd == "query":
        body = {"sql": args.sql}
        if args.max_rows: body["maxRows"] = args.max_rows
        out = call("POST", f"/v1/connections/{args.connection_id}/query", body=body)
    elif cmd == "log":
        out = call("GET", "/v1/log", query={"limit": args.limit})
    else:
        parser.error(f"unknown command {cmd}")
    json.dump(out, sys.stdout, indent=2, default=str)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
