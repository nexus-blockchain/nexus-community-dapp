/** Default seed nodes.
 * Production deployments can override via NEXT_PUBLIC_WS_ENDPOINTS env var. */
export const SEED_NODES: string[] = [
  'wss://80.96.113.85:9948',
];

function isAllowedRemoteEndpoint(endpoint: string): boolean {
  return endpoint.startsWith('wss://') || endpoint.startsWith('ws://');
}

function isAllowedLocalEndpoint(endpoint: string): boolean {
  return endpoint.startsWith('ws://127.0.0.1') || endpoint.startsWith('ws://localhost');
}

export function isAllowedEndpoint(endpoint: string): boolean {
  return isAllowedLocalEndpoint(endpoint) || isAllowedRemoteEndpoint(endpoint);
}

export function filterAllowedEndpoints(endpoints: string[]): string[] {
  const filtered: string[] = [];
  for (const endpoint of endpoints) {
    if (!isAllowedEndpoint(endpoint)) {
      if (typeof window !== 'undefined') {
        console.warn(`[nexus] Ignoring insecure or unsupported endpoint: ${endpoint}`);
      }
      continue;
    }
    if (!filtered.includes(endpoint)) {
      filtered.push(endpoint);
    }
  }
  return filtered;
}

/** Node health probe configuration */
export const NODE_HEALTH_CONFIG = {
  /** Active node probe interval (ms) */
  probeInterval: 15_000,
  /** Background (inactive) node probe interval (ms) */
  backgroundProbeInterval: 30_000,
  /** Latency threshold for "slow" status (ms) */
  slowThreshold: 2000,
  /** Consecutive failures before marking unhealthy */
  unhealthyAfterFailures: 3,
  /** localStorage key for user-preferred node */
  preferredNodeKey: 'nexus_preferred_node',

  // --- Discovery ---
  /** Peer discovery cycle interval (ms) */
  discoveryInterval: 60_000,
  /** Timeout per endpoint probe during discovery (ms) */
  discoveryProbeTimeout: 3_000,
  /** RPC ports to try when constructing ws:// URLs from discovered IPs */
  discoveryRpcPorts: [9948, 9944, 9945] as readonly number[],
  /** localStorage key for discovered node cache */
  discoveredNodesCacheKey: 'nexus_discovered_nodes',
  /** Max number of discovered nodes to keep in cache */
  maxDiscoveredNodes: 20,
  /** Evict discovered nodes not seen for this duration (ms) — 24h */
  nodeEvictionAge: 86_400_000,

  // --- Auto-switch ---
  /** Best node latency must be ≤ this ratio of current to trigger auto-switch (0.7 = 30% better) */
  autoSwitchLatencyThreshold: 0.7,
  /** Current node must lag behind best by more than this many blocks to trigger switch */
  autoSwitchBlockLag: 5,
} as const;

/** Return only the seed endpoints (for UI labelling) */
export function getSeedEndpoints(): string[] {
  return filterAllowedEndpoints(SEED_NODES);
}

/**
 * Get trusted auto-connect endpoints only: env var > seeds.
 * Discovered node cache is intentionally excluded from automatic connection.
 */
export function getConfiguredEndpoints(): string[] {
  const multi = process.env.NEXT_PUBLIC_WS_ENDPOINTS;
  const base: string[] = multi
    ? multi.split(',').map((s) => s.trim()).filter(Boolean)
    : [...SEED_NODES];

  return filterAllowedEndpoints(base);
}

/** React Query staleTime configuration per module (in ms) */
export const STALE_TIMES = {
  entity:      30_000,   // 30s
  shops:       30_000,   // 30s
  products:    15_000,   // 15s
  orders:      10_000,   // 10s
  token:       60_000,   // 60s
  orderBook:    5_000,   // 5s
  members:     30_000,   // 30s
  proposals:   30_000,   // 30s
  // Community-dapp specific
  community:   30_000,   // 30s
  earnings:    15_000,   // 15s
  loyalty:     30_000,   // 30s
  commission:  15_000,   // 15s
  review:      30_000,   // 30s
  disclosure:  30_000,   // 30s
  runtimeApi:  15_000,   // 15s
} as const;

/** React Query retry configuration */
export const RETRY_CONFIG = {
  chainQuery: {
    retry: 3,
    retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10000),
  },
  ipfsContent: {
    retry: 2,
    retryDelay: 2000,
  },
} as const;

/** Dangerous operations that require confirmation dialog */
export const DANGEROUS_OPERATIONS = [
  'transferOwnership',
  'requestCloseEntity',
  'lockGovernance',
  'banMember',
  'burnTokens',
  'leaveEntity',
  'sellerCancelOrder',
  'approveRefund',
  'withdrawCommission',
] as const;
