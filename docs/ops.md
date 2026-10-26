# Operations (frontend)

## GitHub

Required on the `AICOS-FE` repository (Settings → Secrets and variables → Actions):

| Secret | How to create |
|---|---|
| `FIREBASE` | **Actions secret** (not a Variable). Firebase Console → Project settings → Service accounts → Generate new private key. Paste the whole JSON. |

Create a GitHub Environment named `production` (Settings → Environments). Turn on required reviewers if more than one person can deploy.

Recommended branch protection on `main`: require the `CI` and `Security` checks, dismiss stale reviews, no force-push.

Dependabot opens weekly PRs for npm, Actions and the web image.

## Deploy

- **Automatic:** push to `main` → `.github/workflows/deploy.yml` builds with `VITE_USE_MOCK=true` and deploys Firebase Hosting (`https://aicos-3028a.web.app`).
- **Manual:** Actions → Deploy → Run workflow.
- **Laptop:** `npx firebase-tools deploy --only hosting`.

The public site is a **mock demo**. To point a build at a live gateway, set `VITE_USE_MOCK=false` and `VITE_API_BASE_URL=https://<gateway>/api/v1` at build time (Firebase preview channel or the Docker image). Those values are public; never put a signing key in `VITE_*`.

## Docker

```powershell
docker compose up --build
# http://127.0.0.1:8088
```

The image is non-root, read-only, no Linux capabilities, 128 MB RAM. Pair it with the Backend stack:

```powershell
# Backend folder
docker compose -f docker-compose.yml -f ai-models/compose.yml up -d
```
