/**
 * Deterministic operator-intent router for GORKH desktop chat.
 *
 * This module classifies user messages BEFORE sending them to the LLM.
 * Operator/action requests are routed into the GORKH task/approval flow
 * instead of being handled as generic chatbot guidance.
 *
 * v1: keyword/rule-based. No LLM call required for routing.
 */

export type OperatorIntentType =
  | 'informational_capability'
  | 'system_empty_trash'
  | 'open_app_terminal'
  | 'open_app'
  | 'computer_use_task'
  | 'file_management'
  | 'chat';

export type TaskRiskLevel = 'normal' | 'high';

export interface OperatorIntentResult {
  type: OperatorIntentType;
  /** Human-readable goal for the task engine */
  goal?: string;
  /** One-line summary shown in chat and confirmation */
  summary?: string;
  /** Confirmation prompt shown to the user */
  prompt?: string;
  riskLevel?: TaskRiskLevel;
  /** Whether this action needs Accessibility/Input permission */
  requiresAccessibility?: boolean;
  /** Whether this action needs Screen Recording permission */
  requiresScreen?: boolean;
  /** Whether this action needs a configured workspace */
  requiresWorkspace?: boolean;
  /** App name for open_app intents */
  appName?: string;
}

/** Canned GORKH capabilities reply — never identifies as DeepSeek */
export const GORKH_CAPABILITIES_REPLY =
  'I am GORKH, a desktop AI operator. I can help operate your Mac with your approval: observe screen, open apps, click, type, scroll, use hotkeys, manage workspace files, run approved terminal commands, clipboard actions, and empty Trash. Privileged/destructive actions require approval.';

/** Permission guidance message */
export const ACCESSIBILITY_PERMISSION_GUIDANCE =
  'Grant Accessibility permission to let GORKH perform approved desktop actions.';

/** Screen recording permission guidance */
export const SCREEN_PERMISSION_GUIDANCE =
  'Grant Screen Recording permission so GORKH can observe the desktop.';

const EMPTY_TRASH_PATTERNS = [
  /\bempty\s+(?:my\s+|the\s+|your\s+)?(?:mac\s+)?trash\b/i,
  /\bclear\s+(?:my\s+|the\s+|your\s+)?(?:mac\s+)?trash\b/i,
  /\bdelete\s+(?:my\s+|the\s+|your\s+)?(?:mac\s+)?trash\b/i,
  /\btrash\s+(?:is\s+)?full\b/i,
  /\bclean\s+(?:my\s+|the\s+|your\s+)?(?:mac\s+)?trash\b/i,
];

const OPEN_TERMINAL_PATTERNS = [
  /\bopen\s+(?:my\s+)?terminal\b/i,
  /\blaunch\s+(?:my\s+)?terminal\b/i,
  /\bstart\s+(?:my\s+)?terminal\b/i,
  /\bopen\s+(?:a\s+)?new\s+terminal\b/i,
  /\bstart\s+a\s+new\s+terminal\b/i,
  /\brun\s+terminal\b/i,
  /\buse\s+terminal\b/i,
];

const COMPUTER_USE_PATTERNS = [
  /\bclick\b/,
  /\btype\b/,
  /\bscroll\b/,
  /\bhotkey\b/,
  /\bkeyboard\b/,
  /\bpress\s+(?:the\s+)?(?:key|button|enter|return|tab|escape|space)\b/,
  /\bmove\s+(?:the\s+)?mouse\b/,
  /\bdrag\b/,
  /\bright[-\s]?click\b/,
  /\bdouble[-\s]?click\b/,
  /\bcontrol\s+(?:my\s+)?mac\b/,
  /\binteract\s+(?:with\s+)?(?:my\s+)?(?:mac|computer|screen|desktop)\b/,
  /\buse\s+(?:my\s+)?(?:mac|computer)\b/,
  /\boperate\s+(?:my\s+)?(?:mac|computer)\b/,
];

const FILE_MANAGEMENT_PATTERNS = [
  /\borganize\s+(?:my\s+)?(?:downloads|files|desktop)\b/,
  /\bclean\s+(?:up\s+)?(?:my\s+)?(?:downloads|files|desktop)\b/,
  /\bmanage\s+(?:my\s+)?files\b/,
  /\bmove\s+(?:my\s+)?files\b/,
  /\bcopy\s+(?:my\s+)?files\b/,
  /\bdelete\s+(?:my\s+)?files\b/,
  /\brename\s+(?:my\s+)?files\b/,
  /\bsort\s+(?:my\s+)?(?:downloads|files|desktop)\b/,
];

const INFORMATIONAL_CAPABILITY_PATTERNS = [
  /\bwhat\s+can\s+you\s+do\b/,
  /\bwhat\s+do\s+you\s+do\b/,
  /\bwho\s+are\s+you\b/,
  /\bwhat\s+are\s+you\b/,
  /\byour\s+capabilities\b/,
  /\bhelp\s+me\b/,
  /\btell\s+me\s+about\s+yourself\b/,
  /\bwhat\s+can\s+you\s+help\s+(?:me\s+)?with\b/,
  /\bhow\s+can\s+you\s+help\b/,
];

/**
 * Extract a clean app name from "open X" or "launch X" patterns.
 * Returns null if no recognizable app name is found.
 */
function extractAppName(text: string): string | null {
  const lower = text.toLowerCase();

  // Explicit terminal patterns are handled separately
  if (OPEN_TERMINAL_PATTERNS.some((p) => p.test(lower))) {
    return 'Terminal';
  }

  // Generic "open X" / "launch X"
  const match = lower.match(/\b(?:open|launch|start)\s+(?:the\s+)?(?:app\s+)?([a-z][a-z0-9\s]*?)(?:\s+(?:app|application|for me|please))?\b/);
  if (match) {
    const raw = match[1].trim();
    // Filter out vague terms that aren't app names
    const vague = new Set([
      'it', 'this', 'that', 'something', 'anything', 'everything',
      'the', 'a', 'an', 'my', 'your', 'me', 'file', 'folder',
      'document', 'window', 'page', 'tab', 'link', 'url',
    ]);
    if (!vague.has(raw) && raw.length > 1) {
      return raw
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }

  return null;
}

/**
 * Classify a user message into an operator intent.
 *
 * This is intentionally simple and deterministic. It trades
 * sophistication for reliability: we never miss a clear operator
 * intent, and we rarely false-positive on normal chat.
 */
export function classifyOperatorIntent(message: string): OperatorIntentResult {
  const lower = message.toLowerCase().trim();

  // 1. Informational capability questions
  if (INFORMATIONAL_CAPABILITY_PATTERNS.some((p) => p.test(lower))) {
    return { type: 'informational_capability' };
  }

  // 2. Empty trash (high-risk, destructive)
  if (EMPTY_TRASH_PATTERNS.some((p) => p.test(lower))) {
    return {
      type: 'system_empty_trash',
      goal: 'Empty the Mac Trash',
      summary: 'Permanently delete all items in the Mac Trash',
      prompt: 'Empty Mac Trash? This permanently deletes items and cannot be undone.',
      riskLevel: 'high',
      requiresAccessibility: false,
      requiresScreen: false,
      requiresWorkspace: false,
    };
  }

  // 3. Open Terminal
  if (OPEN_TERMINAL_PATTERNS.some((p) => p.test(lower))) {
    return {
      type: 'open_app_terminal',
      goal: 'Open Terminal',
      summary: 'Open the Terminal application',
      prompt: 'Open Terminal?',
      riskLevel: 'normal',
      requiresAccessibility: false,
      requiresScreen: false,
      requiresWorkspace: false,
      appName: 'Terminal',
    };
  }

  // 4. Computer use (click, type, scroll, etc.) — checked before open_app
  // so phrases like "use my computer to open settings" route as tasks
  if (COMPUTER_USE_PATTERNS.some((p) => p.test(lower))) {
    return {
      type: 'computer_use_task',
      goal: message,
      summary: 'Perform desktop actions',
      prompt: `Start desktop task: ${message}?`,
      riskLevel: 'normal',
      requiresAccessibility: true,
      requiresScreen: true,
      requiresWorkspace: false,
    };
  }

  // 5. File management
  if (FILE_MANAGEMENT_PATTERNS.some((p) => p.test(lower))) {
    return {
      type: 'file_management',
      goal: message,
      summary: 'Manage files and folders',
      prompt: `Start file management task: ${message}?`,
      riskLevel: 'normal',
      requiresAccessibility: true,
      requiresScreen: false,
      requiresWorkspace: true,
    };
  }

  // 6. Open a specific app
  const appName = extractAppName(message);
  if (appName && appName !== 'Terminal') {
    return {
      type: 'open_app',
      goal: `Open ${appName}`,
      summary: `Open the ${appName} application`,
      prompt: `Open ${appName}?`,
      riskLevel: 'normal',
      requiresAccessibility: false,
      requiresScreen: false,
      requiresWorkspace: false,
      appName,
    };
  }

  // 7. Default: normal chat
  return {
    type: 'chat',
    requiresAccessibility: false,
    requiresScreen: false,
    requiresWorkspace: false,
  };
}
