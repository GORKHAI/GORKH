# GORKH Skill Format Specification

**Version:** v1.0-DRAFT  
**Status:** Awaiting architect review (Section 10 contains open questions)  
**Audience:** Future Kimi sessions, third-party contributors, architect sign-off.

---

## Section 1 — Glossary

**Skill** — A declarative unit of capability: a named, versioned, documented operation that GORKH can invoke on behalf of the user. A skill consists of a manifest (what it does) and a handler (how it does it).

**Action** — A single invocation of a skill. An action is created when the LLM decides to call a skill, approved (or denied) by the user, and then executed by the handler.

**Parameter** — A typed input to a skill. Parameters are declared in the manifest as a JSON Schema object and deserialized into the handler's input struct at runtime.

**Handler** — The implementation of a skill. Built-in skills are Rust functions. Third-party and user skills may use other execution environments (Section 6).

**Approval policy** — The rule that determines, at runtime, whether a given action requires explicit user confirmation. Policies range from "always prompt" to "auto-approve for this session".

**Risk level** — A classification (`safe`, `low`, `medium`, `high`, `destructive`) that describes the potential harm of a skill if misused or buggy. Risk level constrains which approval policies are legal.

**Platform** — The operating system(s) a skill supports: `macos`, `windows`, `linux`. A skill may declare one, two, or all three.

**Manifest** — The static, machine-readable description of a skill. The manifest is what the LLM sees when deciding which skill to call.

**Registry** — The runtime collection of loaded skills. The registry holds built-in, third-party, and user skills, each with different trust rules.

**Invocation** — The full lifecycle of an action: LLM proposes → user approves (or not) → handler executes → result returned to LLM.

**Parameter schema** — A JSON Schema (draft-07) describing the shape, types, and constraints of a skill's input. Used to translate the skill into OpenAI/Anthropic tool-calling formats.

**Return contract** — The guaranteed shape of a successful handler output. Every handler returns `Result<SkillOutput, SkillError>`; the return contract specifies what `SkillOutput` contains.

**Error contract** — The categorized error types a handler may produce. The LLM uses the error category to decide whether to retry, ask the user, or abort.

**Versioning** — Semver (`MAJOR.MINOR.PATCH`) for skills. `MAJOR` bumps break the public parameter schema or return contract. `MINOR` adds optional parameters or capabilities. `PATCH` is purely internal.

---

## Section 2 — Design principles

**LLM-comprehensibility.** Every skill manifest must be legible to any LLM with tool-calling support. Descriptions are written for the LLM first, humans second. Parameter schemas use standard JSON Schema types. Examples are included so the LLM sees concrete invocation patterns.

**Human-auditability.** A user reading a skill manifest understands exactly what the skill does, what data it accesses, and what side effects it has. No hidden capabilities. Side effects are declared explicitly in the manifest.

**Contributor-friendliness.** A new skill should require no more than a manifest file and a handler function. The barrier to adding a skill must be low enough that the core team can add one in a single session, and a motivated user can add one in an afternoon.

**Long-term stability.** The manifest schema must survive 5+ years without breaking changes. Fields are either stable (guaranteed) or explicitly marked evolutionary. The spec itself versions independently of GORKH releases.

**Safety by default.** Every skill declares its risk level. The approval policy enforces it. A skill cannot silently auto-approve destructive operations. The default safety mode (`Strict`) prompts for every privileged action.

**Cross-platform-where-meaningful.** Some skills are inherently platform-specific (e.g., `macos.send_imessage`). The spec accommodates single-platform skills cleanly via the `platforms` field. Multi-platform skills declare all supported platforms and the handler branches at runtime.

---

## Section 3 — Skill manifest schema

**Serialization format:** JSON (preferred for distribution) or TOML (preferred for hand-authoring). The canonical on-disk format is JSON. TOML is accepted at load time and translated to JSON.

### Required fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Globally unique identifier. Format: `namespace.action`. Namespace must be a valid DNS label (lowercase, alphanumeric, hyphens). | `system.empty_trash` |
| `version` | string | Semver. | `1.2.0` |
| `name` | string | Human-readable name, shown in approval UI. Max 48 chars. | `Empty Trash` |
| `description` | string | Precise prose for LLM and human. Must explain when to use, when NOT to use, and any preconditions. Max 2000 chars. | "Permanently delete all items in the system Trash / Recycle Bin. Use only when the user explicitly asks to empty trash." |
| `category` | string | Taxonomy category. Must be one of: `files`, `system`, `media`, `productivity`, `web`, `dev`, `comms`, `browser`, `network`, `security`. | `system` |
| `platforms` | string[] | Supported platforms. Must be non-empty. | `["macos"]` |
| `risk_level` | string | One of: `safe`, `low`, `medium`, `high`, `destructive`. | `destructive` |
| `reversibility` | string | One of: `reversible`, `irreversible`, `partial`. | `irreversible` |
| `approval_policy` | string | One of: `always_prompt`, `prompt_first_then_remember`, `auto_approve_for_pattern`, `auto_approve_for_session`, `auto_approve_global`. | `always_prompt` |
| `parameters` | JSON Schema | Input parameter schema (draft-07). If no parameters, use `{}`. | See examples below. |

### Optional fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `examples` | Example[] | 1–3 example invocations. | See Section 9. |
| `triggers` | string[] | Natural-language phrases that should map to this skill. | `["empty my trash", "clear the trash", "delete trash"]` |
| `requires` | Requirement[] | System requirements. | `[{ "kind": "permission", "name": "Accessibility" }]` |
| `cost_estimate` | CostEstimate | Estimated wall-clock time and token cost. | `{ "time_seconds": 5, "tokens_input": 500, "tokens_output": 150 }` |
| `author` | Author | Name and verified badge eligibility. | `{ "name": "GORKH Core", "verified": true }` |
| `license` | string | SPDX identifier or custom URL. | `MIT` |
| `homepage` | string | URL to documentation. | `https://gorkh.ai/skills/empty-trash` |
| `source_url` | string | URL to source code. | `https://github.com/GORKHAI/GORKH/tree/main/skills/empty-trash` |
| `signed` | Signature | Cryptographic signature (required for marketplace). | See Section 6. |

### Approval policy rules

The following matrix defines which policies are legal for which risk levels. Illegal combinations are refused at load time.

| Risk level | `always_prompt` | `prompt_first_then_remember` | `auto_approve_for_pattern` | `auto_approve_for_session` | `auto_approve_global` |
|------------|-----------------|------------------------------|----------------------------|----------------------------|----------------------|
| `safe` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `low` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `medium` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `high` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `destructive` | ✅ | ❌ | ❌ | ❌ | ❌ |

### Parameter schema translation rules

For OpenAI: `parameters` → `tools[].function.parameters` (JSON Schema).
For Anthropic: `parameters` → `tools[].input_schema` (JSON Schema).
For DeepSeek/Moonshot: same as OpenAI.

The `description` of each parameter property is used as the parameter description in all formats.

---

## Section 4 — Handler contract

### Rust function signature (built-in skills)

```rust
pub fn my_skill_handler(
    input: MySkillInput,
    ctx: SkillContext,
) -> Result<SkillOutput, SkillError>;
```

### Input type

Generated from the manifest's `parameters` JSON Schema at compile time (for built-in skills) or deserialized at runtime (for dynamic skills).

### Output type

```rust
pub struct SkillOutput {
    /// Human-readable result summary (shown to user and fed back to LLM)
    pub summary: String,
    /// Optional structured data for the LLM
    pub data: Option<serde_json::Value>,
}
```

### Error type

```rust
pub enum SkillError {
    /// User-facing message; LLM should retry or ask for clarification
    Transient { message: String, retryable: bool },
    /// Permanent failure; LLM should abort or try a different skill
    Permanent { message: String },
    /// User denied a nested approval mid-execution
    Denied { message: String },
    /// Timeout exceeded
    Timeout { elapsed_ms: u64 },
    /// Missing system requirement (permission, installed app, etc.)
    RequirementMissing { requirement: String },
}
```

### Execution context

```rust
pub struct SkillContext {
    /// File system access within the workspace sandbox
    pub workspace: Option<WorkspaceFs>,
    /// Full file system access (only for `high`/`destructive` skills with explicit user consent)
    pub fs: Option<FullFs>,
    /// Network access (disabled by default; must be declared in manifest)
    pub network: Option<NetworkClient>,
    /// Clipboard access
    pub clipboard: Option<ClipboardAccess>,
    /// Current app state snapshot
    pub app_state: GorkhSnapshot,
    /// Active display info for screenshot/input
    pub display: DisplayInfo,
    /// The safety level currently active
    pub safety_level: SafetyLevel,
}
```

### Timeout

Default: 30 seconds. Configurable per-skill via `timeout_ms` in manifest (optional, max 300_000).

### Idempotency

Skills SHOULD be idempotent where feasible. The handler is called exactly once per user-approved action. If the LLM retries, it is a new action with a new approval.

### Side-effect declaration

Every manifest must declare side effects in a `side_effects` array:
- `disk_write` — writes to disk
- `disk_delete` — deletes data
- `network_egress` — sends network requests
- `clipboard_write` — modifies clipboard
- `app_state_change` — mutates GORKH settings
- `input_injection` — simulates clicks/typing
- `process_spawn` — spawns child processes

---

## Section 5 — Approval policy enforcement

### Runtime decision matrix

Given:
- `risk_level` from skill manifest
- `safety_mode` from user settings (`Strict`, `Balanced`, `Permissive`)
- `approval_policy` from skill manifest
- `prior_approvals` from user's stored decisions

The runtime computes:

| Safety mode | Risk | Policy | Result |
|-------------|------|--------|--------|
| Strict | any | any | **Prompt always** |
| Balanced | safe/low | auto_approve_for_session | Auto-approve if approved once this session |
| Balanced | medium | auto_approve_for_pattern | Auto-approve if exact params match prior approval |
| Balanced | high/destructive | any non-always | **Downgrade to always_prompt** |
| Permissive | safe/low/medium | auto_approve_global | Auto-approve |
| Permissive | high | auto_approve_for_session | Auto-approve if approved once this session |
| Permissive | destructive | any non-always | **Downgrade to always_prompt** |

### Stored approvals format

Location: `~/Library/Application Support/GORKH/approvals.json` (macOS), `%APPDATA%/GORKH/approvals.json` (Windows).

```json
{
  "version": 1,
  "entries": [
    {
      "skill_id": "system.empty_trash",
      "skill_version": "1.0.0",
      "policy": "prompt_first_then_remember",
      "approved_at": 1715000000000,
      "expires_at": 1717600000000,
      "param_hash": "sha256:..."
    }
  ]
}
```

User revocation: In Settings → Safety → "Review remembered approvals" → delete individual entries or clear all.

---

## Section 6 — Skill provenance and trust

### Built-in

- Ship inside the GORKH binary.
- Trusted automatically. No signature check at runtime.
- Cryptographically pinned: the manifest hash is baked into the binary at compile time.
- Loaded at startup from the binary's embedded skill manifest directory.
- Discovery: always present in the LLM tool list.
- Revocation: impossible without a binary update.

### Third-party (marketplace)

- Distributed as `.gorkh-skill` archives (tar.gz with manifest + handler + signature).
- User must explicitly install via Settings → Skills → Install.
- Signed by publisher. Signature verified at install time.
- Review process: automated static analysis (parameter schema validation, side-effect check, handler sandbox scan) + manual review for `high`/`destructive` skills.
- Loaded at startup from `~/Library/Application Support/GORKH/skills/`.
- Discovery: present in LLM tool list after install.
- Revocation: user uninstalls via Settings; GORKH can also remotely blacklist by skill ID.

### User-authored (local)

- User writes a manifest + handler on their own machine.
- No signing required.
- Treated as the most cautious risk class: `approval_policy` is capped at `prompt_first_then_remember` regardless of declared level.
- Loaded from `~/.gorkh/skills/`.
- Discovery: present in LLM tool list.
- Revocation: delete the skill directory.

---

## Section 7 — Skill versioning and migration

### Registry behavior on version update

When a skill is updated from `1.2.0` to `1.3.0` (minor bump):
- New optional parameters are accepted.
- Old parameters remain valid.
- User's stored `always_allow` rules remain valid.

When a skill is updated from `1.3.0` to `2.0.0` (major bump):
- The registry treats it as a **new skill** with a separate entry.
- Old `always_allow` rules are **invalidated** for the new version.
- The old skill remains in the registry until the user uninstalls it or a cleanup job removes it after 30 days.

### Clean migration path for skill authors

Skill authors should provide a `migrations` array in the manifest:

```json
{
  "migrations": [
    {
      "from": "1.x",
      "to": "2.0.0",
      "note": "Parameter 'force' renamed to 'confirm_destructive'. Update your prompts."
    }
  ]
}
```

---

## Section 8 — LLM tool-call translation

### OpenAI / DeepSeek / Moonshot

```json
{
  "type": "function",
  "function": {
    "name": "system.empty_trash",
    "description": "Permanently delete all items in the system Trash...",
    "parameters": {
      "type": "object",
      "properties": {},
      "required": []
    }
  }
}
```

Result format:
```json
{
  "role": "tool",
  "tool_call_id": "call_abc123",
  "content": "Trash emptied successfully."
}
```

### Anthropic

```json
{
  "name": "system.empty_trash",
  "description": "Permanently delete all items in the system Trash...",
  "input_schema": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

Result format:
```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "toolu_01Abc123",
      "content": "Trash emptied successfully."
    }
  ]
}
```

### System prompt placement

For all providers, the skill manifest `description` and `examples` are injected into the system prompt in a dedicated "Available skills" section. The placement is:
1. Core identity prompt
2. Available skills (sorted by category)
3. Safety instructions
4. Output format rules

---

## Section 9 — Worked examples

### 9.1 Read-only safe skill: `fs.list_files`

```json
{
  "id": "fs.list_files",
  "version": "1.0.0",
  "name": "List Files",
  "description": "List the files and directories inside a given path within the workspace. Use this when the user asks what files are present or wants to explore directory contents.",
  "category": "files",
  "platforms": ["macos", "windows", "linux"],
  "risk_level": "safe",
  "reversibility": "reversible",
  "approval_policy": "auto_approve_global",
  "parameters": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Relative path within the workspace to list. Use '.' for root."
      }
    },
    "required": ["path"]
  },
  "examples": [
    {
      "user_prompt": "What files are in the project?",
      "tool_call": { "tool": "fs.list_files", "path": "." },
      "result": "README.md, src/, package.json"
    }
  ],
  "side_effects": [],
  "triggers": ["list files", "what files", "show directory contents"]
}
```

### 9.2 Reversible-write skill: `fs.move_files`

```json
{
  "id": "fs.move_files",
  "version": "1.1.0",
  "name": "Move Files",
  "description": "Move one or more files from one location to another within the workspace. This is reversible if the destination is known.",
  "category": "files",
  "platforms": ["macos", "windows", "linux"],
  "risk_level": "medium",
  "reversibility": "reversible",
  "approval_policy": "prompt_first_then_remember",
  "parameters": {
    "type": "object",
    "properties": {
      "paths": { "type": "array", "items": { "type": "string" } },
      "destination": { "type": "string" }
    },
    "required": ["paths", "destination"]
  },
  "side_effects": ["disk_write"]
}
```

### 9.3 Irreversible-destructive skill: `system.empty_trash`

```json
{
  "id": "system.empty_trash",
  "version": "1.0.0",
  "name": "Empty Trash",
  "description": "Permanently delete all items in the system Trash / Recycle Bin. Use ONLY when the user explicitly asks to empty trash. Warn the user that this cannot be undone.",
  "category": "system",
  "platforms": ["macos"],
  "risk_level": "destructive",
  "reversibility": "irreversible",
  "approval_policy": "always_prompt",
  "parameters": { "type": "object", "properties": {} },
  "examples": [
    {
      "user_prompt": "empty my trash",
      "tool_call": { "tool": "system.empty_trash" },
      "result": "Trash emptied successfully. 3 items deleted."
    }
  ],
  "side_effects": ["disk_delete", "process_spawn"],
  "requires": [{ "kind": "permission", "name": "FinderAutomation" }],
  "triggers": ["empty my trash", "clear the trash", "delete trash"]
}
```

### 9.4 Network-egress skill: `web.download_file`

```json
{
  "id": "web.download_file",
  "version": "1.0.0",
  "name": "Download File",
  "description": "Download a file from a URL to the workspace. Verify the URL is trustworthy before downloading.",
  "category": "web",
  "platforms": ["macos", "windows", "linux"],
  "risk_level": "medium",
  "reversibility": "reversible",
  "approval_policy": "prompt_first_then_remember",
  "parameters": {
    "type": "object",
    "properties": {
      "url": { "type": "string", "format": "uri" },
      "destination_path": { "type": "string", "description": "Relative path in workspace to save the file." }
    },
    "required": ["url", "destination_path"]
  },
  "side_effects": ["disk_write", "network_egress"],
  "cost_estimate": { "time_seconds": 10, "tokens_input": 200, "tokens_output": 100 }
}
```

### 9.5 Platform-specific skill: `mac.send_imessage`

```json
{
  "id": "mac.send_imessage",
  "version": "1.0.0",
  "name": "Send iMessage",
  "description": "Send an iMessage to a contact using macOS Messages app. The contact must be reachable via iMessage.",
  "category": "comms",
  "platforms": ["macos"],
  "risk_level": "medium",
  "reversibility": "irreversible",
  "approval_policy": "always_prompt",
  "parameters": {
    "type": "object",
    "properties": {
      "recipient": { "type": "string", "description": "Phone number or email address registered with iMessage." },
      "body": { "type": "string", "maxLength": 4000 }
    },
    "required": ["recipient", "body"]
  },
  "side_effects": ["network_egress", "process_spawn"],
  "requires": [{ "kind": "app", "name": "Messages" }]
}
```

---

## Section 10 — Open questions for the architect

### Q1: Should built-in skills support non-Rust handlers?

**Options:**
- A) No — all built-in skills are Rust only. Keeps binary size and attack surface controlled.
- B) Yes — built-in skills may embed Python or shell scripts for rapid prototyping.

**Recommendation:** A. Rust-only for built-in skills. If a skill needs rapid iteration, it should start as a user-authored skill and graduate to built-in after being rewritten in Rust.

### Q2: Should third-party skills run in a separate process for isolation?

**Options:**
- A) In-process — maximum performance, minimum complexity. Trust established via code review and signature.
- B) Separate process — better isolation, but higher IPC overhead and more complex lifecycle management.
- C) WebAssembly sandbox — language-agnostic, strong isolation, but limited system API access without host functions.

**Recommendation:** C for the long term, B as a stepping stone. Start with separate-process execution for third-party skills (using the existing Tauri process-spawning infrastructure), then migrate to Wasm once the host-function surface is stable.

### Q3: Should the skill manifest use TOML instead of JSON for hand-authoring?

**Options:**
- A) JSON only — one format everywhere, no translation layer.
- B) TOML for authoring, JSON for distribution — better ergonomics for humans, standard machine format.

**Recommendation:** B. Accept TOML at load time, translate to JSON internally. The spec already allows this.

### Q4: Should skills support conditional parameters (e.g., `if platform == macos then require X`)?

**Options:**
- A) No — keep parameters flat. Platform differences are handled in the handler.
- B) Yes — add a `conditional_parameters` section for platform-specific optional params.

**Recommendation:** A. Platform branching belongs in the handler, not the manifest. The manifest should be simple and static.

### Q5: Should the registry support skill dependencies (e.g., skill B requires skill A)?

**Options:**
- A) No — each skill is self-contained.
- B) Yes — skills may declare `depends_on` for composition.

**Recommendation:** A for v1.0. Composition can be achieved by the LLM invoking multiple skills in sequence. Dependency graphs add significant complexity to load order, versioning, and circular-dependency checking.

---

## Section 11 — Backward and forward compatibility commitment

### Stable fields (guaranteed until spec v2.0)

- `id`, `version`, `name`, `description`, `category`, `platforms`, `risk_level`, `reversibility`, `approval_policy`, `parameters`
- The approval policy enforcement matrix (Section 5)
- The handler return contract `Result<SkillOutput, SkillError>`
- The OpenAI and Anthropic translation rules (Section 8)

### Evolutionary fields (may change in v1.1, v1.2, etc.)

- `cost_estimate` — format may expand to include per-provider estimates
- `requires` — new requirement kinds may be added
- `side_effects` — new effect types may be added
- `migrations` — format may be refined

### Spec versioning rules

- **Patch (v1.0.1 → v1.0.2):** Clarifications, typo fixes, non-normative examples. No implementation changes required.
- **Minor (v1.0 → v1.1):** New optional manifest fields, new side-effect types, new requirement kinds. Implementations may ignore unknown optional fields.
- **Major (v1.x → v2.0):** Changes to stable fields, changes to the handler contract, changes to the approval matrix. Requires coordinated rollout.

---

**SKILL FORMAT SPEC v1.0-DRAFT — 11 sections, 5 open questions for architect.**
