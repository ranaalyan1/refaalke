"""Unit tests for AgentCourt pure helpers (R4, R5, E1 decoding)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import importlib
import json

mod = importlib.import_module("AgentCourt")

# --- to_hex32 -------------------------------------------------------------
assert mod.to_hex32(0) == "0" * 64, "hex32 zero"
assert mod.to_hex32(0xC87B56DD)[:8] == "00000000"[-8:]  # sanity
assert len(mod.to_hex32(12345)) == 64
assert mod.to_hex32(0xDEADBEEF) == "0" * 56 + "deadbeef"
print("to_hex32 OK")

# --- decode_hex_result on a real ABI-encoded string ------------------------
uri = "https://example.com/agent/1.json"
hexdata = uri.encode().hex()
offset = (32).to_bytes(32, "big").hex()
length = (len(uri)).to_bytes(32, "big").hex()
payload = "0x" + offset + length + hexdata
assert mod.is_abi_string(payload), "abi string check"
assert mod.decode_hex_result(payload) == uri, mod.decode_hex_result(payload)
print("decode_hex_result OK")

# Revert blob must fail the ABI check
assert not mod.is_abi_string("0x")
assert not mod.is_abi_string("0x" + "f" * 64)
# Multi-byte UTF-8 (emoji in name) roundtrip
uri2 = "data:application/json;base64,eyJibG9jayI6Iktpbmcgf8OibG8ifQ=="
hex2 = uri2.encode().hex()
payload2 = "0x" + (32).to_bytes(32, "big").hex() + len(uri2).to_bytes(32, "big").hex() + hex2
assert mod.decode_hex_result(payload2) == uri2
print("utf8 decode OK")

# --- citation_count (R4) --------------------------------------------------
good = "Endpoints 404 and 500; 14 reviewers share 1 funder; 0 payment proofs of 89 feedback; x402 tx 0xabc123def4567890"
bad = "This agent appears trustworthy based on general on-chain activity and community sentiment."
assert mod.citation_count(good) >= 2, mod.citation_count(good)
assert mod.citation_count(bad) < 2, mod.citation_count(bad)
assert mod.citation_count("score is high because reasons" * 10) < 2
# status code counting
assert mod.citation_count("HTTP 404 from endpoint") >= 1
assert mod.citation_count("reviewers: 42 distinct") >= 1
print("citation_count OK:", mod.citation_count(good), "/", mod.citation_count(bad))

# --- score band (R5 integer) ---------------------------------------------
assert mod.scores_within_band(70, 80, 10)
assert mod.scores_within_band(70, 60, 10)
assert not mod.scores_within_band(70, 81, 10)
assert not mod.scores_within_band(70, 59, 10)
assert mod.clamp_score(150) == 100
assert mod.clamp_score(-3) == 0
assert mod.clamp_score(0) == 0
print("score band OK")

# --- verdict enum match ---------------------------------------------------
assert mod.verdicts_match("REAL", "REAL")
assert not mod.verdicts_match("REAL", "SUSPICIOUS")
print("verdict match OK")

# --- to_int rejects floats-as-int silently but safely (R5) ----------------
assert mod.to_int("42") == 42
assert mod.to_int("42.7") == 42      # floored once, never used as float downstream
assert mod.to_int(None) == 0
assert mod.to_int(True) == 1
assert mod.to_int("0x10") == 16
print("to_int OK")

# --- b64 ------------------------------------------------------------------
import base64
doc = json.dumps({"name": "AlphaTradeBot", "type": "https://erc8004.org/registration/v1"})
payload_b64 = base64.b64encode(doc.encode()).decode()
assert json.loads(mod.b64_decode_str(payload_b64))["name"] == "AlphaTradeBot"
print("b64 OK")

# --- ipfs gateway rotation ------------------------------------------------
assert mod.resolve_ipfs("ipfs://QmABC", 0) == "https://ipfs.io/ipfs/QmABC"
assert mod.resolve_ipfs("ipfs://QmABC", 1) == "https://dweb.link/ipfs/QmABC"
print("ipfs rotation OK")

# --- rubric prompt builds integer-only text -------------------------------
reg = {"ok": True, "compliant": True, "x402": False, "name": "Alpha",
       "description": "Trade bot", "services": []}
metrics = {"total_feedback": 89, "distinct_reviewers": 14,
           "max_reviewer_share_bp": 7142, "sybil_cluster_share_bp": 9060,
           "x402_volume_usd": 0, "grounded_count": 0, "spot_checked": 3,
           "spot_files": ["{}"], "feedback": []}
p = mod.build_rubric_prompt("Alpha", "Trade bot", reg, [{"name": "MCP", "status": 500}], metrics)
assert "7142" in p and "9060" in p and "0 of 3" in p
assert "0.0027" not in p
print("rubric prompt OK")

# --- evidence digest is JSON ---------------------------------------------
j = mod.evidence_digest_json(
    {"note": "ok"}, reg, [{"name": "MCP", "status": 500, "live": False}],
    metrics, {"verdict": "FAKE", "score": 12, "evidence": ["404 on /mcp"]})
d = json.loads(j)
assert len(d) >= 5
print("evidence digest OK:", len(d), "cards")

print("\nALL PURE-HELPER TESTS PASSED")
