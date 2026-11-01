"""End-to-end simulation: commit -> guess -> run_verdict (leader+validator) -> settlement."""
import os, sys, json, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import importlib
import genlayer as gstub

mod = importlib.import_module("AgentCourt")

# ------------------------------------------------------------------ mocks --
CHAIN = {"timestamp": 1793462400}  # some unix ts; day = ts//86400

REG_DOC = {
    "type": "https://erc8004.org/registration/v1",
    "name": "AlphaTradeBot",
    "description": "Autonomous trading agent for perp markets " * 10,
    "services": [
        {"name": "MCP", "endpoint": "https://alpha-trade.example/mcp"},
        {"name": "A2A", "endpoint": "https://alpha-trade.example/a2a"},
    ],
    "x402Support": False,
    "active": True,
}
REG_JSON = json.dumps(REG_DOC)

def abi_string(s: str) -> str:
    return "0x" + (32).to_bytes(32, "big").hex() + len(s).to_bytes(32, "big").hex() + s.encode().hex()

SNAPSHOT = {
    "feedback": [
        {"reviewer": "0xr1", "fileURI": "https://fb/1.json"},
        {"reviewer": "0xr1", "fileURI": "https://fb/2.json"},
        {"reviewer": "0xr1", "fileURI": "https://fb/3.json"},
        {"reviewer": "0xr2", "fileURI": "https://fb/4.json"},
        {"reviewer": "0xr3", "fileURI": "https://fb/5.json"},
    ],
    "reviewers": [{"address": "0xr1"}, {"address": "0xr2"}, {"address": "0xr3"}],
    "fundingClusters": [{"funder": "0xf1", "shareBp": 6667}],
    "x402": {"volumeUsd": 0},
}
FB_NO_PROOF = json.dumps({"rating": 100, "text": "great agent"})
FB_PROOF = json.dumps({"proofOfPayment": {"txHash": "0xfeedfacefeedfacefeedfacefeedface"}})

CALLS = {"web": 0, "llm": 0}

class FakeResp:
    def __init__(self, status_code, body):
        self.status_code = status_code
        self.body = body.encode() if isinstance(body, str) else body

def fake_get(url):
    CALLS["web"] += 1
    if "basescan.org" in url:
        return FakeResp(200, json.dumps({"status": "1", "result": abi_string("ipfs://QmAgentReg")}))
    if "ipfs.io" in url and "QmAgentReg" in url:
        return FakeResp(200, REG_JSON)
    if "ipfs.io" in url and "QmCase123" in url:
        return FakeResp(200, json.dumps(SNAPSHOT))
    if "alpha-trade.example" in url:
        return FakeResp(404, "not found")  # endpoints respond but 404 (200-499 = responds)
    if url.startswith("https://fb/"):
        n = url.split("/")[-1]
        return FakeResp(200, FB_PROOF if n == "1.json" else FB_NO_PROOF)
    return FakeResp(500, "")

def fake_prompt(prompt, response_format=None):
    CALLS["llm"] += 1
    assert "reviewers" in prompt or "feedback" in prompt
    return {"verdict": "FAKE", "score": 22,
            "reasoning": "Identity file ipfs://QmCase123 resolved, endpoints 404, 3 of 5 spot-checked proofs found is below threshold, sybil cluster share 6667 bp",
            "evidence": ["endpoints 404", "cluster 6667bp"]}

def fake_block(_):
    return {"timestamp": CHAIN["timestamp"]}

gstub.gl.nondet.web.get = staticmethod(fake_get)
gstub.gl.nondet.exec_prompt = staticmethod(fake_prompt)
gstub.gl.nondet.eth.get_block_by_number = staticmethod(fake_block)
# contract already imported gl from stub — rebind module ref used inside AgentCourt
mod.gl = gstub.gl

OWNER = "0x" + "aa" * 20
DAY = mod.u256(CHAIN["timestamp"] // 86400)
print("day:", DAY)

c = mod.AgentCourt(OWNER)

# -- commit ------------------------------------------------------------------
gstub.gl.message.sender_address = OWNER
c.commit_daily_case(DAY, mod.u256(42), mod.u256(8453), "ipfs://QmCase123")
try:
    c.commit_daily_case(DAY, mod.u256(43), mod.u256(8453), "ipfs://QmX")
    raise SystemExit("double commit should revert")
except Exception as e:
    assert "already committed" in str(e), e

# -- guesses -----------------------------------------------------------------
P1, P2, P3 = "0x" + "01" * 20, "0x" + "02" * 20, "0x" + "03" * 20
gstub.gl.message.sender_address = P1
c.submit_guess(DAY, mod.u8(1))   # FAKE (correct)
gstub.gl.message.sender_address = P2
c.submit_guess(DAY, mod.u8(0))   # REAL (wrong)
gstub.gl.message.sender_address = P3
c.submit_guess(DAY, mod.u8(1))   # FAKE (correct)
try:
    c.submit_guess(DAY, mod.u8(1))
    raise SystemExit("double guess should revert")
except Exception as e:
    assert "already guessed" in str(e), e
try:
    c.submit_guess(mod.u256(DAY + 1), mod.u8(0))
    raise SystemExit("wrong day should revert")
except Exception as e:
    # Uncommitted next day is caught by the day_status guard; a committed
    # but non-current day would hit the current-day guard.
    assert "current day" in str(e) or "not open" in str(e), e

# -- verdict -----------------------------------------------------------------
CALLS["web"] = 0; CALLS["llm"] = 0
c.run_verdict(DAY)
print("web calls:", CALLS["web"], "llm calls:", CALLS["llm"])
assert CALLS["llm"] == 2, "leader and validator must each run an LLM call (R3)"

v = json.loads(c.get_verdict(DAY))
assert v["exists"] and v["verdict"] == "FAKE" and v["score"] == 22, v
digest = json.loads(v["evidenceDigest"])
assert len(digest) >= 5, digest
assert json.loads(c.get_day_status(DAY))["status"] == "final"

# -- settlement --------------------------------------------------------------
s1 = json.loads(mod.json.dumps({"x": 1}))  # sanity json import ok
gstub.gl.message.sender_address = P1
s1 = json.loads(c.get_my_stats())
assert s1["wins"] == 1 and s1["streak"] == 1 and s1["bestStreak"] == 1, s1
gstub.gl.message.sender_address = P2
s2 = json.loads(c.get_my_stats())
assert s2["losses"] == 1 and s2["streak"] == 0, s2
gstub.gl.message.sender_address = P3
s3 = json.loads(c.get_my_stats())
assert s3["wins"] == 1, s3

# -- guesses after verdict rejected -----------------------------------------
try:
    c.submit_guess(DAY, mod.u8(1))
    raise SystemExit("guess after verdict should revert")
except Exception as e:
    assert "not open" in str(e), e

# -- views -------------------------------------------------------------------
assert json.loads(c.get_case(DAY))["agentId"] == "42"
assert json.loads(c.get_case(mod.u256(1))) == {"exists": False}
g1 = json.loads(c.get_guess(DAY, P1))
assert g1["exists"] and g1["guessLabel"] == "FAKE"
lb = json.loads(c.get_leaderboard(mod.u256(10)))
assert len(lb["top"]) == 3
assert lb["top"][0]["wins"] == 1 and lb["top"][0]["address"] in (P1, P3)
print("leaderboard:", lb)

# -- run_verdict twice must revert ------------------------------------------
try:
    c.run_verdict(DAY)
    raise SystemExit("re-verdict should revert")
except Exception as e:
    assert "not open" in str(e), e

# -- non-owner commit rejected ----------------------------------------------
gstub.gl.message.sender_address = P1
try:
    c.commit_daily_case(mod.u256(DAY + 1), mod.u256(1), mod.u256(8453), "ipfs://x")
    raise SystemExit("non-owner commit should revert")
except Exception as e:
    assert "only owner" in str(e), e

print("\nE2E CONTRACT SIMULATION PASSED")

# ================= UNDETERMINED day: replay tokens, no streak damage =========
CHAIN["timestamp"] += 86400
DAY2 = mod.u256(CHAIN["timestamp"] // 86400)
gstub.gl.message.sender_address = OWNER
c.commit_daily_case(DAY2, mod.u256(77), mod.u256(8453), "ipfs://QmCase123")
gstub.gl.message.sender_address = P1   # currently on a 1-win streak
c.submit_guess(DAY2, mod.u8(1))
gstub.gl.message.sender_address = P2
c.submit_guess(DAY2, mod.u8(0))

def undet_prompt(prompt, response_format=None):
    return {"verdict": "UNDETERMINED", "score": 0,
            "reasoning": "E1 explorer returned HTTP 429 twice; anchored identity unresolvable",
            "evidence": []}
gstub.gl.nondet.exec_prompt = staticmethod(undet_prompt)
c.run_verdict(DAY2)
v2 = json.loads(c.get_verdict(DAY2))
assert v2["verdict"] == "UNDETERMINED" and v2["exists"], v2
gstub.gl.message.sender_address = P1
s1b = json.loads(c.get_my_stats())
assert s1b["replayTokens"] == 1, s1b
assert s1b["wins"] == 1 and s1b["streak"] == 1, "streak must be untouched"
assert s1b["games"] == 1, "no game counted for undetermined"
gstub.gl.message.sender_address = P2
s2b = json.loads(c.get_my_stats())
assert s2b["replayTokens"] == 1 and s2b["losses"] == 1, s2b
print("UNDETERMINED settlement: replay tokens issued, streaks safe")
print("E2E+UNDETERMINED PASSED")

# ================= R4: evidence-free reasoning on a REAL verdict =============
CHAIN["timestamp"] += 86400
DAY3 = mod.u256(CHAIN["timestamp"] // 86400)
gstub.gl.message.sender_address = OWNER
c.commit_daily_case(DAY3, mod.u256(5), mod.u256(8453), "ipfs://QmCase123")

def fluff_prompt(prompt, response_format=None):
    # Fluent, confident, ZERO concrete fetched facts — the R4 reject case.
    return {"verdict": "REAL", "score": 85,
            "reasoning": "This agent appears trustworthy and well regarded by the community overall.",
            "evidence": []}
gstub.gl.nondet.exec_prompt = staticmethod(fluff_prompt)
gstub.gl.message.sender_address = P1
c.submit_guess(DAY3, mod.u8(0))
try:
    c.run_verdict(DAY3)
    raise SystemExit("FAIL: fluff reasoning must not survive consensus")
except AssertionError:
    print("R4 gate: fluff-only leader reasoning REJECTED by validator")
    # day_status must be left rejected so a corrected round can be retried
    # (stub raised inside run_nondet_unsafe; status remains judging=1 here)
print("R4 ENFORCEMENT PASSED")

# ================= Forced-FAKE safety net carries a FAKE score ==============
# Dead identity (tokenURI resolves empty) + feedback in the snapshot, while
# the LLM insists REAL/70 => verdict forced FAKE AND score clamped <= 39.
CHAIN["timestamp"] += 86400
DAYF = mod.u256(CHAIN["timestamp"] // 86400)

def dead_get(url):
    if "basescan.org" in url:
        return FakeResp(200, json.dumps({"status": "1", "result": abi_string("")}))
    if "ipfs.io" in url and "QmCase123" in url:
        return FakeResp(200, json.dumps(SNAPSHOT))
    return FakeResp(500, "")

def stubborn_real_prompt(prompt, response_format=None):
    CALLS["llm"] += 1
    return {"verdict": "REAL", "score": 70,
            "reasoning": "Identity tokenURI resolved empty; 5 feedback rows "
                         "across 3 reviewers, sybil cluster 6667 bp; no endpoint evidence",
            "evidence": []}

gstub.gl.nondet.web.get = staticmethod(dead_get)
gstub.gl.nondet.exec_prompt = staticmethod(stubborn_real_prompt)
gstub.gl.message.sender_address = OWNER
c.commit_daily_case(DAYF, mod.u256(9), mod.u256(8453), "ipfs://QmCase123")
gstub.gl.message.sender_address = P1
c.submit_guess(DAYF, mod.u8(0))
c.run_verdict(DAYF)
vf = json.loads(c.get_verdict(DAYF))
assert vf["verdict"] == "FAKE", vf
assert int(vf["score"]) <= 39, "forced FAKE must carry a FAKE-band score: " + str(vf)
print("FORCED-FAKE SCORE CLAMP PASSED (verdict FAKE, score <= 39)")

# ============ Malformed-but-non-raising LLM output triggers one re-prompt ===
# First exec_prompt call returns garbage (no exception); the REMINDER
# re-prompt returns a valid judgment which must be used.
CHAIN["timestamp"] += 86400
DAYR = mod.u256(CHAIN["timestamp"] // 86400)

def alive_get(url):
    if "basescan.org" in url:
        return FakeResp(200, json.dumps({"status": "1", "result": abi_string("ipfs://QmAgentReg")}))
    if "ipfs.io" in url and "QmAgentReg" in url:
        return FakeResp(200, REG_JSON)
    if "ipfs.io" in url and "QmCase123" in url:
        return FakeResp(200, json.dumps(SNAPSHOT))
    if "alpha-trade.example" in url:
        return FakeResp(404, "not found")
    if url.startswith("https://fb/"):
        n = url.split("/")[-1]
        return FakeResp(200, FB_PROOF if n == "1.json" else FB_NO_PROOF)
    return FakeResp(500, "")

prompt_calls = {"n": 0}
def flaky_prompt(prompt, response_format=None):
    prompt_calls["n"] += 1
    if prompt_calls["n"] % 2 == 1:
        return "not json at all"          # malformed, but does NOT raise
    return {"verdict": "FAKE", "score": 24,
            "reasoning": "endpoints 404; 5 feedback across 3 reviewers; "
                         "cluster 6667 bp; 1 of 5 spot-checked proofs",
            "evidence": ["404"]}

gstub.gl.nondet.web.get = staticmethod(alive_get)
gstub.gl.nondet.exec_prompt = staticmethod(flaky_prompt)
gstub.gl.message.sender_address = OWNER
c.commit_daily_case(DAYR, mod.u256(42), mod.u256(8453), "ipfs://QmCase123")
gstub.gl.message.sender_address = P1
c.submit_guess(DAYR, mod.u8(1))
before = prompt_calls["n"]
c.run_verdict(DAYR)
used = prompt_calls["n"] - before
assert used == 4, "leader+validator x (garbage then valid) = 4 prompts, got %d" % used
vr = json.loads(c.get_verdict(DAYR))
assert vr["verdict"] == "FAKE" and vr["score"] == 24, "re-prompt result must be used: " + str(vr)
print("JSON RETRY PASSED (malformed output re-prompted exactly once per run)")

# ================= Crowd vs Jury: basis-point tally ========================
CHAIN["timestamp"] += 86400
DAYC = mod.u256(CHAIN["timestamp"] // 86400)
P4 = "0x" + "04" * 20

def crowd_prompt(prompt, response_format=None):
    return {"verdict": "FAKE", "score": 22,
            "reasoning": "endpoints 404; 5 feedback rows across 3 reviewers; "
                         "sybil cluster 6667 bp; 1 of 5 spot-checked proofs",
            "evidence": []}

gstub.gl.nondet.web.get = staticmethod(alive_get)
gstub.gl.nondet.exec_prompt = staticmethod(crowd_prompt)
gstub.gl.message.sender_address = OWNER
c.commit_daily_case(DAYC, mod.u256(42), mod.u256(8453), "ipfs://QmCase123")
for p in (P1, P2, P3):
    gstub.gl.message.sender_address = p
    c.submit_guess(DAYC, mod.u8(0))     # REAL x3
gstub.gl.message.sender_address = P4
c.submit_guess(DAYC, mod.u8(1))         # FAKE x1

crowd_open = json.loads(c.get_crowd(DAYC))
assert crowd_open["real"] == 0 and crowd_open["fake"] == 0, \
    "tally must be written at settlement, not at guess time: " + str(crowd_open)

c.run_verdict(DAYC)
crowd = json.loads(c.get_crowd(DAYC))
assert crowd["real"] == 3 and crowd["fake"] == 1, crowd
assert crowd["realBp"] == 7500 and crowd["fakeBp"] == 2500, crowd
assert json.loads(c.get_verdict(DAYC))["verdict"] == "FAKE"   # jury beat the crowd
empty = json.loads(c.get_crowd(mod.u256(999999)))
assert empty["real"] == 0 and empty["fake"] == 0 and empty["realBp"] == 0, empty
print("CROWD vs JURY PASSED (3 REAL / 1 FAKE => realBp 7500)")
