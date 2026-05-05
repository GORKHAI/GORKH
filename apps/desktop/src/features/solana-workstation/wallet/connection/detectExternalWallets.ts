import { type SolanaExternalWalletProvider } from '@gorkh/shared';

// ----------------------------------------------------------------------------
// detectExternalWallets.ts
// ----------------------------------------------------------------------------
// Detects wallet providers in the browser/Tauri webview window.
// Returns metadata only. Does not connect or request permissions.
// ----------------------------------------------------------------------------

export interface DetectedWalletProvider {
  provider: SolanaExternalWalletProvider;
  detected: boolean;
  label: string;
  detail?: string;
}

function getWindow(): Record<string, unknown> | null {
  try {
    if (typeof window !== 'undefined') {
      return window as unknown as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return null;
}

export function detectExternalWallets(): DetectedWalletProvider[] {
  const win = getWindow();
  const providers: DetectedWalletProvider[] = [];

  if (!win) {
    // Tauri webview or test environment without window
    providers.push({
      provider: 'solflare',
      detected: false,
      label: 'Solflare',
      detail: 'Browser extension not detected in this environment.',
    });
    providers.push({
      provider: 'phantom',
      detected: false,
      label: 'Phantom',
      detail: 'Browser extension not detected in this environment.',
    });
    providers.push({
      provider: 'backpack',
      detected: false,
      label: 'Backpack',
      detail: 'Browser extension not detected in this environment.',
    });
    providers.push({
      provider: 'wallet_standard',
      detected: false,
      label: 'Wallet Standard',
      detail: 'Wallet Standard registry not available in this environment.',
    });
    return providers;
  }

  // Solflare
  const solflareDetected =
    typeof win.solflare === 'object' && win.solflare !== null;
  providers.push({
    provider: 'solflare',
    detected: solflareDetected,
    label: 'Solflare',
    detail: solflareDetected
      ? 'Solflare extension detected.'
      : 'Solflare extension not installed.',
  });

  // Phantom
  const phantomDetected =
    typeof win.phantom === 'object' &&
    win.phantom !== null &&
    typeof (win.phantom as Record<string, unknown>).solana === 'object';
  providers.push({
    provider: 'phantom',
    detected: phantomDetected,
    label: 'Phantom',
    detail: phantomDetected
      ? 'Phantom extension detected.'
      : 'Phantom extension not installed.',
  });

  // Backpack
  const backpackDetected =
    typeof win.backpack === 'object' && win.backpack !== null;
  providers.push({
    provider: 'backpack',
    detected: backpackDetected,
    label: 'Backpack',
    detail: backpackDetected
      ? 'Backpack extension detected.'
      : 'Backpack extension not installed.',
  });

  // Wallet Standard
  const walletStandardDetected =
    typeof win.navigator === 'object' &&
    win.navigator !== null &&
    typeof (win.navigator as Record<string, unknown>).wallets === 'object';
  providers.push({
    provider: 'wallet_standard',
    detected: walletStandardDetected,
    label: 'Wallet Standard',
    detail: walletStandardDetected
      ? 'Wallet Standard compatible wallets may be available.'
      : 'Wallet Standard registry not available.',
  });

  return providers;
}

export function isExternalWalletConnectionSupported(): boolean {
  const providers = detectExternalWallets();
  return providers.some((p) => p.detected);
}
