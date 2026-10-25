# Security

## Report a vulnerability

Email the maintainers (GitHub profile of `@KushinoAkira`). Do not open a public issue for a live secret or an exploitable flaw.

We aim to acknowledge within 7 days and ship a fix or a public note within 30 days for confirmed high/critical issues.

## What this repo contains

This is a **frontend**. It never holds payment keys, JWT signing keys, or database passwords. Anything that starts with `VITE_` is compiled into the browser bundle and is **public**.

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
