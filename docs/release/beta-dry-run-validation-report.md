# GORKH Beta Dry-Run Validation Report

> Template — fill in during/after each beta dry-run.  
> Do not use this template for stable releases.

---

## 1. Beta Run Metadata

| Field | Value |
|-------|-------|
| **GitHub Actions run URL** | `https://github.com/<owner>/<repo>/actions/runs/<run-id>` |
| **Workflow name** | Desktop Release |
| **Trigger** | `workflow_dispatch` |
| **Channel** | `beta` |
| **Version** | `0.0.47` |
| **Commit SHA** | `<full-sha>` |
| **Branch** | `main` |
| **Date / Time (UTC)** | `YYYY-MM-DD HH:MM` |
| **Runner** | GitHub Actions (`macos-15-intel` + `macos-14`) |
| **Duration** | `<minutes>` |
| **Result** | `success` / `failure` |

---

## 2. Artifacts

Download artifacts from the GitHub Actions run:

| Artifact | File | Size | SHA-256 |
|----------|------|------|---------|
| macOS arm64 | `ai-operator-desktop_{VERSION}_macos_aarch64.dmg` | `<size>` | `<hash>` |
| macOS x86_64 | `ai-operator-desktop_{VERSION}_macos_x86_64.dmg` | `<size>` | `<hash>` |
| Validation template | `packaged-desktop-validation-beta.json` | `<size>` | `<hash>` |

**Updater manifest:** Not applicable for beta (updater is disabled).

**Signatures:** Beta artifacts must NOT contain `.sig` files. Confirm absence.

---

## 3. Code Signature Verification

Run these commands on a Mac after installing the app from the DMG:

```bash
APP_PATH="/Applications/GORKH.app"

# 1. Deep signature verification
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

# Expected output: "valid on disk" and "satisfies its Designated Requirement"

# 2. Gatekeeper assessment
spctl --assess --type execute --verbose "$APP_PATH"

# Expected output: "accepted"

# 3. Show signature info
codesign -dvv "$APP_PATH"

# Verify:
# - Authority = Developer ID Application: <Team Name> (<Team ID>)
# - TeamIdentifier = <expected-team-id>
# - Identifier = com.ai-operator.desktop
```

**Result:** ⬜ Pass / ⬜ Fail  
**Notes:**

---

## 4. Notarization Verification

Beta dry-runs are signed with Developer ID but **not stapled** (notarization is only for stable). Verify the app is notarized via online check:

```bash
# For DMG:
hdiutil verify "ai-operator-desktop_{VERSION}_macos_aarch64.dmg"

# Online notarization check (if applicable):
# xcrun notarytool history --key-id ... --issuer ...
# (Beta builds may skip notarization depending on config.)
```

**Result:** ⬜ Pass / ⬜ Skip / ⬜ Fail  
**Notes:**

---

## 5. Install / Open Test

| Step | Result | Notes |
|------|--------|-------|
| Download DMG from GitHub Actions artifact | ⬜ | |
| Mount DMG by double-clicking | ⬜ | |
| Drag `.app` to Applications folder | ⬜ | |
| Launch app from Applications (not DMG) | ⬜ | |
| No Gatekeeper block on first launch | ⬜ | |
| App icon appears in Dock | ⬜ | |
| Transparent overlay window renders | ⬜ | |
| Traffic lights at `{18, 20}` | ⬜ | |

---

## 6. Module Smoke Tests

### Wallet
| Test | Result | Notes |
|------|--------|-------|
| Create address-only profile | ⬜ Pass / ⬜ Fail | |
| Browser handoff works | ⬜ Pass / ⬜ Fail | |
| Ownership proof (signMessage) works | ⬜ Pass / ⬜ Fail | |
| Read-only snapshot loads | ⬜ Pass / ⬜ Fail | |
| Portfolio tab shows SOL + tokens | ⬜ Pass / ⬜ Fail | |
| **No Send/Sign/Execute buttons** | ⬜ Pass / ⬜ Fail | |

### Markets
| Test | Result | Notes |
|------|--------|-------|
| Add token to watchlist | ⬜ Pass / ⬜ Fail | |
| RPC analysis runs | ⬜ Pass / ⬜ Fail | |
| Sample market data generates | ⬜ Pass / ⬜ Fail | |
| Birdeye manual fetch works (test key) | ⬜ Pass / ⬜ Fail | |
| **No Swap/Trade/Route buttons** | ⬜ Pass / ⬜ Fail | |

### Shield
| Test | Result | Notes |
|------|--------|-------|
| Decode offline transaction | ⬜ Pass / ⬜ Fail | |
| Read-only RPC lookup | ⬜ Pass / ⬜ Fail | |
| Simulation preview | ⬜ Pass / ⬜ Fail | |
| **No Sign/Submit buttons** | ⬜ Pass / ⬜ Fail | |

### Builder
| Test | Result | Notes |
|------|--------|-------|
| Inspect workspace | ⬜ Pass / ⬜ Fail | |
| Parse IDL | ⬜ Pass / ⬜ Fail | |
| Safe file preview | ⬜ Pass / ⬜ Fail | |
| **Build/Test/Deploy blocked** | ⬜ Pass / ⬜ Fail | |

### Agent
| Test | Result | Notes |
|------|--------|-------|
| Create local agent | ⬜ Pass / ⬜ Fail | |
| Create draft | ⬜ Pass / ⬜ Fail | |
| Context export | ⬜ Pass / ⬜ Fail | |
| **No Execute Draft button** | ⬜ Pass / ⬜ Fail | |

### Context
| Test | Result | Notes |
|------|--------|-------|
| Export bundle | ⬜ Pass / ⬜ Fail | |
| **No auto-send to LLM** | ⬜ Pass / ⬜ Fail | |

---

## 7. Safety Verification

| Check | Result | Notes |
|-------|--------|-------|
| No `signTransaction` button anywhere | ⬜ Pass / ⬜ Fail | |
| No `signAllTransactions` button anywhere | ⬜ Pass / ⬜ Fail | |
| No `sendTransaction` button anywhere | ⬜ Pass / ⬜ Fail | |
| No `sendRawTransaction` button anywhere | ⬜ Pass / ⬜ Fail | |
| No `requestAirdrop` button anywhere | ⬜ Pass / ⬜ Fail | |
| `signMessage` only in ownership proof flow | ⬜ Pass / ⬜ Fail | |
| No swap/route/trade/order/auto-buy buttons | ⬜ Pass / ⬜ Fail | |
| Birdeye API key not persisted after restart | ⬜ Pass / ⬜ Fail | |
| No Drift integration visible | ⬜ Pass / ⬜ Fail | |
| No HumanRail / White Protocol references | ⬜ Pass / ⬜ Fail | |

---

## 8. Final Result

| Item | Status |
|------|--------|
| **Overall result** | ⬜ **PASS** / ⬜ **FAIL** |
| **Blockers for stable** | ⬜ None / ⬜ See below |
| **Follow-up actions** | |

### Blockers (if any)

1. 
2. 

### Stable release recommendation

⬜ **Ready for stable** — Beta dry-run passed, all manual QA verified, no blockers.  
⬜ **Not ready** — Blockers must be resolved before stable tag.  

**Signed off by:** _______________  
**Date:** _______________
