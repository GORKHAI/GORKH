---
name: frontend-ui
description: >
  GORKH frontend engineering for both the desktop React app (Tauri webview) and
  the Next.js web portal. Covers product UX polish, state management, chat/task UI,
  approval dialogs, permission guidance, provider settings, runtime status displays,
  sign-in flow, billing pages, download pages, and retail-friendly design. Use this
  skill for ANY React component, page, hook, or UI state work in apps/desktop/src/ or
  apps/web/. Trigger for "component", "page", "UI", "UX", "React", "Next.js", "form",
  "dialog", "modal", "state", "store", "hook", "layout", "navigation", "chat",
  "conversation", "approval", "settings", "billing page", "download page", "design",
  "styling", "Tailwind", "animation", or "responsive".
---

# Frontend / Product UI — GORKH

GORKH must feel like a **consumer desktop assistant**, not an ops console. Retail-friendly,
polished, responsive, and clear.

## Two Frontend Surfaces

| Surface | Path | Framework | Purpose |
|---|---|---|---|
| Desktop App | `apps/desktop/src/` | React + Vite (in Tauri webview) | Primary product: chat, tasks, approvals, settings |
| Web Portal | `apps/web/` | Next.js 14+ (App Router) | Sign-in, billing, downloads, account, admin |

## Desktop App UI Structure

```
apps/desktop/src/
├── App.tsx                     # Root: auth gate, layout shell
├── main.tsx                    # React entry
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        # Main layout: sidebar + content
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   ├── TitleBar.tsx        # Custom title bar (if frameless)
│   │   └── StatusBar.tsx       # Bottom bar: provider, runtime, network
│   │
│   ├── chat/
│   │   ├── ChatView.tsx        # Main chat container
│   │   ├── MessageList.tsx     # Scrollable message list
│   │   ├── MessageBubble.tsx   # Single message (user/assistant/tool)
│   │   ├── ChatInput.tsx       # Text input + send button
│   │   ├── ToolCallCard.tsx    # Visual card for tool execution
│   │   ├── ToolResultCard.tsx  # Tool result display
│   │   └── StreamingText.tsx   # Streaming response renderer
│   │
│   ├── approvals/
│   │   ├── ApprovalDialog.tsx  # Modal for approving actions
│   │   ├── ApprovalQueue.tsx   # Pending approvals indicator
│   │   └── ActionPreview.tsx   # Preview of what will be executed
│   │
│   ├── providers/
│   │   ├── ProviderSettings.tsx    # Provider configuration panel
│   │   ├── ProviderCard.tsx        # Single provider config card
│   │   ├── ApiKeyInput.tsx         # Secure key input field
│   │   └── ProviderStatus.tsx      # Availability indicator
│   │
│   ├── runtime/
│   │   ├── RuntimeStatus.tsx       # Free AI runtime status display
│   │   ├── RuntimeSetupGuide.tsx   # Step-by-step setup helper
│   │   ├── ModelSelector.tsx       # Local model picker
│   │   └── RuntimeControls.tsx     # Start/stop buttons
│   │
│   ├── permissions/
│   │   ├── PermissionGate.tsx      # Shows guidance if permissions missing
│   │   ├── PermissionCard.tsx      # Single permission status + action
│   │   └── PermissionBanner.tsx    # Top banner for missing permissions
│   │
│   └── common/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Dialog.tsx
│       ├── Badge.tsx
│       ├── Spinner.tsx
│       ├── EmptyState.tsx
│       ├── ErrorBoundary.tsx
│       └── Tooltip.tsx
│
├── hooks/
│   ├── use-auth.ts             # Auth state + sign-in/out
│   ├── use-chat.ts             # Chat state, message history, send
│   ├── use-agent.ts            # Agent orchestrator hook
│   ├── use-providers.ts        # Provider config + status
│   ├── use-runtime.ts          # Runtime detection, start, stop
│   ├── use-permissions.ts      # OS permission checks
│   ├── use-approvals.ts        # Approval queue management
│   ├── use-ws.ts               # WebSocket connection hook
│   └── use-theme.ts            # Light/dark theme
│
├── stores/
│   ├── auth.store.ts           # Auth state (zustand)
│   ├── chat.store.ts           # Conversation state
│   ├── provider.store.ts       # Provider config
│   ├── runtime.store.ts        # Runtime status
│   └── ui.store.ts             # UI state (sidebar, modals)
│
├── lib/
│   ├── ipc.ts                  # Typed Tauri invoke wrappers
│   ├── ws-client.ts            # WebSocket client
│   └── format.ts               # Formatting utilities
│
└── styles/
    ├── globals.css              # Tailwind base + custom properties
    └── tokens.css               # Design tokens
```

## Web Portal UI Structure

```
apps/web/
├── src/app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing / marketing
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── desktop-login/page.tsx  # Desktop auth handoff
│   ├── (app)/
│   │   ├── layout.tsx          # Authenticated layout
│   │   ├── dashboard/page.tsx
│   │   ├── billing/page.tsx
│   │   ├── account/page.tsx
│   │   ├── devices/page.tsx
│   │   └── settings/page.tsx
│   ├── download/page.tsx       # Public download page
│   └── admin/                  # Admin/debug surfaces
│       ├── health/page.tsx
│       └── sessions/page.tsx
│
├── src/components/
│   ├── auth/
│   ├── billing/
│   ├── download/
│   └── layout/
│
└── src/lib/
    ├── api-client.ts
    └── auth.ts
```

## State Management — Desktop App

Use **Zustand** for global state. Keep state minimal and derive where possible.

```typescript
// apps/desktop/src/stores/chat.store.ts
import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  timestamp: number;
  streaming?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;

  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, update: Partial<ChatMessage>) => void;
  appendToLastAssistant: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  error: null,

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  updateMessage: (id, update) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, ...update } : m
      ),
    })),

  appendToLastAssistant: (content) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content: last.content + content };
      }
      return { messages: msgs };
    }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [], error: null }),
}));
```

## Chat Components

### Chat Input

```tsx
// apps/desktop/src/components/chat/ChatInput.tsx
import { useState, useRef, useCallback } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Auto-resize textarea
  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, []);

  return (
    <div className="flex items-end gap-2 p-4 border-t border-neutral-200 dark:border-neutral-800">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => { setValue(e.target.value); handleInput(); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Ask GORKH anything..."}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-neutral-300 dark:border-neutral-700 
                   bg-white dark:bg-neutral-900 px-4 py-3 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500
                   disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="rounded-lg bg-blue-600 px-4 py-3 text-white text-sm font-medium
                   hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors"
      >
        Send
      </button>
    </div>
  );
}
```

### Approval Dialog

```tsx
// apps/desktop/src/components/approvals/ApprovalDialog.tsx
interface ApprovalDialogProps {
  action: PendingAction;
  onApprove: () => void;
  onDeny: () => void;
}

export function ApprovalDialog({ action, onApprove, onDeny }: ApprovalDialogProps) {
  return (
    <Dialog open onOpenChange={() => onDeny()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldIcon className="w-5 h-5 text-amber-500" />
            Action Requires Approval
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg bg-neutral-50 dark:bg-neutral-900 p-3">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {action.description}
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
            <p className="text-xs text-neutral-500 mb-1">Tool: {action.tool}</p>
            <pre className="text-xs text-neutral-600 dark:text-neutral-400 overflow-auto max-h-40">
              {JSON.stringify(action.arguments, null, 2)}
            </pre>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDeny}>Deny</Button>
          <Button onClick={onApprove}>Approve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Runtime Status

```tsx
export function RuntimeStatus() {
  const { status, start, stop } = useRuntime();

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
      <StatusDot
        color={
          status.running ? "green"
          : status.installed ? "yellow"
          : "red"
        }
      />
      <div className="flex-1">
        <p className="text-sm font-medium">
          {status.running ? "Free AI Running"
           : status.installed ? "Free AI Stopped"
           : "Free AI Not Installed"}
        </p>
        {status.model_loaded && (
          <p className="text-xs text-neutral-500">Model: {status.model_loaded}</p>
        )}
        {status.error && (
          <p className="text-xs text-red-500">{status.error}</p>
        )}
      </div>
      {status.installed && !status.running && (
        <Button size="sm" onClick={start}>Start</Button>
      )}
      {status.running && (
        <Button size="sm" variant="outline" onClick={stop}>Stop</Button>
      )}
      {!status.installed && (
        <Button size="sm" onClick={() => { /* open setup guide */ }}>Set Up</Button>
      )}
    </div>
  );
}
```

## Design Tokens

```css
/* apps/desktop/src/styles/tokens.css */
:root {
  /* Brand */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;

  /* Surfaces */
  --color-bg: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-tertiary: #f3f4f6;
  --color-border: #e5e7eb;

  /* Text */
  --color-text: #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary: #9ca3af;

  /* Status */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* Spacing */
  --sidebar-width: 260px;
  --header-height: 52px;

  /* Typography */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
}

.dark {
  --color-bg: #0a0a0a;
  --color-bg-secondary: #171717;
  --color-bg-tertiary: #262626;
  --color-border: #2e2e2e;
  --color-text: #fafafa;
  --color-text-secondary: #a3a3a3;
  --color-text-tertiary: #737373;
}
```

## Styling Rules

- Use **Tailwind CSS** for all styling. No CSS modules, no styled-components.
- Color palette: clean, neutral with blue primary accents. Dark mode mandatory.
- Font: Inter for UI, JetBrains Mono for code/tool output.
- Border radius: `rounded-lg` (8px) for cards, `rounded-md` (6px) for inputs, `rounded-full` for avatars/badges.
- Shadows: minimal. Use border separation, not heavy shadows.
- Animations: subtle. 150ms transitions for hover/focus states. No gratuitous motion.
- Desktop and web share Tailwind config but have separate theme customizations.
- All interactive elements must have visible focus rings for accessibility.
- Loading states use skeleton placeholders, not spinners (except for streaming text).

## Desktop vs Web UX Differences

| Aspect | Desktop | Web |
|---|---|---|
| Primary flow | Chat → Task → Approval → Execution | Sign-in → Billing → Account |
| Navigation | Sidebar + tray | Top navbar |
| Auth | Keychain-backed, auto-reconnect | Cookie-based sessions |
| Data display | Real-time streaming, tool cards | Static pages, SSR |
| Settings | Provider keys, runtime, permissions | Billing, account, devices |

## Rules

- The app must feel **retail-friendly**. No developer jargon in the UI.
- Error messages are human-readable: "Couldn't connect to the AI" not "ERR_CONNECTION_REFUSED".
- Streaming text must render progressively — users see words appear, not a blank screen then a wall of text.
- Approval dialogs are modal and blocking. The user must explicitly approve or deny.
- Permission banners are dismissible but persistent until the permission is granted.
- Dark mode respects system preference by default with manual override.
- All components are keyboard navigable.
- The chat input supports Shift+Enter for newlines, Enter to send.
- Empty states (no conversations, no providers configured) have helpful guidance, not just blank screens.
- Tool execution cards show: tool name, arguments preview, status (pending/running/done/failed), result.
