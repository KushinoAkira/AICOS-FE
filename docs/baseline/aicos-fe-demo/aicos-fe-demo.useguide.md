---
baseline_schema: "2.0"
pack: "aicos-fe-demo"
document: "useguide"
status: "active"
updated: "2026-10-27"
code_ref: "uncommitted"
---

# Operator guide

## Firebase mock demo URLs

| Surface | URL |
|---|---|
| Home | https://aicos-3028a.web.app |
| Guest QR sample | https://aicos-3028a.web.app/q/tbl-a1 |
| Staff login | https://aicos-3028a.web.app/login |
| Customer login | https://aicos-3028a.web.app/customer-login |
| Bàn & QR | https://aicos-3028a.web.app/branch/tables |

Hard-reload (Ctrl+F5) after deploy if the old mock error or stale SW remains.

## Demo accounts (mock)

| Who | Login route | Email | Password |
|---|---|---|---|
| Branch manager (Bàn & QR) | `/login` | `manager@aicos.local` | `Staff@12345` |
| Super admin | `/login` | `admin@aicos.local` | `Admin@12345` |
| Brand (maps to manager on Hosting) | `/login` | `brand@aicos.local` | `Staff@12345` |
| Cashier | `/login` | `cashier@aicos.local` | `Staff@12345` |
| Customer | `/customer-login` | `customer@aicos.local` | `Customer@12345` |

If customer login bounces to a staff home, clear `localStorage` key `aicos.session` and retry.

Hosting builds need `VITE_DEMO=true` for the staff quick-login buttons (manual deploy used that flag). CI Deploy workflow currently sets only `VITE_USE_MOCK=true`.

## Create / print table QR

1. Sign in as manager on `/login`.
2. Open **Bàn & QR**.
3. **Thêm bàn** -> code + seats -> **Tạo bàn và QR**.
4. Modal: copy link, **Tải PNG**, or **In**.
5. Guest URL shape: `/q/tbl-<code-lower>` (example `C1` -> `/q/tbl-c1`).

Seeded: A1..A3, B1..B3.

## Manual Hosting redeploy

From `Frontend/`:

1. `$env:VITE_USE_MOCK="true"; $env:VITE_DEMO="true"; npx --no-install vite build`
2. `npx --yes firebase-tools@13 deploy --only hosting --non-interactive --project aicos-3028a`

## GitHub Actions notes (FE)

| Topic | Practice |
|---|---|
| FIREBASE | Repository **Secret** (service-account JSON), never Variable |
| Workflow permissions | "Read repository contents and packages permissions" |
| GHCR write | Job `packages: write`; if 403, package Manage Actions -> Write |
| Private + no GHAS | CodeQL job skipped by `if: !github.event.repository.private` |

## Local stack notes

| Service | Typical host |
|---|---|
| FE Vite | `http://localhost:8443` |
| Gateway | `http://localhost:8080` |
| AICOS postgres | host `5433` via `Backend/ai-models/compose.local.yml` |
| vietai postgres / Ollama | `5432` / `11434` - do not stop |

Do not expect mock Hosting to reach a laptop gateway. Real mode needs a decided public API (AFE-Q2 in `hallucination`).
