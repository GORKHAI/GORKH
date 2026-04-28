/**
 * GORKH static knowledge base.
 *
 * Plain-English descriptions of GORKH features, settings, states, and guidance
 * injected into the assistant's context so it can answer product questions
 * accurately without relying on generic model training data.
 *
 * Privacy: this module contains no user data — only static product knowledge.
 */

// ---------------------------------------------------------------------------
// Feature descriptions
// ---------------------------------------------------------------------------

export interface GorkhFeatureDoc {
  name: string;
  description: string;
  howToUse: string;
  requirements?: string;
}

export const GORKH_FEATURES: Record<string, GorkhFeatureDoc> = {
  freeAi: {
    name: 'GORKH AI (Free)',
    description:
      'GORKH provides a hosted free tier powered by DeepSeek. No API key is required. ' +
      'Sign in to use it.',
    howToUse:
      'Select GORKH AI (Free) in Settings. Sign in to verify the device. You get a limited number of tasks per day.',
    requirements:
      'Requires an internet connection and a signed-in GORKH account.',
  },
  remoteControl: {
    name: 'Remote control',
    description:
      'Lets GORKH (or a connected web session) perform actions on your screen — clicking, typing, ' +
      'scrolling, and keyboard shortcuts. Every action requires your explicit approval before it happens.',
    howToUse:
      'Enable "Allow remote control" in Settings. Each proposed action will appear in an approval ' +
      'dialog — you approve or deny it before anything happens.',
    requirements:
      'Requires Accessibility permission on macOS (Settings > Privacy & Security > Accessibility).',
  },
  screenPreview: {
    name: 'Screen preview',
    description:
      'Shares a live view of your screen with the GORKH web dashboard. Frames are never stored to ' +
      'disk or the server — they exist only in memory for 60 seconds.',
    howToUse: 'Enable "Screen preview" in Settings. You can stop it at any time from the same toggle.',
    requirements:
      'Requires Screen Recording permission on macOS (Settings > Privacy & Security > Screen Recording).',
  },
  workspace: {
    name: 'Workspace',
    description:
      'A folder on your computer that GORKH can read and write files in, and run terminal commands ' +
      'inside. This lets the assistant help with code, documents, and projects without needing GUI clicks.',
    howToUse:
      'Configure your workspace folder in Settings > Workspace. The assistant can then list files, ' +
      'read/write text files, and run commands — each action requires your approval.',
    requirements: 'No extra permissions required. Only files inside the configured folder are accessible.',
  },
  approvals: {
    name: 'Local approvals',
    description:
      'Every action GORKH proposes — clicking, typing, reading files, running commands — is shown ' +
      'to you before it happens. You approve or deny each one. Nothing runs without your confirmation.',
    howToUse:
      'Approvals appear automatically when the assistant proposes an action. You have 60 seconds to ' +
      'decide. "Stop All" immediately cancels everything.',
    requirements: 'Always on — cannot be disabled.',
  },
};

// ---------------------------------------------------------------------------
// Setting descriptions
// ---------------------------------------------------------------------------

export interface GorkhSettingDoc {
  label: string;
  description: string;
  howToChange: string;
  default: string;
}

export const GORKH_SETTINGS: Record<string, GorkhSettingDoc> = {
  allowControl: {
    label: 'Allow remote control',
    description:
      'When enabled, the assistant can propose clicking, typing, and keyboard shortcuts on your screen. ' +
      'Every proposed action still requires your approval in a pop-up dialog.',
    howToChange: 'Toggle "Allow remote control" in the Settings panel.',
    default: 'Off',
  },
  screenPreview: {
    label: 'Screen preview',
    description:
      'Streams a live view of your screen to the GORKH web dashboard. Frames are never saved — ' +
      'they are discarded automatically after 60 seconds.',
    howToChange: 'Toggle "Screen preview" in the Settings panel.',
    default: 'Off',
  },
  autostart: {
    label: 'Start at login',
    description: 'Launches GORKH automatically when you log in to your Mac.',
    howToChange: 'Toggle "Start at login" in the Settings panel.',
    default: 'Off',
  },
  aiProvider: {
    label: 'AI provider',
    description:
      'Chooses which AI model powers the assistant. GORKH AI (Free) is the hosted free tier. ' +
      'Paid providers (OpenAI, Claude, etc.) use your own API key and may incur usage costs.',
    howToChange: 'Select a provider in Settings > AI Provider.',
    default: 'GORKH AI (Free)',
  },
};

// ---------------------------------------------------------------------------
// Provider explanations
// ---------------------------------------------------------------------------

export const GORKH_PROVIDER_EXPLANATIONS: Record<string, string> = {
  gorkh_free:
    'GORKH AI (Free) — hosted free tier. No API key required. Limited tasks per day.',
  openai:
    'OpenAI — uses your OpenAI API key. Charges apply per use. The model runs in the cloud.',
  claude:
    'Anthropic Claude — uses your Claude API key. Charges apply per use. The model runs in the cloud.',
  deepseek:
    'DeepSeek — uses your DeepSeek API key. Charges apply per use. The model runs in the cloud.',
  minimax:
    'MiniMax — uses your MiniMax API key. Charges apply per use. The model runs in the cloud.',
  kimi:
    'Kimi — uses your Kimi API key. Charges apply per use. The model runs in the cloud.',
  openai_compat:
    'Custom OpenAI-compatible endpoint — self-hosted. Advanced use.',
};

// ---------------------------------------------------------------------------
// Permission guidance
// ---------------------------------------------------------------------------

export const GORKH_PERMISSION_GUIDANCE: Record<string, string> = {
  screenRecording:
    'GORKH needs Screen Recording permission to capture your screen for the preview and for the ' +
    'AI assistant to see what is on your screen. ' +
    'Go to System Settings > Privacy & Security > Screen Recording and enable GORKH.',
  accessibility:
    'GORKH needs Accessibility permission to send clicks, keystrokes, and hotkeys on your behalf. ' +
    'Go to System Settings > Privacy & Security > Accessibility and enable GORKH.',
};

// ---------------------------------------------------------------------------
// Onboarding / help strings
// ---------------------------------------------------------------------------

export const GORKH_ONBOARDING = {
  firstGreeting:
    "Hi — I'm GORKH, your desktop AI assistant. I can help you automate tasks on your computer, " +
    "answer questions about my own settings and features, or guide you through setup. How can I help you today?",

  providerNotConfigured:
    "I don't have an AI provider configured yet. To get started, " +
    "you can use GORKH AI (Free) after signing in, or enter an API key for a paid provider like OpenAI or Claude.",

  screenRecordingNeeded:
    "To see what's on your screen, I need Screen Recording permission. " +
    "You can grant it in System Settings > Privacy & Security > Screen Recording.",

  accessibilityNeeded:
    "To control your Mac, I need Accessibility permission. " +
    "You can grant it in System Settings > Privacy & Security > Accessibility.",
};

// ---------------------------------------------------------------------------
// Common Q&A used in grounded responses
// ---------------------------------------------------------------------------

export interface GorkhQA {
  question: string;
  answer: string;
}

export const GORKH_FAQ: GorkhQA[] = [
  {
    question: 'What can GORKH do?',
    answer:
      'GORKH can automate tasks on your computer (clicking, typing, keyboard shortcuts), ' +
      'read and write files in a workspace folder, run terminal commands, ' +
      'explain its own settings and features, and guide you through setup — ' +
      'all with your explicit approval for every action.',
  },
  {
    question: 'Is my data private?',
    answer:
      'Yes. Screen frames are never stored to disk or the server. ' +
      'Typed text is never logged. Workspace file contents are never transmitted without your approval. ' +
      'API keys are stored in your OS keychain and never sent to our servers.',
  },
  {
    question: 'What is GORKH AI (Free)?',
    answer:
      'GORKH AI (Free) is a hosted free tier powered by DeepSeek. No API key is required. ' +
      'Sign in to use it. A limited number of tasks are included each day.',
  },
  {
    question: 'Why do I need to approve every action?',
    answer:
      'GORKH requires your approval for every action — clicking, typing, file edits, terminal commands — ' +
      'because you stay in control at all times. Nothing happens on your computer without your confirmation.',
  },
];
