# AgentCourt.py — the Intelligent Contract

Python Intelligent Contract (GenVM) for **RefAalke**, the daily AI-agent
court game on GenLayer.

- **Spec compliance:** consensus rules R1–R8 from the project spec are
  implemented and documented in the module docstring.
- **Tests:** `python3 tests/test_helpers.py` (pure helpers — R4/R5 logic,
  ABI string decoding, b64/IPFS paths) and `python3 tests/test_e2e.py`
  (full commit → guess → consensus round → settlement simulation against a
  stubbed `genlayer` SDK: leader+validator double execution, the ±10 score
  band, citation gating, UNDETERMINED replay tokens, double-guess/double-commit
  guards).
- **Studio:** paste into GenLayer Studio (studio.genlayer.com) and use the
  multi-validator simulator on `commit_daily_case` → `submit_guess` →
  `run_verdict`.
- **Deploy:** `genlayer deploy contracts/AgentCourt.py --network bradbury`
