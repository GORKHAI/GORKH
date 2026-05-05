# GORKH Stable Release Sign-Off Checklist

> **WARNING:** Do not create a stable tag until this checklist is fully completed and explicit written approval is obtained.

---

## Preconditions

All items must be checked before stable release approval.

### CI / Quality Gates
- [ ] `pnpm -w test` passes fully (585/585)
- [ ] `pnpm -w typecheck` passes
- [ ] `pnpm -w build` passes
- [ ] `cargo fmt --check` passes (from `apps/desktop/src-tauri`)
- [ ] `cargo clippy --all-targets --all-features -- -D warnings` passes
- [ ] `pnpm check:desktop:security` passes
- [ ] `pnpm check:release:readiness` passes (17/17)
- [ ] Desktop CI workflow passes on `macos-latest` runner
- [ ] No open P0/P1 bugs blocking release

### Beta Dry-Run
- [ ] Beta dry-run executed via GitHub Actions (`workflow_dispatch` → channel: `beta`)
- [ ] macOS arm64 artifact produced and downloaded
- [ ] macOS x86_64 artifact produced and downloaded
- [ ] Code signature verified with `codesign --verify --deep --strict`
- [ ] Gatekeeper assessment passes (`spctl --assess --type execute`)
- [ ] App launches without crash on real Mac hardware
- [ ] Manual QA checklist completed (`docs/qa/workstation-qa-checklist.md`)
- [ ] Beta validation report filled out (`docs/release/beta-dry-run-validation-report.md`)

### Version & Metadata
- [ ] `VERSION` file is finalized and matches intended stable version
- [ ] `apps/desktop/package.json` version matches `VERSION`
- [ ] `apps/desktop/src-tauri/tauri.conf.json` version matches `VERSION`
- [ ] `apps/desktop/src-tauri/Cargo.toml` version matches `VERSION`
- [ ] `apps/api/package.json` version matches `VERSION`
- [ ] `apps/web/package.json` version matches `VERSION`
- [ ] `packages/shared/package.json` version matches `VERSION`
- [ ] Release notes drafted
- [ ] CHANGELOG updated (if maintained)

### Secrets & Infrastructure
- [ ] Apple Developer ID certificate is valid and not expired
- [ ] macOS signing secrets configured in GitHub Actions:
  - `MACOS_CERT_P12_BASE64`
  - `MACOS_CERT_PASSWORD`
  - `MACOS_KEYCHAIN_PASSWORD`
- [ ] Notarization credentials configured (API key mode or Apple ID mode)
- [ ] Updater signing secrets configured:
  - `TAURI_PRIVATE_KEY`
  - `TAURI_KEY_PASSWORD`
- [ ] Updater public key variable configured:
  - `VITE_DESKTOP_UPDATER_PUBLIC_KEY`
- [ ] API runtime variables configured:
  - `VITE_API_HTTP_BASE` (https://)
  - `VITE_API_WS_URL` (wss://)
  - `APP_BASE_URL` (https://)

---

## Explicit Approval Gate

> **CRITICAL:** A stable tag must **NOT** be created until the following approval is documented.

**Release approver:** _______________  
**Approval date:** _______________  
**Approved version:** _______________  
**Approval statement:**

> I confirm that all preconditions above have been verified, the beta dry-run passed, manual QA was completed on real macOS hardware, and I authorize the creation of a stable tag for version _______.

---

## Stable Tag Command

**DO NOT RUN THESE COMMANDS UNTIL APPROVAL IS WRITTEN ABOVE.**

```bash
# 1. Ensure you are on main and fully synced
git checkout main
git pull origin main

# 2. Verify VERSION file matches intended release
cat VERSION

# 3. Create the signed tag
git tag -a v0.0.47 -m "GORKH Desktop v0.0.47 stable release"

# 4. Push the tag (this triggers the release workflow)
git push origin v0.0.47
```

**Expected workflow trigger:**
- The `Desktop Release` workflow will start automatically on tag push
- It will build signed macOS artifacts for both `x86_64` and `aarch64`
- It will notarize the DMG files
- It will generate updater signatures
- It will publish a GitHub Release with the artifacts

---

## Rollback Plan

If the stable release is broken or needs to be pulled:

1. **Do not delete the tag** — deleting tags can confuse GitHub and users.
2. **Mark the release as pre-release** on GitHub to hide it from default views.
3. **Disable updater promotion** by setting the updater endpoint to return a 404 or empty manifest.
4. **Publish a hotfix** by incrementing the patch version and releasing again.
5. **Communicate** to users via the web portal or in-app messaging.

---

## Post-Release Monitoring Checklist

Within 24 hours of stable release:

- [ ] GitHub Release page shows correct artifacts (2 DMG files + updater sigs)
- [ ] macOS x86_64 DMG downloads and installs correctly
- [ ] macOS aarch64 DMG downloads and installs correctly
- [ ] Updater check returns the new version for existing installs
- [ ] No spike in error reports or crash reports
- [ ] API server logs show normal traffic patterns
- [ ] No user complaints about Gatekeeper blocks

Within 1 week:

- [ ] Download/install metrics reviewed
- [ ] Any reported issues triaged and assigned
- [ ] Decision made on next release (patch/minor)
