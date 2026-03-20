import type { ApiPromise } from '@polkadot/api';

/** Convert chain balance (BN or Codec) to display string with fixed decimals */
export function formatBalance(raw: string | bigint, decimals = 12, displayDecimals = 0): string {
  const n = typeof raw === 'bigint' ? raw : BigInt(raw || '0');
  const divisor = BigInt(10 ** decimals);
  const whole = n / divisor;
  const frac = n % divisor;
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, displayDecimals);
  if (displayDecimals === 0) return `${whole}`;
  return `${whole}.${fracStr}`;
}

/** Format USDT amount (6 decimals) */
export function formatUsdt(raw: number | string, displayDecimals = 2): string {
  const n = typeof raw === 'number' ? raw : Number(raw);
  return (n / 1e6).toFixed(displayDecimals);
}

/** Format NEX/USDT price (raw u64 with 10^6 precision).
 *  Auto-adjusts decimal places to show meaningful digits:
 *  - >= $1     → 2 decimals  (e.g. "10.00")
 *  - >= $0.01  → 4 decimals  (e.g. "0.0500")
 *  - < $0.01   → up to 6 decimals, trimming trailing zeros (e.g. "0.00001")
 */
export function formatNexPrice(raw: number | string): string {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (isNaN(n) || n === 0) return '0';
  const value = n / 1e6;
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  // Show up to 6 decimals but trim trailing zeros
  const s = value.toFixed(6);
  return s.replace(/0+$/, '').replace(/\.$/, '');
}

/** Parse basis points to percentage string */
export function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2) + '%';
}

/** Format rating (0-500 → 0.0-5.0) */
export function formatRating(raw: number): string {
  return (raw / 100).toFixed(1);
}

/** Shorten account address for display */
export function shortAddress(addr: string, chars = 6): string {
  if (!addr) return '';
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

/** Parse a chain Option value - returns null if None */
export function parseOption<T>(codec: any): T | null {
  if (!codec) return null;
  if (codec.isNone) return null;
  if (codec.isSome) return codec.unwrap();
  // Fallback for raw values
  return codec.toJSON ? codec.toJSON() : codec;
}

/** Parse chain codec to JS object */
export function toJs(codec: any): any {
  if (!codec) return null;
  if (codec.toJSON) return codec.toJSON();
  return codec;
}

/** Parse a BoundedVec<u8> (bytes) to UTF-8 string.
 *  Handles hex-encoded strings (0x...) returned by .toJSON(),
 *  Codec objects with .toUtf8(), and plain strings. */
export function bytesToString(bytes: any): string {
  if (!bytes) return '';
  if (typeof bytes === 'string') {
    if (bytes.startsWith('0x')) {
      try {
        const hex = bytes.slice(2);
        const buf = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          buf[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }
        return new TextDecoder().decode(buf);
      } catch {
        return bytes;
      }
    }
    return bytes;
  }
  if (bytes.toUtf8) return bytes.toUtf8();
  if (bytes.toString) return bytes.toString();
  return '';
}

/** Parse block number from codec */
export function parseBlockNumber(codec: any): number {
  if (typeof codec === 'number') return codec;
  if (codec?.toNumber) return codec.toNumber();
  return Number(codec || 0);
}

/** Build IPFS gateway URL from CID */
export function ipfsUrl(cid: string | null): string | null {
  if (!cid) return null;
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';
  return `${gateway}/${cid}`;
}

/** Convert NEX amount string to chain-compatible bigint (12 decimals) */
export function nexToRaw(amount: string): bigint {
  const parts = amount.split('.');
  const whole = BigInt(parts[0] || '0') * BigInt(10 ** 12);
  if (parts[1]) {
    const frac = parts[1].padEnd(12, '0').slice(0, 12);
    return whole + BigInt(frac);
  }
  return whole;
}

/** Convert USDT amount string to chain-compatible number (6 decimals) */
export function usdtToRaw(amount: string): number {
  return Math.round(parseFloat(amount) * 1e6);
}

/**
 * Compute dynamic NEX price from a USDT product price and the NEX/USDT market rate.
 *
 * @param usdtPrice  Product USDT price (raw u64, 6 decimals)
 * @param nexUsdtRate  NEX/USDT market price (raw u64, 6 decimals — e.g. 50000 = $0.05)
 * @returns NEX amount string (raw, 12 decimals) or null if rate unavailable
 *
 * Formula: nexAmount = usdtPrice / nexUsdtRate  (scaled to 12-decimal NEX)
 *   usdtPrice has 6 decimals, nexUsdtRate has 6 decimals
 *   result needs 12 decimals → nexRaw = usdtPrice * 10^12 / nexUsdtRate
 */
export function usdtToNexDynamic(usdtPrice: number | string, nexUsdtRate: number | string): string | null {
  const rate = BigInt(nexUsdtRate || '0');
  if (rate <= BigInt(0)) return null;
  const usdt = BigInt(typeof usdtPrice === 'number' ? usdtPrice : Number(usdtPrice));
  if (usdt <= BigInt(0)) return null;
  const nexRaw = (usdt * BigInt(10 ** 12)) / rate;
  return nexRaw.toString();
}

/**
 * Convert NEX amount to approximate USDT display value using market rate.
 *
 * @param nexRaw  NEX amount (raw, 12 decimals)
 * @param nexUsdtRate  NEX/USDT market price (raw u64, 6 decimals — e.g. 50000 = $0.05)
 * @returns USDT amount string (raw, 6 decimals) or null if rate unavailable
 *
 * Formula: usdtAmount = nexRaw * nexUsdtRate / 10^12
 */
export function nexToUsdtDynamic(nexRaw: string | bigint, nexUsdtRate: number | string): string | null {
  const rate = BigInt(nexUsdtRate || '0');
  if (rate <= BigInt(0)) return null;
  const nex = typeof nexRaw === 'bigint' ? nexRaw : BigInt(nexRaw || '0');
  if (nex <= BigInt(0)) return null;
  const usdtRaw = (nex * rate) / BigInt(10 ** 12);
  return usdtRaw.toString();
}

/** Get pallet storage entries as array */
export async function queryStorageMap<T>(
  api: ApiPromise,
  palletName: string,
  storageName: string,
  transform: (key: any, value: any) => T,
): Promise<T[]> {
  const entries = await (api.query as any)[palletName][storageName].entries();
  return entries.map(([key, value]: [any, any]) => transform(key, value));
}
