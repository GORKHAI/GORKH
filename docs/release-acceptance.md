# Release Acceptance Checklist (Iteration 29)

This is the **final step** before shipping AI Operator desktop installers to customers. This checklist must be completed in full for every stable release.

---

## Pre-Flight Checks

Run these locally in your Codespace/development environment before tagging:

### 1. Build and Test

```bash
# Must all pass
pnpm -w build
pnpm -w typecheck
pnpm -w test
pnpm -w lint:ci
```

- [ ] `pnpm -w build` completes without errors
- [ ] `pnpm -w typecheck` reports no TypeScript errors
- [ ] `pnpm -w test` shows all tests passing (30 pass, 1 skip is expected)
- [ ] `pnpm -w lint:ci` completes without issues

### 2. Final Smoke Test

```bash
pnpm smoke:final
```

- [ ] Infra starts (Postgres + Redis)
- [ ] Migrations apply cleanly
- [ ] API starts in production-like mode
- [ ] Web starts successfully
- [ ] All HTTP smoke checks pass:
  - User registration/login
  - CSRF token handling
  - CSRF protection (403 without header)
  - Subscription gating
  - Downloads endpoint
  - Update feed endpoint
  - Admin health endpoint
  - Metrics endpoint
  - Rate limiting
- [ ] Redis device command E2E tests pass (4/4)

### 3. Version Check

```bash
pnpm version:check
```

- [ ] No version drift warnings
- [ ] All package versions are consistent

### 4. Desktop Security Check

```bash
pnpm check:desktop:security
```

- [ ] CSP configuration valid
- [ ] Tauri capabilities properly locked down
- [ ] No unauthorized commands exposed

### 5. Migration Safety

```bash
# In a clean environment
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migrate
```

- [ ] Migrations apply cleanly with `prisma migrate deploy`
- [ ] No destructive changes without corresponding code updates

---

## Release Steps

### Beta Release Flow

Use for early testing, feature previews, and validation:

```bash
# 1. Ensure you're on main and up to date
git checkout main
git pull origin main

# 2. Run pre-flight checks (above)
# ... all must pass ...

# 3. Create beta tag (follows semver with prerelease suffix)
git tag v1.2.3-beta.1

# 4. Push tag (triggers desktop-ci workflow)
git push origin v1.2.3-beta.1
```

Beta releases:
- Appear on GitHub as "Pre-release"
- Do NOT include `.sig` signature files (updater will not pick them up)
- Are NOT promoted to the stable auto-update channel
- Can be downloaded directly from GitHub for manual testing

### Stable Release Flow

This is the current shipping lane. Stable sign-off is macOS-only for now:

```bash
# 1. Ensure ALL pre-flight checks pass

# 2. Verify CI is green on main
gh run list --workflow=desktop-ci --limit 5
# Check that the latest run on main is green

# 3. Create stable tag (NO prerelease suffix)
git checkout main
git pull origin main
git tag v1.2.3

# 4. Push tag (triggers full release pipeline)
git push origin v1.2.3
```

---

## Post-Release Validation

After CI completes the release (typically 10-15 minutes):

### 0. Validate The Packaged Desktop Report

Download the workflow artifact named `packaged-desktop-validation-stable`, run the packaged checks on a real Mac, fill the JSON report, then verify it:

```bash
node scripts/release/verify-packaged-desktop-report.mjs --report /path/to/packaged-desktop-report-stable.template.json
```

- [ ] Stable packaged report validated after real-machine macOS testing
- [ ] Report records outcomes for local Free AI, non-workspace tasks, fallback-unavailable behavior, overlay/dragging, and stable updater truth

### 1. Verify GitHub Release

```bash
# Stable release verification
GITHUB_REPO_OWNER=yourorg \
GITHUB_REPO_NAME=ai-operator \
RELEASE_TAG=v1.2.3 \
CHANNEL=stable \
pnpm release:verify:github
```

Expected output:
```
RELEASE_OK=true
VERSION=1.2.3
MISSING_ASSETS=[]
```

- [ ] Release exists on GitHub
- [ ] All required macOS assets present (2 installers + 2 signatures)
- [ ] Asset names follow convention: `ai-operator-desktop_{VERSION}_{platform}.{ext}`

### 2. Verify API in GitHub Mode

Set your API to use GitHub as the release source:

```bash
# .env.prod
DESKTOP_RELEASE_SOURCE=github
GITHUB_REPO_OWNER=yourorg
GITHUB_REPO_NAME=ai-operator
```

Then verify:

```bash
# Start API in production mode
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d api

# Run verification
API_BASE=https://api.yourdomain.com \
USER_EMAIL=test@example.com \
USER_PASSWORD=testpass \
ADMIN_API_KEY=your-admin-key \
pnpm release:verify:api
```

- [ ] `/downloads/desktop` returns correct URLs from GitHub
- [ ] `/updates/desktop/{platform}/{arch}/{version}.json` returns valid manifest with signatures
- [ ] `/metrics` accessible with admin key

### 3. Manual Desktop Updater Check

On a test machine with the previous stable version installed:

1. Open AI Operator desktop app
2. Go to Settings
3. Check for updates
4. Verify update is detected and can be downloaded

- [ ] macOS (Intel): Update detected and installs
- [ ] macOS (Apple Silicon): Update detected and installs
- [ ] Windows remains disabled for now

### 3A. Packaged Desktop Runtime Check

On the packaged Mac build used for sign-off:

1. Confirm a simple local Free AI task and verify it executes after confirmation.
2. Confirm a non-workspace, non-screen task and verify it does not hard-block on setup.
3. Test overlay mode and verify the main window still drags from the visible top chrome.
4. Validate the stable updater truth: broken feed surfaces a real error instead of silent no-update.

- [ ] Confirmed local Free AI task executes in the packaged app
- [ ] Non-workspace task starts without unrelated blockers
- [ ] Overlay stays compact and the normal window drags correctly
- [ ] Stable updater truth is verified in the packaged app

### 4. Smoke Test Production Deploy

Run a final smoke test against your production API:

```bash
API_BASE=https://api.yourdomain.com \
WEB_ORIGIN=https://app.yourdomain.com \
ADMIN_API_KEY=your-admin-key \
bash scripts/final-smoke.sh
```

- [ ] Production API passes all smoke checks

---

## Rollback Procedure

If a release has critical issues:

### Option 1: Pin to Previous Tag (Fastest)

```bash
# Edit .env.prod
DESKTOP_RELEASE_TAG=v1.2.2  # Previous stable

# Redeploy API
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d api
```

### Option 2: Mark Release as Draft (Prevents New Downloads)

1. Go to GitHub Releases
2. Edit the problematic release
3. Check "This is a pre-release" (if not already)
4. Or click "Delete" (use with caution, affects git tags)

### Option 3: Hotfix Release (Recommended)

```bash
# 1. Create hotfix branch from the problematic tag
git checkout -b hotfix/v1.2.4 v1.2.3

# 2. Apply minimal fix
git cherry-pick <fix-commit>

# 3. Push branch and tag
git push origin hotfix/v1.2.4
git tag v1.2.4
git push origin v1.2.4
```

**Important:** Do NOT delete stable releases if users may have already downloaded them. Prefer hotfix releases.

---

## Sign-off

Before marking release as complete, verify:

- [ ] Pre-flight checks all passed
- [ ] Beta validation complete (for stable releases)
- [ ] GitHub Release verified with `release:verify:github`
- [ ] API feed verified with `release:verify:api`
- [ ] Desktop updater tested on all platforms
- [ ] Rollback plan documented
- [ ] Release notes published

**Release Owner:** _______________  
**Date:** _______________  
**Version:** _______________

---

## Quick Reference: Verification Commands

```bash
# Full verification suite
pnpm version:check && \
pnpm check:desktop:security && \
pnpm smoke:final && \
GITHUB_REPO_OWNER=yourorg GITHUB_REPO_NAME=ai-operator RELEASE_TAG=v1.2.3 CHANNEL=stable pnpm release:verify:github && \
API_BASE=https://api.yourdomain.com ADMIN_API_KEY=yourkey pnpm release:verify:api

# Individual checks
pnpm version:check
pnpm check:desktop:security
pnpm smoke:final
pnpm release:verify:github
pnpm release:verify:api
```

---

## Emergency Contacts

- Release Engineering: [contact]
- Infrastructure On-Call: [contact]
- Security Team: [contact]
