import { z } from 'zod';
export const SolanaProtocolSupportedMode = {
  AGENT: 'agent',
  BUILDER: 'builder',
  PRIVATE: 'private',
  MARKETS: 'markets',
  SHIELD: 'shield',
  CONTEXT: 'context',
} as const;
export type SolanaProtocolSupportedMode =
  (typeof SolanaProtocolSupportedMode)[keyof typeof SolanaProtocolSupportedMode];

export const SolanaProtocolSupportedModeSchema = z.enum([
  SolanaProtocolSupportedMode.AGENT,
  SolanaProtocolSupportedMode.BUILDER,
  SolanaProtocolSupportedMode.PRIVATE,
  SolanaProtocolSupportedMode.MARKETS,
  SolanaProtocolSupportedMode.SHIELD,
  SolanaProtocolSupportedMode.CONTEXT,
]);

// ============================================================================
// GORKH Solana Protocol Registry — Canonical Source of Truth (Phase 9A)
// ============================================================================
// Production/mainnet-facing protocol registry for Shield, Agent, Markets,
// Private/Confidential, and Context Bridge. No HumanRail. No White Protocol.
// No Drift. No execution APIs in this phase.
// ============================================================================

// ----------------------------------------------------------------------------
// Core Enums
// ----------------------------------------------------------------------------

export const SolanaProtocolRegistryId = {
  SOLFLARE: 'solflare',
  KAMINO: 'kamino',
  DFLOW: 'dflow',
  QUICKNODE: 'quicknode',
  BIRDEYE: 'birdeye',
  UMBRA: 'umbra',
  CLOAK: 'cloak',
  SNS: 'sns',
  ZERION_CLI: 'zerion_cli',
  IKA: 'ika',
  TOKEN_2022_CONFIDENTIAL_TRANSFERS: 'token_2022_confidential_transfers',
  LIGHT_PROTOCOL: 'light_protocol',
  SQUADS: 'squads',
  TURNKEY: 'turnkey',
  BLOWFISH: 'blowfish',
  PYTH: 'pyth',
  JUPITER: 'jupiter',
  METEORA: 'meteora',
  ORCA: 'orca',
  JITO: 'jito',
  SOLANA_ACTIONS_BLINKS: 'solana_actions_blinks',
} as const;
export type SolanaProtocolRegistryId =
  (typeof SolanaProtocolRegistryId)[keyof typeof SolanaProtocolRegistryId];

export const SolanaProtocolRegistryCategory = {
  WALLET: 'wallet',
  LENDING: 'lending',
  ORDERFLOW: 'orderflow',
  RPC_INFRA: 'rpc_infra',
  MARKET_DATA: 'market_data',
  PRIVACY: 'privacy',
  IDENTITY: 'identity',
  AGENT: 'agent',
  CONFIDENTIAL_TOKEN: 'confidential_token',
  ZK_INFRA: 'zk_infra',
  MULTISIG: 'multisig',
  WALLET_INFRA: 'wallet_infra',
  TRANSACTION_SECURITY: 'transaction_security',
  ORACLE: 'oracle',
  SWAP: 'swap',
  LIQUIDITY: 'liquidity',
  STAKING: 'staking',
  TRANSACTION_DELIVERY: 'transaction_delivery',
} as const;
export type SolanaProtocolRegistryCategory =
  (typeof SolanaProtocolRegistryCategory)[keyof typeof SolanaProtocolRegistryCategory];

export const SolanaProtocolRegistryStatus = {
  AVAILABLE_MAINNET: 'available_mainnet',
  AVAILABLE_API: 'available_api',
  AVAILABLE_WALLET: 'available_wallet',
  PLANNED_READ_ONLY: 'planned_read_only',
  PLANNED_DRAFT_ONLY: 'planned_draft_only',
  PLANNED_SECURITY_CHECK: 'planned_security_check',
  PLANNED_CONFIDENTIAL_WORKFLOW: 'planned_confidential_workflow',
  PLANNED_AGENT_WORKFLOW: 'planned_agent_workflow',
  RESEARCH: 'research',
  DISABLED: 'disabled',
} as const;
export type SolanaProtocolRegistryStatus =
  (typeof SolanaProtocolRegistryStatus)[keyof typeof SolanaProtocolRegistryStatus];

export const SolanaProtocolExecutionLevel = {
  READ_ONLY: 'read_only',
  DRAFT_ONLY: 'draft_only',
  SECURITY_CHECK_ONLY: 'security_check_only',
  WALLET_CONNECT_FUTURE: 'wallet_connect_future',
  MANUAL_EXTERNAL: 'manual_external',
  EXECUTION_DISABLED: 'execution_disabled',
} as const;
export type SolanaProtocolExecutionLevel =
  (typeof SolanaProtocolExecutionLevel)[keyof typeof SolanaProtocolExecutionLevel];

// ----------------------------------------------------------------------------
// Zod Schemas
// ----------------------------------------------------------------------------

export const SolanaProtocolRegistryIdSchema = z.enum([
  SolanaProtocolRegistryId.SOLFLARE,
  SolanaProtocolRegistryId.KAMINO,
  SolanaProtocolRegistryId.DFLOW,
  SolanaProtocolRegistryId.QUICKNODE,
  SolanaProtocolRegistryId.BIRDEYE,
  SolanaProtocolRegistryId.UMBRA,
  SolanaProtocolRegistryId.CLOAK,
  SolanaProtocolRegistryId.SNS,
  SolanaProtocolRegistryId.ZERION_CLI,
  SolanaProtocolRegistryId.IKA,
  SolanaProtocolRegistryId.TOKEN_2022_CONFIDENTIAL_TRANSFERS,
  SolanaProtocolRegistryId.LIGHT_PROTOCOL,
  SolanaProtocolRegistryId.SQUADS,
  SolanaProtocolRegistryId.TURNKEY,
  SolanaProtocolRegistryId.BLOWFISH,
  SolanaProtocolRegistryId.PYTH,
  SolanaProtocolRegistryId.JUPITER,
  SolanaProtocolRegistryId.METEORA,
  SolanaProtocolRegistryId.ORCA,
  SolanaProtocolRegistryId.JITO,
  SolanaProtocolRegistryId.SOLANA_ACTIONS_BLINKS,
]);

export const SolanaProtocolRegistryCategorySchema = z.enum([
  SolanaProtocolRegistryCategory.WALLET,
  SolanaProtocolRegistryCategory.LENDING,
  SolanaProtocolRegistryCategory.ORDERFLOW,
  SolanaProtocolRegistryCategory.RPC_INFRA,
  SolanaProtocolRegistryCategory.MARKET_DATA,
  SolanaProtocolRegistryCategory.PRIVACY,
  SolanaProtocolRegistryCategory.IDENTITY,
  SolanaProtocolRegistryCategory.AGENT,
  SolanaProtocolRegistryCategory.CONFIDENTIAL_TOKEN,
  SolanaProtocolRegistryCategory.ZK_INFRA,
  SolanaProtocolRegistryCategory.MULTISIG,
  SolanaProtocolRegistryCategory.WALLET_INFRA,
  SolanaProtocolRegistryCategory.TRANSACTION_SECURITY,
  SolanaProtocolRegistryCategory.ORACLE,
  SolanaProtocolRegistryCategory.SWAP,
  SolanaProtocolRegistryCategory.LIQUIDITY,
  SolanaProtocolRegistryCategory.STAKING,
  SolanaProtocolRegistryCategory.TRANSACTION_DELIVERY,
]);

export const SolanaProtocolRegistryStatusSchema = z.enum([
  SolanaProtocolRegistryStatus.AVAILABLE_MAINNET,
  SolanaProtocolRegistryStatus.AVAILABLE_API,
  SolanaProtocolRegistryStatus.AVAILABLE_WALLET,
  SolanaProtocolRegistryStatus.PLANNED_READ_ONLY,
  SolanaProtocolRegistryStatus.PLANNED_DRAFT_ONLY,
  SolanaProtocolRegistryStatus.PLANNED_SECURITY_CHECK,
  SolanaProtocolRegistryStatus.PLANNED_CONFIDENTIAL_WORKFLOW,
  SolanaProtocolRegistryStatus.PLANNED_AGENT_WORKFLOW,
  SolanaProtocolRegistryStatus.RESEARCH,
  SolanaProtocolRegistryStatus.DISABLED,
]);

export const SolanaProtocolExecutionLevelSchema = z.enum([
  SolanaProtocolExecutionLevel.READ_ONLY,
  SolanaProtocolExecutionLevel.DRAFT_ONLY,
  SolanaProtocolExecutionLevel.SECURITY_CHECK_ONLY,
  SolanaProtocolExecutionLevel.WALLET_CONNECT_FUTURE,
  SolanaProtocolExecutionLevel.MANUAL_EXTERNAL,
  SolanaProtocolExecutionLevel.EXECUTION_DISABLED,
]);

export const SolanaProtocolRegistryDefinitionSchema = z.object({
  id: SolanaProtocolRegistryIdSchema,
  name: z.string().min(1),
  category: SolanaProtocolRegistryCategorySchema,
  status: SolanaProtocolRegistryStatusSchema,
  executionLevel: SolanaProtocolExecutionLevelSchema,
  supportedModes: z.array(SolanaProtocolSupportedModeSchema),
  mainnetFacing: z.boolean(),
  externalApiRequired: z.boolean(),
  safetyNote: z.string(),
  roadmapNote: z.string().optional(),
});

// ----------------------------------------------------------------------------
// Inferred Types
// ----------------------------------------------------------------------------

export type SolanaProtocolRegistryDefinition = z.infer<typeof SolanaProtocolRegistryDefinitionSchema>;

// ----------------------------------------------------------------------------
// Canonical Registry
// ----------------------------------------------------------------------------

export const GORKH_SOLANA_PROTOCOL_REGISTRY: SolanaProtocolRegistryDefinition[] = [
  {
    id: SolanaProtocolRegistryId.SOLFLARE,
    name: 'Solflare',
    category: SolanaProtocolRegistryCategory.WALLET,
    status: SolanaProtocolRegistryStatus.AVAILABLE_WALLET,
    executionLevel: SolanaProtocolExecutionLevel.WALLET_CONNECT_FUTURE,
    supportedModes: ['agent', 'private', 'markets', 'shield'],
    mainnetFacing: true,
    externalApiRequired: false,
    safetyNote: 'Future wallet connection only. No active wallet connection, signing, or execution in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.KAMINO,
    name: 'Kamino',
    category: SolanaProtocolRegistryCategory.LENDING,
    status: SolanaProtocolRegistryStatus.PLANNED_READ_ONLY,
    executionLevel: SolanaProtocolExecutionLevel.READ_ONLY,
    supportedModes: ['agent', 'markets'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Read-only roadmap integration. No lending API calls in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.DFLOW,
    name: 'DFlow',
    category: SolanaProtocolRegistryCategory.ORDERFLOW,
    status: SolanaProtocolRegistryStatus.RESEARCH,
    executionLevel: SolanaProtocolExecutionLevel.EXECUTION_DISABLED,
    supportedModes: ['markets', 'agent'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Research phase. No orderflow API calls or execution in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.QUICKNODE,
    name: 'QuickNode',
    category: SolanaProtocolRegistryCategory.RPC_INFRA,
    status: SolanaProtocolRegistryStatus.AVAILABLE_API,
    executionLevel: SolanaProtocolExecutionLevel.READ_ONLY,
    supportedModes: ['shield', 'markets', 'builder'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Optional RPC infrastructure. Custom endpoints are supported with privacy warnings.',
  },
  {
    id: SolanaProtocolRegistryId.BIRDEYE,
    name: 'Birdeye',
    category: SolanaProtocolRegistryCategory.MARKET_DATA,
    status: SolanaProtocolRegistryStatus.AVAILABLE_API,
    executionLevel: SolanaProtocolExecutionLevel.READ_ONLY,
    supportedModes: ['markets', 'agent'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Read-only market data roadmap integration. No external API calls in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.UMBRA,
    name: 'Umbra',
    category: SolanaProtocolRegistryCategory.PRIVACY,
    status: SolanaProtocolRegistryStatus.PLANNED_CONFIDENTIAL_WORKFLOW,
    executionLevel: SolanaProtocolExecutionLevel.DRAFT_ONLY,
    supportedModes: ['private', 'agent'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Future confidential workflow planning only. No private transfers or proof generation in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.CLOAK,
    name: 'Cloak',
    category: SolanaProtocolRegistryCategory.PRIVACY,
    status: SolanaProtocolRegistryStatus.PLANNED_CONFIDENTIAL_WORKFLOW,
    executionLevel: SolanaProtocolExecutionLevel.DRAFT_ONLY,
    supportedModes: ['private', 'agent'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Future confidential workflow planning only. No private transfers or proof generation in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.SNS,
    name: 'SNS',
    category: SolanaProtocolRegistryCategory.IDENTITY,
    status: SolanaProtocolRegistryStatus.PLANNED_AGENT_WORKFLOW,
    executionLevel: SolanaProtocolExecutionLevel.READ_ONLY,
    supportedModes: ['agent', 'context'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Read-only identity resolution roadmap. No external SNS API calls in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.ZERION_CLI,
    name: 'Zerion CLI',
    category: SolanaProtocolRegistryCategory.AGENT,
    status: SolanaProtocolRegistryStatus.RESEARCH,
    executionLevel: SolanaProtocolExecutionLevel.EXECUTION_DISABLED,
    supportedModes: ['agent'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Research only. No autonomous execution in GORKH yet.',
    roadmapNote: 'Exploring future agent automation via Zerion CLI patterns.',
  },
  {
    id: SolanaProtocolRegistryId.IKA,
    name: 'Ika',
    category: SolanaProtocolRegistryCategory.AGENT,
    status: SolanaProtocolRegistryStatus.RESEARCH,
    executionLevel: SolanaProtocolExecutionLevel.EXECUTION_DISABLED,
    supportedModes: ['agent'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Research for future policy/MPC workflows only. No execution in current phase.',
    roadmapNote: 'Exploring future MPC and policy-gated execution.',
  },
  {
    id: SolanaProtocolRegistryId.TOKEN_2022_CONFIDENTIAL_TRANSFERS,
    name: 'Token-2022 Confidential Transfers',
    category: SolanaProtocolRegistryCategory.CONFIDENTIAL_TOKEN,
    status: SolanaProtocolRegistryStatus.PLANNED_CONFIDENTIAL_WORKFLOW,
    executionLevel: SolanaProtocolExecutionLevel.DRAFT_ONLY,
    supportedModes: ['private', 'shield'],
    mainnetFacing: true,
    externalApiRequired: false,
    safetyNote: 'Amount/balance confidentiality only. Public addresses remain visible. No execution in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.LIGHT_PROTOCOL,
    name: 'Light Protocol',
    category: SolanaProtocolRegistryCategory.ZK_INFRA,
    status: SolanaProtocolRegistryStatus.RESEARCH,
    executionLevel: SolanaProtocolExecutionLevel.READ_ONLY,
    supportedModes: ['private', 'builder'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Research phase for ZK compression infrastructure. No external API calls in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.SQUADS,
    name: 'Squads',
    category: SolanaProtocolRegistryCategory.MULTISIG,
    status: SolanaProtocolRegistryStatus.PLANNED_DRAFT_ONLY,
    executionLevel: SolanaProtocolExecutionLevel.DRAFT_ONLY,
    supportedModes: ['agent', 'shield'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Draft-only future proposal review and multisig drafting. No Squads API calls in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.TURNKEY,
    name: 'Turnkey',
    category: SolanaProtocolRegistryCategory.WALLET_INFRA,
    status: SolanaProtocolRegistryStatus.PLANNED_AGENT_WORKFLOW,
    executionLevel: SolanaProtocolExecutionLevel.EXECUTION_DISABLED,
    supportedModes: ['agent'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Future policy wallet infrastructure research. No signing, custody, or execution in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.BLOWFISH,
    name: 'Blowfish',
    category: SolanaProtocolRegistryCategory.TRANSACTION_SECURITY,
    status: SolanaProtocolRegistryStatus.PLANNED_SECURITY_CHECK,
    executionLevel: SolanaProtocolExecutionLevel.SECURITY_CHECK_ONLY,
    supportedModes: ['shield', 'agent', 'markets'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Future transaction security and risk scanning. No external Blowfish API calls in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.PYTH,
    name: 'Pyth',
    category: SolanaProtocolRegistryCategory.ORACLE,
    status: SolanaProtocolRegistryStatus.PLANNED_READ_ONLY,
    executionLevel: SolanaProtocolExecutionLevel.READ_ONLY,
    supportedModes: ['markets', 'agent'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Read-only price feed roadmap. No external oracle calls in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.JUPITER,
    name: 'Jupiter',
    category: SolanaProtocolRegistryCategory.SWAP,
    status: SolanaProtocolRegistryStatus.PLANNED_DRAFT_ONLY,
    executionLevel: SolanaProtocolExecutionLevel.DRAFT_ONLY,
    supportedModes: ['markets', 'agent', 'shield'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Draft-only swap route and unsigned transaction drafting. No Jupiter API calls or trade execution in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.METEORA,
    name: 'Meteora',
    category: SolanaProtocolRegistryCategory.LIQUIDITY,
    status: SolanaProtocolRegistryStatus.PLANNED_READ_ONLY,
    executionLevel: SolanaProtocolExecutionLevel.READ_ONLY,
    supportedModes: ['markets'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Read-only liquidity intelligence roadmap. No external liquidity API calls in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.ORCA,
    name: 'Orca',
    category: SolanaProtocolRegistryCategory.LIQUIDITY,
    status: SolanaProtocolRegistryStatus.PLANNED_READ_ONLY,
    executionLevel: SolanaProtocolExecutionLevel.READ_ONLY,
    supportedModes: ['markets'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Read-only liquidity intelligence roadmap. No external liquidity API calls in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.JITO,
    name: 'Jito',
    category: SolanaProtocolRegistryCategory.STAKING,
    status: SolanaProtocolRegistryStatus.PLANNED_READ_ONLY,
    executionLevel: SolanaProtocolExecutionLevel.READ_ONLY,
    supportedModes: ['markets', 'agent'],
    mainnetFacing: true,
    externalApiRequired: true,
    safetyNote: 'Read-only staking and LST intelligence roadmap. No external staking API calls in current phase.',
  },
  {
    id: SolanaProtocolRegistryId.SOLANA_ACTIONS_BLINKS,
    name: 'Solana Actions / Blinks',
    category: SolanaProtocolRegistryCategory.TRANSACTION_DELIVERY,
    status: SolanaProtocolRegistryStatus.RESEARCH,
    executionLevel: SolanaProtocolExecutionLevel.DRAFT_ONLY,
    supportedModes: ['agent', 'shield'],
    mainnetFacing: true,
    externalApiRequired: false,
    safetyNote: 'Research phase for action delivery and signable transaction UX. No execution in current phase.',
  },
];

// ----------------------------------------------------------------------------
// Id Subsets
// ----------------------------------------------------------------------------

export const GORKH_PRODUCTION_PROTOCOL_IDS: SolanaProtocolRegistryId[] = [
  SolanaProtocolRegistryId.SOLFLARE,
  SolanaProtocolRegistryId.KAMINO,
  SolanaProtocolRegistryId.QUICKNODE,
  SolanaProtocolRegistryId.BIRDEYE,
  SolanaProtocolRegistryId.SNS,
  SolanaProtocolRegistryId.SQUADS,
  SolanaProtocolRegistryId.BLOWFISH,
  SolanaProtocolRegistryId.PYTH,
  SolanaProtocolRegistryId.JUPITER,
  SolanaProtocolRegistryId.METEORA,
  SolanaProtocolRegistryId.ORCA,
  SolanaProtocolRegistryId.JITO,
];

export const GORKH_PRIVACY_PROTOCOL_IDS: SolanaProtocolRegistryId[] = [
  SolanaProtocolRegistryId.UMBRA,
  SolanaProtocolRegistryId.CLOAK,
  SolanaProtocolRegistryId.TOKEN_2022_CONFIDENTIAL_TRANSFERS,
  SolanaProtocolRegistryId.LIGHT_PROTOCOL,
];

export const GORKH_AGENT_PROTOCOL_IDS: SolanaProtocolRegistryId[] = [
  SolanaProtocolRegistryId.SNS,
  SolanaProtocolRegistryId.ZERION_CLI,
  SolanaProtocolRegistryId.IKA,
  SolanaProtocolRegistryId.SQUADS,
  SolanaProtocolRegistryId.TURNKEY,
  SolanaProtocolRegistryId.BLOWFISH,
  SolanaProtocolRegistryId.SOLANA_ACTIONS_BLINKS,
];

export const GORKH_MARKETS_PROTOCOL_IDS: SolanaProtocolRegistryId[] = [
  SolanaProtocolRegistryId.KAMINO,
  SolanaProtocolRegistryId.QUICKNODE,
  SolanaProtocolRegistryId.BIRDEYE,
  SolanaProtocolRegistryId.PYTH,
  SolanaProtocolRegistryId.JUPITER,
  SolanaProtocolRegistryId.METEORA,
  SolanaProtocolRegistryId.ORCA,
  SolanaProtocolRegistryId.JITO,
];

export const GORKH_DENIED_PROTOCOL_IDS: SolanaProtocolRegistryId[] = [
  // Drift is explicitly denied from all GORKH integrations
  'drift' as SolanaProtocolRegistryId,
];

// ----------------------------------------------------------------------------
// Lookup Helpers
// ----------------------------------------------------------------------------

export function getProtocolDefinition(
  id: string
): SolanaProtocolRegistryDefinition | undefined {
  return GORKH_SOLANA_PROTOCOL_REGISTRY.find((p) => p.id === id);
}

export function isProtocolInRegistry(id: string): boolean {
  return GORKH_SOLANA_PROTOCOL_REGISTRY.some((p) => p.id === id);
}

export function isDeniedProtocol(id: string): boolean {
  return GORKH_DENIED_PROTOCOL_IDS.includes(id as SolanaProtocolRegistryId);
}

export function isMainnetFacingProtocol(id: string): boolean {
  const def = getProtocolDefinition(id);
  return def?.mainnetFacing ?? false;
}
