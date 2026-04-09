# Desktop Stabilization Release Validation

This checklist is the Phase 4 follow-through for the desktop stabilization plan.

It separates:

- validation already covered by in-repo source and typecheck regressions
- validation that still requires a real packaged desktop build on a real machine

## Automated In-Repo Coverage

These are already enforced in source-level or typecheck verification:

- confirmed tasks default to `ai_assist_legacy`
- `advanced_agent` remains clearly experimental/debug
- normal desktop window exposes a broader drag region
- overlay shell/controller stays compact instead of shipping the earlier heavy retail shell
- task readiness no longer hard-blocks every task on workspace and screen setup
- hosted Free AI fallback only routes when bootstrap readiness explicitly allows it
- AI Assist runs are not marked `running` on `device.run.accept` alone
- updater feed failures no longer collapse into `204 No Content`
- disabled updater UI copy explicitly explains the beta-build policy

## Required Real-Machine Validation

Run these checks on at least one packaged macOS beta build and one packaged macOS stable build.

### 1. Confirmed Task On Local Free AI

Build and install the packaged app, then:

1. Pair/sign in.
2. Set up local Free AI.
3. Confirm a simple non-vision task like “summarize this repository structure”.
4. Verify the run leaves `queued`, produces visible progress, and finishes.

Pass criteria:

- the confirmed task starts after confirmation
- the run shows real step/log/proposal activity
- the task does not silently stall after accept

### 2. Non-Workspace / Non-Screen Task

With no workspace configured and no screen-preview requirement prepared:

1. Launch the packaged app.
2. Confirm a simple chat-style task that does not require file access or control.
3. Verify the task can start without forcing workspace selection or screen setup.

Pass criteria:

- no hard blocker is shown for workspace
- no hard blocker is shown for screen preview or screen recording

### 3. Hosted Fallback Unavailable

Test with hosted fallback disabled or unreachable:

1. Use a goal that would normally require hosted vision fallback.
2. Confirm the task.
3. Verify the app surfaces a direct explanation instead of routing into a dead path.

Pass criteria:

- the task does not start a hosted fallback run unless bootstrap readiness says fallback is available
- the user sees an actionable error instead of a silent stall

### 4. Overlay And Dragging

In the packaged desktop app:

1. Move the normal window by dragging the visible top chrome.
2. Enable overlay mode.
3. Verify the desktop remains visually primary and the overlay surfaces stay compact.

Pass criteria:

- the normal window can be dragged from the visible top shell
- overlay mode does not present as a heavy fullscreen blocker
- control and approval surfaces remain small and readable

### 5. Beta Updater Truth

On a packaged beta build:

1. Open Settings.
2. Review updater messaging.
3. Attempt an update check.

Pass criteria:

- updater controls clearly state that beta builds do not ship in-app updates
- the user is not misled into thinking a broken stable updater path exists in beta

### 6. Stable Updater Truth

On a packaged stable build:

1. Open Settings.
2. Trigger an update check against a healthy feed.
3. Repeat against an intentionally broken or misconfigured feed.

Pass criteria:

- healthy feed returns the expected update state
- broken feed surfaces a visible error path, not a false “up to date” or silent no-update result

## Sign-Off Gate

Do not cut the next desktop release until:

- the Phase 1-3 automated checks are green
- the packaged report verifier passes for the recorded beta and stable Mac reports
- the packaged macOS validation above has been executed
- results are recorded with build version, channel, machine type, and outcome for each check

Use:

```bash
node scripts/release/verify-packaged-desktop-report.mjs --template --channel beta --version <version> --machine <machine> > /tmp/gorkh-beta-packaged-report.json
node scripts/release/verify-packaged-desktop-report.mjs --report /tmp/gorkh-beta-packaged-report.json
```
