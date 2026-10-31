# DEMO_SCRIPT.md — the 90-second demo video

**Goal in one line:** *open app → today's agent “AlphaTradeBot, 97/100” →
guess FAKE → jury room → evidence cards stream → “0 payment proofs, 12
reviewers share 1 funder, endpoints dead” → FAKE stamp slams → “You caught
it. Streak: 5.” → end on the thesis line.*

Record at 1440×900 @ 60fps, mic on, no music (UI sound carries the stamp).
Cursor visible. Browser: Chrome, window without bookmarks bar, demo mode ON
(“DEMO MODE” chip visible in nav).

---

## Shot list

### 0:00–0:06 — Cold open (full screen, home hero)
- App already loaded at `/`, hero fills the frame: the mouse-scrubbed
  courtroom video behind the blurred intro label. Sweep the cursor
  left↔right to scrub the footage, then let the typewriter line finish.
- **VO:** “There are 1.3 million AI agents on-chain. The researchers say
  97% of the scores they show you are fake. Prove it — daily.”

### 0:06–0:18 — Today's case
- Cursor scrolls to the case-file card. Hover the redacted **97/100 ★**
  badge (the strike-through is visible), then the endpoint list.
- **VO:** “Every day, one real agent from the ERC-8004 registry stands
  trial. Today: AlphaTradeBot. Claimed reputation 97. Three service
  endpoints. 89 reviews.”
- Beat: pause on “The jury decides at 20:00 UTC.”

### 0:18–0:26 — The guess
- Click **🔴 IT'S FAKE**. Buttons collapse into “YOU CALLED IT FAKE” +
  “Filed · guess locked”.
- **VO:** “You call it. Wallet optional — points and streaks save locally.”
- Click **Enter the Jury Room →**.

### 0:26–0:42 — The jury convenes
- Jury Room: the 7 validator seats light amber one by one
  (`V-01 … V-07`, “deliberating”), right column streams the consensus log:
  `leader: E1 tokenURI → ipfs://… ✓`, `validator: re-deriving E1–E5…`.
- **VO:** “Seven seats, one thousand and one validators on GenLayer. The
  leader fetches live evidence — and every validator re-runs the entire
  pipeline from scratch. No rubber stamps.”
- Optionally tap **“sound: tap to arm”** before the stamp (primes audio).

### 0:42–0:58 — The evidence trail (the receipts)
- Evidence cards stream in one at a time; cursor follows each card:
  1. `Anchored identity — tokenURI resolved ipfs://Qm9x…4d2`
  2. `Registration file — RESOLVED · type-compliant v1`
  3. `Endpoint liveness — MCP=404, A2A=404, HTTP=404 — 0/3 live`
  4. `Reviewer graph — 14 reviewers, 9,060 bp share 1 first-funder`
  5. `Payment proofs — 0 of 89 feedback rows carry proofOfPayment.txHash`
  6. `Jury LLM — score 18/100`
- **VO:** “Zero payment proofs. All three endpoints dead. Fourteen
  reviewers collapse to one funding wallet. That's not a reputation —
  that's a costume.”

### 0:58–1:08 — The stamp (peak moment)
- **[SFX: stamp thud]** The red steel **FAKE** stamp slams in with screen
  shake; “JURY TRUST SCORE 18/100”.
- Result line: **“✔ You caught it — STREAK: 4 → 5”** (live count).
- **VO:** “The scammer fooled no one today.”

### 1:08–1:20 — Your haul
- Click **Share the verdict** → Stats: streak flame, Wordle grid
  (🟩🟥⬜), the canvas share card renders; click **Download PNG** (show the
  file). Then **Hall of Shame** — scroll the mugshot cards:
  `displayed 97/100 ★ — jury 18/100`, “killed by: 0 of 89 payment proofs…”
- **VO:** “Your streak, your grid, your receipts — and a public wall of
  every scammer the court has exposed.”

### 1:20–1:30 — Close (hold on the Hall of Shame header or the stamp)
- **VO, verbatim:** “The jury is 1,001 AI validators. The scammers are
  real. So is the verdict.”
- End card (2s): `REAL / FAKE — daily. on-chain. decided by evidence.`
  + `built on GenLayer · cases from ERC-8004`.

---

## Capture checklist

- [ ] Demo mode chip visible in nav (no wallet ceremony in the video)
- [ ] Countdown chip ticking on home (`JURY DECIDES IN …`)
- [ ] Stamp sound audible (tap “sound: tap to arm” during deliberation)
- [ ] No console errors, no horizontal scrollbar (QA pass: 10/10 clean)
- [ ] Mobile pass optional: 390×844 re-record of shots 2–3 for the
      vertical cut-down (the layout is mobile-first)
- [ ] Export: 1440×900 → MP4 H.264; vertical re-cut at 1080×1920
