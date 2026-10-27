---
baseline_schema: "2.0"
pack: "aicos-fe-demo"
document: "roadmap"
status: "active"
updated: "2026-10-27"
code_ref: "uncommitted"
---

# Roadmap

Phases AFE-P6..P10 finished earlier in the same session than AFE-P1..P3; IDs are append-only so the overview is chronological by work, not by ID number.

## Phase overview

| Phase | Title | Status | Depends on |
|---|---|---|---|
| AFE-P6 | FE CI/CD, security, Docker, Firebase Actions | complete | - |
| AFE-P7 | BE CI/CD, security, compose, AI image CI | complete | - |
| AFE-P8 | Local FE+BE run beside vietai | complete | AFE-P7 |
| AFE-P9 | GitHub secrets and workflow permissions | complete | AFE-P6 |
| AFE-P3 | Customer register email and password UX | complete (uncommitted) | - |
| AFE-P1 | Same-origin mock on Firebase Hosting | complete | AFE-P6, AFE-P9 |
| AFE-P2 | Per-table QR on Bàn & QR | complete | AFE-P1 |
| AFE-P10 | Install Baselinedocs skills | complete | - |
| AFE-P4 | Commit and push FE dirty tree | pending | AFE-P1, AFE-P2, AFE-P3 |
| AFE-P11 | Commit BE dirty ai-models / dependabot | pending | AFE-Q4 |
| AFE-P5 | Firebase real API cutover | blocked | AFE-Q2 |

## AFE-P6: FE CI/CD, security, Docker, Firebase Actions

Status: complete

Outcome: FE repo gained CI, Security, Deploy, Docker workflows; gitleaks via Docker image; npm audit high+; Trivy pin `aquasecurity/trivy-action@v0.36.0` with image-scan soft-fail; CodeQL/dependency-review skipped when `github.event.repository.private`; pnpm/action-setup without `version:` (uses `packageManager` pnpm@10.15.0); vite 8.3.5 + overrides for postcss/nanoid/source-map-js; Docker image includes `.figma/make/site.json` (`.figma` not dockerignored); Deploy uses secret `FIREBASE`. See AFE-D5, AFE-D6, AFE-D7, AFE-D8 in `hallucination`.

Final evidence: Commits through `a475229` on `AICOS-FE` main; workflows present under `Frontend/.github/workflows/`.

Next action: none unless CI regresses.

## AFE-P7: BE CI/CD, security, compose, AI image CI

Status: complete

Outcome: BE Security/Docker/AI workflows; gitleaks allowlist for tests and TESTING-GUIDE; SignalR.Client 8.0.32; transformers pin in `ai-models/requirements-serve.txt`; pip-audit soft-fail; Trivy soft-fail; CodeQL skip on private; `compose.security.yml`; `ai-models/compose.local.yml` host postgres 5433; AI CORS allow-list. See AFE-D6, AFE-D7, AFE-D10 in `hallucination`.

Final evidence: Commits through `473c57a` on `AICOS-BE` main.

Next action: none for the green path; BE working tree still has uncommitted ai-models/dependabot edits (AFE-P11).

## AFE-P8: Local FE+BE run beside vietai

Status: complete

Outcome: Docker Desktop started; AICOS stack up without stopping `vietai_*`; postgres remapped to host 5433; FE Vite on 8443 (mock); gateway 8080. Customer `_info` 404 was observed as-is.

Final evidence: Session observation after compose up; compose local overlay at `Backend/ai-models/compose.local.yml`.

Next action: re-verify containers only when starting a local real-mode session.

## AFE-P9: GitHub secrets and workflow permissions

Status: complete

Outcome: User guidance: keep Actions workflow permissions on "Read repository contents and packages permissions"; there is no separate "Packages write" radio - GHCR write comes from job `packages: write` plus package Manage Actions access if 403. FIREBASE JSON must be an Actions **Secret**, not a Variable; Variable content was moved to Secret and Variable deleted. See AFE-D5, AFE-D8; rotation still AFE-Q3.

Final evidence: Deploy workflow reads `secrets.FIREBASE`; user confirmed Variable screenshot then secret migration in chat.

Next action: confirm AFE-Q3 rotation done.

## AFE-P3: Customer register email and password UX

Status: complete (uncommitted)

Outcome: Register gained required email, confirm password, strength meter (Yếu/Trung bình/Khá/Mạnh), hints; submit needs `isAcceptable` + match + terms. Staff login remains `/login`; customer login `/customer-login` (`customer@aicos.local` / `Customer@12345`). Clearing `aicos.session` was needed when staff session redirected customer login. See AFE-D4.

Final evidence: Working tree files; Hosting build included them; no separate Hosting walkthrough of register recorded.

Next action: optional Hosting smoke of customer register route.

## AFE-P1: Same-origin mock on Firebase Hosting

Status: complete

Outcome: Mock `http.ts` same-origin `/api/v1`; MSW start options; firebase rewrite/CSP/SW-Allowed. Fixed guest error "Không thể kết nối dữ liệu giả lập". See AFE-D1, AFE-D3.

Final evidence: Deploy + browser: menu load and place order on `/q/tbl-a1`.

Next action: none.

## AFE-P2: Per-table QR on Bàn & QR

Status: complete

Outcome: QR thumbnail per table; create opens QR; print / PNG / copy; brandAdmin RBAC+nav. See AFE-D2.

Final evidence: Local create `C1` -> `/q/tbl-c1`; Hosting `/branch/tables` after redeploy.

Next action: none.

## AFE-P10: Install Baselinedocs skills

Status: complete

Outcome: `npx skills add the-khiem7/Baselinedocs-Skills` (22 skills, v3.3.0) for Cursor; copied into `~/.cursor/skills/`.

Final evidence: Skill folders present under `C:\Users\h_u_n\.cursor\skills\baselinedocs-*`.

Next action: use skills in new threads; this pack is the first save.

## AFE-P4: Commit and push FE dirty tree

Status: pending

Outcome wanted: Explicit commit (and optional push) of Hosting/mock/QR/register/baseline docs. See AFE-Q1.

Final evidence: not started.

Next action: wait for user ask.

## AFE-P11: Commit BE dirty ai-models / dependabot

Status: pending

Outcome wanted: User decision on Backend dirty paths. See AFE-Q4.

Final evidence: not started.

Next action: ask whether those BE files should be committed separately.

## AFE-P5: Firebase real API cutover

Status: blocked

Outcome wanted: `VITE_USE_MOCK=false` + public API/AI URLs. Blocked on AFE-Q2.

Final evidence: not started.

Next action: keep mock Hosting until decided.

## Optional leftovers (not phased)

Recorded only as questions: AFE-Q5 (public brands API vs sign-up picker), AFE-Q6 (PhoBERT retrain / grounded trap questions). No commitment in this session.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Hosting ahead of git | Demo works, repo lags | AFE-P4 |
| Leaked Firebase SA / Groq | Abuse | AFE-Q3 |
| Private repo without GHAS | CodeQL jobs fail if enabled | AFE-D6 |
| Port 5432 clash with vietai | AICOS postgres crash | AFE-D10 |
| MSW first-load race | Empty menu until reload | recover paths in `http.ts` / `main.tsx` |

## Resume here

1. AFE-P4 - ask to commit/push FE dirty tree (include `docs/baseline/` if desired).
2. AFE-P11 / AFE-Q4 - ask about BE dirty ai-models files.
3. AFE-Q3 - remind secret rotation.
4. Keep Hosting mock until AFE-Q2 closes.
