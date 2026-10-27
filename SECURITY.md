# Security

## Report a vulnerability

Email the maintainers (GitHub profile of `@KushinoAkira`). Do not open a public issue for a live secret or an exploitable flaw.

We aim to acknowledge within 7 days and ship a fix or a public note within 30 days for confirmed high/critical issues.

## What this repo contains

This is a **frontend**. It never holds payment keys, JWT signing keys, or database passwords. Anything that starts with `VITE_` is compiled into the browser bundle and is **public**.

## Agent skills installed for security reviews

| Skill | Path | Use when |
|---|---|---|
| `firebase-security-rules-auditor` | `.cursor/skills/firebase-security-rules-auditor` | Auditing Firestore / Storage rules (not used yet — Hosting-only demo) |
| `better-auth-security-best-practices` | `.cursor/skills/better-auth-security-best-practices` | Hardening auth (secrets, rate limits, CSRF, sessions, cookies) when cutting over to a real auth stack |

Copies also live under `.agents/skills/` (CLI install) and the maintainer’s `~/.cursor/skills/`.

## Stack note (AICOS FE demo)

| Layer | Reality today | Security implication |
|---|---|---|
| Firebase | **Hosting only** (`aicos-3028a`) — no Firestore / Storage / Auth | Firestore rules auditor: **N/A** until those products are added |
| Auth | Custom mock via MSW + `localStorage` session (`aicos.session`) | Not Better Auth; apply the **checklist principles**, not the library API |
| API | Same-origin `/api/v1` answered by MSW in the browser | Mock `denyUnless(role)` gates data; real BE must enforce the same |

## Audit mapped from the two skills (2026-10-27)

### Firebase Security Rules Auditor → Hosting / future data

```json
{
  "score": 4,
  "summary": "No Firestore/Storage rules to bypass. Hosting headers are strong. Residual risk is client-held session + mock API in the browser (demo only).",
  "findings": [
    {
      "check": "Authority source",
      "severity": "moderate",
      "issue": "Session user/role lives in localStorage; XSS could forge UI state.",
      "recommendation": "On real BE cutover: httpOnly Secure cookies + server JWT/session. Keep FE RBAC as UX only."
    },
    {
      "check": "Business logic vs rules",
      "severity": "minor",
      "issue": "Mock API previously lacked role checks on platform/brand/POS.",
      "recommendation": "Done for demo: `services/mock/auth.ts` + `denyUnless`. Mirror in gateway."
    },
    {
      "check": "Storage abuse / DoS",
      "severity": "minor",
      "issue": "Login lockout exists; register lacked rate limit.",
      "recommendation": "Done: register attempts share lockout map. Real BE: Redis/IP rate limits."
    }
  ]
}
```

When Firestore or Storage is introduced, run `firebase-security-rules-auditor` against `firestore.rules` / `storage.rules` before any public write path ships.

### Better Auth security checklist → AICOS today

| Checklist item | Demo (mock) | Production target |
|---|---|---|
| Strong secret | N/A (no signing in FE) | Gateway / Better Auth `BETTER_AUTH_SECRET` ≥ 32 chars |
| HTTPS | Firebase Hosting + HSTS | Keep |
| Trusted origins | CSP `connect-src 'self'` | Gateway CORS + Better Auth `trustedOrigins` |
| Rate limiting | Login + register lockout (5 / 15 min) | Per-IP + per-account on `/auth/*` |
| CSRF | Same-origin SPA; no cookie session yet | Enable when moving to cookies (`disableCSRFCheck: false`) |
| Secure cookies | Not used (localStorage) | `httpOnly` + `Secure` + `SameSite=Lax` |
| Opaque session tokens | Mock access tokens are random `atk_…` (not `mock-<userId>`) | Server-side session store or signed JWT |
| Account enumeration | Login + forgot-password generic messages | Keep; dummy work on unknown emails |
| Audit logging | Platform audit list (mock) | `databaseHooks` / BE audit for login, password change, role change |
| OAuth token encryption | N/A | `encryptOAuthTokens: true` if social login is added |

## What we run on every change

| Check | Where |
|---|---|
| Typecheck, lint, unit tests, production build | `.github/workflows/ci.yml` |
| Secret scan (gitleaks), CodeQL, npm audit, dependency review, Trivy | `.github/workflows/security.yml` |
| Dependabot | `.github/dependabot.yml` |
| Firebase deploy (main only) | `.github/workflows/deploy.yml` |

## Local rules

- Copy `.env.example` to `.env.local`. Never commit `.env*`.
- `VITE_USE_MOCK=true` is for demos. Production against the real API must set it to `false` and point `VITE_API_BASE_URL` at the gateway over HTTPS.
- Do not put a Groq / DeepSeek / Firebase service-account JSON in source. Those live in GitHub Actions secrets (`FIREBASE`).
- Do not treat readable SPA paths as a security boundary — enforce RBAC in the UI **and** on the API.
