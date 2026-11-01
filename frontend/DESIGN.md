# RefAalke (formerly REAL or FAKE) — frontend build spec

## v2 — "Sticker court" (current)

> Full redesign: new logo, new UI/UX. Supersedes the noir v1 spec below
> (kept for history). Palette lock: **baby blue · baby pink · white · black.**

- **Mood (3 words):** pastel, playful, precise.
- **Logo:** inline SVG mark in `components/logo.tsx` — a black-stroked
  rounded square containing a tilting balance: baby-blue pan left, baby-pink
  pan right. Wordmark "RefAalke" in Space Grotesk medium.
- **Tokens (authoritative — `tailwind.config.ts`):**

```css
--bg: #FFFFFF;            /* first CSS rule on html,body */
--surface: #F4FAFD;       /* baby-blue mist band */
--pinkmist: #FDF2F7;      /* baby-pink mist band */
--card: #FFFFFF;
--ink: #0B0B0F;           /* black type + outlines */
--real: #3B9AD9;          /* baby blue, readable depth  */
--realsoft: #BFE3F7;
--fake: #EB7BA6;          /* baby pink, readable depth  */
--fakesoft: #F8C8DC;
--line: rgba(11,11,15,0.12);
```

- **Materials:** sticker style — white cards, 2px black/10 outlines, radius
  24, soft neutral shadow; buttons are pills with 2px black borders; the
  only saturated color belongs to verdicts (REAL=blue, FAKE=pink) and the
  pastel mist bands. No grain layer, no glows.
- **Hero:** mouse-scrubbed pastel court illustration
  (`public/court-pastel.mp4`, dense-keyframe H.264, object-position 85%
  center) under a horizontal white wash + bottom-up white wash; blurred
  intro label, typewriter line (38ms/char), pill actions — choreography
  unchanged from the Mainframe-inspired hero.
- **Motion:** v1 entrance language kept (blur-rise on
  `cubic-bezier(0.22,1,0.36,1)`, reduced-motion honored).

---

## v1 — courtroom noir (retired)

> Written before code, per the MotionSites skill workflow. Every element gets
> real values. Build exactly this.

## Brief in five

- **What & who:** a daily game + trust dApp; visitors are crypto/AI natives
  (they'll play on a phone between tabs) and wordle-brained casuals. First
  screen must read "daily game" + "courtroom" + "on-chain" in 3 seconds.
- **Mood (3 words):** courtroom-noir, forensic, electric.
- **Signature (the one memorable moment):** **The Verdict Slam** — in the Jury
  Room, 7 validator seats light up one by one, evidence cards stream in with
  real fetched facts, then a wax-seal `REAL` / steel-stamp `FAKE` slams in
  oversized type with a screen shake. Everything else stays quiet so this
  lands.
- **Output:** the user's stack — Next.js 14 App Router, TS, Tailwind, shadcn/ui
  idioms (hand-rolled subset), Framer Motion.
- **Scope:** 5 screens: Home / Jury Room / Stats & Share / Hall of Shame /
  Leaderboard.

## Media decision

UI/data-led design (case files, evidence, stamps are the imagery). One
generated noir backdrop behind the home hero (courtroom bench in darkness,
single light shaft, no people, no text) used at low opacity with a heavy scrim
— it unifies the dark page; plus an SVG grain layer everywhere. No stock
video: motion is carried by choreography + the stamp.

## Tokens

```css
--bg: #060607;            /* first CSS rule on html,body — no white flash */
--surface: #0b0b0e;       /* alternating band */
--card: #101014;
--line: rgba(255,255,255,0.08);
--fg: #EDEBE4;            /* warm paper-white */
--fg-80: rgba(237,235,228,0.80);
--fg-55: rgba(237,235,228,0.55);
--fg-35: rgba(237,235,228,0.35);
--real: #2BFF88;          /* neon evidence green   */
--fake: #FF453A;          /* steel red             */
--suspicious: #FFB020;    /* amber                 */
--cold: #67E8F9;          /* docket cyan (micro only) */
--radius-card: 20px; --radius-case: 24px;
--ease-out: cubic-bezier(0.22,1,0.36,1);
--dur: 0.8s;
```

- **Fonts:** Space Grotesk 300/400/500/700 (display + body), JetBrains Mono
  400/500/700 (on-chain data, micro-labels). Via `@fontsource` npm packages
  (no Google Fonts CDN at build time).
- **Type scale:** H1 `clamp(40px, 7vw, 88px)`, weight 500, tracking −0.03em,
  line-height 0.98. Section h2 `clamp(28px,4vw,44px)`. Lede 16–17px/1.6,
  max-width 46ch. Mono labels 11px, uppercase, +0.18em, opacity .55. Stat
  numerals weight 300, `tabular-nums`, −0.02em.
- **Palette rules:** one dark bg; semantic verdict colors only on
  verdict-related elements (never decorative); cyan only for docket/chip
  micro-accents; hierarchy via opacity steps, not new colors. Borders 8% fg.
- **Materials:** cards = `#101014` + 1px `--line` + radius 20; case-file card
  gets a red confidential-style docket header; pills for all actions
  (primary: solid inverse or semantic fill; secondary: ghost 1px line).
- **Grain:** SVG fractal noise, opacity .05, fixed, pointer-events none.
- **Depth:** radial ambient light `rgba(255,255,255,0.03)` top-center of dark
  sections — never blobs.

## Motion vocabulary

- Entrance: y 24→0 + opacity 0→1 (+blur 8→0 on H1), 0.7–0.9s, `--ease-out`,
  stagger 0.08s; order nav → docket label → H1 → lede → case card → buttons.
- Evidence cards: sequential, 0.45s apart, slide from left + icon pop.
- Validator seats: each seat transitions idle→deliberating (amber ring pulse)
  →gavel-down (green/red) with 0.4s stagger; seats 7.
- **Verdict stamp:** scale 2.6→0.94→1, rotate −8°→−4°, spring
  (stiffness 240, damping 12), then `shake` keyframes on the stage
  (translate 0,−3,3,−2,0 over 0.35s) + a subtle flash of the accent glow.
  Wax seal (REAL) = radial green with inner scallop; steel stamp (FAKE) =
  red double-ruled frame with distressed tracking.
- Hovers ≤1.03 scale, 180ms; `:active` 0.97. Full
  `prefers-reduced-motion` branch: final states, no shakes, no blur.
- Share canvas: draws at 2× DPR, snap-to-1200×630 card.

## Screens & copy (real copy, no placeholders)

### 1. HOME `/` — "Today's case"
Floating pill nav: monogram ⚖ `RefAalke` · links: Today, Jury, Shame,
Leaderboard · CTA "Connect".
Hero (full-height, backdrop image at 22% opacity + scrim):
- mono eyebrow: `DAILY CASE — DAY 47 · BASE MAINNET · 0x8004:A169`
- H1: `Real agents. / Fake scores.` (second line in `--fg-55`)
- lede: "Every day one AI agent from the live ERC-8004 registry stands trial.
  You guess. 1,001 AI jurors fetch the chain. The verdict decides your streak."
- live countdown chip: `JURY DECIDES IN 04:12:33` (mono, amber pulse dot)
Case-file card (the concept, so it may live in the first viewport):
- docket header `CASE FILE №047 — CONFIDENTIAL` (red hairline)
- agent name **AlphaTradeBot**, chips: `Ethereum · Base 8453`, wallet in
  mono truncated `0x7f3a…9c21`
- claimed skills list (3), displayed reputation badge `97/100 ★` struck
  through by a diagonal "claimed" tag
- TWO big buttons: `● IT'S REAL` (green fill) / `● IT'S FAKE` (red fill),
  56px min-height, side-by-side on ≥400px
- microcopy: "The jury decides at 20:00 UTC. Free — wallet optional."
- after guess: both buttons lock into one chosen chip + `Filed. See you in
  the Jury Room →` link.

### 2. JURY ROOM `/jury`
- Stage header: `JURY ROOM — DAY 47` + your filed guess chip.
- **7 validator seats** in an arc: monospace `V-01…V-07`, status ring,
  states: idle (dim) → deliberating (amber pulse, `EVIDENCE FETCH…` micro) →
  agreed (green gavel tick) ; footer line `Equivalence Principle · GenLayer
  Testnet Bradbury`.
- tx/status panel (mono): leader/validator round log lines streaming
  (`leader: E1 tokenURI ✓` / `validator: re-derived — score 18±6 ✓`).
- **Evidence trail**: sequential cards from evidence_digest:
  `📄 Registration file: RESOLVED` · `🌐 Endpoints: 0/3 live (404,404,404)` ·
  `🕵️ Reviewer graph: 14 reviewers — 1 funder (90.6%)` ·
  `💸 Payment proofs: 0 of 89` · `🕵️ Jury LLM: score 18/100`.
- **Verdict slam**: full-stage stamp + your result `✔ You caught it —
  Streak 5` or `✘ The scammer fooled you.` + buttons: `Share the verdict`,
  `See Hall of Shame`, `Back to today`.
- Polling: read `get_day_status`/`get_verdict` every 4s when connected;
  demo mode plays a timed sequence.

### 3. STATS `/stats`
- Big numerals: current streak (flame), best, wins, caught-this-week.
- Wordle-style 7-day grid: 🟩 caught / 🟥 fooled / ⬜ missed / 🟨 replay.
- Share card canvas: dark card 1200×630: `I out-judged the AI jury — Day 47`
  + grid + streak + `REALorFAKE · GenLayer`; Download / Copy buttons.
- Empty state: "No cases judged yet — file your first verdict on today's case."

### 4. HALL OF SHAME `/shame`
- Header: `HALL OF SHAME` + count `31 scammers exposed this week`.
- Mugshot cards: B&W high-contrast head (monogram in a steel frame),
  `displayed 97/100 ★` struck, verdict `FAKE`, "killed by:" 2–3 evidence
  bullets (from real digest facts), `Verdict on explorer ↗`.
- Layout: 1 col mobile, 2 col ≥900px; slight per-card rotate (−1°..1°) for
  evidence-board feel.

### 5. LEADERBOARD `/leaderboard`
- Top 10 mono table: rank, truncated address, wins, streak (🔥), best.
- Podium top-3 oversized numerals; user's own row highlighted when connected.

## Guard rails

- Mobile-first: 16px gutters, tap targets ≥44px, `100dvh` heroes, no
  horizontal scroll (`overflow-x: clip`).
- No white flash: `html,body{background:var(--bg)}` first rule.
- If JS/state fails: rest state visible (no permanent opacity 0).
- All on-chain values in mono + `tabular-nums`; addresses always truncated
  with copy-to-clipboard.
- Demo mode (no CONTRACT_ADDRESS): fixtures + timers simulate the full flow;
  banner chip `DEMO MODE` in nav.
