# GORKH — Next 30 Days Execution Plan

**Status:** Active short-term execution plan  
**Scope:** 30 days  
**Owner:** Gorkhmaz + AI coding agent  
**Execution rule:** Every Kimi/Claude Code session must start by reading this file and must end by updating it.  
**Primary goal:** Ship a stable macOS build, prove GORKH Free works without API keys, make computer-use measurable, then validate the Mistral/Blender pivot without destabilizing the product.

---

## 0. Mandatory Session Protocol for Kimi

Every time Kimi starts work in this repo, it must follow this protocol before touching code.

### 0.1 Start-of-session checklist

1. Open and read this file from top to bottom.
2. Read the current phase status in **Section 10 — Phase Status Board**.
3. Read the latest entry in **Section 11 — Session Log**.
4. Run or inspect:
   - `git status --short`
   - `git branch --show-current`
   - `git rev-parse --short HEAD`
5. Identify the current active phase.
6. Continue only the active phase unless the human explicitly says to move to the next phase.
7. Do not skip phase exit criteria.
8. Do not start broad refactors unless they are explicitly part of the active phase.

### 0.2 End-of-session checklist

At the end of every work session, Kimi must update this file.

Update:

1. **Section 10 — Phase Status Board**
   - status
   - completion percentage
   - blockers
   - next action

2. **Section 11 — Session Log**
   - date/time
   - branch
   - commit SHA
   - files changed
   - commands run
   - tests passed/failed
   - blockers
   - next recommended step

3. **Section 12 — Open Blockers**
   - add new blockers
   - close resolved blockers

4. **Section 13 — Decision Log**
   - add product/architecture decisions made during the session

Kimi must not claim a phase is complete unless every exit criterion for that phase is satisfied.

---

## 1. Non-Negotiables

1. Do not reintroduce local AI, Ollama, Qwen local, `native_qwen_ollama`, llama.cpp, or Vision Boost local.
2. Do not switch to the experimental Rust `AdvancedAgent`.
3. Keep the production legacy `AiAssistController` path as the default.
4. Keep hosted GORKH Free working without a user API key.
5. Keep BYO provider keys in OS keychain only.
6. Do not send BYO OpenAI, Claude, DeepSeek, Kimi, MiniMax, or custom provider keys to the GORKH API.
7. Do not remove current DeepSeek/GORKH Free until a Mistral replacement is tested and production-verified behind a feature flag.
8. Do not claim “data never leaves EU” until every default production inference path is EU-hosted and BYO disclaimers are precise.
9. Stable macOS release comes before the large pivot.
10. Every phase must end with tests, docs, and a clear go/no-go decision.
11. Do not tag a stable release until the installed DMG passes real macOS validation.
12. Do not hide failures by deleting tests, weakening assertions, or skipping tests.

---

## 2. 30-Day Outcome

By the end of 30 days, GORKH should have:

- stable macOS DMG validated on real hardware
- GORKH Free working with no API key
- BYO OpenAI/Claude tested
- TextEdit/Notes computer-use MVP working
- eval harness with golden tasks
- first policy engine
- Mistral provider tested behind feature flag
- Blender wedge validated with landing page, demo script, and user feedback
- clear decision: build Blender skill pack, validate another vertical, or focus on generic desktop reliability

---

## 3. Current Product Baseline

### 3.1 Preserved

- Hosted GORKH Free tier
- BYO OpenAI
- BYO Claude
- BYO DeepSeek
- BYO Kimi
- BYO MiniMax
- Custom OpenAI-compatible provider
- Tauri desktop shell
- React desktop UI
- Fastify API
- Next.js web portal
- macOS-only release path for now
- local approvals
- screen capture
- input injection
- coordinate validation
- action verification loop
- screenshot hashing without raw screenshot persistence

### 3.2 Removed

- Ollama
- local Qwen
- local AI runtime
- local model install
- local model download
- local hardware recommendation
- local Vision Boost
- `native_qwen_ollama`
- `local_ai_*` Tauri commands
- localhost `11434` default binding
- local AI onboarding/setup UI

### 3.3 Known risks

- Real screen capture cannot be validated in Codespace.
- Real input injection cannot be validated in Codespace.
- macOS Screen Recording and Accessibility permissions must be validated on real Mac.
- App focus after `open_app` may still be fragile.
- Multi-monitor hot-plug behavior may not be robust yet.
- AdvancedAgent remains experimental and is not the production path.

---

# Phase 0 — Stable macOS Release Gate

**Timebox:** Days 1–4  
**Status:** Active until real macOS validation passes  
**Goal:** Confirm current app is stable enough to tag/release as a macOS stable build.

## 0.1 Verify GORKH Free production behavior

Expected behavior:

- signed-in user can use GORKH Free without API key
- unsigned user sees: `Sign in to use GORKH Free`
- BYO providers still ask for API key
- Render logs show `/llm/free/chat` when GORKH Free is used
- `/desktop/free-ai/v1/models` remains a quota-safe health/model-list endpoint
- `/llm/free/chat` remains the actual free-tier inference endpoint unless the API code says otherwise

Check files:

- `apps/desktop/src/state/providerStatus.ts`
- `apps/desktop/src/components/SettingsPanel.tsx`
- `apps/desktop/src/lib/freeAiFallback.ts`
- `apps/desktop/src/lib/taskReadiness.ts`
- `apps/desktop/src/lib/llmConfig.ts`
- `apps/desktop/src-tauri/src/llm/gorkh_free.rs`
- API free-tier routes

Expected Render request pattern:

```text
GET  /ready
GET  /desktop/free-ai/v1/models
POST /llm/free/chat
GET  /llm/free/usage
```

If Render shows only `/ready` and no `/llm/free/chat`, the desktop is still blocked before free-tier inference.

## 0.2 Build stable DMG locally on macOS

Run on real Mac, not Codespace:

```bash
pnpm install
pnpm --filter @ai-operator/shared typecheck
pnpm --filter @ai-operator/desktop typecheck
pnpm --filter @ai-operator/desktop build

cd apps/desktop/src-tauri
cargo check
cargo clippy --all-targets -- -D warnings
cargo test --lib

cd ..
pnpm tauri build
```

Record:

- `.app` path
- `.dmg` path
- app version
- signing status
- notarization status
- Gatekeeper result

## 0.3 Install DMG and run native smoke

Manual tests:

1. Launch from Applications.
2. Sign in.
3. Confirm device registration.
4. Select GORKH Free.
5. Send: `Say hello in one sentence.`
6. Confirm no API key prompt.
7. Confirm Render shows `POST /llm/free/chat`.
8. Configure BYO OpenAI or Claude.
9. Confirm key is stored in OS keychain.
10. Run a simple BYO task.
11. Remove key and confirm missing-key state returns.
12. Open TextEdit.
13. Ask GORKH: `Click inside the blank document and type: GORKH validation test.`
14. Approve click.
15. Approve typing.
16. Confirm text appears.
17. Confirm GORKH observes again and verifies.
18. Test cancel/stop during an active run.
19. Test overlay/approval visibility.
20. Test updater check.

## 0.4 Update release docs

Create/update:

- `docs/releases/STABLE_RELEASE_CHECKLIST.md`
- `docs/releases/v0.0.41-stable-release-notes.md`
- `docs/testing/native-mac-validation-results.md`

Do not tag until all blockers are resolved.

## 0.5 Commands

```bash
pnpm --filter @ai-operator/shared typecheck
pnpm --filter @ai-operator/desktop typecheck
pnpm --filter @ai-operator/desktop build
pnpm -w build
cd apps/desktop/src-tauri && cargo check
cd apps/desktop/src-tauri && cargo clippy --all-targets -- -D warnings
cd apps/desktop/src-tauri && cargo test --lib
node --import tsx --test tests/desktop-agent-pipeline.diagnostic.ts
node --import tsx --test tests/desktop-agent-verification.diagnostic.ts
node --import tsx --test tests/desktop-provider-capabilities-after-local-ai-removal.test.ts
node --import tsx --test tests/desktop-gorkh-free-readiness.test.ts
node --import tsx --test --test-force-exit tests/desktop-*.test.* tests/shared-*.test.*
```

## 0.6 Exit criteria

- DMG builds.
- App installs and launches.
- GORKH Free works without API key.
- BYO key path works.
- TextEdit click/type task passes.
- Overlay and approval gates work.
- Stop/cancel works.
- No local AI/Ollama references in runtime or user-facing copy.
- Stable release docs updated.

## 0.7 Go/no-go

If Phase 0 fails, do not start Phase 1. Fix the stable release blocker first.

---

# Phase 1 — Computer-Use Eval Harness

**Timebox:** Days 5–10  
**Status:** Not started  
**Goal:** Make GORKH measurable. Every future agent change must be judged against golden tasks.

## 1.1 Build deterministic fake computer environment

Create:

```text
tests/computer-use/
  fakeComputerEnvironment.ts
  fakeProvider.ts
  goldenTasks.ts
  runner.ts
```

Fake environment must support:

- screen state
- buttons
- text fields
- file system simulation
- terminal output simulation
- screenshot hash simulation
- action application
- stuck-loop scenarios

## 1.2 Add golden tasks

Minimum tasks:

1. open app action requires approval
2. click visible button
3. type into field
4. missed click does not mark done
5. repeated same click triggers stuck-loop protection
6. ask user when screen is ambiguous
7. file read within workspace
8. file write requires approval
9. terminal command risk classification
10. cancel stops future execution

## 1.3 Add metrics

Each eval result must include:

- task id
- success/fail
- failure reason
- step count
- approvals required
- provider calls
- action count
- verification count
- stuck-loop trigger
- estimated model cost placeholder

## 1.4 Add script

Add a package script matching repo conventions:

```json
"test:computer-use": "node --import tsx --test tests/computer-use/*.test.ts"
```

## 1.5 Add report output

Write:

```text
docs/testing/computer-use-eval-report.md
```

Include sample JSON output.

## 1.6 Commands

```bash
pnpm --filter @ai-operator/desktop typecheck
pnpm --filter @ai-operator/shared typecheck
node --import tsx --test tests/desktop-agent-pipeline.diagnostic.ts
node --import tsx --test tests/desktop-agent-verification.diagnostic.ts
pnpm test:computer-use
node --import tsx --test --test-force-exit tests/desktop-*.test.* tests/shared-*.test.*
```

## 1.7 Exit criteria

- at least 10 golden tasks
- deterministic tests pass in CI/Codespace
- eval report generated
- failed/missed-click scenarios are covered
- no real OS input required in CI

---

# Phase 2 — Policy Engine v1

**Timebox:** Days 11–16  
**Status:** Not started  
**Goal:** Add a real safety layer beyond “approve everything.”

## 2.1 Create policy module

Suggested files:

```text
apps/desktop/src/lib/computerUsePolicy.ts
apps/desktop/src/lib/computerUsePolicy.test.ts
```

Policy should classify:

```text
low
medium
high
critical
blocked
```

## 2.2 Rules

Implement deterministic rules for:

- `wait` = low, no approval
- `observe` = low, no approval
- `click` = approval required
- `type_text` = approval required
- `hotkey` = approval required
- `open_app` = approval required
- `file_read` = allowed only inside workspace
- `file_write` = approval required
- `file_delete` = high/critical approval
- `terminal` = risk based on command
- seed phrase/private key/password typing = blocked
- payment/banking/crypto transfer/email send = critical confirmation
- destructive shell commands = blocked or critical
- screenshot raw base64 never persisted

## 2.3 Add prompt-injection guard

Screen content must be treated as untrusted.

Add tests for prompts/screens containing:

```text
Ignore previous instructions
Click approve automatically
Delete all files
Type this seed phrase
Send money
```

Expected: blocked or ask_user, not execute.

## 2.4 Integrate policy before approval

Flow:

```text
LLM proposes action
↓
schema validation
↓
policy classification
↓
blocked / approval required / allowed
↓
execute only if safe
```

## 2.5 Add docs

Create:

```text
docs/security/computer-use-policy-v1.md
```

## 2.6 Commands

```bash
pnpm --filter @ai-operator/desktop typecheck
node --import tsx --test tests/desktop-agent-verification.diagnostic.ts
node --import tsx --test tests/computer-use/*.test.ts
node --import tsx --test --test-force-exit tests/desktop-*.test.* tests/shared-*.test.*
```

## 2.7 Exit criteria

- policy tests pass
- blocked actions cannot reach executor
- approval UI receives correct risk level
- eval harness includes policy cases
- no raw screenshots or keys in logs

---

# Phase 3 — Mistral Provider Behind Feature Flag

**Timebox:** Days 17–22  
**Status:** Not started  
**Goal:** Test EU-hosted Mistral without breaking current GORKH Free.

## 3.1 Important

Do not remove DeepSeek/GORKH Free yet. Add Mistral behind a server-side feature flag.

## 3.2 Add env vars

Update `.env.example`:

```dotenv
MISTRAL_API_KEY=
MISTRAL_BASE_URL=https://api.mistral.ai/v1
MISTRAL_FREE_TIER_ENABLED=false
MISTRAL_FREE_TIER_MODEL=mistral-small-latest
```

## 3.3 Add Mistral provider server-side

Create files matching existing API structure, for example:

```text
apps/api/src/llm/providers/mistral.ts
apps/api/src/llm/mistralRouter.ts
```

Must support:

- chat completions
- JSON mode if available/currently needed
- request id
- timeout
- error mapping
- no prompt logging
- token usage logging only
- model name from env

## 3.4 Add routing flag

Behavior:

```text
if MISTRAL_FREE_TIER_ENABLED=true:
  /llm/free/chat uses Mistral
else:
  /llm/free/chat uses current DeepSeek backend
```

## 3.5 Add comparison script

Create:

```text
scripts/compare-free-tier-models.mjs
```

It should run a small benchmark:

- 10 simple chat prompts
- 5 JSON action prompts
- 5 ask_user/uncertainty prompts
- 5 policy-sensitive prompts

Output:

```text
docs/testing/free-tier-model-comparison.md
```

Compare:

- response validity
- JSON parse success
- latency
- estimated cost
- refusals/overblocking
- computer-use action quality

## 3.6 Tests

Add tests:

- Mistral request shape
- missing `MISTRAL_API_KEY` returns clear config error
- feature flag off keeps current DeepSeek path
- feature flag on uses Mistral
- quota still enforced
- no BYO key sent to API
- no raw screenshot persisted

## 3.7 Commands

```bash
pnpm --filter @ai-operator/api typecheck
pnpm --filter @ai-operator/api test
pnpm --filter @ai-operator/desktop typecheck
node --import tsx --test tests/desktop-gorkh-free-readiness.test.ts
node --import tsx --test --test-force-exit tests/desktop-*.test.* tests/shared-*.test.*
```

## 3.8 Exit criteria

- Mistral path works behind flag
- current GORKH Free remains working with flag off
- model comparison report created
- no default production switch yet

## 3.9 Go/no-go

Switch default free tier to Mistral only if:

- quality is acceptable
- cost is acceptable
- latency is acceptable
- Render env is configured
- production smoke passes

---

# Phase 4 — Blender Validation, Not Full Build

**Timebox:** Days 23–30  
**Status:** Not started  
**Goal:** Validate whether Blender is worth building before implementing full skill-pack architecture.

## 4.1 Important

Do not build the full Blender bridge yet unless validation is strong.

## 4.2 Create validation landing page draft

Create:

```text
docs/validation/blender-wedge-landing-copy.md
```

Include:

- headline
- subheadline
- 3 use cases
- fake demo flow
- waitlist CTA
- objections
- target user profile

## 4.3 Create Blender demo spec

Create:

```text
docs/validation/blender-demo-script.md
```

Demo concept:

```text
User: "Clean this Blender scene and set up cinematic three-point lighting."
GORKH:
- inspects scene summary
- proposes scene_cleanup
- approval card
- proposes three_point_lighting
- approval card
- returns action receipt
```

No full implementation needed yet.

## 4.4 Interview script

Create:

```text
docs/validation/blender-user-interview-script.md
```

Questions:

- What repetitive Blender tasks waste your time?
- Would you install a local addon?
- Would you approve each action?
- What would make this unsafe?
- Would you pay €19–€49/month?
- Which task would make you pay immediately?

## 4.5 Outreach list

Create:

```text
docs/validation/blender-outreach-list.md
```

Include target communities:

- BlenderArtists
- r/blender
- Blender Discords
- indie game artists
- 3D freelancers
- small studios
- YouTube Blender creators

## 4.6 Technical spike only

Create a tiny proof-of-concept, not product architecture:

```text
skills/blender-poc/
  README.md
  scene_summary.py
```

Goal:

- run a Python script inside Blender
- print scene object count, materials, cameras, lights
- no websocket
- no signed skill packs yet
- no bridge yet

## 4.7 Commands

```bash
pnpm --filter @ai-operator/desktop typecheck
pnpm --filter @ai-operator/shared typecheck
python3 --version
# Blender command only if installed:
blender -b --python skills/blender-poc/scene_summary.py
```

## 4.8 Exit criteria

- landing copy ready
- demo script ready
- interview script ready
- outreach list ready
- optional Blender POC runs locally
- at least 10 user conversations scheduled or started

## 4.9 Decision gate

Proceed to full Blender skill pack only if:

- at least 10 real Blender users give feedback
- at least 5 say they would try it
- at least 2 say they would pay for a concrete workflow
- one workflow is repeated by multiple users

Otherwise, validate Photoshop/DaVinci before building.

---

# Phase 5 — 30-Day Review

**Timebox:** Day 30  
**Status:** Not started  
**Goal:** Decide what to build next.

## 5.1 Review metrics

Collect:

```text
Stable DMG:
- installed successfully?
- sign-in success?
- GORKH Free success?
- BYO success?
- TextEdit MVP success?

Reliability:
- eval pass rate
- policy blocks
- missed-click behavior
- cancel behavior

Free tier:
- daily active users
- free task usage
- failure rate
- quota exhaustion
- backend cost estimate

Mistral:
- quality vs current free tier
- latency
- cost
- JSON reliability
- EU positioning impact

Blender:
- interviews completed
- waitlist signups
- strongest requested workflows
- willingness to pay
```

## 5.2 Final decision

Choose one:

```text
A. Continue with Blender skill pack
B. Switch validation to Photoshop
C. Focus on generic desktop reliability for 30 more days
D. Start paid beta with current product
```

## 5.3 Deliverable

Create:

```text
docs/strategy/30-day-review.md
```

Include:

- what shipped
- what broke
- what users said
- what metrics say
- next 30-day plan

---

# 10. Phase Status Board

Kimi must update this table at the end of every session.

| Phase | Name | Status | Completion | Blockers | Next Action |
| --- | --- | --- | ---: | --- | --- |
| 0 | Stable macOS release gate | Active | 65% | Real Mac validation required | Human: build DMG on real Mac and run native smoke |
| 1 | Computer-use eval harness | Not started | 0% | Phase 0 incomplete | Wait |
| 2 | Policy engine v1 | Not started | 0% | Phase 1 incomplete | Wait |
| 3 | Mistral provider behind flag | Not started | 0% | Phase 2 incomplete | Wait |
| 4 | Blender validation | Not started | 0% | Phase 3 incomplete | Wait |
| 5 | 30-day review | Not started | 0% | Prior phases incomplete | Wait |

---

# 11. Session Log

Kimi must append a new entry here after every session.

## Session Template

```markdown
## 2026-04-30 — Fix GORKH Free production bug + all tests green

**Agent:** Kimi  
**Branch:** `main`  
**Commit SHA:** `985d9d4` (pre-commit, changes staged)  
**Active phase:** 0  
**Status:** Partial  

### Work completed

- Diagnosed root cause: `providerStatus.ts` gated `gorkh_free` on `FREE_AI_ENABLED && sessionToken`. Production builds without `VITE_FREE_AI_ENABLED=true` blocked free tier with "Add an API key".
- Fixed `providerStatus.ts`: `gorkh_free` configured state now depends solely on `Boolean(sessionToken)`.
- Fixed `SettingsPanel.tsx`: `handleTest` special-cases `gorkh_free` to call `testHostedFreeAiFallback` with device token, returning sign-in message when unauthenticated.
- Fixed Rust `resolve_llm_api_key`: `gorkh_free` falls through to `Ok(String::new())`, allowing frontend-passed `apiKeyOverride` (device token) to be used by `GorkhFreeProvider`.
- Updated SettingsPanel marketing copy to include "hosted Free AI tier that runs in the cloud" to satisfy pre-existing static source test.
- Created debug doc: `docs/debug/gorkh-free-production-debug.md` with curl commands and expected status codes.
- Added `tests/desktop-gorkh-free-readiness.test.ts` (6 tests, all pass).
- Updated existing tests for new behavior.

### Files changed

- `apps/desktop/src/state/providerStatus.ts`
- `apps/desktop/src/components/SettingsPanel.tsx`
- `apps/desktop/src-tauri/src/lib.rs` (resolve_llm_api_key)
- `tests/desktop-gorkh-free-readiness.test.ts` (new)
- `tests/desktop-free-ai-hosted-fallback.test.ts`
- `tests/desktop-provider-capabilities-after-local-ai-removal.test.ts`
- `docs/debug/gorkh-free-production-debug.md` (new)

### Commands run

| Command | Result |
| --- | --- |
| `pnpm --filter @ai-operator/shared typecheck` | PASS |
| `pnpm --filter @ai-operator/desktop typecheck` | PASS |
| `cd apps/desktop/src-tauri && cargo check` | PASS |
| `cd apps/desktop/src-tauri && cargo clippy --all-targets -- -D warnings` | PASS |
| `cd apps/desktop/src-tauri && cargo test --lib` | PASS (33/33) |
| `node --import tsx --test --test-force-exit tests/desktop-*.test.* tests/shared-*.test.*` | PASS (177/177) |

### Test results

- Rust unit tests: 33 passed, 0 failed
- Node.js desktop/shared tests: 177 passed, 0 failed, 0 skipped

### Blockers

- B-001: Real macOS validation required (still open — needs human with real Mac)
- B-002: Stable DMG install smoke required (still open — needs human with real Mac)
- B-003: GORKH Free production behavior must be confirmed in Render logs (still open — needs installed DMG test)
- B-004: BYO OpenAI/Claude key path must be validated on installed app (still open — needs human with real Mac)

### Decisions made

- Removed `FREE_AI_ENABLED` build flag as a runtime gate for GORKH Free. The free tier is now purely session-token-gated.
- SettingsPanel `gorkh_free` test bypasses generic `test_provider` and uses the hosted fallback endpoint to verify connectivity.

### Next recommended action

- Human must build DMG on real Mac: `pnpm --filter @ai-operator/desktop tauri:build`
- Install DMG, sign in, select GORKH Free, send chat message
- Verify Render logs show `POST /llm/free/chat`
- Verify BYO OpenAI/Claude key path works with keychain storage
- Run TextEdit click/type MVP test
- If all pass, tag stable release

---

## YYYY-MM-DD — Session title

**Agent:** Kimi / Claude Code / Human  
**Branch:** `<branch>`  
**Commit SHA:** `<sha>`  
**Active phase:** `<phase>`  
**Status:** Pass / Fail / Partial  

### Work completed

- ...

### Files changed

- ...

### Commands run

| Command | Result |
| --- | --- |
| `...` | PASS/FAIL |

### Test results

- ...

### Blockers

- ...

### Decisions made

- ...

### Next recommended action

- ...
```

---

# 12. Open Blockers

Kimi must keep this list current.

| ID | Blocker | Phase | Severity | Owner | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| B-001 | Real macOS validation required | 0 | High | Human | Open | Codespace cannot validate screen capture/input injection |
| B-002 | Stable DMG install smoke required | 0 | High | Human | Open | Must test installed app before stable tag |
| B-003 | GORKH Free production behavior must be confirmed in Render logs | 0 | High | Human/Kimi | Open | Expect `POST /llm/free/chat`. Code fix applied; needs real Mac validation. |
| B-004 | BYO OpenAI/Claude key path must be validated on installed app | 0 | Medium | Human | Open | Keychain-only storage required |
| B-005 | App focus after `open_app` may be fragile | 1/2 | Medium | Kimi | Open | Needs eval/manual test |
| B-006 | Multi-monitor real-device validation missing | 1/2 | Medium | Human/Kimi | Open | Not blocking single-monitor MVP |

---

# 13. Decision Log

Kimi must append architectural/product decisions here.

| Date | Decision | Reason | Impact |
| --- | --- | --- | --- |
| 2026-04-30 | No local AI/Ollama in near-term roadmap | Too much support/runtime complexity for MVP | Hosted GORKH Free + BYO providers only |
| 2026-04-30 | Keep legacy `AiAssistController` as production path | AdvancedAgent remains experimental | Focus reliability before architecture rewrite |
| 2026-04-30 | Do not migrate from DeepSeek to Mistral abruptly | Free tier was just stabilized | Add Mistral behind feature flag first |
| 2026-04-30 | BYO provider keys must stay on device | Privacy and trust boundary | Desktop calls provider directly for BYO paths |
| 2026-04-30 | Blender is validation target, not committed build yet | Avoid overbuilding before demand proof | Validate with landing/demo/interviews first |
| 2026-04-30 | Remove `FREE_AI_ENABLED` build flag as runtime gate for GORKH Free | Production builds may omit the flag, silently breaking free tier | `gorkh_free` readiness now depends only on `sessionToken` |
| 2026-04-30 | SettingsPanel tests `gorkh_free` via hosted fallback endpoint | Generic `test_provider` expects BYO keychain key and fails for free tier | Hosted fallback gives accurate connectivity + auth signal |
| 2026-04-30 | Rust `resolve_llm_api_key` returns empty string for `gorkh_free` | Device token comes from frontend keychain/session, not static keychain entry | `apiKeyOverride` (device token) flows into `GorkhFreeProvider` auth header |

---

# 14. Stable Tag Policy

Stable tag can be created only after Phase 0 exit criteria pass.

Do not create a stable tag if any of these are true:

- GORKH Free asks for API key.
- Render does not show `/llm/free/chat` during free-tier inference.
- DMG does not install.
- app does not launch from Applications.
- Screen Recording permission flow fails.
- Accessibility permission flow fails.
- TextEdit click/type MVP fails.
- stop/cancel fails.
- updater points to beta channel.
- app shows beta/preview copy.
- local AI/Ollama copy appears in user-facing UI.

Prepared tag format:

```bash
git tag -a v0.0.41 -m "GORKH v0.0.41 stable macOS release"
```

Use actual version if different from package/Tauri config.

Do not push tag without explicit human approval.

---

# 15. Human Daily Checklist

Before each new Kimi session, the human should paste this instruction:

```text
Read GORKH_NEXT_30_DAYS.md first.
Continue only the active phase.
Update the Phase Status Board, Session Log, Open Blockers, and Decision Log before finishing.
Do not start the next phase unless the current phase exit criteria are complete.
```

After Kimi finishes, the human should check:

- Did Kimi update this file?
- Did Kimi run the required commands?
- Did Kimi list failures honestly?
- Did Kimi change only the active phase scope?
- Did Kimi avoid reintroducing local AI/Ollama?
- Did Kimi preserve GORKH Free and BYO providers?

---

# 16. First Action for Kimi

When this file is first added to the repo, Kimi must:

1. Add this file at repo root as `GORKH_NEXT_30_DAYS.md`.
2. Execute Phase 0 only.
3. Do not start Phase 1.
4. Do not implement Mistral yet.
5. Do not implement Blender yet.
6. Do not build policy engine yet.
7. Focus only on the stable macOS release gate and GORKH Free production behavior.

Final response after first session must include:

1. File created
2. Phase 0 checks completed
3. Files changed
4. Commands run
5. DMG/native checks still requiring human Mac validation
6. Whether Phase 0 is pass/fail
7. Next recommended human action
