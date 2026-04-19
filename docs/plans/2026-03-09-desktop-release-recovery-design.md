# Desktop Release Recovery Design

## Goal

Recover the desktop release lane so that:

- Windows MSI packaging succeeds again.
- macOS DMG packaging is verified against the current `main` branch state instead of stale failure logs.
- GitHub Release assets remain compatible with the API's `/downloads/desktop` and `/updates/desktop/...` consumers.
- future regressions fail in fast node tests before they burn a full Actions runner.

## Current Context

The desktop release path spans three layers:

1. `apps/desktop/src-tauri`
   Owns the Tauri app, Rust code, bundle icons, and packaging config.
2. `.github/workflows/desktop-release.yml`
   Builds Windows and macOS artifacts, signs/notarizes stable builds, normalizes asset names, and publishes GitHub Releases on tag pushes.
3. `apps/api/src/lib/releases/*` plus `apps/api/src/index.ts`
   Reads GitHub Release assets and serves desktop downloads and updater manifests.

Important repo evidence from the current tree:

- [apps/desktop/src-tauri/tauri.conf.json](/workspaces/GM7/apps/desktop/src-tauri/tauri.conf.json) currently references only `icons/icon.png`.
- [apps/desktop/src-tauri/icons](/workspaces/GM7/apps/desktop/src-tauri/icons) currently contains only `icon.png`.
- the Windows failure explicitly says ``icons/icon.ico` not found; required for generating a Windows Resource file during tauri-build``.
- recent commits `63f4c04`, `a00b881`, and `ef5604f` already targeted desktop release prerequisites and Rust compile failures, so the macOS log the user pasted may predate the current tree.
- [apps/api/src/lib/releases/resolveDesktopAssets.ts](/workspaces/GM7/apps/api/src/lib/releases/resolveDesktopAssets.ts) requires exact GitHub asset names and `.sig` companions for stable release consumption.

## Approaches

### 1. Minimal hotfix

Add only `icon.ico`, rerun Windows, and hope macOS is already fixed.

Pros:

- fastest patch
- almost certainly resolves the specific Windows error

Cons:

- does not verify whether macOS still has a real compile failure on current `main`
- does not add guardrails for future missing asset regressions
- can still leave release publication or API consumption broken

### 2. Systematic lane recovery

Add packaging-prerequisite tests, fix the missing bundle assets, re-baseline macOS compile on current HEAD, and verify the release asset contract all the way through the API.

Pros:

- fixes the concrete Windows root cause
- avoids guessing about the macOS failure
- protects the GitHub Release to API path, not just CI packaging
- produces a repeatable release checklist

Cons:

- more work than a single-file hotfix
- requires one pass through both packaging and consumer-side verification

### 3. Broader release refactor

Refactor the release workflow and desktop packaging structure more heavily, for example by generating icons during CI or splitting compile and bundle jobs further.

Pros:

- could improve long-term maintainability

Cons:

- unnecessary before the current lane is green
- increases change surface while the root cause is still partly known

## Recommendation

Use approach 2.

It addresses the confirmed Windows failure, treats the macOS failure as an evidence-gathering problem instead of a guessing problem, and verifies the release asset contract that the API depends on.

## Proposed Design

### Packaging prerequisites

- treat bundle assets as source-controlled build inputs, not ad hoc local files
- commit the Windows `.ico` asset and, if needed by the macOS bundle flow, the macOS `.icns` asset derived from the tracked source icon
- expand [tests/desktop-rust-release-prereqs.test.mjs](/workspaces/GM7/tests/desktop-rust-release-prereqs.test.mjs) so CI fails immediately when a required desktop bundle asset or config reference is missing

### Current-HEAD macOS re-baseline

- rerun the desktop compile/build commands against the current branch state
- if macOS still fails, capture the exact Rust compiler errors and encode the fix with a matching regression test
- do not change `Cargo.toml` or Rust source just to silence warnings; only fix the remaining hard errors

### Release contract verification

- keep the asset naming contract centered on:
  - `ai-operator-desktop_<version>_windows_x86_64.msi`
  - `ai-operator-desktop_<version>_macos_x86_64.dmg`
  - `ai-operator-desktop_<version>_macos_aarch64.dmg`
- verify that stable releases still include `.sig` files and beta releases do not
- add direct tests around resolver expectations in [apps/api/src/lib/releases/resolveDesktopAssets.ts](/workspaces/GM7/apps/api/src/lib/releases/resolveDesktopAssets.ts) or a dedicated node test so release publishing and API consumption cannot drift apart

### `package.metadata does not exist`

Do not treat this line as a guaranteed bug yet.

- If the build succeeds after the icon fix, leave it alone.
- If a current build shows that missing package metadata is still fatal, then investigate the exact Tauri/bundler expectation and add the smallest required metadata with a regression test.

## Verification Strategy

Use staged verification:

1. fast node tests for desktop prereqs and workflow contracts
2. platform-native desktop build commands on Windows and macOS
3. GitHub release asset verification
4. API verification against GitHub-backed release mode

That sequence keeps failures local to the layer that introduced them.
