---
baseline_schema: "2.0"
pack: "aicos-fe-demo"
document: "hallucination"
status: "active"
updated: "2026-10-27"
code_ref: "uncommitted"
---

# Hallucination journal

## Entry index

| ID | About | Status | Related |
|---|---|---|---|
| AFE-D1 | Mock fetches use same-origin `/api/v1` on Hosting | current | AFE-P1 |
| AFE-D2 | One QR token per table; brand and branch can manage | current | AFE-P2 |
| AFE-D3 | Firebase demo builds keep mock and demo login on | current | AFE-P1, AFE-P5 |
| AFE-D4 | Register password bar matches reset-password bar | current | AFE-P3 |
| AFE-D5 | FIREBASE is an Actions Secret, not a Variable | current | AFE-P9, AFE-Q3 |
| AFE-D6 | Skip CodeQL on private repos without GHAS | current | AFE-P6, AFE-P7 |
| AFE-D7 | Soft-fail Trivy image scans when DB incomplete | current | AFE-P6, AFE-P7 |
| AFE-D8 | Workflow permissions radio stays read+packages | current | AFE-P9 |
| AFE-D9 | FE must not edit Backend app source | current | - |
| AFE-D10 | AICOS postgres on host 5433 beside vietai | current | AFE-P8 |
| AFE-D11 | pnpm-action has no version pin | current | AFE-P6 |
| AFE-D12 | Three separate web surfaces: public, staff, customer | current | - |
| AFE-Q1 | Commit and push the dirty FE tree now? | open | AFE-P4 |
| AFE-Q2 | When does Hosting leave mock for a real gateway? | open | AFE-P5 |
| AFE-Q3 | Have Firebase SA and Groq keys been rotated? | open | AFE-D5 |
| AFE-Q4 | Commit Backend dirty ai-models / dependabot? | open | AFE-P11 |
| AFE-Q5 | Public brands API vs sign-up brand picker? | open | - |
| AFE-Q6 | PhoBERT retrain / grounded trap questions? | open | - |

## Closed decisions

### AFE-D1: Mock fetches use same-origin `/api/v1` on Hosting

Decision: In mock mode, `http.ts` builds absolute same-origin URLs under `/api/v1/...` (prefixing paths that omit `/api/`), and does not use `VITE_API_BASE_URL` or localhost.

Why: HTTPS Firebase blocked `http://localhost` (mixed content), shown as "Không thể kết nối dữ liệu giả lập" on `/q/:token`.

What breaks if ignored: Guest QR and mock APIs fail on Hosting while local Vite still works.

Rejected alternative: Widen CSP `connect-src` for localhost - still mixed content on HTTPS; guests have no local gateway.

### AFE-D2: One QR token per table; brand and branch can manage

Decision: Keep `qrToken` per table (`tbl-<code>`) and expose QR on `/branch/tables` for `branchManager` and `brandAdmin`, with print, PNG, and copy-link.

Why: Each table needs its own guest URL; QR was easy to miss behind a button-only UI.

What breaks if ignored: Operators cannot mint/print stickers; guests share one wrong link.

Rejected alternative: Generate QR on cashier Tables - that screen is bill/pay (`UC-28`), not UC-23 setup.

### AFE-D3: Firebase demo builds keep mock and demo login on

Decision: Manual Hosting deploys use `VITE_USE_MOCK=true` and `VITE_DEMO=true`.

Why: No public gateway is wired to this Hosting project yet.

What breaks if ignored: Real-mode build calls a missing API; without demo flag staff must type credentials on Hosting.

Rejected alternative: Real mode pointing at localhost:8080 - unreachable from visitors.

### AFE-D4: Register password bar matches reset-password bar

Decision: Register requires email, confirm password, and `isAcceptable` (min 8, uppercase, digit) with shared meter/hints from `src/lib/password.ts`.

Why: User asked for email, confirm, strength meter, and hints aligned with reset.

What breaks if ignored: Weak/mismatched passwords pass UI; missing email blocks recovery stories.

Rejected alternative: Softer bar for register only - splits rules from reset.

### AFE-D5: FIREBASE is an Actions Secret, not a Variable

Decision: Store the Firebase service-account JSON only in repository Actions Secrets as `FIREBASE`; Deploy must not read Variables.

Why: Variables are visible to more contexts; empty/wrong FIREBASE broke Deploy; user had pasted JSON into Variables.

What breaks if ignored: Deploy fails or leaks credentials via Variables UI.

Rejected alternative: Keep JSON in Variables for "easier editing" - wrong sensitivity class.

### AFE-D6: Skip CodeQL on private repos without GHAS

Decision: FE and BE Security workflows run CodeQL (and FE dependency-review) only when `!github.event.repository.private`.

Why: Private repos without GitHub Advanced Security returned "Resource not accessible" / code scanning not enabled and failed Security.

What breaks if ignored: Security workflow stays red on both private repos.

Rejected alternative: Force-enable GHAS - paid; not available for this student setup.

### AFE-D7: Soft-fail Trivy image scans when DB incomplete

Decision: Container image Trivy steps use `continue-on-error` (and related exit-code 0 where applied) after pinning `trivy-action@v0.36.0`.

Why: Trivy DB "no vulnerability details" failed otherwise green image jobs.

What breaks if ignored: Docker/image CI flaps on scanner infra, not on app CVEs.

Rejected alternative: Fail closed on every Trivy error - blocks merges without actionable CVE data.

### AFE-D8: Workflow permissions radio stays read+packages

Decision: Leave GitHub Actions general workflow permission on "Read repository contents and packages permissions"; do not hunt a separate "Packages write" radio.

Why: Job YAML already requests `packages: write` for GHCR; a later 403 is fixed on the package's Manage Actions access, not a missing org-wide toggle.

What breaks if ignored: User churns Settings looking for a control that does not exist; wrong radio can strip needed reads.

Rejected alternative: Set workflows to read-write all - over-broad default token.

### AFE-D9: FE must not edit Backend app source

Decision: Agent work on Backend is limited to authorised `ai-models` and DevOps infra; product BE gaps are reported and covered by FE mocks.

Why: Capstone ownership / dual-repo boundary set by the user for this FE-led session.

What breaks if ignored: Unreviewed BE changes; FE/BE drift without owner sign-off.

Rejected alternative: "Just patch the API in Backend" for every mock gap - violates the standing rule.

### AFE-D10: AICOS postgres on host 5433 beside vietai

Decision: Map AICOS postgres to host `5433` via `Backend/ai-models/compose.local.yml` overlay; leave `vietai_*` (including postgres 5432) running.

Why: Host 5432 was taken; killing vietai was forbidden; unclean password/volume issues appeared when sharing 5432.

What breaks if ignored: AICOS postgres exits or auth-fails; other student stacks break if stopped.

Rejected alternative: Stop vietai_postgres to free 5432 - violates coexistence rule.

### AFE-D11: pnpm-action has no version pin

Decision: FE workflows call `pnpm/action-setup@v4` without `version:`; version comes from `package.json` `packageManager`.

Why: Pinning `version: 10` while packageManager was 10.15.0 caused "Multiple versions" action errors.

What breaks if ignored: CI install job fails before tests.

Rejected alternative: Duplicate version in YAML and packageManager - drifts again.

### AFE-D12: Three separate web surfaces: public, staff, customer

Decision: Keep three portals with separate chrome and entry URLs:
- Public marketing: `/`, `/contact`, `/terms`, `/privacy` (`PublicChrome`) — for brand owners / SaaS sales; no customer-app nav or CTAs into `/menu` or customer auth as primary actions.
- Staff / brand ops: `/login` then role dashboards (`InternalLayout`).
- Customer: `/customer-login`, `/customer` routes, and `/q/:token` (`CustomerFrame`); dine-in starts from table QR, not from the marketing home.

Why: Mixing customer login on the marketing home made `/` feel like the customer app and bounced signed-in customers away from the landing story.

What breaks if ignored: Owners and guests share one mental model; session on one portal hijacks the other.

Rejected alternative: Single “universal” home with both owner and customer primary CTAs — caused the redirect/`customer` confusion.

## Open questions

### AFE-Q1: Commit and push the dirty FE tree now?

Dirty includes mock HTTP, firebase.json, BranchTables, RBAC/nav, CustomerRegister, password helpers, and `docs/baseline/`. Needs explicit user ask.

### AFE-Q2: When does Hosting leave mock for a real gateway?

Needs public `VITE_API_BASE_URL` / AI URL, CORS, auth, and deploy env changes. Until then AFE-D3 holds.

### AFE-Q3: Have Firebase SA and Groq keys been rotated?

FIREBASE JSON lived in Variables then Secret; Groq appeared in chat. Rotation status unknown.

### AFE-Q4: Commit Backend dirty ai-models / dependabot?

`Backend` status shows modified `ai-models/.dockerignore`, `Dockerfile`, `compose.yml`, `tests/test_guardrails.py`, `.github/dependabot.yml`. Not deployed with the FE Hosting work.

### AFE-Q5: Public brands API vs sign-up brand picker?

Leftover from proposal alignment: whether public brand listing API exists for customer sign-up brand choice. Not implemented in this session.

### AFE-Q6: PhoBERT retrain / grounded trap questions?

Optional AI leftover (retrain / trap questions for grounded answers). Not worked in this session beyond being listed as leftover.
