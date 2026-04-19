# Release Rehearsal Guide

This document describes how to prepare, validate, and execute stable releases of AI Operator.

## Table of Contents

1. [Release Types](#release-types)
2. [Pre-Release Checklist](#pre-release-checklist)
3. [Beta Releases](#beta-releases)
4. [Stable Releases](#stable-releases)
5. [Validation Procedures](#validation-procedures)
6. [Required Secrets](#required-secrets)
7. [Troubleshooting](#troubleshooting)

---

## Release Types

### Beta Releases

- **Purpose:** Early testing, feature previews
- **Tag format:** `v1.2.3-beta.1`, `v1.2.3-beta.2`
- **Distribution:** GitHub Releases (pre-release)
- **Auto-update:** Not promoted to stable channel

### Stable Releases

- **Purpose:** Production-ready
- **Tag format:** `v1.2.3`
- **Distribution:** GitHub Releases (stable) + auto-update feed
- **Auto-update:** Promoted to all users

---

## Pre-Release Checklist

Before pushing any stable tag, the following MUST be green:

### 1. CI Pipeline Status

- [ ] `desktop-ci` workflow green for the current macOS release lane
- [ ] `ci.yml` green (build, typecheck, tests, smoke)
- [ ] All required status checks passing

### 2. Version Validation

```bash
# Verify version consistency
pnpm version:check
```

Expected: No version drift warnings.

### 3. Desktop Security Checks

```bash
# Validate CSP, capabilities, and command surface
pnpm check:desktop:security
```

Expected: No security violations.

### 4. Database Migrations

```bash
# Test migration deploy (not dev) in CI-like environment
pnpm --filter @ai-operator/api exec prisma migrate deploy
```

Expected: Migrations apply cleanly.

### 5. Retention Job

```bash
# Run retention cleanup once to verify it works
pnpm --filter @ai-operator/api retention:run-once
```

Expected: Completes without errors.

### 6. Metrics Endpoint

```bash
# Start API locally and verify metrics
curl -H "x-admin-api-key: $ADMIN_API_KEY" http://localhost:3001/metrics
```

Expected: Prometheus-formatted metrics returned.

---

## Beta Releases

### Creating a Beta Tag

```bash
# 1. Ensure you're on main and up to date
git checkout main
git pull origin main

# 2. Create beta tag (follow semver)
git tag v1.2.3-beta.1

# 3. Push tag (triggers CI)
git push origin v1.2.3-beta.1
```

### Beta Validation

```bash
# After CI completes, verify GitHub Release was created
curl -s https://api.github.com/repos/OWNER/REPO/releases/tags/v1.2.3-beta.1 | jq '.prerelease'
# Expected: true
```

Beta releases appear on GitHub as "Pre-release" and are NOT picked up by the stable auto-updater.

Download the workflow artifact `packaged-desktop-validation-beta`, fill it while testing the packaged Mac build, then verify it:

```bash
node scripts/release/verify-packaged-desktop-report.mjs --report /path/to/packaged-desktop-report-beta.template.json
```

---

## Stable Releases

### Creating a Stable Tag

```bash
# 1. Complete ALL pre-release checklist items

# 2. Ensure you're on main and up to date
git checkout main
git pull origin main

# 3. Create stable tag (NO pre-release suffix)
git tag v1.2.3

# 4. Push tag (triggers full release pipeline)
git push origin v1.2.3
```

### Release Pipeline Flow

```
Tag Push
    ↓
CI Workflow
    ↓
Build + Test + Typecheck
    ↓
Desktop Build (macOS)
    ↓
Code Signing + Notarization (macOS)
    ↓
GitHub Release Created
    ↓
Auto-updater Feed Updated
```

Before declaring the stable release ready, download the workflow artifact `packaged-desktop-validation-stable`, fill it on the packaged Mac test machine, then verify it:

```bash
node scripts/release/verify-packaged-desktop-report.mjs --report /path/to/packaged-desktop-report-stable.template.json
```

---

## Validation Procedures

### A) Signed Release Workflow Inputs

**Without using secrets, verify workflow configuration:**

```bash
# Check .github/workflows/desktop-ci.yml exists and has signing steps
ls -la .github/workflows/

# Verify required secrets are documented (not their values)
grep -E "(APPLE_CERTIFICATE|APPLE_ID|WINDOWS_CERTIFICATE)" .github/workflows/*.yml
```

Expected: Workflow references secrets for signing.

### B) API Release Resolution

#### File Fallback Mode (Local)

```bash
# Start API with DESKTOP_RELEASE_SOURCE=file
export DESKTOP_RELEASE_SOURCE=file
export DESKTOP_VERSION=0.1.0
export DESKTOP_WIN_URL=https://example.com/setup.exe
export DESKTOP_MAC_INTEL_URL=https://example.com/intel.dmg
export DESKTOP_MAC_ARM_URL=https://example.com/arm.dmg

# Test downloads endpoint
curl -H "Cookie: ..." http://localhost:3001/downloads/desktop | jq .

# Expected response:
# {
#   "version": "0.1.0",
#   "windowsUrl": "https://example.com/setup.exe",
#   "macIntelUrl": "https://example.com/intel.dmg",
#   "macArmUrl": "https://example.com/arm.dmg"
# }
```

#### GitHub Mode (Requires Outbound Network)

```bash
# Start API with DESKTOP_RELEASE_SOURCE=github
export DESKTOP_RELEASE_SOURCE=github
export GITHUB_REPO_OWNER=yourorg
export GITHUB_REPO_NAME=ai-operator
# GITHUB_TOKEN optional for private repos

# Test downloads endpoint
curl -H "Cookie: ..." http://localhost:3001/downloads/desktop | jq .

# Expected: Resolves from latest GitHub Release
```

**Note:** GitHub mode requires outbound network access to `api.github.com`.

### C) Update Feed Validation

#### File Mode

```bash
# Create test update manifest
mkdir -p apps/api/updates
cat > apps/api/updates/desktop-windows-x86_64.json <<'EOF'
{
  "version": "1.0.0",
  "notes": "Test release",
  "pub_date": "2024-01-01T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "url": "https://example.com/setup.exe",
      "signature": "dW5hdmFpbGFibGU="
    }
  }
}
EOF

# Test updater endpoint
curl http://localhost:3001/updates/desktop/windows/x86_64/0.0.0.json | jq .

# Expected: JSON manifest with version > 0.0.0
```

### D) Packaged Desktop Sign-Off

For the current stable rehearsal, the packaged Mac run must record:

- confirmed local Free AI task execution
- non-workspace / non-screen task execution
- hosted fallback unavailable behavior
- overlay and dragging behavior
- stable updater truth

Windows remains disabled for now, so stable sign-off is macOS-only.

The rehearsal is incomplete until the corresponding packaged desktop report validates cleanly.

#### GitHub Mode

```bash
# Test updater endpoint (requires network)
curl http://localhost:3001/updates/desktop/macos/aarch64/0.0.0.json | jq .

# Expected: Resolves from GitHub Release assets and .sig files
```

### D) Subscription Gating Validation

```bash
# 1. Login and get cookies
curl -c cookies.txt -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password"}'

# 2. Without subscription (expect 402)
curl -b cookies.txt http://localhost:3001/downloads/desktop
# Expected: HTTP 402 Payment Required

# 3. Set subscription to active (via Prisma or Stripe webhook simulation)
# ...

# 4. With subscription (expect 200)
curl -b cookies.txt http://localhost:3001/downloads/desktop
# Expected: HTTP 200 with download URLs
```

---

## Required Secrets

### Stable Signing/Notarization

These secrets are required in GitHub for stable releases:

| Secret | Purpose | Platform |
|--------|---------|----------|
| `APPLE_CERTIFICATE` | Base64-encoded .p12 certificate | macOS |
| `APPLE_CERTIFICATE_PASSWORD` | Certificate password | macOS |
| `APPLE_ID` | Apple ID for notarization | macOS |
| `APPLE_PASSWORD` | App-specific password | macOS |
| `APPLE_TEAM_ID` | Developer Team ID | macOS |
| `WINDOWS_CERTIFICATE` | Base64-encoded .pfx certificate | Windows |
| `WINDOWS_CERTIFICATE_PASSWORD` | Certificate password | Windows |

**Note:** Never commit these secrets. They are configured in GitHub repository settings.

### Artifact Naming Conventions

**Validate before releasing:**

| Platform | Expected Filename Pattern |
|----------|---------------------------|
| Windows | `ai-operator_<version>_x64-setup.exe` |
| macOS Intel | `ai-operator_<version>_x64.dmg` |
| macOS ARM | `ai-operator_<version>_aarch64.dmg` |
| Windows (MSI) | `ai-operator_<version>_x64_en-US.msi` |

**Verify naming:**

```bash
# After CI completes, check release assets
curl -s https://api.github.com/repos/OWNER/REPO/releases/latest | jq '.assets[].name'
```

---

## Troubleshooting

### Desktop CI Fails

**Symptom:** macOS or Windows build fails in CI

**Check:**
1. Certificate secrets are valid and not expired
2. Certificate base64 encoding is correct (no newlines)
3. Apple ID credentials are valid (not locked)
4. Windows certificate password is correct

**Debug locally:**
```bash
# macOS (requires Xcode)
pnpm --filter @ai-operator/desktop tauri:build

# Check signing
 codesign -dv --verbose=4 apps/desktop/src-tauri/target/release/bundle/macos/*.app
```

### Update Feed Returns 404

**Symptom:** `/updates/desktop/...` returns 404

**Check:**
1. `DESKTOP_UPDATE_ENABLED=true`
2. For file mode: `DESKTOP_UPDATE_FEED_DIR` exists and contains JSON files
3. For GitHub mode: `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME` are set
4. Release exists with matching platform/arch asset

### GitHub Rate Limiting

**Symptom:** API returns 403 with rate limit message

**Resolution:**
1. Set `GITHUB_TOKEN` for higher rate limits (5000/hour vs 60/hour)
2. Check cache hit ratio in `/admin/health`
3. Adjust `DESKTOP_RELEASE_CACHE_TTL_SECONDS` if needed

### Version Drift

**Symptom:** `pnpm version:check` fails

**Resolution:**
1. Check `VERSION` file matches intended release
2. Ensure all package.json versions are consistent
3. Run version bump script if available

---

## Release Sign-off

Before marking a release as complete:

- [ ] Stable tag pushed and CI green
- [ ] GitHub Release created with signed artifacts
- [ ] Update feed returns valid JSON for all platforms
- [ ] Downloads endpoint returns 200 for subscribed users
- [ ] Smoke tests pass against released version
- [ ] Rollback plan documented (previous stable tag)

---

## Emergency Procedures

### Reverting a Bad Release

If a stable release has critical issues:

```bash
# 1. Identify previous stable tag
git tag | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -2

# 2. Delete problematic release on GitHub (web UI)
# 3. Delete and recreate tag if needed (careful!)
git push --delete origin v1.2.3
git tag -d v1.2.3

# 4. Notify users via changelog/release notes
# 5. Monitor auto-updater for issues
```

**Note:** Deleting tags can disrupt git history. Prefer creating a hotfix release instead.
