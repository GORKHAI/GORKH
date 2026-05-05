import {
  SolanaRpcNetwork,
  type SolanaRpcEndpointConfig,
  type SolanaRpcCommitment,
} from '@gorkh/shared';

export const DEFAULT_RPC_COMMITMENT: SolanaRpcCommitment = 'confirmed';

export const RPC_TIMEOUT_MS = 15000;

export const NETWORK_LABELS: Record<SolanaRpcNetwork, string> = {
  devnet: 'Devnet',
  'mainnet-beta': 'Mainnet Beta',
  localnet: 'Localnet',
};

export const NETWORK_OPTIONS: { value: SolanaRpcNetwork; label: string }[] = [
  { value: 'devnet', label: 'Devnet' },
  { value: 'mainnet-beta', label: 'Mainnet Beta' },
  { value: 'localnet', label: 'Localnet' },
];

export function getDefaultEndpointConfig(network: SolanaRpcNetwork): SolanaRpcEndpointConfig {
  const map: Record<SolanaRpcNetwork, SolanaRpcEndpointConfig> = {
    devnet: { network: 'devnet', url: 'https://api.devnet.solana.com', label: 'Solana Devnet', isCustom: false },
    'mainnet-beta': { network: 'mainnet-beta', url: 'https://api.mainnet-beta.solana.com', label: 'Solana Mainnet', isCustom: false },
    localnet: { network: 'localnet', url: 'http://127.0.0.1:8899', label: 'Local Validator', isCustom: false },
  };
  return map[network];
}
