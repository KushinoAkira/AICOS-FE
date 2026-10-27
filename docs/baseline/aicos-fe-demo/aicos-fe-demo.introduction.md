---
baseline_schema: "2.0"
pack: "aicos-fe-demo"
document: "introduction"
status: "active"
updated: "2026-10-27"
code_ref: "uncommitted"
---

# AICOS FE ops and demo (session capture)

## Scope

Brownfield capture of one Cursor session on the AICOS capstone workspace `Project/` (not itself a git repo). Two remotes: `Frontend/` -> `https://github.com/KushinoAkira/AICOS-FE.git` (private), `Backend/` -> `https://github.com/KushinoAkira/AICOS-BE.git` (private). GitHub user `KushinoAkira`.

This pack covers: FE/BE GitHub Actions CI, security scanning, Docker/GHCR, Firebase Hosting mock demo (`aicos-3028a`), local Docker stack coexistence with `vietai_*`, customer auth UX (login path + register password), branch table QR tooling, and installing Baselinedocs skills on the agent machine.

Out of scope files/trees: `Frontend/ExtentionProject(donotpush)/`, `Mobile/`, rewriting Backend application services (only authorised DevOps / `ai-models` paths were in play). Pack files live under `Frontend/docs/baseline/` even when they cite Backend paths.

## Current truth

| Area | State |
|---|---|
| FE HEAD | `a475229` skip CodeQL on private |
| BE HEAD | `473c57a` skip CodeQL on private |
| FE Hosting | https://aicos-3028a.web.app mock + demo login; guest `/q/tbl-a1` and `/branch/tables` verified after manual deploy |
| FE working tree | Dirty: mock HTTP, firebase.json, BranchTables QR UX, RBAC/nav, CustomerRegister + untracked password helpers + this `docs/baseline/` pack |
| BE working tree | Dirty: `ai-models` Docker/compose/tests and `.github/dependabot.yml` (not part of the Hosting demo land) |
| Local stack (last observed) | FE Vite `:8443`, gateway `:8080`, AICOS postgres host `:5433`, `vietai_*` left running on `:5432` / Ollama `:11434` |
| Agent skills | `the-khiem7/Baselinedocs-Skills` v3.3.0 installed under `~/.cursor/skills/` and `~/.agents/skills/` |

## Target

Keep the Firebase mock demo and table-QR operator path working, land FE (and optionally BE) dirty trees only when the user asks, rotate leaked secrets, and only then decide a real API Hosting cutover.

## Constraints (standing)

- Senior FE stance: do not modify Backend application source except authorised `Backend/ai-models/` plus authorised DevOps (`/.github`, compose overlays, `.gitleaks.toml`, `Directory.Packages.props` SignalR bump for CI). Prefer FE mocks when a BE API gap appears.
- Never modify or push `Frontend/ExtentionProject(donotpush)/`.
- Commit/push only on explicit user ask; never update git config; no Co-authored-by; author identity already `Duy Hieu <duyhieunguyen2672004@gmail.com>`.
- Do not stop other projects' Docker containers (`vietai_*`).
- FE: files ~300 lines, TS strict, no hard-coded hex in new components; proposal v2 role/AI scope (Super Admin creates brands; customer one brand; limited AI UCs + landing FAQ search).
- Groq key and Firebase service-account JSON that appeared in chat / Variables are leaked; rotate outside code edits.
