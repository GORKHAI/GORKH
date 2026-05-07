import { GORKH_CLOAK_PROGRAM_ID, GORKH_CLOAK_RELAY_URL } from './cloakConfig.js';

export interface CloakSdkStatus {
  installed: boolean;
  programId: string;
  relayUrl: string;
  executionMode: 'tauri_signer_bridge' | 'prepared_actions_only';
  reason: string;
}

export async function getCloakSdkStatus(): Promise<CloakSdkStatus> {
  try {
    const cloakSdkPackage = '@cloak.dev/sdk';
    await import(/* @vite-ignore */ cloakSdkPackage);
    return {
      installed: true,
      programId: GORKH_CLOAK_PROGRAM_ID,
      relayUrl: GORKH_CLOAK_RELAY_URL,
      executionMode: 'tauri_signer_bridge',
      reason:
        'Cloak SDK is installed. Deposits use a Tauri signer bridge so private keys stay in Rust/keychain storage.',
    };
  } catch {
    return {
      installed: false,
      programId: GORKH_CLOAK_PROGRAM_ID,
      relayUrl: GORKH_CLOAK_RELAY_URL,
      executionMode: 'prepared_actions_only',
      reason: 'Cloak SDK package is unavailable in this desktop build.',
    };
  }
}
