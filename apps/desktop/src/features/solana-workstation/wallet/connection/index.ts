export { detectExternalWallets, isExternalWalletConnectionSupported } from './detectExternalWallets.js';
export {
  loadWalletConnectionState,
  saveWalletConnectionState,
  clearWalletConnectionState,
  createEmptyWalletConnectionState,
} from './walletConnectionStorage.js';
export {
  rejectSigningCapabilityExposure,
  assertReadOnlyWalletConnectionState,
  sanitizeWalletProviderName,
  validateConnectedPublicAddress,
} from './walletConnectionGuards.js';
export {
  createWalletProfileFromConnection,
  getConnectionSafetyNotes,
} from './createWalletProfileFromConnection.js';
export { ExternalWalletPanel } from './components/ExternalWalletPanel.js';
export { WalletConnectionStatusPanel } from './components/WalletConnectionStatusPanel.js';
export { WalletConnectionSafetyPanel } from './components/WalletConnectionSafetyPanel.js';
export { WalletConnectionStrategyPanel } from './components/WalletConnectionStrategyPanel.js';
