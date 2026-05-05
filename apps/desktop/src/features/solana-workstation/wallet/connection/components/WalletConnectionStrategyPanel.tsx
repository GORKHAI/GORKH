import { SOLANA_WALLET_CONNECTION_STRATEGY } from '@gorkh/shared';

export function WalletConnectionStrategyPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
        GORKH Wallet Connection Strategy
      </div>
      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
        GORKH is building toward a real non-custodial wallet experience. The safest first path is
        external wallet connection.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {SOLANA_WALLET_CONNECTION_STRATEGY.solflareFirst && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#166534' }}>●</span>
            <span style={{ fontSize: '0.72rem', color: '#475569' }}>
              <strong>Solflare</strong> — primary external wallet target
            </span>
          </div>
        )}
        {SOLANA_WALLET_CONNECTION_STRATEGY.walletStandardCompatibleLater && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#92400e' }}>●</span>
            <span style={{ fontSize: '0.72rem', color: '#475569' }}>
              <strong>Wallet Standard</strong> compatible wallets — future support
            </span>
          </div>
        )}
        {SOLANA_WALLET_CONNECTION_STRATEGY.localGeneratedWalletFuture && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#92400e' }}>●</span>
            <span style={{ fontSize: '0.72rem', color: '#475569' }}>
              <strong>Local generated wallet</strong> — planned future
            </span>
          </div>
        )}
        {SOLANA_WALLET_CONNECTION_STRATEGY.privateKeyImportDisabled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#991b1b' }}>●</span>
            <span style={{ fontSize: '0.72rem', color: '#475569' }}>
              <strong>Private key import</strong> — disabled / advanced future only
            </span>
          </div>
        )}
        {SOLANA_WALLET_CONNECTION_STRATEGY.turnkeyFuturePolicyWallet && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#92400e' }}>●</span>
            <span style={{ fontSize: '0.72rem', color: '#475569' }}>
              <strong>Turnkey policy wallet</strong> — future integration
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
