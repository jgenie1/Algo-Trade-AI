/**
 * Multi-Chain Explorer Link Utility
 * Standardized public explorer URL generation for Solana and EVM / BSC.
 */

export type SupportedChain = 'SOL' | 'SOLANA' | 'BSC' | 'EVM' | string;

/**
 * Returns the public explorer transaction URL for the specified blockchain and transaction hash.
 * - Solana -> https://solscan.io/tx/{txHash}
 * - EVM / BSC -> https://bscscan.com/tx/{txHash}
 */
export function getExplorerTxUrl(chain: SupportedChain, txHash: string): string {
  if (!txHash) return '';
  const cleanHash = txHash.trim();
  if (!cleanHash) return '';
  const chainUpper = (chain || '').toUpperCase();
  if (chainUpper.includes('SOL')) {
    return `https://solscan.io/tx/${cleanHash}`;
  }
  return `https://bscscan.com/tx/${cleanHash}`;
}

/**
 * Returns the public explorer account/wallet URL for the specified blockchain and address.
 */
export function getExplorerAddressUrl(chain: SupportedChain, address: string): string {
  if (!address) return '';
  const cleanAddress = address.trim();
  if (!cleanAddress) return '';
  const chainUpper = (chain || '').toUpperCase();
  if (chainUpper.includes('SOL')) {
    return `https://solscan.io/account/${cleanAddress}`;
  }
  return `https://bscscan.com/address/${cleanAddress}`;
}

/**
 * Returns the public explorer token URL for the specified blockchain and token contract / mint address.
 */
export function getExplorerTokenUrl(chain: SupportedChain, tokenAddress: string): string {
  if (!tokenAddress) return '';
  const cleanToken = tokenAddress.trim();
  if (!cleanToken) return '';
  const chainUpper = (chain || '').toUpperCase();
  if (chainUpper.includes('SOL')) {
    return `https://solscan.io/token/${cleanToken}`;
  }
  return `https://bscscan.com/token/${cleanToken}`;
}
