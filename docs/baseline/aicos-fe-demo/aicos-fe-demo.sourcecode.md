---
baseline_schema: "2.0"
pack: "aicos-fe-demo"
document: "sourcecode"
status: "active"
updated: "2026-10-27"
code_ref: "uncommitted"
---

# Source topology

## FE mock HTTP and Hosting

| Piece | Path | Role |
|---|---|---|
| Env flag | `Frontend/src/config/env.ts` | `useMock` from `VITE_USE_MOCK === "true"`; `demo` from DEV or `VITE_DEMO` |
| Fetch client | `Frontend/src/lib/api/http.ts` | Mock same-origin `/api/v1...`; real `VITE_API_BASE_URL` |
| MSW boot | `Frontend/src/main.tsx` | Worker before mount; one reload if SW not controlling |
| Worker | `Frontend/src/services/mock/browser.ts` | Combined handlers |
| Guest handler | `Frontend/src/services/mock/orderHandlers.ts` | `GET */api/v1/ordering/guest/:token` |
| Worker asset | `Frontend/public/mockServiceWorker.js` | Hosting root |
| Firebase | `Frontend/firebase.json` | SPA rewrite; explicit SW path; CSP; SW-Allowed |
| Project | `Frontend/.firebaserc` | `aicos-3028a` |

Adapter pattern: `export const xApi = env.useMock ? mockXApi : beXApi` (example `orders.ts`).

## FE table QR and auth surfaces

| Piece | Path | Role |
|---|---|---|
| Bàn & QR | `Frontend/src/pages/brand/BranchTables.tsx` | QR per table; print/PNG/copy |
| Route | `Frontend/src/router/pages.ts` | `branch-tables` -> `/branch/tables`; guest `/q/:token` |
| Access | `Frontend/src/router/rbac.ts` | brandAdmin + branchManager |
| Nav | `Frontend/src/components/InternalLayout.tsx` | Bàn & QR entries |
| Guest menu | `Frontend/src/pages/guest/GuestMenu.tsx` | QR ordering |
| Seed tables | `Frontend/src/services/mock/orderDb.ts` | `tbl-a1` .. `tbl-b3` |
| Staff login | `Frontend/src/pages/auth/Login.tsx` | `/login` + demo buttons |
| Customer login | `Frontend/src/pages/auth/CustomerLogin.tsx` | `/customer-login` |
| Customer register | `Frontend/src/pages/auth/CustomerRegister.tsx` | email + password UX |
| Password rules | `Frontend/src/lib/password.ts` | `isAcceptable` + strength |
| Password UI | `Frontend/src/components/PasswordStrength.tsx` | Meter + hints |

## FE CI / Docker

| Piece | Path | Role |
|---|---|---|
| CI | `Frontend/.github/workflows/ci.yml` | install, typecheck, test, build |
| Security | `Frontend/.github/workflows/security.yml` | gitleaks, npm audit, Trivy, CodeQL if public |
| Deploy | `Frontend/.github/workflows/deploy.yml` | mock build + Firebase via `secrets.FIREBASE` |
| Docker | `Frontend/.github/workflows/docker.yml` | nginx image + soft-fail Trivy |
| Image | `Frontend/docker/Dockerfile`, `nginx.conf` | static SPA |
| Ignore | `Frontend/.dockerignore` | must not exclude `.figma` (needs `site.json`) |
| Gitleaks | `Frontend/.gitleaks.toml` | allowlists |
| Ops notes | `Frontend/docs/ops.md`, `SECURITY.md` | operator docs |

## BE CI / local compose (cited paths)

| Piece | Path | Role |
|---|---|---|
| Security | `Backend/.github/workflows/security.yml` | gitleaks, nuget audit, Trivy, CodeQL if public |
| Images | `Backend/.github/workflows/docker-images.yml` | service images + soft-fail Trivy |
| AI CI | `Backend/.github/workflows/ai-models.yml` | pip-audit soft-fail, transformers pin |
| Gitleaks | `Backend/.gitleaks.toml` | allowlist tests + TESTING-GUIDE |
| Packages | `Backend/Directory.Packages.props` | SignalR.Client 8.0.32 |
| Local postgres | `Backend/ai-models/compose.local.yml` | host `5433:5432` |
| Security overlay | `Backend/compose.security.yml` | hardening overlay |

## Guest QR on Hosting (flow)

1. SPA loads; bundle has `useMock` true.
2. `main.tsx` registers `/mockServiceWorker.js` scope `/`, then mounts.
3. Guest opens `/q/tbl-a1`; `ordersApi.guest` -> same-origin `/api/v1/ordering/guest/tbl-a1`.
4. MSW returns menu JSON. Without SW control, SPA rewrite would return HTML; recover/reload paths exist.
