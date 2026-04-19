---
name: devops-release
description: >
  GORKH DevOps, release pipeline, CI/CD, macOS notarization, Windows code signing,
  Tauri app packaging, Render/Vercel deployment, secrets management, monitoring,
  Docker infrastructure, and security hardening. Use this skill for ANY work involving
  CI/CD pipelines, GitHub Actions, build scripts, release automation, app signing,
  notarization, installer packaging, deployment configuration, environment management,
  Docker setup, monitoring, alerting, incident handling, secrets rotation, or security
  review. Trigger for "CI/CD", "GitHub Actions", "pipeline", "release", "build",
  "sign", "notarize", "notarization", "certificate", "code signing", "installer",
  "DMG", "MSI", "NSIS", ".app", "Render", "Vercel", "deploy", "Docker", "infra",
  "secrets", "monitoring", "Sentry", "metrics", "health check", or "security".
---

# DevOps / Release / Security — GORKH

GORKH ships four artifacts: desktop app, backend API, web frontend, and release pipeline.
That's a large surface area for a desktop+cloud product.

## Release Artifacts

| Artifact | Target | Hosting | Signing |
|---|---|---|---|
| macOS .dmg / .app | Desktop | GitHub Releases or direct URL | Apple Developer ID + Notarization |
| Windows .msi / .exe | Desktop | GitHub Releases or direct URL | Authenticode (EV cert recommended) |
| Linux .AppImage / .deb | Desktop | GitHub Releases or direct URL | GPG signature |
| API server | Backend | Render (Docker) | N/A |
| Web portal | Frontend | Vercel | N/A |

## CI/CD Pipeline (GitHub Actions)

### Desktop Build & Release

```yaml
# .github/workflows/desktop-release.yml
name: Desktop Release

on:
  push:
    tags: ["v*"]

env:
  TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}

jobs:
  build-desktop:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest
            target: aarch64-apple-darwin
            name: macOS ARM64
          - platform: macos-latest
            target: x86_64-apple-darwin
            name: macOS Intel
          - platform: windows-latest
            target: x86_64-pc-windows-msvc
            name: Windows x64

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Rust cache
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: apps/desktop/src-tauri

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # macOS: Import signing certificate
      - name: Import macOS certificate
        if: matrix.platform == 'macos-latest'
        env:
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
        run: |
          echo $APPLE_CERTIFICATE | base64 --decode > certificate.p12
          security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
          security import certificate.p12 -k build.keychain -P "$APPLE_CERTIFICATE_PASSWORD" -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" build.keychain

      # Build Tauri app
      - name: Build desktop app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # macOS notarization
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          # Windows signing
          WINDOWS_CERTIFICATE: ${{ secrets.WINDOWS_CERTIFICATE }}
          WINDOWS_CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
        with:
          tagName: v__VERSION__
          releaseName: "GORKH v__VERSION__"
          releaseBody: "See the assets for download."
          releaseDraft: true
          prerelease: false
          args: --target ${{ matrix.target }}
```

### Backend & Web Deploy

```yaml
# .github/workflows/deploy.yml
name: Deploy Backend & Web

on:
  push:
    branches: [main]
    paths:
      - "apps/api/**"
      - "apps/web/**"
      - "packages/**"

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm -w typecheck
      - run: pnpm -w test
      - run: pnpm -w build

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Render
        uses: johnbeynon/render-deploy-action@v0.0.8
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}

  # Vercel auto-deploys from GitHub on push to main
```

### PR Checks

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks

on:
  pull_request:
    branches: [main]

jobs:
  lint-typecheck-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm -w typecheck
      - run: pnpm -w build
      - run: pnpm -w test

  desktop-rust-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt, clippy
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: apps/desktop/src-tauri
      - name: Rust format check
        run: cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --check
      - name: Rust clippy
        run: cargo clippy --manifest-path apps/desktop/src-tauri/Cargo.toml --all-targets --all-features -- -D warnings

  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm check:desktop:security
      - run: pnpm audit --audit-level=high || true
```

## macOS Notarization

Apple requires notarization for distribution outside the App Store.

### Requirements
- Apple Developer ID Application certificate (not Mac Installer)
- Apple ID with app-specific password
- Team ID

### Tauri Handles It

Tauri's build process handles notarization when these env vars are set:
```
APPLE_CERTIFICATE         # base64-encoded .p12
APPLE_CERTIFICATE_PASSWORD
APPLE_ID                  # Apple ID email
APPLE_PASSWORD            # App-specific password
APPLE_TEAM_ID
```

### Verify Notarization

```bash
# Check if app is notarized
spctl -a -vvv "GORKH.app"
# Should output: "accepted" and "source=Notarized Developer ID"

# Check codesign
codesign -dv --verbose=4 "GORKH.app"
```

## Windows Code Signing

### Requirements
- Authenticode certificate (.pfx)
- EV certificate recommended for SmartScreen reputation

### Tauri Handles It
```
WINDOWS_CERTIFICATE           # base64-encoded .pfx
WINDOWS_CERTIFICATE_PASSWORD
```

### Verify Signing
```powershell
Get-AuthenticodeSignature "GORKH_x64.msi"
# Status should be "Valid"
```

## Tauri Updater

The updater checks the API endpoint for new versions:

```json
// In tauri.conf.json
{
  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ...",
      "endpoints": [
        "https://api.gorkh.com/updates/desktop/{{target}}/{{arch}}/{{current_version}}.json"
      ]
    }
  }
}
```

### Generate Updater Keys
```bash
# Generate signing keypair for Tauri updater
npx @nicholasrice/tauri-plugin-websocket generate
# Or use Tauri CLI:
pnpm tauri signer generate
# Outputs: public key (for tauri.conf.json) + private key (for TAURI_SIGNING_PRIVATE_KEY secret)
```

## Infrastructure

### Docker Compose (Local)

```yaml
# infra/docker-compose.yml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ai_operator
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s

volumes:
  pgdata:
```

### Render Configuration

```yaml
# render.yaml
services:
  - type: web
    name: gorkh-api
    runtime: node
    plan: starter
    buildCommand: pnpm install --frozen-lockfile && pnpm -w build
    startCommand: node apps/api/dist/index.js
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: gorkh-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: REDIS_URL
        fromService:
          name: gorkh-redis
          type: redis
          property: connectionString

databases:
  - name: gorkh-db
    plan: starter
    databaseName: ai_operator
```

## Secrets Management

### GitHub Secrets Required

| Secret | Purpose |
|---|---|
| `APPLE_CERTIFICATE` | Base64 .p12 for macOS signing |
| `APPLE_CERTIFICATE_PASSWORD` | .p12 password |
| `APPLE_ID` | Apple ID for notarization |
| `APPLE_APP_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Apple Developer Team ID |
| `WINDOWS_CERTIFICATE` | Base64 .pfx for Windows signing |
| `WINDOWS_CERTIFICATE_PASSWORD` | .pfx password |
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri updater signing key |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Updater key password |
| `RENDER_SERVICE_ID` | Render API service ID |
| `RENDER_API_KEY` | Render deploy API key |

### Rotation Policy

- Rotate JWT_SECRET on security incidents (invalidates all sessions)
- Apple app-specific passwords: regenerate annually
- Signing certificates: renew before expiry (typically 1-3 year validity)
- Stripe webhook secret: rotate if suspected compromise

## Monitoring

### Health Endpoints

```
GET /         → { status: "ok", version: "x.y.z" }
GET /health   → { status: "healthy", uptime: N }
GET /ready    → { status: "ready", db: true, redis: true }
GET /metrics  → Prometheus-format metrics
```

### Recommended Monitoring Stack

- **Error tracking**: Sentry (both API and desktop)
- **Uptime**: Better Stack or Render built-in
- **Logs**: Render log streams + Pino structured logging
- **Desktop crash reporting**: Sentry Rust SDK in Tauri

### Desktop Diagnostics

Support exports exclude:
- Typed text / file contents
- Terminal arguments
- Auth tokens
- LLM API keys
- Screen capture data

Only include: app version, OS info, runtime status, permission status, error logs (redacted).

## Rules

- Every PR runs: typecheck, build, test, and Rust clippy.
- Desktop releases are tagged (`v*`) and produce signed artifacts.
- macOS builds MUST be notarized — unsigned apps won't run on modern macOS.
- Windows builds SHOULD be Authenticode-signed to avoid SmartScreen warnings.
- Tauri updater artifacts MUST include `.sig` signature files.
- Never commit secrets. Use GitHub Secrets + Render env vars + Vercel env vars.
- Database migrations run on deploy (via Prisma migrate deploy).
- API deploys trigger on pushes to `main` only after tests pass.
- Desktop releases are draft by default — manually publish after QA.
- Docker compose is for local dev only — never use it in production.
