# Desktop Release Process

GitHub Releases remain the canonical source of truth for desktop downloads and updater signatures when `DESKTOP_RELEASE_SOURCE=github`.

Iteration 25 splits the release lane into two channels:

- `beta`: GitHub pre-releases with signed and notarized macOS artifacts, unsigned Windows artifacts, and updater promotion disabled.
- `stable`: a macOS-only signed and notarized release lane, with updater promotion enabled. Windows remains disabled for now.

## Channels And Tags

Preferred tag conventions:

- Stable: `vX.Y.Z`
- Beta: `vX.Y.Z-beta.N`

The `Desktop Release` workflow also supports manual `workflow_dispatch` runs with:

- `channel=beta`
- `channel=stable`

Manual runs build normalized artifacts and upload them as workflow artifacts. Tag-driven runs also publish to GitHub Releases.

Channel rules:

- `stable` cannot use a beta version string.
- `beta` tags must use the `vX.Y.Z-beta.N` format.
- Beta releases are published as GitHub pre-releases.

## Release Asset Naming Convention

Each tagged release should contain these assets:

- `ai-operator-desktop_<version>_windows_x86_64.msi`
- `ai-operator-desktop_<version>_windows_x86_64.msi.sig` for `stable` only
- `ai-operator-desktop_<version>_macos_x86_64.dmg`
- `ai-operator-desktop_<version>_macos_x86_64.dmg.sig` for `stable` only
- `ai-operator-desktop_<version>_macos_aarch64.dmg`
- `ai-operator-desktop_<version>_macos_aarch64.dmg.sig` for `stable` only

The `<version>` segment matches the git tag without the leading `v`.

## Channel Behavior

### Beta

- Builds Windows and macOS installers.
- Leaves Windows beta installers unsigned.
- Imports the macOS Developer ID certificate into a temporary keychain.
- Builds macOS bundles with a Developer ID signing identity.
- Submits the final macOS `.dmg` to Apple notarization, waits for completion, staples the ticket, and validates the result with `spctl`.
- Does not upload updater `.sig` files.
- Publishes the GitHub Release as a pre-release.
- Marks the release notes as `MACOS-SIGNED BETA` and explicitly calls out that Windows beta artifacts remain unsigned.

Beta artifacts are intentionally not promotable for auto-update.

### Stable

- Imports the macOS Developer ID certificate into a temporary keychain.
- Builds macOS bundles with a Developer ID signing identity.
- Submits the final `.dmg` to Apple notarization, waits for completion, staples the ticket, and validates the result with `spctl`.
- Generates updater `.sig` files only after the final platform signing/notarization steps complete.
- Publishes macOS artifacts only. Windows remains disabled for now.

Updater promotion is enabled only for this channel.

## GitHub Secrets For Signed Releases

Beta macOS releases require the macOS signing and notarization secrets below.

Stable releases additionally require updater-signing secrets and the updater public key workflow variable.

### Existing updater-signing secrets

- `TAURI_PRIVATE_KEY`: Tauri updater private key.
- `TAURI_KEY_PASSWORD`: password for the updater private key.

These secrets are still stored under the existing names. The workflow maps them to Tauri's current signer env vars when it generates final updater `.sig` files.

### macOS code-signing secrets

- `MACOS_CERT_P12_BASE64`: base64-encoded Developer ID Application `.p12`.
- `MACOS_CERT_PASSWORD`: password for the `.p12`.
- `MACOS_KEYCHAIN_PASSWORD`: temporary keychain password used on the runner.

### macOS notarization secrets

Preferred App Store Connect API key method:

- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER_ID`
- `APPLE_API_KEY_P8_BASE64`

Fallback Apple ID method:

- `APPLE_ID`
- `APPLE_TEAM_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`

Stable runs fail early if:

- any required updater or macOS signing secret is missing, or
- neither notarization credential set is complete.

The workflow never falls back from `stable` to unsigned behavior.

## How To Run Releases

### Stable release from a tag

```bash
git tag v0.2.0
git push origin v0.2.0
```

### Beta release from a tag

```bash
git tag v0.2.1-beta.1
git push origin v0.2.1-beta.1
```

### Manual beta validation build

Use GitHub Actions `workflow_dispatch` with:

- `channel=beta`

This produces workflow artifacts only.

### Manual stable validation build

Use GitHub Actions `workflow_dispatch` with:

- `channel=stable`

This is the safest way to validate certificate and notarization wiring before cutting a real tag. On non-tag runs it produces workflow artifacts only.

## Updater Promotion Rules

`DESKTOP_RELEASE_SOURCE=github` continues to read release metadata from GitHub Releases.

Default behavior:

- `DESKTOP_RELEASE_TAG=latest` follows GitHub's latest stable release behavior and ignores GitHub pre-releases.
- Stable clients therefore do not receive beta updates by default.

Explicit override:

- Set `DESKTOP_RELEASE_TAG` to a specific tag such as `v0.2.1-beta.1` if you intentionally want the API to point at a beta release.

Practical effect:

- Stable channel releases include updater `.sig` assets generated from the final trusted artifacts.
- Beta channel releases omit updater `.sig` assets and are marked as GitHub pre-releases.

## Base64 Secret Preparation

Run these locally, never in CI, and never commit the raw files.

Linux:

```bash
base64 -w 0 path/to/windows-cert.pfx
base64 -w 0 path/to/macos-cert.p12
base64 -w 0 path/to/AuthKey_ABC123XYZ.p8
```

macOS:

```bash
base64 < path/to/windows-cert.pfx | tr -d '\n'
base64 < path/to/macos-cert.p12 | tr -d '\n'
base64 < path/to/AuthKey_ABC123XYZ.p8 | tr -d '\n'
```

Store the resulting strings as GitHub Actions secrets. Do not upload raw certificate or key files to the repository.

## Certificate Rotation

Recommended rotation process:

1. Generate the replacement certificate or API key outside this repository.
2. Upload the new GitHub Actions secrets without deleting the old ones yet.
3. Run `workflow_dispatch` with `channel=stable` to validate signing, notarization, stapling, and updater signature generation against workflow artifacts.
4. Cut a real stable tag only after the manual stable validation run succeeds.
5. Remove superseded secrets from GitHub after the replacement release is confirmed.

Additional guidance:

- Rotate macOS and updater-signing secrets independently when possible.
- Keep certificate passwords unique per environment.
- Treat updater keys with the same care as platform certificates: losing the private key prevents future update signing continuity.

## API Configuration

Set these values in `apps/api/.env` for GitHub-backed desktop releases:

- `DESKTOP_RELEASE_SOURCE=github`
- `GITHUB_REPO_OWNER`
- `GITHUB_REPO_NAME`
- `GITHUB_TOKEN` (optional; useful for private repositories or higher rate limits)
- `DESKTOP_RELEASE_CACHE_TTL_SECONDS=60`
- `DESKTOP_RELEASE_TAG=latest`

If you need a deterministic beta feed for internal testing, pin a specific beta tag with `DESKTOP_RELEASE_TAG=vX.Y.Z-beta.N`.

If you want the local stub mode instead, keep:

- `DESKTOP_RELEASE_SOURCE=file`

## Post-Release Checks

After publishing a stable release:

1. Start the API with `DESKTOP_RELEASE_SOURCE=github`.
2. Call:
   ```bash
   curl http://localhost:3001/updates/desktop/darwin/aarch64/0.0.0.json
   ```
3. Confirm the response references the expected stable version and `.sig` asset.
4. Log in as an active subscriber and open `/download`.
5. Confirm the displayed version and download links match the stable GitHub Release assets.

## Packaged Desktop Validation Reports

Source checks and CI are not enough for the desktop release gate. Before cutting or promoting a desktop release, record the real packaged-app results from a Mac in a structured report and verify that report locally.

Generate a report template:

```bash
node scripts/release/verify-packaged-desktop-report.mjs --template --channel beta --version 0.2.1-beta.1 --machine macos-sonoma-arm64 > /tmp/gorkh-beta-packaged-report.json
node scripts/release/verify-packaged-desktop-report.mjs --template --channel stable --version 0.2.1 --machine macos-sonoma-arm64 > /tmp/gorkh-stable-packaged-report.json
```

The `Desktop Release` workflow now also uploads a channel-specific artifact. For the current shipping lane, use `packaged-desktop-validation-stable` and complete it on a real Mac before promotion.

Fill the report after running the packaged checks on the real machine, then verify it:

```bash
node scripts/release/verify-packaged-desktop-report.mjs --report /tmp/gorkh-beta-packaged-report.json
node scripts/release/verify-packaged-desktop-report.mjs --report /tmp/gorkh-stable-packaged-report.json
```

Required common packaged checks:

- `confirmed_task_local_free_ai`
- `non_workspace_non_screen_task`
- `hosted_fallback_unavailable`
- `overlay_and_dragging`

Required channel-specific packaged checks:

- stable report: `stable_updater_truth`

Current release sign-off requires:

- one validated stable packaged report from a real Mac
