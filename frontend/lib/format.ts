/** Hedera account IDs (0.0.12345) print in full; this is for longer ids like UUIDs. */
export function truncateHex(id: string, head = 6, tail = 4): string {
  if (id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}

/** price_display is free text ("$110.99", "₹4,999", "—") — extract a number for sorting, or null. */
export function parsePriceValue(priceDisplay: string | null): number | null {
  if (!priceDisplay) return null;
  const match = priceDisplay.replace(/,/g, '').match(/[\d.]+/);
  if (!match) return null;
  const value = parseFloat(match[0]);
  return Number.isNaN(value) ? null : value;
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function formatHbar(amount: number): string {
  return `${amount.toFixed(amount < 0.01 ? 4 : 2)} ℏ`;
}

/**
 * Static placeholder rate — there's no live price feed wired up yet, so this
 * is a fixed approximation for display purposes only (real integration
 * would pull this from a price oracle or exchange API, not hardcode it).
 */
export const HBAR_USD_RATE = 0.05;

export function formatUsdFromHbar(amountHbar: number): string {
  const usd = amountHbar * HBAR_USD_RATE;
  // Attention-tick payouts are fractions of a cent (0.0005 ℏ * $0.05 = $0.000025)
  // — clamping to 2-4 digits like a normal price would just print "$0.00".
  const digits = usd === 0 ? 2 : usd < 0.0001 ? 6 : usd < 1 ? 4 : 2;
  return usd.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  });
}

export function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

/** Hedera transaction IDs are `0.0.x@seconds.nanos` — HashScan wants `0.0.x-seconds-nanos`. */
export function hashscanTxUrl(txId: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  const atIndex = txId.indexOf('@');
  const account = txId.slice(0, atIndex);
  const [seconds, nanos] = txId.slice(atIndex + 1).split('.');
  return `https://hashscan.io/${network}/transaction/${account}-${seconds}-${nanos}`;
}

export function hashscanAccountUrl(accountId: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  return `https://hashscan.io/${network}/account/${accountId}`;
}

export function hashscanTopicUrl(topicId: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  return `https://hashscan.io/${network}/topic/${topicId}`;
}
