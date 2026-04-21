import { WsProvider } from '@polkadot/api';
import type { ApiPromise } from '@polkadot/api';
import { NODE_HEALTH_CONFIG, filterAllowedEndpoints, isAllowedEndpoint } from './constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProbeResult {
  endpoint: string;
  latencyMs: number;
  blockHeight: number;
}

export interface CachedNode {
  endpoint: string;
  discoveredAt: number;
  lastSeen: number;
}

// ---------------------------------------------------------------------------
// Host extraction from libp2p multiaddr (IP and DNS)
// ---------------------------------------------------------------------------

/**
 * Extract an IPv4 address from a multiaddr like `/ip4/1.2.3.4/tcp/30333/p2p/12D3...`.
 * Returns null for loopback (127.x), unspecified (0.0.0.0), and private ranges.
 */
export function extractIpFromMultiaddr(addr: string): string | null {
  const match = addr.match(/\/ip4\/([\d.]+)\//);
  if (!match) return null;
  const ip = match[1];
  const parts = ip.split('.').map(Number);
  // Filter loopback, unspecified, link-local, and RFC1918 private ranges
  if (
    ip.startsWith('127.') ||
    ip === '0.0.0.0' ||
    ip.startsWith('169.254.') ||
    ip.startsWith('10.') ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    ip.startsWith('192.168.') ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
  ) {
    return null;
  }
  return ip;
}

/**
 * Extract a DNS hostname from a multiaddr like `/dns4/node.example.com/tcp/9944/...`.
 * Only returns valid domain names (not bare IPs or localhost).
 * 从 multiaddr 中提取 dns4/dns6 域名，仅返回合法域名。
 */
export function extractDnsFromMultiaddr(addr: string): string | null {
  const match = addr.match(/\/dns[46]\/([\w.-]+)\//);
  if (!match) return null;
  const host = match[1];
  // Skip localhost and bare IPs
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  // Must contain at least one dot (i.e. a real domain)
  if (!host.includes('.')) return null;
  return host;
}

// ---------------------------------------------------------------------------
// Peer discovery via RPC
// ---------------------------------------------------------------------------

/**
 * Discover peer endpoints by extracting DNS hostnames from multiaddr in
 * `system_networkState`. Only domains (dns4/dns6) produce wss:// endpoints;
 * bare IPs are skipped since they lack TLS certificates.
 * 通过 system_networkState 发现对等节点的域名，仅对 dns4/dns6 域名生成 wss:// 端点，
 * 裸 IP 因无 TLS 证书而跳过。
 */
export async function discoverPeers(api: ApiPromise): Promise<string[]> {
  const domains = new Set<string>();

  // --- Try unsafe RPC: system.networkState() ---
  try {
    const state = await (api.rpc.system as unknown as { networkState: () => Promise<unknown> }).networkState();
    const json = (state as { toJSON?: () => unknown }).toJSON?.() ?? state;
    const obj = json as Record<string, unknown>;

    const peerSections = ['peeredPeers', 'connectedPeers', 'notConnectedPeers'];
    for (const section of peerSections) {
      const peers = obj[section] as Record<string, unknown> | undefined;
      if (!peers || typeof peers !== 'object') continue;

      for (const peerId of Object.keys(peers)) {
        const peer = peers[peerId] as Record<string, unknown> | undefined;
        if (!peer) continue;

        const addrs = (peer.knownAddresses ?? peer.known_addresses) as string[] | undefined;
        if (!Array.isArray(addrs)) continue;

        for (const raw of addrs) {
          const addrStr = typeof raw === 'string' ? raw : (raw as Record<string, string>)?.addr;
          if (typeof addrStr !== 'string') continue;
          const dns = extractDnsFromMultiaddr(addrStr);
          if (dns) domains.add(dns);
        }
      }
    }
  } catch {
    // system_networkState is unsafe RPC; gracefully degrade
  }

  // Generate wss:// endpoints only for discovered domains (TLS-capable)
  const endpoints: string[] = [];
  for (const domain of Array.from(domains)) {
    for (const port of NODE_HEALTH_CONFIG.discoveryRpcPorts) {
      endpoints.push(`wss://${domain}:${port}`);
    }
  }
  return filterAllowedEndpoints(endpoints);
}

// ---------------------------------------------------------------------------
// Lightweight endpoint probing
// ---------------------------------------------------------------------------

/**
 * Probe a single endpoint using a raw WsProvider (no full ApiPromise).
 * Returns latency + block height on success, null on failure.
 */
export async function probeEndpoint(
  endpoint: string,
  timeoutMs: number = NODE_HEALTH_CONFIG.discoveryProbeTimeout,
): Promise<ProbeResult | null> {
  let provider: WsProvider | null = null;
  try {
    const start = performance.now();
    provider = new WsProvider(endpoint, false);

    // Race connect + RPC against timeout
    const result = await Promise.race<ProbeResult | null>([
      (async () => {
        await provider!.connect();
        const resp = await provider!.send<{ number: string }>('chain_getHeader', []);
        const latencyMs = Math.round(performance.now() - start);
        const blockHeight = parseInt(resp.number, 16);
        return { endpoint, latencyMs, blockHeight };
      })(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);

    return result;
  } catch {
    return null;
  } finally {
    try {
      await provider?.disconnect();
    } catch { /* ignore */ }
  }
}

/**
 * Probe multiple endpoints with concurrency control.
 */
export async function probeEndpointsBatch(
  endpoints: string[],
  concurrency: number = 3,
  timeout: number = NODE_HEALTH_CONFIG.discoveryProbeTimeout,
): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];
  const queue = [...endpoints];

  async function worker() {
    while (queue.length > 0) {
      const ep = queue.shift()!;
      const r = await probeEndpoint(ep, timeout);
      if (r) results.push(r);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, endpoints.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Best node selection
// ---------------------------------------------------------------------------

/**
 * Select the best node from probe results:
 * Among nodes within 3 blocks of the max height, pick the one with lowest latency.
 */
export function selectBestNode(
  results: ProbeResult[],
  _currentActive?: string,
): ProbeResult | null {
  if (results.length === 0) return null;
  const maxBlock = Math.max(...results.map((r) => r.blockHeight));
  const candidates = results.filter((r) => r.blockHeight >= maxBlock - 3);
  candidates.sort((a, b) => a.latencyMs - b.latencyMs);
  return candidates[0] ?? null;
}

/**
 * Determine whether we should auto-switch from `current` to `best`.
 * Returns true when:
 * 1. There is no user-preferred node AND
 * 2. Either the current node is unhealthy, OR the best node is significantly better.
 */
export function shouldAutoSwitch(
  current: { latencyMs: number | null; blockHeight: number | null; status: string } | null,
  best: ProbeResult | null,
  preferredEndpoint: string | null,
  currentEndpoint: string | null,
): boolean {
  // Never override user preference
  if (preferredEndpoint) return false;
  if (!best) return false;
  if (!currentEndpoint) return true; // no active connection

  // If best is the same as current, no switch
  if (best.endpoint === currentEndpoint) return false;

  // Current node is unhealthy → switch
  if (!current || current.status === 'unhealthy') return true;

  // Check latency improvement
  if (current.latencyMs != null) {
    if (best.latencyMs <= current.latencyMs * NODE_HEALTH_CONFIG.autoSwitchLatencyThreshold) {
      return true;
    }
  }

  // Check block lag
  if (current.blockHeight != null) {
    if (best.blockHeight - current.blockHeight > NODE_HEALTH_CONFIG.autoSwitchBlockLag) {
      return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Discovered node cache (localStorage)
// ---------------------------------------------------------------------------

export function loadCachedNodes(): CachedNode[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NODE_HEALTH_CONFIG.discoveredNodesCacheKey);
    if (!raw) return [];
    const nodes: CachedNode[] = JSON.parse(raw);
    const now = Date.now();
    // Evict stale entries and endpoints no longer allowed
    return nodes.filter(
      (n) => isAllowedEndpoint(n.endpoint) && now - n.lastSeen < NODE_HEALTH_CONFIG.nodeEvictionAge,
    );
  } catch {
    return [];
  }
}

export function saveCachedNodes(nodes: CachedNode[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Enforce allowlist and max limit
    const trimmed = filterAllowedEndpoints(nodes.map((n) => n.endpoint))
      .map((endpoint) => nodes.find((n) => n.endpoint === endpoint)!)
      .slice(0, NODE_HEALTH_CONFIG.maxDiscoveredNodes);
    localStorage.setItem(NODE_HEALTH_CONFIG.discoveredNodesCacheKey, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

/**
 * Merge newly discovered endpoints into the cache, updating lastSeen for existing ones.
 * Returns the updated cache.
 */
export function mergeCachedNodes(existing: CachedNode[], newEndpoints: string[]): CachedNode[] {
  const now = Date.now();
  const map = new Map(existing.map((n) => [n.endpoint, n]));

  for (const ep of newEndpoints) {
    const cached = map.get(ep);
    if (cached) {
      map.set(ep, { ...cached, lastSeen: now });
    } else {
      map.set(ep, { endpoint: ep, discoveredAt: now, lastSeen: now });
    }
  }

  // Evict old entries, enforce limit
  const all = Array.from(map.values())
    .filter((n) => now - n.lastSeen < NODE_HEALTH_CONFIG.nodeEvictionAge)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, NODE_HEALTH_CONFIG.maxDiscoveredNodes);

  return all;
}
