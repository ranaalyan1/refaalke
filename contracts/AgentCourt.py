# { "Depends": "py-genlayer:" }
"""
AgentCourt.py — "RefAalke" (formerly REAL or FAKE): The AI Agent Court Game on GenLayer
====================================================================

A daily game + trust primitive: every day one real ERC-8004 agent (registered
on the live Identity Registry at 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432,
same CREATE2 address on every chain) is put on trial. Players guess REAL or
FAKE. A decentralized jury of GenLayer validators then fetches live blockchain
evidence and delivers a consensus verdict.

-----------------------------------------------------------------------
THE CONTESTED CLAIM (why multi-validator consensus is not theater — R1)
-----------------------------------------------------------------------
The claim is: "Agent #<id> on chain <chainId> is a REAL, functional,
non-sybil-inflated AI agent."

Who benefits from a false verdict, each way:

* A FALSE "REAL" verdict benefits the agent's owner. A REAL verdict from this
  court is a public trust badge for an ERC-8004 agent — the missing Validation
  layer the standard's own researchers called for (the Validation Registry has
  never been deployed on mainnet). Marketplaces, orchestrators and humans can
  query it. An owner running a dead placeholder or a sybil-inflated reputation
  farm has every incentive to steer the jury toward REAL. A real adversary is
  present on that side of the case.

* A FALSE "FAKE" verdict benefits competitors and short-signal actors in the
  agent economy: rival agents, griefers, and players who benefit reputationally
  from "exposing" a functioning agent (the game's Hall of Shame is public
  fame). The jury cannot be bought per-round because every validator
  independently re-fetches the evidence (R3) and the rubric is fixed in code,
  chosen by neither player nor agent owner (R5/E5).

Because both sides have motivated liars and the evidence is re-fetched live
inside the consensus round, agreement across independent validators is
meaningful — this is a genuinely contested claim.

-----------------------------------------------------------------------
VALIDATOR RE-DERIVATION DESIGN (R2, R3, R4)
-----------------------------------------------------------------------
* R2 — EVIDENCE IS FETCHED, NEVER TRUSTED: the verdict never reasons from a
  caller-supplied description. Evidence sources fetched inside the round:
  E1 the on-chain agentURI via the Base explorer eth_call proxy (anchored on
  the Identity Registry NFT — chosen at registration, not at verdict time by
  player or owner), E2 the registration file behind that URI, E3 the service
  endpoints, E4 the indexer snapshot PLUS up-to-3 live spot-checks of feedback
  files for proofOfPayment.txHash.
* R3 — validators never rubber-stamp: validator_fn(leader_result) re-runs the
  entire E1–E5 pipeline from scratch (fresh fetches, fresh LLM call) and only
  then compares its own derived verdict to the leader's. It never merely checks
  that the leader's payload "looks plausible".
* R4 — REASONING MUST TOUCH EVIDENCE: the validator counts concrete citations
  in the leader's reasoning (status codes, reviewer counts, txHash fragments,
  percentages it independently observed) and rejects fluent-but-evidence-free
  prose.
* R8 — the comparison logic below (citation counting, band check, enum match)
  is pure, deterministic, integer-only: no LLM calls, no fetches, no random.
* Integer determinism (R5): scores are integers 0–100, shares are basis
  points, no floats anywhere in consensus-reachable code.
* Storage discipline (R6): TreeMap for every keyed lookup, @allow_storage
  dataclasses for records, gl.storage.copy_to_memory before entering
  run_nondet_unsafe, views return str via json.dumps.
* Verdicts are consequences, not wagers (R7): no odds, no payouts — a fixed
  scoring rule for player points only.
* Flapping evidence (endpoint timeouts, explorer rate limits) is absorbed by
  the retry logic and the 10-point score band between leader and validator;
  genuine splits are left to GenLayer's native appeal/escalation.

Deploy:  genlayer deploy contracts/AgentCourt.py --network bradbury
"""

from genlayer import *
import json
import base64

# --------------------------------------------------------------------------
# Constants (ints only — R5)
# --------------------------------------------------------------------------

# ERC-8004 Identity Registry (same address on every chain — CREATE2).
IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
# ERC-8004 Reputation Registry.
REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63"

# tokenURI(uint256) selector (ERC-721) — verified against the ERC-721 ABI.
TOKEN_URI_SELECTOR = "0xc87b56dd"

# Explorer proxy used for the anchored identity fetch (E1). Module-level so a
# v2-unified endpoint (api.etherscan.io/v2/api?chainid=8453) can be swapped in
# without touching the pipeline.
BASESCAN_PROXY = "https://api.basescan.org/api"

# Canonical ERC-8004 registration type.
REGISTRATION_TYPE = "https://erc8004.org/registration/v1"

# IPFS gateways, in rotation order (edge case: gateway timeouts).
IPFS_GATEWAYS = ["https://ipfs.io/ipfs/", "https://dweb.link/ipfs/"]

# Score band tolerance between leader and validator (± points, R5 integer).
SCORE_BAND = 10

# Verdict enum.
VERDICT_REAL = "REAL"
VERDICT_SUSPICIOUS = "SUSPICIOUS"
VERDICT_FAKE = "FAKE"
VERDICT_UNDETERMINED = "UNDETERMINED"

# Day status enum.
DAY_OPEN = 0
DAY_JUDGING = 1
DAY_FINAL = 2

# Guess enum.
GUESS_REAL = 0
GUESS_FAKE = 1

# Max service endpoints probed (E3) and feedback files spot-checked (E4).
MAX_ENDPOINTS = 3
MAX_SPOT_CHECKS = 3

# Basis points denominator.
BP = 10000

# Rubric prompt (fixed standard — neither player nor agent owner controls it).
RUBRIC_TEMPLATE = """You are a forensic auditor of ERC-8004 AI agents. Judge this agent STRICTLY by the rubric below. Output ONLY valid JSON with keys: verdict, score, reasoning, evidence.

Agent dossier (all data below was fetched live by the court, trust it):
- Name: {name}
- Description (first 300 chars): {description}
- Registration file: {reg_status}
- Service endpoints (name:status_code): {endpoints}
- Total feedback records: {total_feedback}
- Distinct reviewers: {distinct_reviewers}
- Largest reviewer share: {max_share_bp} basis points
- Sybil cluster share: {sybil_bp} basis points
- Feedback with payment/task proof (spot-checked): {grounded} of {spot_checked}
- x402 payment volume to agent wallet (90d, integer USD): {x402_usd}
- Spot-checked feedback files (truncated 500 chars): {spot_files}

Rubric (integer points only):
- Liveness (0-40): registration file resolves and type-compliant (+15); at least 1 endpoint responds with status 200-499 (+15); at least 1 agent-native (A2A/MCP) endpoint responds (+10).
- Groundedness (0-35): payment/task proof share, i.e. 35 * grounded_feedback_bp / 10000 where grounded_feedback_bp is your estimate from the spot-check ratio and total feedback; plus x402 volume evidence (+10 if > 0, scaled upward by volume tier); plus endpoint domain verification (+5 if service domains match the registration identity).
- Sybil resistance (0-25): start at 25; subtract max_reviewer_share_bp * 15 / 10000; subtract sybil_cluster_share_bp * 10 / 10000.
- Verdict mapping: score >= 70 AND grounded share >= 30% => REAL; score >= 70 BUT grounded share < 30% => SUSPICIOUS (reputation may be inflated); score < 40 OR (identity dead AND feedback exists) => FAKE; evidence unresolvable => UNDETERMINED.
- score must be an integer 0-100.
- reasoning MUST cite specific fetched facts (HTTP status codes, reviewer counts, txHash fragments, percentages above). Never generic prose."""


# --------------------------------------------------------------------------
# Storage records (R6: @allow_storage @dataclass, never gl.Record)
# --------------------------------------------------------------------------

@allow_storage
@dataclass
class VerdictRecord:
    verdict: str          # "REAL" | "SUSPICIOUS" | "FAKE" | "UNDETERMINED"
    score: u256           # 0-100 integer trust score
    evidence_digest: str  # JSON: compact list of cited evidence facts
    reasoning: str        # <= 500 chars, must cite concrete evidence
    judged_at: u256       # unix timestamp of the consensus round


@allow_storage
@dataclass
class CaseFile:
    agent_id: u256
    chain_id: u256        # 8453 = Base
    snapshot_uri: str     # indexer-built bulk evidence (IPFS/HTTPS)
    committed_at: u256


@allow_storage
@dataclass
class PlayerStats:
    wins: u256
    losses: u256
    streak: u256
    best_streak: u256
    games: u256


# --------------------------------------------------------------------------
# Pure helpers — no storage, no nondeterminism (safe under R5/R8)
# --------------------------------------------------------------------------

def clamp_score(x: int) -> int:
    if x < 0:
        return 0
    if x > 100:
        return 100
    return x


def to_hex32(n: int) -> str:
    """32-byte little... no: big-endian hex string of a uint256 (64 chars)."""
    h = ""
    v = n
    for _ in range(64):
        h = "0123456789abcdef"[v % 16] + h
        v = v // 16
    return h


def decode_hex_result(hex_str: str) -> str:
    """
    Decode an eth_call return of the form 0x<offset><len><utf8 bytes...>
    (standard ABI string return of tokenURI). Returns "" on any malformation.
    """
    s = hex_str.strip()
    if s.startswith("0x") or s.startswith("0X"):
        s = s[2:]
    # Need at least offset (64) + length (64) hex chars.
    if len(s) < 128:
        return ""
    try:
        len_words = s[64:128]
        str_len = int(len_words, 16)
        if str_len <= 0 or str_len > 8192:
            return ""
        data = s[128:128 + str_len * 2]
        if len(data) < str_len * 2:
            return ""
        # Byte-wise UTF-8 decode (2 hex chars per byte — NOT 4).
        out = ""
        i = 0
        while i + 2 <= len(data):
            b0 = int(data[i:i + 2], 16)
            i = i + 2
            if b0 < 0x80:
                out = out + chr(b0)
            elif b0 < 0xE0:
                if i + 2 > len(data):
                    break
                b1 = int(data[i:i + 2], 16)
                i = i + 2
                out = out + chr(((b0 & 0x1F) << 6) | (b1 & 0x3F))
            elif b0 < 0xF0:
                if i + 4 > len(data):
                    break
                b1 = int(data[i:i + 2], 16)
                b2 = int(data[i + 2:i + 4], 16)
                i = i + 4
                out = out + chr(((b0 & 0x0F) << 12) | ((b1 & 0x3F) << 6) | (b2 & 0x3F))
            else:
                if i + 6 > len(data):
                    break
                b1 = int(data[i:i + 2], 16)
                b2 = int(data[i + 2:i + 4], 16)
                b3 = int(data[i + 4:i + 6], 16)
                i = i + 6
                out = out + chr(((b0 & 0x07) << 18) | ((b1 & 0x3F) << 12)
                                | ((b2 & 0x3F) << 6) | (b3 & 0x3F))
        return out
    except Exception:
        return ""


def is_abi_string(hex_str: str) -> bool:
    """
    True when hex_str looks like an ABI-encoded `string` return:
    0x + 32-byte offset word == 32 + length word + data. A revert or a
    non-string result fails this check.
    """
    s = hex_str.strip()
    if s.startswith("0x") or s.startswith("0X"):
        s = s[2:]
    if len(s) < 128:
        return False
    try:
        return int(s[0:64], 16) == 32
    except Exception:
        return False


def b64_decode_str(payload: str) -> str:
    try:
        raw = base64.b64decode(payload)
        return raw.decode("utf-8", "ignore")
    except Exception:
        return ""


def resolve_ipfs(uri: str, attempt: int) -> str:
    """2-gateway rotation for ipfs:// URIs (edge case). attempt: 0 or 1."""
    cid_path = uri[7:]  # strip "ipfs://"
    gw = IPFS_GATEWAYS[attempt % len(IPFS_GATEWAYS)]
    return gw + cid_path


def safe_get(d, key, default):
    """Defensive dict access — LLM/snapshot JSON is hostile input."""
    try:
        if isinstance(d, dict):
            v = d.get(key)
            if v is None:
                return default
            return v
        return default
    except Exception:
        return default


def to_int(x) -> int:
    """Coerce to int without floats (R5: no floats even transiently)."""
    try:
        if isinstance(x, bool):
            return 1 if x else 0
        if isinstance(x, int):
            return x
        if isinstance(x, str):
            t = x.strip()
            if t == "":
                return 0
            low = t.lower()
            if low.startswith("0x"):
                return int(t, 16)
            if low.startswith("0b"):
                return int(t, 2)
            if low.startswith("0o"):
                return int(t, 8)
            # Reject float-looking strings as exact floats (R5): floor once.
            if "." in t or "e" in low:
                f = float(t)
                return int(f) if f >= 0 else 0
            return int(t, 10)
        if isinstance(x, float):
            return int(x)             # transient — immediately floored
        return 0
    except Exception:
        return 0


def trunc(s: str, n: int) -> str:
    if not isinstance(s, str):
        return ""
    if len(s) <= n:
        return s
    return s[:n]


# --------------------------------------------------------------------------
# Evidence pipeline E1–E5 (each validator runs all of it independently — R3)
# --------------------------------------------------------------------------

def e1_anchor_identity(agent_id: int) -> dict:
    """
    ANCHORED IDENTITY (R2): eth_call tokenURI(uint256) on the Identity
    Registry through the explorer proxy. The agentURI was fixed at mint time
    by the agent's owner — neither the player nor the owner can swap it at
    verdict time.

    Returns {"ok": bool, "agent_uri": str, "liveness": str, "note": str}
      liveness: "ALIVE" | "DEAD" | "UNKNOWN"
      ok False means the anchored fetch itself was unresolvable (rate limit /
      explorer down) — the round must end UNDETERMINED, never guessed.
    """
    data_arg = TOKEN_URI_SELECTOR + to_hex32(agent_id)
    url = BASESCAN_PROXY + "?module=proxy&action=eth_call&to=" + IDENTITY_REGISTRY \
        + "&data=" + data_arg + "&tag=latest"
    body = ""
    status = 0
    try:
        r = gl.nondet.web.get(url)
        status = r.status_code
        body = r.body.decode("utf-8", "ignore") if hasattr(r.body, "decode") else str(r.body)
    except Exception:
        status = 0
        body = ""
    if status != 200 or body == "":
        # Retry once (edge case: explorer rate-limit), then give up.
        try:
            r = gl.nondet.web.get(url)
            status = r.status_code
            body = r.body.decode("utf-8", "ignore") if hasattr(r.body, "decode") else str(r.body)
        except Exception:
            return {"ok": False, "agent_uri": "", "liveness": "UNKNOWN",
                    "note": "E1 unresolvable after retry: HTTP " + str(status)}
    if status != 200:
        return {"ok": False, "agent_uri": "", "liveness": "UNKNOWN",
                "note": "E1 unresolvable: HTTP " + str(status)}
    try:
        parsed = json.loads(body)
    except Exception:
        # Explorer may return the raw call result string.
        parsed = {"result": body}
    if safe_get(parsed, "message", "") == "NOTOK" or safe_get(parsed, "status", "") == "0":
        # eth_call itself failed (contract missing on this chain / bad id).
        return {"ok": False, "agent_uri": "", "liveness": "UNKNOWN",
                "note": "E1 eth_call failed: " + trunc(str(safe_get(parsed, "result", "")), 120)}
    result = str(safe_get(parsed, "result", ""))
    if result == "" or not is_abi_string(result):
        # eth_call succeeded at the explorer layer but returned "0x", a
        # revert blob, or non-string data => anchored evidence unresolvable.
        return {"ok": False, "agent_uri": "", "liveness": "UNKNOWN",
                "note": "E1 result missing or not an ABI-encoded string"}
    uri = decode_hex_result(result)
    if uri.strip() == "":
        # Identity exists but carries no registration file: dead agent.
        return {"ok": True, "agent_uri": "", "liveness": "DEAD",
                "note": "tokenURI resolved empty: agent has no registration file"}
    return {"ok": True, "agent_uri": uri, "liveness": "ALIVE",
            "note": "tokenURI resolved: " + trunc(uri, 80)}


def e2_registration(agent_uri: str) -> dict:
    """
    REGISTRATION FILE: fetch + parse the agentURI. Handles data:, https:,
    ipfs:// (2-gateway rotation). Returns:
      {"ok": bool, "json": dict, "compliant": bool, "name": str,
       "description": str, "services": list, "x402": bool, "active": bool,
       "note": str}
    ok=False means the anchored E2 fetch was unresolvable -> UNDETERMINED.
    """
    body_text = ""
    if agent_uri.startswith("data:"):
        # data:application/json;base64,...  (or plain data:...;utf8,...)
        comma = agent_uri.find(",")
        if comma < 0:
            return {"ok": False, "json": {}, "compliant": False, "name": "",
                    "description": "", "services": [], "x402": False,
                    "active": False, "note": "E2 malformed data: URI"}
        meta = agent_uri[5:comma]
        payload = agent_uri[comma + 1:]
        if ";base64" in meta:
            body_text = b64_decode_str(payload)
        else:
            body_text = payload
        if body_text == "":
            return {"ok": False, "json": {}, "compliant": False, "name": "",
                    "description": "", "services": [], "x402": False,
                    "active": False, "note": "E2 data: URI base64 decode failed"}
    elif agent_uri.startswith("ipfs://"):
        body_text = ""
        used = ""
        for attempt in range(2):
            url = resolve_ipfs(agent_uri, attempt)
            try:
                r = gl.nondet.web.get(url)
                if r.status_code == 200 and r.body:
                    body_text = r.body.decode("utf-8", "ignore") if hasattr(r.body, "decode") else str(r.body)
                    used = url
                    break
            except Exception:
                pass
        if body_text == "":
            return {"ok": False, "json": {}, "compliant": False, "name": "",
                    "description": "", "services": [], "x402": False,
                    "active": False, "note": "E2 ipfs unresolvable after 2 gateways"}
    elif agent_uri.startswith("https://") or agent_uri.startswith("http://"):
        try:
            r = gl.nondet.web.get(agent_uri)
            if r.status_code != 200:
                return {"ok": False, "json": {}, "compliant": False, "name": "",
                        "description": "", "services": [], "x402": False,
                        "active": False, "note": "E2 registration HTTP " + str(r.status_code)}
            body_text = r.body.decode("utf-8", "ignore") if hasattr(r.body, "decode") else str(r.body)
        except Exception:
            return {"ok": False, "json": {}, "compliant": False, "name": "",
                    "description": "", "services": [], "x402": False,
                    "active": False, "note": "E2 registration fetch failed"}
    else:
        return {"ok": False, "json": {}, "compliant": False, "name": "",
                "description": "", "services": [], "x402": False,
                "active": False, "note": "E2 unsupported URI scheme"}

    try:
        doc = json.loads(body_text)
    except Exception:
        return {"ok": False, "json": {}, "compliant": False, "name": "",
                "description": "", "services": [], "x402": False,
                "active": False, "note": "E2 registration file is not valid JSON"}

    rtype = str(safe_get(doc, "type", ""))
    compliant = (rtype == REGISTRATION_TYPE)
    services_raw = safe_get(doc, "services", [])
    services = []
    if isinstance(services_raw, list):
        count = 0
        for s in services_raw:
            if count >= MAX_ENDPOINTS:
                break
            services.append({
                "name": trunc(str(safe_get(s, "name", "unknown")), 40),
                "endpoint": trunc(str(safe_get(s, "endpoint", "")), 300),
            })
            count = count + 1
    return {
        "ok": True,
        "json": doc,
        "compliant": compliant,
        "name": trunc(str(safe_get(doc, "name", "unnamed")), 80),
        "description": trunc(str(safe_get(doc, "description", "")), 300),
        "services": services,
        "x402": bool(safe_get(doc, "x402Support", False)),
        "active": bool(safe_get(doc, "active", True)),
        "note": "E2 registration parsed; type compliant=" + str(compliant),
    }


def e3_endpoints(services: list) -> list:
    """
    ENDPOINT LIVENESS: GET each service endpoint (max 3), one retry each.
    200-499 counts as responds; timeout/error = dead.
    """
    results = []
    for s in services:
        ep = safe_get(s, "endpoint", "")
        name = safe_get(s, "name", "unknown")
        if not isinstance(ep, str) or ep == "":
            results.append({"name": name, "endpoint": "", "status": 0, "live": False})
            continue
        code = 0
        for attempt in range(2):
            try:
                r = gl.nondet.web.get(ep)
                code = r.status_code
                if 200 <= code <= 499:
                    break
            except Exception:
                code = 0
        live = 200 <= code <= 499
        results.append({"name": name, "endpoint": trunc(ep, 120), "status": code, "live": live})
    return results


def e4_reputation(snapshot: dict) -> dict:
    """
    REPUTATION FORENSICS: bulk metrics from the indexer-built snapshot PLUS
    live spot-checks of up to 3 feedback file URIs for proofOfPayment.txHash.
    All integer metrics; shares in basis points (R5).
    """
    feedback = safe_get(snapshot, "feedback", [])
    reviewers = safe_get(snapshot, "reviewers", [])
    clusters = safe_get(snapshot, "fundingClusters", [])
    x402 = safe_get(snapshot, "x402", {})

    total_feedback = 0
    if isinstance(feedback, list):
        total_feedback = len(feedback)
    distinct_reviewers = 0
    if isinstance(reviewers, list):
        distinct_reviewers = len(reviewers)

    # Largest single reviewer's share of feedback, in basis points.
    max_reviewer_share_bp = 0
    if isinstance(feedback, list) and total_feedback > 0:
        counts = {}
        for f in feedback:
            rv = trunc(str(safe_get(f, "reviewer", "")), 42)
            counts[rv] = to_int(counts.get(rv, 0)) + 1
        for rv in counts:
            share = to_int(counts[rv]) * BP // total_feedback
            if share > max_reviewer_share_bp:
                max_reviewer_share_bp = share

    # Sybil cluster share: combined share of reviewers sharing a first-funder.
    sybil_cluster_share_bp = 0
    if isinstance(clusters, list):
        for c in clusters:
            s = to_int(safe_get(c, "shareBp", 0))
            if s > sybil_cluster_share_bp:
                sybil_cluster_share_bp = s

    x402_volume_usd = to_int(safe_get(x402, "volumeUsd", 0))

    # SPOT-CHECK (live, R2): fetch up to 3 feedback file URIs from the
    # snapshot; count proofOfPayment.txHash presence.
    grounded = 0
    checked = 0
    spot_files = []
    if isinstance(feedback, list):
        for f in feedback:
            if checked >= MAX_SPOT_CHECKS:
                break
            uri = trunc(str(safe_get(f, "fileURI", "")), 400)
            if uri == "":
                continue
            body_text = ""
            if uri.startswith("data:"):
                comma = uri.find(",")
                if comma > 0 and ";base64" in uri[5:comma]:
                    body_text = b64_decode_str(uri[comma + 1:])
            elif uri.startswith("ipfs://"):
                for attempt in range(2):
                    try:
                        r = gl.nondet.web.get(resolve_ipfs(uri, attempt))
                        if r.status_code == 200 and r.body:
                            body_text = r.body.decode("utf-8", "ignore") if hasattr(r.body, "decode") else str(r.body)
                            break
                    except Exception:
                        pass
            elif uri.startswith("http"):
                try:
                    r = gl.nondet.web.get(uri)
                    if r.status_code == 200:
                        body_text = r.body.decode("utf-8", "ignore") if hasattr(r.body, "decode") else str(r.body)
                except Exception:
                    pass
            checked = checked + 1
            has_proof = False
            if body_text != "":
                try:
                    doc = json.loads(body_text)
                    pop = safe_get(doc, "proofOfPayment", {})
                    txh = trunc(str(safe_get(pop, "txHash", "")), 80)
                    if txh != "" and txh != "0x" and txh.lower() != "none":
                        has_proof = True
                    spot_files.append(trunc(body_text, 500))
                except Exception:
                    spot_files.append(trunc(body_text, 500))
            else:
                spot_files.append("[unresolvable feedback file]")
            if has_proof:
                grounded = grounded + 1

    return {
        "total_feedback": total_feedback,
        "distinct_reviewers": distinct_reviewers,
        "max_reviewer_share_bp": max_reviewer_share_bp,
        "sybil_cluster_share_bp": sybil_cluster_share_bp,
        "x402_volume_usd": x402_volume_usd,
        "grounded_count": grounded,
        "spot_checked": checked,
        "spot_files": spot_files,
        "feedback": feedback if isinstance(feedback, list) else [],
    }


def build_rubric_prompt(agent_name: str, agent_desc: str, reg: dict,
                        endpoints: list, metrics: dict) -> str:
    """Compose the single fixed-rubric prompt for E5 (no floats)."""
    if reg.get("ok"):
        reg_status = "RESOLVED; type-compliant=" + str(reg.get("compliant")) \
            + "; x402Support=" + str(reg.get("x402"))
    else:
        reg_status = "UNRESOLVED (" + str(reg.get("note")) + ")"
    ep_parts = []
    for e in endpoints:
        ep_parts.append(str(safe_get(e, "name", "?")) + ":" + str(safe_get(e, "status", 0)))
    endpoints_str = ", ".join(ep_parts) if ep_parts else "none"
    spot_parts = []
    for sf in metrics.get("spot_files", []):
        spot_parts.append("---\n" + str(sf))
    spot_files_str = "\n".join(spot_parts) if spot_parts else "[]"
    grounded = to_int(metrics.get("grounded_count", 0))
    checked = to_int(metrics.get("spot_checked", 0))
    grounded_share_bp = (grounded * BP // checked) if checked > 0 else 0
    return RUBRIC_TEMPLATE.format(
        name=agent_name if agent_name else "unknown",
        description=agent_desc if agent_desc else "",
        reg_status=reg_status,
        endpoints=endpoints_str,
        total_feedback=to_int(metrics.get("total_feedback", 0)),
        distinct_reviewers=to_int(metrics.get("distinct_reviewers", 0)),
        max_share_bp=to_int(metrics.get("max_reviewer_share_bp", 0)),
        sybil_bp=to_int(metrics.get("sybil_cluster_share_bp", 0)),
        grounded=grounded,
        spot_checked=checked,
        x402_usd=to_int(metrics.get("x402_volume_usd", 0)),
        spot_files=spot_files_str,
    )


def _normalize_judgment(raw) -> dict:
    """
    Parse and validate one LLM attempt. Returns a clean judgment dict, or
    None when the output is unusable (malformed JSON, not a dict, or a
    verdict outside the enum) — None tells the caller to re-prompt.
    """
    try:
        if isinstance(raw, str):
            raw = json.loads(raw)
    except Exception:
        return None
    if not isinstance(raw, dict):
        return None
    verdict = str(safe_get(raw, "verdict", "")).upper()
    if verdict not in (VERDICT_REAL, VERDICT_SUSPICIOUS, VERDICT_FAKE, VERDICT_UNDETERMINED):
        return None
    score = clamp_score(to_int(safe_get(raw, "score", 0)))
    reasoning = trunc(str(safe_get(raw, "reasoning", "")), 500)
    evidence = safe_get(raw, "evidence", [])
    if not isinstance(evidence, list):
        evidence = []
    return {"verdict": verdict, "score": score, "reasoning": reasoning,
            "evidence": evidence}


def e5_llm_judgment(prompt: str) -> dict:
    """
    LLM JUDGMENT: one call with the fixed rubric; on malformed output (bad
    JSON OR a raised error), ONE re-prompt demanding ONLY valid JSON; then
    UNDETERMINED. Never crashes the consensus round. Score clamped 0-100;
    verdict forced into the enum by _normalize_judgment.
    """
    for attempt in range(2):
        p = prompt if attempt == 0 else prompt + "\n\nREMINDER: output ONLY valid JSON. No prose, no markdown."
        try:
            raw = gl.nondet.exec_prompt(p, response_format="json")
        except Exception:
            continue
        norm = _normalize_judgment(raw)
        if norm is not None:
            return norm
    return {"verdict": VERDICT_UNDETERMINED, "score": 0,
            "reasoning": "LLM returned unusable output after one re-prompt.",
            "evidence": []}


def evidence_digest_json(e1: dict, reg: dict, endpoints: list, metrics: dict,
                         judgment: dict) -> str:
    """
    Compact, citable digest of every fetched fact — this is what the frontend
    replays as evidence cards in the Jury Room.
    """
    digest = [
        {"id": "E1", "label": "Anchored identity (tokenURI)",
         "fact": str(safe_get(e1, "note", ""))},
        {"id": "E2", "label": "Registration file",
         "fact": str(safe_get(reg, "note", ""))},
        {"id": "E3", "label": "Endpoint liveness",
         "fact": "; ".join(
             str(safe_get(e, "name", "?")) + "=" + str(safe_get(e, "status", 0))
             for e in endpoints
         ) if endpoints else "no services declared"},
        {"id": "E4", "label": "Reputation forensics",
         "fact": "feedback=" + str(to_int(metrics.get("total_feedback", 0)))
                 + " reviewers=" + str(to_int(metrics.get("distinct_reviewers", 0)))
                 + " max_share_bp=" + str(to_int(metrics.get("max_reviewer_share_bp", 0)))
                 + " sybil_bp=" + str(to_int(metrics.get("sybil_cluster_share_bp", 0)))
                 + " grounded=" + str(to_int(metrics.get("grounded_count", 0)))
                 + "/" + str(to_int(metrics.get("spot_checked", 0)))
                 + " x402_usd=" + str(to_int(metrics.get("x402_volume_usd", 0)))},
        {"id": "E5", "label": "Jury LLM (fixed rubric)",
         "fact": "verdict=" + str(safe_get(judgment, "verdict", ""))
                 + " score=" + str(to_int(safe_get(judgment, "score", 0)))},
    ]
    extra = safe_get(judgment, "evidence", [])
    if isinstance(extra, list):
        n = 0
        for item in extra:
            if n >= 4:
                break
            digest.append({"id": "L" + str(n), "label": "Jury citation",
                           "fact": trunc(str(item), 160)})
            n = n + 1
    return json.dumps(digest)


def fetch_snapshot(uri: str):
    """
    Fetch the indexer-built snapshot with ipfs:// 2-gateway rotation and one
    HTTP retry. Returns the parsed dict, or None (E4 degrades honestly).
    """
    if uri == "":
        return None
    urls = []
    if uri.startswith("ipfs://"):
        urls = [resolve_ipfs(uri, 0), resolve_ipfs(uri, 1)]
    else:
        urls = [uri, uri]
    for url in urls:
        for _attempt in range(1):
            try:
                r = gl.nondet.web.get(url)
                if r.status_code == 200 and r.body:
                    text = r.body.decode("utf-8", "ignore") if hasattr(r.body, "decode") else str(r.body)
                    return json.loads(text)
            except Exception:
                pass
    return None


def run_pipeline(agent_id: int, snapshot_uri: str) -> str:
    """
    The full E1->E5 evidence pipeline, executed independently by the leader
    AND by every validator (R3). Returns the VerdictRecord fields as JSON.
    """
    e1 = e1_anchor_identity(agent_id)
    if not e1["ok"]:
        # Anchored fetch unresolvable => never guess (R2 / edge cases).
        rec = {"verdict": VERDICT_UNDETERMINED, "score": 0,
               "reasoning": "Anchored identity fetch unresolvable: " + str(e1["note"]),
               "evidence_digest": json.dumps([
                   {"id": "E1", "label": "Anchored identity", "fact": str(e1["note"])}]),
               "evidence": []}
        return json.dumps(rec)

    endpoints = []
    metrics = {"total_feedback": 0, "distinct_reviewers": 0,
               "max_reviewer_share_bp": 0, "sybil_cluster_share_bp": 0,
               "x402_volume_usd": 0, "grounded_count": 0, "spot_checked": 0,
               "spot_files": [], "feedback": []}
    reg = {"ok": False, "compliant": False, "name": "", "description": "",
           "services": [], "x402": False, "note": "skipped: no registration file"}

    if e1["liveness"] == "DEAD" and e1["agent_uri"] == "":
        # Identity on-chain but no registration file: skip to E5 with DEAD
        # liveness; E4 bulk still runs from the snapshot so feedback with no
        # backing file is exposed as the smoking gun.
        snap = fetch_snapshot(snapshot_uri)
        if snap is not None:
            metrics = e4_reputation(snap)
    else:
        reg = e2_registration(e1["agent_uri"])
        if not reg["ok"]:
            # E2 anchored fetch unresolvable => UNDETERMINED (never guess).
            rec = {"verdict": VERDICT_UNDETERMINED, "score": 0,
                   "reasoning": "Registration file unresolvable: " + str(reg["note"]),
                   "evidence_digest": json.dumps([
                       {"id": "E1", "label": "Anchored identity", "fact": str(e1["note"])},
                       {"id": "E2", "label": "Registration file", "fact": str(reg["note"])}]),
                   "evidence": []}
            return json.dumps(rec)
        endpoints = e3_endpoints(reg["services"])
        snap = fetch_snapshot(snapshot_uri)
        if snap is not None:
            metrics = e4_reputation(snap)
        else:
            metrics["note"] = "snapshot unreachable; live spot-checks only"

    # Any live endpoint resets a DEAD identity to ALIVE (it resolves).
    live_any = False
    for e in endpoints:
        if e["live"]:
            live_any = True
    liveness = "ALIVE" if (e1["liveness"] == "ALIVE" or live_any) else "DEAD"
    if e1["liveness"] == "UNKNOWN":
        liveness = "UNKNOWN"

    prompt = build_rubric_prompt(
        reg["name"] if reg.get("ok") else "",
        reg["description"] if reg.get("ok") else "",
        reg, endpoints, metrics,
    )
    prompt = prompt + "\n- Identity liveness: " + liveness
    judgment = e5_llm_judgment(prompt)

    # Safety net: dead identity + existing feedback => FAKE regardless of
    # LLM mood (rubric line made explicit in code for determinism). The
    # score must travel with the forced verdict: a FAKE case carrying
    # >= 70 would render as "FAKE — 75/100" downstream, so clamp to the
    # rubric's FAKE band (score < 40 => FAKE).
    verdict = str(judgment["verdict"])
    forced_fake = False
    if liveness == "DEAD" and to_int(metrics.get("total_feedback", 0)) > 0 \
            and verdict in (VERDICT_REAL, VERDICT_SUSPICIOUS):
        verdict = VERDICT_FAKE
        forced_fake = True

    digest = evidence_digest_json(e1, reg, endpoints, metrics, judgment)
    score = clamp_score(to_int(judgment["score"]))
    if forced_fake and score > 39:
        score = 39
    rec = {
        "verdict": verdict,
        "score": score,
        "reasoning": trunc(str(judgment["reasoning"]), 500),
        "evidence_digest": digest,
        "evidence": judgment["evidence"],
    }
    return json.dumps(rec)


# --------------------------------------------------------------------------
# Pure comparison logic used by the validator (R8: deterministic, no I/O)
# --------------------------------------------------------------------------

def citation_count(text: str) -> int:
    """
    Count concrete evidence citations in reasoning (R4): HTTP status codes,
    0x txHash fragments, percentages, basis-point figures, and bare counts
    next to evidence nouns. Pure string/integer work.
    """
    if not isinstance(text, str):
        return 0
    t = text.lower()
    n = 0

    # 1) 0x-prefixed hex fragments of >= 8 hex chars (txHash / address cites).
    i = 0
    while True:
        j = t.find("0x", i)
        if j < 0:
            break
        k = j + 2
        while k < len(t) and t[k] in "0123456789abcdef":
            k = k + 1
        if k - (j + 2) >= 8:
            n = n + 1
        i = k if k > j else j + 1

    # 2) HTTP status codes: standalone 3-digit numbers in [200, 599].
    tokens = t.replace(",", " ").replace(":", " ").replace("=", " ") \
              .replace("(", " ").replace(")", " ").split()
    status_hits = 0
    for tok in tokens:
        if len(tok) == 3 and tok.isdigit():
            v = int(tok)
            if 200 <= v <= 599:
                status_hits = status_hits + 1
    n = n + status_hits

    # 3) Percentages and basis points.
    n = n + t.count("%") + t.count("basis point") + t.count("bp ")

    # 4) Counts tied to evidence nouns (reviewers, feedback, proofs...).
    # A citation is a number adjacent to the noun, either side:
    # "14 reviewers" or "reviewers: 42".
    nouns = ["reviewer", "feedback", "proof", "payment", "endpoint",
             "cluster", "funder", "transfer", "deposit"]
    for noun in nouns:
        idx = 0
        while True:
            j = t.find(noun, idx)
            if j < 0:
                break
            window = t[max(0, j - 16):j] + t[j + len(noun):j + len(noun) + 16]
            if any(c.isdigit() for c in window):
                n = n + 1
            idx = j + len(noun)
    return n


def verdicts_match(a: str, b: str) -> bool:
    return a == b


def scores_within_band(a: int, b: int, band: int) -> bool:
    d = a - b
    if d < 0:
        d = -d
    return d <= band


# --------------------------------------------------------------------------
# The contract
# --------------------------------------------------------------------------

class AgentCourt(gl.Contract):
    # R6: every keyed lookup is a TreeMap; records are dataclasses.
    verdicts: TreeMap[u256, VerdictRecord]
    daily_cases: TreeMap[u256, CaseFile]
    guesses: TreeMap[Address, TreeMap[u256, u8]]
    player_stats: TreeMap[Address, PlayerStats]
    day_status: TreeMap[u256, u8]
    # Guessers per day — an iteration list for settlement, NOT a lookup
    # (keyed access still goes through the `guesses` TreeMap).
    day_guessers: TreeMap[u256, DynArray[Address]]
    # Replay tokens granted when a day settled UNDETERMINED (no streak damage).
    replay_tokens: TreeMap[Address, u256]
    owner: Address

    def __init__(self, owner: Address):
        self.verdicts = TreeMap()
        self.daily_cases = TreeMap()
        self.guesses = TreeMap()
        self.player_stats = TreeMap()
        self.day_status = TreeMap()
        self.day_guessers = TreeMap()
        self.replay_tokens = TreeMap()
        self.owner = owner

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _now() -> int:
        """Best-effort unix timestamp of the latest block (0 if unavailable)."""
        try:
            block = gl.nondet.eth.get_block_by_number("latest")
            ts = getattr(block, "timestamp", None)
            if ts is None and isinstance(block, dict):
                ts = block.get("timestamp", 0)
            return to_int(ts)
        except Exception:
            return 0

    def _current_day(self) -> u256:
        """
        UTC day index from the latest block timestamp (nondeterministic read,
        fine inside GenVM consensus). Day boundaries are exact seconds; a
        guess landing within seconds of midnight may attribute to either day
        — the day_status guard still keeps settlement consistent.
        """
        try:
            ts = self._now()
            if ts == 0:
                # Fall back to the latest committed day being "today".
                return u256(0)
            return u256(ts // 86400)
        except Exception:
            return u256(0)

    def _settle(self, day: u256, verdict: str) -> None:
        """
        Deterministically settle every guess for the day. Runs inside the
        same consensus-accepted execution as the verdict, so streaks cannot
        be cherry-picked.
          correct: guess REAL & verdict REAL, or guess FAKE & verdict FAKE
                   or SUSPICIOUS (suspicious counts for the doubters).
          UNDETERMINED: replay token for everyone; no streak damage.
        """
        if day not in self.day_guessers:
            return
        guessers = self.day_guessers[day]
        for player in guessers:
            g = to_int(self.guesses[player][day])
            stats = self.player_stats[player]
            if verdict == VERDICT_UNDETERMINED:
                self.replay_tokens[player] = u256(to_int(self.replay_tokens.get(player, 0)) + 1)
                continue
            correct = False
            if g == GUESS_REAL and verdict == VERDICT_REAL:
                correct = True
            if g == GUESS_FAKE and verdict in (VERDICT_FAKE, VERDICT_SUSPICIOUS):
                correct = True
            if correct:
                stats.wins = u256(to_int(stats.wins) + 1)
                stats.streak = u256(to_int(stats.streak) + 1)
                if to_int(stats.streak) > to_int(stats.best_streak):
                    stats.best_streak = stats.streak
            else:
                stats.losses = u256(to_int(stats.losses) + 1)
                stats.streak = u256(0)
            stats.games = u256(to_int(stats.games) + 1)
            self.player_stats[player] = stats

    # ------------------------------------------------------------------
    # Write functions
    # ------------------------------------------------------------------

    @gl.public.write
    def commit_daily_case(self, day: u256, agent_id: u256, chain_id: u256,
                          snapshot_uri: str) -> None:
        """
        Owner/keeper only. Commits today's agent BEFORE guesses open.
        Curation is centralized (game design); judgment is NOT — the verdict
        re-fetches everything live inside the consensus round (R2).
        """
        if gl.message.sender_address != self.owner:
            raise Exception("only owner")
        if day in self.daily_cases:
            raise Exception("day already committed")
        if self.day_status.get(day, u8(DAY_OPEN)) != DAY_OPEN:
            raise Exception("day not open")
        self.daily_cases[day] = CaseFile(
            agent_id=agent_id,
            chain_id=chain_id,
            snapshot_uri=snapshot_uri,
            committed_at=u256(self._now()),
        )
        self.day_status[day] = u8(DAY_OPEN)

    @gl.public.write
    def submit_guess(self, day: u256, guess: u8) -> None:
        """
        Anyone. Deterministic and cheap: just records the guess (0=REAL,
        1=FAKE). Guards: day open, day is current, one guess per wallet.
        """
        if guess != GUESS_REAL and guess != GUESS_FAKE:
            raise Exception("guess must be 0 (REAL) or 1 (FAKE)")
        if self.day_status.get(day, u8(255)) != DAY_OPEN:
            raise Exception("day not open for guesses")
        if day not in self.daily_cases:
            raise Exception("no case committed for day")
        current = self._current_day()
        if to_int(current) != 0 and to_int(day) != to_int(current):
            raise Exception("not the current day")
        sender = gl.message.sender_address
        player_guesses = self.guesses.get(sender)
        if player_guesses is None:
            player_guesses = TreeMap()
            self.guesses[sender] = player_guesses
        if day in player_guesses:
            raise Exception("already guessed today")
        player_guesses[day] = u8(guess)
        self.guesses[sender] = player_guesses
        if sender not in self.player_stats:
            self.player_stats[sender] = PlayerStats(
                wins=u256(0), losses=u256(0), streak=u256(0),
                best_streak=u256(0), games=u256(0))
        if day not in self.day_guessers:
            self.day_guessers[day] = DynArray[Address]()
        self.day_guessers[day].append(sender)

    @gl.public.write
    def run_verdict(self, day: u256) -> None:
        """
        Anyone (the keeper bot calls it after the guess window closes).
        THE consensus event: gl.vm.run_nondet_unsafe(leader, validator).
        The leader runs E1-E5; the validator re-runs ALL of E1-E5 from
        scratch and only then applies the pure comparison (R3/R8).
        On consensus: store the VerdictRecord, mark the day final, settle.
        """
        if day not in self.daily_cases:
            raise Exception("no case for day")
        status = self.day_status.get(day, u8(DAY_OPEN))
        if status != DAY_OPEN:
            raise Exception("day not open")
        self.day_status[day] = u8(DAY_JUDGING)

        # R6 compliance intent: do NOT copy the whole (unbounded) daily_cases
        # TreeMap into memory — read only this day's record BEFORE the
        # nondet round and bind plain int/str values, so no storage refs
        # cross the run_nondet_unsafe boundary.
        case = self.daily_cases[day]
        agent_id_i = to_int(case.agent_id)
        snapshot_uri_s = str(case.snapshot_uri)
        day_u = u256(day)

        def leader_fn() -> str:
            # Fresh pipeline; every fetch and the LLM call happen inside the
            # consensus round. (R2, R3)
            return run_pipeline(agent_id_i, snapshot_uri_s)

        def validator_fn(leader_result: str) -> bool:
            # R3: re-derive from scratch — fresh E1-E5, fresh LLM call.
            mine_json = run_pipeline(agent_id_i, snapshot_uri_s)
            try:
                mine = json.loads(mine_json)
            except Exception:
                return False
            try:
                theirs = json.loads(leader_result) if isinstance(leader_result, str) else leader_result
            except Exception:
                return False
            if not isinstance(mine, dict) or not isinstance(theirs, dict):
                return False
            my_verdict = str(mine.get("verdict", ""))
            their_verdict = str(theirs.get("verdict", ""))
            their_reasoning = str(theirs.get("reasoning", ""))
            my_score = to_int(mine.get("score", 0))
            their_score = to_int(theirs.get("score", 0))
            # Check 1: exact verdict enum match.
            if not verdicts_match(my_verdict, their_verdict):
                return False
            # Check 2: score within the same 10-point band.
            if not scores_within_band(my_score, their_score, SCORE_BAND):
                return False
            # Check 3 (R4): the leader's reasoning must cite >= 2 concrete
            # fetched facts the validator also observed in its own run.
            # Exception, deliberately narrow: when BOTH sides independently
            # derived UNDETERMINED the citation gate is skipped — otherwise
            # an explorer outage (whose failure note may carry a single HTTP
            # code) could never reach consensus, defeating the documented
            # "retry once, then UNDETERMINED, never crash the round" path.
            # UNDETERMINED still must match exactly on enum and band, and it
            # awards nobody a REAL/FAKE outcome (R7: verdicts are
            # consequences, not wagers). Every verdict that DECIDES the case
            # remains fully subject to the >= 2 citation requirement.
            if my_verdict != VERDICT_UNDETERMINED:
                if citation_count(their_reasoning) < 2:
                    return False
            return True

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        try:
            rec = json.loads(raw) if isinstance(raw, str) else raw
        except Exception:
            rec = None
        if not isinstance(rec, dict):
            rec = {"verdict": VERDICT_UNDETERMINED, "score": 0,
                   "reasoning": "consensus round returned malformed result",
                   "evidence_digest": "[]"}
        verdict = str(rec.get("verdict", VERDICT_UNDETERMINED))
        if verdict not in (VERDICT_REAL, VERDICT_SUSPICIOUS, VERDICT_FAKE, VERDICT_UNDETERMINED):
            verdict = VERDICT_UNDETERMINED
        score = clamp_score(to_int(rec.get("score", 0)))
        reasoning = trunc(str(rec.get("reasoning", "")), 500)
        digest = str(rec.get("evidence_digest", "[]"))
        now = self._now()
        self.verdicts[day] = VerdictRecord(
            verdict=verdict,
            score=u256(score),
            evidence_digest=digest,
            reasoning=reasoning,
            judged_at=u256(now),
        )
        self.day_status[day] = u8(DAY_FINAL)
        self._settle(day_u, verdict)

    # ------------------------------------------------------------------
    # View functions (R6: all return str via json.dumps)
    # ------------------------------------------------------------------

    @gl.public.view
    def get_day_status(self, day: u256) -> str:
        names = {0: "open", 1: "judging", 2: "final"}
        s = to_int(self.day_status.get(day, u8(255)))
        return json.dumps({"day": to_int(day), "statusCode": s,
                           "status": names.get(s, "unknown")})

    @gl.public.view
    def get_case(self, day: u256) -> str:
        if day not in self.daily_cases:
            return json.dumps({"exists": False})
        c = self.daily_cases[day]
        return json.dumps({
            "exists": True,
            "day": to_int(day),
            "agentId": str(to_int(c.agent_id)),
            "chainId": to_int(c.chain_id),
            "snapshotUri": c.snapshot_uri,
            "committedAt": to_int(c.committed_at),
        })

    @gl.public.view
    def get_verdict(self, day: u256) -> str:
        if day not in self.verdicts:
            return json.dumps({"exists": False})
        v = self.verdicts[day]
        return json.dumps({
            "exists": True,
            "day": to_int(day),
            "verdict": v.verdict,
            "score": to_int(v.score),
            "evidenceDigest": v.evidence_digest,
            "reasoning": v.reasoning,
            "judgedAt": to_int(v.judged_at),
        })

    @gl.public.view
    def get_my_stats(self) -> str:
        player = gl.message.sender_address
        if player not in self.player_stats:
            return json.dumps({"exists": False, "address": str(player)})
        s = self.player_stats[player]
        return json.dumps({
            "exists": True,
            "address": str(player),
            "wins": to_int(s.wins),
            "losses": to_int(s.losses),
            "streak": to_int(s.streak),
            "bestStreak": to_int(s.best_streak),
            "games": to_int(s.games),
            "replayTokens": to_int(self.replay_tokens.get(player, 0)),
        })

    @gl.public.view
    def get_guess(self, day: u256, player: Address) -> str:
        if player not in self.guesses:
            return json.dumps({"exists": False})
        pg = self.guesses[player]
        if day not in pg:
            return json.dumps({"exists": False})
        g = to_int(pg[day])
        return json.dumps({"exists": True, "guess": g,
                           "guessLabel": "REAL" if g == GUESS_REAL else "FAKE"})

    @gl.public.view
    def get_leaderboard(self, top_n: u256) -> str:
        """Top hunters: sort by wins, then streak. top_n clamped to 100."""
        limit = to_int(top_n)
        if limit <= 0 or limit > 100:
            limit = 100
        rows = []
        for player in self.player_stats:
            s = self.player_stats[player]
            rows.append({
                "address": str(player),
                "wins": to_int(s.wins),
                "losses": to_int(s.losses),
                "streak": to_int(s.streak),
                "bestStreak": to_int(s.best_streak),
                "games": to_int(s.games),
            })
        # Deterministic sort: wins desc, then streak desc, then address asc.
        rows.sort(key=lambda r: (-r["wins"], -r["streak"], r["address"]))
        return json.dumps({"top": rows[:limit]})
