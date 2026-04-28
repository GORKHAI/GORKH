# Native Desktop Computer-Use Validation Checklist

> **Target**: Legacy computer-use reliability patch v1  
> **Platform**: macOS (primary), Windows (secondary)  
> **Date**: 2026-04-28  
> **Branch**: `feature/byo-key-fix`

This checklist must be completed on a **real Mac** (Intel or Apple Silicon) before the patch is considered merge-safe for production. Codespaces and CI can validate compilation and unit tests, but only a real machine can verify screen capture, input injection, permissions, and overlay behavior.

---

## A. Permissions

### A.1 Screen Recording permission detected
- [ ] Launch GORKH on a Mac without Screen Recording permission granted
- [ ] Open Settings → Permissions
- [ ] Verify the app shows "Screen Recording: Denied" or "Not granted"
- [ ] Verify a clickable "Open System Settings" button is present
- [ ] Click the button and verify System Settings opens to the Screen Recording privacy pane

### A.2 Accessibility permission detected
- [ ] Launch GORKH on a Mac without Accessibility permission granted
- [ ] Open Settings → Permissions
- [ ] Verify the app shows "Accessibility: Denied" or "Not granted"
- [ ] Verify a clickable "Open System Settings" button is present
- [ ] Click the button and verify System Settings opens to the Accessibility privacy pane

### A.3 App shows correct guidance if permissions are missing
- [ ] With both permissions missing, start a task: "Open Notes and type hello"
- [ ] Verify the chat surfaces a message explaining which permissions are needed and how to grant them
- [ ] Verify the task does not crash or hang

### A.4 After granting permissions, app can capture and control
- [ ] Grant Screen Recording permission to GORKH in System Settings
- [ ] Grant Accessibility permission to GORKH in System Settings
- [ ] Restart GORKH (required for Screen Recording to take effect)
- [ ] Start a task: "Click the Launchpad icon in the Dock"
- [ ] Verify the approval modal appears with a screenshot preview
- [ ] Approve the action
- [ ] Verify the cursor moves and clicks

---

## B. Screenshot Dimensions

### B.1 Capture primary display
- [ ] Start any task that requires screen observation
- [ ] In the Rust logs or via a debug build, verify `capture_display_png` is called
- [ ] Verify the returned payload includes `width`, `height`, `png_base64`

### B.2 Verify width/height returned
- [ ] On a MacBook Pro 14" (3024×1964), verify returned dimensions match the native resolution (or the `maxWidth` clamp if >1280)
- [ ] On an external 4K monitor, verify dimensions match that display

### B.3 Verify LLM proposal request includes screenshot_width and screenshot_height
- [ ] Enable verbose logging or patch a temporary `println!` in `llm_propose_next_action`
- [ ] Verify `ProposalParams` contains `screenshot_width` and `screenshot_height` matching the captured screenshot
- [ ] Verify `build_user_prompt` output contains `Screenshot dimensions: WxH`

### B.4 Verify raw screenshots are not stored in logs
- [ ] Inspect `~/.config/ai-operator/logs/` or console logs
- [ ] Search for `data:image/png;base64` or long base64 strings
- [ ] **Expected**: No raw base64 found. Only SHA-256 hashes appear in action history.
- [ ] Inspect the `actionResults` array in React DevTools or IPC logs
- [ ] **Expected**: Entries like `click → verified | hash: a1b2...→c3d4...` — no base64.

---

## C. Input Accuracy

### C.1 Click into document
- [ ] Open TextEdit (or Notes)
- [ ] Ask GORKH: "Click in the middle of the document and type 'Hello from GORKH'"
- [ ] Approve the click action
- [ ] **Verify**: The cursor lands inside the document text area, not on the toolbar or title bar
- [ ] Approve the type action
- [ ] **Verify**: The text "Hello from GORKH" appears in the document

### C.2 Normalized coordinate mapping
- [ ] On a 1920×1080 external display, ask GORKH to click at a known location (e.g., "Click the red close button at the top-left of the window")
- [ ] **Verify**: The click lands within ~10 pixels of the target
- [ ] Repeat on the built-in Retina display
- [ ] **Verify**: The click lands correctly despite the higher DPI / different scale factor

### C.3 Coordinate clamping behavior
- [ ] Using a test/mock provider, send a proposal with `x=1.5, y=-0.2`
- [ ] **Verify**: The executed click is clamped to the screen edge (x=1920, y=0 on a 1920×1080 display)
- [ ] Check Rust logs for clamp confirmation or observe the cursor stops at the edge

---

## D. Verification Behavior

### D.1 Verified action (screen changes)
- [ ] Open Safari to google.com
- [ ] Ask GORKH: "Click the search bar"
- [ ] Approve the click
- [ ] **Verify**: The action is marked `verified` in logs because the screenshot changed (search bar got focus)

### D.2 Uncertain action (no visible change)
- [ ] Ask GORKH: "Click a blank area of the desktop wallpaper"
- [ ] Approve the click
- [ ] **Verify**: The action is marked `uncertain` because the screenshot hash did not change
- [ ] **Verify**: The controller continues to the next proposal (does not ask user for uncertain clicks)

### D.3 Failed action (blocked UI)
- [ ] Open a dialog with a modal blocker (e.g., Save dialog)
- [ ] Ask GORKH: "Type 'test' in the main window" (behind the modal)
- [ ] Approve the type action
- [ ] **Verify**: The action is marked `failed` because the screenshot hash did not change after typing
- [ ] **Verify**: The controller retries the action once automatically
- [ ] **Verify**: After the retry also fails, the controller asks the user instead of marking done

### D.4 Does not mark done blindly
- [ ] Using a test provider, return `{"kind":"done","summary":"Task completed"}` immediately after a failed action
- [ ] **Verify**: GORKH does NOT accept the done proposal if the last action was `failed` and no retry succeeded
- [ ] **Verify**: GORKH asks the user for guidance

---

## E. Overlay / Approval UX

### E.1 Overlay remains visible during active run
- [ ] Start a multi-step task
- [ ] **Verify**: The top-left GORKH status pill stays visible with the green pulse dot
- [ ] **Verify**: The floating controller card (bottom-right) shows Stop, Pause, Details, Settings

### E.2 Approval modal still appears
- [ ] Start any task
- [ ] **Verify**: The approval modal appears with:
  - Action description
  - Screenshot preview
  - Approve / Reject / Ask User buttons

### E.3 Stop / cancel works during active run
- [ ] Start a task
- [ ] Click "Stop" in the floating controller
- [ ] **Verify**: The run stops immediately
- [ ] **Verify**: The status pill changes to "Stopped" or disappears
- [ ] **Verify**: No further actions are proposed

### E.4 Removing blur did not break usability
- [ ] During an active run, verify the desktop behind the overlay is visible (not blurred)
- [ ] **Verify**: You can still see and interact with apps under the translucent dim layer
- [ ] **Verify**: The overlay does not feel like a fullscreen blocker
- [ ] **Verify**: The approval modal still draws attention without relying on frosted glass

---

## F. Multi-Monitor

### F.1 Select secondary display
- [ ] Connect an external monitor
- [ ] Open GORKH Settings → Display
- [ ] Select the secondary display
- [ ] Start a task: "Click near the center of the screen"

### F.2 Capture works on secondary display
- [ ] **Verify**: The screenshot preview in the approval modal shows the secondary display, not the primary

### F.3 Normalized click maps to selected display
- [ ] Approve the click
- [ ] **Verify**: The cursor appears on the secondary display, not the primary
- [ ] **Verify**: The click coordinates map to the secondary display's resolution, not the primary's

### F.4 Unplug/replug behavior
- [ ] With a task running on the external display, unplug the monitor
- [ ] **Expected behavior to document**: The app may fall back to the primary display or show an error
- [ ] **Document the actual behavior** in the test notes

---

## G. App Focus (open_app)

### G.1 Ask GORKH to open Notes/TextEdit
- [ ] Ask GORKH: "Open TextEdit"
- [ ] Approve the `open_app` action
- [ ] **Verify**: TextEdit becomes the frontmost application (menu bar shows TextEdit)
- [ ] **Verify**: TextEdit window is visible and focused

### G.2 Document current limitation if any
- [ ] If TextEdit opens but does not become frontmost, document the exact failure mode
- [ ] If the app opens minimized or in the background, document the behavior
- [ ] Include macOS version and GORKH version in the notes

---

## H. BYO-Key / Provider Safety

### H.1 No provider key sent to GORKH servers
- [ ] Configure OpenAI with a personal API key
- [ ] Start a task using OpenAI provider
- [ ] Use a network proxy (e.g., Proxyman, Charles) or inspect Rust IPC logs
- [ ] **Verify**: The API key is sent ONLY to `api.openai.com`, never to `api.gorkh.app` or any GORKH endpoint

### H.2 Key stored in keychain, not localStorage
- [ ] Open browser DevTools → Application → Local Storage
- [ ] **Verify**: No `openai_api_key`, `claude_api_key`, or similar entries
- [ ] Open macOS Keychain Access → search for "ai-operator" or "gorkh"
- [ ] **Verify**: Provider keys appear as generic passwords with service names like `llm_api_key:openai`

---

## Sign-off

| Tester | Date | Result |
|--------|------|--------|
|        |      |        |

**Merge recommendation after this checklist:**
- [ ] **PASS** — All critical items (A.4, B.3, C.1, D.3, E.2, G.1) pass
- [ ] **PARTIAL** — Some items fail but failures are documented and non-blocking
- [ ] **FAIL** — Critical safety or functionality regression found; do not merge
