# Retail Local AI Self-Setup Design

**Problem**

The current desktop beta proves that the product direction is right, but the retail setup experience is not. Non-technical users currently need to understand provider settings, local runtimes, and sometimes even terminal commands. In practice, the current `Free AI` path only works smoothly if the user already has a compatible local runtime such as Ollama installed and running. That is not acceptable for a retail desktop product.

The current desktop surface is also too dense for first-run users. Setup state, provider configuration, workspace selection, permissions, and low-level runtime details are mixed into one view. Users do not need that much system detail before they can ask for help from the app.

**Goal**

Make `Free AI` work like a normal consumer desktop feature on both macOS and Windows:

- the app detects what already exists on the machine
- the app installs and manages what is missing
- the user does not need `brew`, `winget`, or manual terminal commands
- the default UI explains setup in product language, not infrastructure language
- advanced runtime/provider details remain available, but only behind an `Advanced` surface

**Non-Goals**

- Linux support in the first retail self-setup rollout
- bundling every model directly inside the main desktop installer
- redesigning the entire assistant product surface in one pass
- removing the ability to adopt an existing local runtime for advanced users

**Current Code Reality**

The repo already has a partial managed local-AI foundation:

- `apps/desktop/src-tauri/src/local_ai.rs` already owns runtime status, install progress, hardware profiling, and tier recommendation
- `apps/desktop/src/lib/localAi.ts` already exposes a typed frontend surface for local AI lifecycle commands
- `apps/desktop/src/components/FreeAiSetupCard.tsx` already exposes a setup card for Free AI

The blocker is that the current runtime installer stops at `adopt an existing Ollama binary if it is already installed`. It does not yet download and provision a managed runtime itself. That is why retail users still fall back to manual installation.

**Recommended Approach**

Use a fully managed in-app local AI installer, with `adopt existing install` as a fast path rather than the primary path.

This means:

1. The app checks whether a compatible local runtime already exists.
2. If it exists, the app can adopt it or keep using it.
3. If it does not exist, the app downloads and installs a GORKH-managed runtime artifact into the app-managed local AI directory.
4. The app starts the runtime, pulls the default model, verifies health, and only then marks `Free AI` ready.

This is the best retail outcome and also the cleanest support model. It removes package-manager dependencies from normal use, keeps the runtime under app control, and still preserves an advanced-user path for existing installs.

**Why Not Use Brew/Winget From The App**

The product should not treat OS package managers as the primary retail install path.

Reasons:

- package managers are not present or trusted on every retail machine
- package-manager flows create more permission prompts and more platform-specific failure modes
- they make the app support surface depend on tools the product does not control
- they still force users into an infrastructure mental model

Package managers can remain a fallback for advanced troubleshooting, but the retail path should be app-managed.

**Managed Runtime Architecture**

The app should treat local AI as a managed subsystem with one owner: GORKH.

High-level lifecycle:

1. **Detect**
   - Check for an app-managed runtime in the managed local AI directory.
   - Check for a compatible existing system runtime.
   - Determine whether a model is already present and whether the service is already healthy.

2. **Decide**
   - If an app-managed runtime is already healthy, reuse it.
   - If a compatible system runtime exists, offer a quiet adopt-or-manage decision for advanced users.
   - If no compatible runtime exists, proceed with managed install.

3. **Provision**
   - Download a platform-specific runtime artifact from GORKH-controlled runtime assets.
   - Verify checksum/signature metadata before using it.
   - Install it into the app-managed runtime directory.

4. **Start**
   - Launch the managed runtime using platform-specific process rules.
   - Poll the local service health endpoint until ready or timed out.

5. **Bootstrap Model**
   - Pull the recommended default model automatically.
   - Record progress in the existing install progress state.
   - Verify model availability with a real local request.

6. **Recover**
   - If runtime start, download, or model pull fails, move to a clear repairable error state.
   - Expose `Retry`, `Repair Free AI`, and `Use existing install` actions instead of vague generic failures.

**Runtime Asset Strategy**

The managed runtime should not be baked into the main desktop installer. Instead, GORKH should publish platform-specific runtime assets and a lightweight runtime manifest.

Runtime manifest contents:

- runtime version
- target platform (`macos-aarch64`, `macos-x86_64`, `windows-x86_64`)
- download URL
- checksum
- archive format
- expected runtime binary relative path
- optional minimum supported desktop version

This keeps the desktop installer smaller and allows runtime updates without forcing full desktop reinstalls.

**Platform Scope**

The first retail self-setup rollout should support:

- macOS
- Windows

The high-level UX and state model should be identical on both platforms. Only the provisioning and process-launch backend should differ.

Platform notes:

- macOS needs signed/notarization-safe runtime assets and predictable app-managed launch locations
- Windows needs a managed runtime layout that avoids relying on `winget` and handles first-run firewall/service prompts cleanly

**Retail UX Direction**

The current desktop surface is exposing too much setup complexity up front. The default surface should instead guide the user through a short readiness flow in plain product language.

Recommended default readiness flow:

1. `Set Up Free AI`
2. `Checking this device`
3. `Installing local engine`
4. `Downloading AI model`
5. `Enable Screen Access`
6. `Choose Workspace`
7. `Ready`

Important UI rules:

- First-run users should not see base URLs, model IDs, or provider internals on the main path.
- The primary CTA should be singular and obvious.
- `Vision Boost` should not be part of the first-run critical path.
- `Load failed` should be replaced with explicit actions such as `Retry`, `Repair Free AI`, or `Open permissions`.
- Advanced runtime/provider controls should live under `Advanced`, not the default setup path.

**Proposed Surface Split**

Default surface:

- one retail setup card
- one readiness checklist
- one clear explanation for what is currently blocked
- assistant chat visible but gated until setup is complete

Advanced surface:

- provider selection
- model and base URL details
- runtime source/version details
- diagnostics export
- existing-install adoption details
- optional Vision Boost management

**Failure Handling**

Failure states should map to user-understandable recovery actions:

- download failure -> `Retry download`
- runtime unhealthy -> `Repair Free AI`
- model missing -> `Download model`
- incompatible existing install -> `Use GORKH-managed install`
- permissions missing -> `Open Screen Access` / `Open Control Access`
- workspace missing -> `Choose Workspace`

The app should never require the user to interpret low-level runtime terms just to recover.

**Testing Strategy**

The rollout should be guarded by:

- Rust tests for runtime manifest parsing, asset selection, and install-state transitions
- desktop contract tests for Tauri command payloads
- frontend tests for onboarding states and readiness blockers
- platform-specific install path resolution tests for macOS and Windows
- smoke tests for fresh-machine setup:
  - no runtime installed
  - runtime install succeeds
  - model download succeeds
  - service health check succeeds
  - assistant becomes ready

**Phased Rollout**

This should not be attempted as one giant rewrite.

Recommended phases:

1. Ship the current desktop preview/runtime contract fixes needed for reliable beta testing.
2. Add managed runtime asset manifest support and platform-specific runtime download/provisioning.
3. Add automatic runtime start, health checks, and default model bootstrap.
4. Keep existing-install adoption as a supported fast path.
5. Replace the current setup/settings overload with a guided retail onboarding card.
6. Move provider/runtime internals into an `Advanced` section.
7. Add repair/update/remove flows for the managed local AI subsystem.

**Decision**

Proceed with a phased macOS + Windows managed local-AI self-setup implementation:

- app-managed runtime downloads as the primary path
- existing-install adoption as a secondary advanced path
- simplified guided setup on the main desktop surface
- advanced runtime/provider configuration moved out of the first-run experience
