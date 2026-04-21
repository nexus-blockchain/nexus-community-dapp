'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import type { ProviderInterface } from '@polkadot/rpc-provider/types';
import { getConfiguredEndpoints, getSeedEndpoints, NODE_HEALTH_CONFIG, filterAllowedEndpoints } from './constants';
import {
  discoverPeers,
  probeEndpointsBatch,
  selectBestNode,
  shouldAutoSwitch,
  mergeCachedNodes,
  loadCachedNodes,
  saveCachedNodes,
} from './peer-discovery';
import { runtimeDefs, customTypes } from './runtime-defs';
import { useNodeHealthStore } from '@/stores/node-health-store';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

const DEBUG_WS =
  process.env.NODE_ENV === 'development' &&
  typeof window !== 'undefined' &&
  (window.location.protocol === 'capacitor:' || window.location.hostname === 'localhost' || window.location.search.includes('debugWs=1'));

function logWs(event: string, details?: unknown): void {
  if (!DEBUG_WS || typeof window === 'undefined') return;
  if (details === undefined) {
    console.log(`[nexus-ws] ${event}`);
    return;
  }
  console.log(`[nexus-ws] ${event}`, details);
}

interface ApiContextValue {
  api: ApiPromise | null;
  isReady: boolean;
  connectionStatus: ConnectionStatus;
  error: string | null;
  activeEndpoint: string | null;
  switchNode: (endpoint: string) => void;
  reconnect: () => void;
  discoveredNodeCount: number;
  isDiscovering: boolean;
  addManualNode: (endpoint: string) => Promise<boolean>;
}

const ApiContext = createContext<ApiContextValue>({
  api: null,
  isReady: false,
  connectionStatus: 'disconnected',
  error: null,
  activeEndpoint: null,
  switchNode: () => {},
  reconnect: () => {},
  discoveredNodeCount: 0,
  isDiscovering: false,
  addManualNode: async () => false,
});

/** Order endpoints: preferred first, then by health (healthy > slow > unknown > unhealthy), then by latency */
function orderEndpoints(
  endpoints: string[],
  preferred: string | null,
  nodes: { endpoint: string; status: string; latencyMs: number | null }[],
): string[] {
  const healthMap = new Map(nodes.map((n) => [n.endpoint, n]));
  const statusOrder: Record<string, number> = { healthy: 0, slow: 1, unknown: 2, unhealthy: 3 };

  const sorted = [...endpoints].sort((a, b) => {
    if (a === preferred) return -1;
    if (b === preferred) return 1;

    const ha = healthMap.get(a);
    const hb = healthMap.get(b);
    const sa = statusOrder[ha?.status ?? 'unknown'] ?? 2;
    const sb = statusOrder[hb?.status ?? 'unknown'] ?? 2;
    if (sa !== sb) return sa - sb;

    const la = ha?.latencyMs ?? Infinity;
    const lb = hb?.latencyMs ?? Infinity;
    return la - lb;
  });

  return sorted;
}

export function ApiProvider({
  endpoint,
  children,
}: {
  endpoint?: string;
  children: React.ReactNode;
}) {
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [activeEndpoint, setActiveEndpointLocal] = useState<string | null>(null);
  const [discoveredNodeCount, setDiscoveredNodeCount] = useState(0);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const apiRef = useRef<ApiPromise | null>(null);
  const providerRef = useRef<ProviderInterface | null>(null);
  const connectAttemptRef = useRef(0);
  const probeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgProbeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const discoveryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initNodes = useNodeHealthStore((s) => s.initNodes);
  const addNodeToStore = useNodeHealthStore((s) => s.addNode);
  const storeNodes = useNodeHealthStore((s) => s.nodes);
  const setStoreActiveEndpoint = useNodeHealthStore((s) => s.setActiveEndpoint);
  const preferredEndpoint = useNodeHealthStore((s) => s.preferredEndpoint);
  const setPreferredEndpoint = useNodeHealthStore((s) => s.setPreferredEndpoint);
  const recordProbeSuccess = useNodeHealthStore((s) => s.recordProbeSuccess);
  const recordProbeFailure = useNodeHealthStore((s) => s.recordProbeFailure);

  const endpointsRef = useRef<string[]>([]);
  const discoveredEndpointsRef = useRef<string[]>([]);
  const failoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failoverAttemptsRef = useRef(0);

  // -----------------------------------------------------------------------
  // Helper: create a WsProvider + ApiPromise connection
  // -----------------------------------------------------------------------
  const createConnection = useCallback(
    (ordered: string[]) => {
      const attemptId = ++connectAttemptRef.current;
      logWs('createConnection:start', { attemptId, ordered });

      // Disconnect existing established connection
      if (apiRef.current) {
        logWs('createConnection:disconnect-api', { attemptId });
        apiRef.current.disconnect().catch(() => {});
        apiRef.current = null;
      }
      if (providerRef.current) {
        logWs('createConnection:disconnect-provider', { attemptId });
        providerRef.current.disconnect().catch(() => {});
        providerRef.current = null;
      }

      if (ordered.length === 0) {
        logWs('createConnection:no-endpoints', { attemptId });
        setConnectionStatus('error');
        setError('No valid WebSocket endpoints configured');
        return;
      }

      setConnectionStatus('connecting');
      setError(null);

      const provider = new WsProvider(ordered, 2500);
      logWs('provider:constructed', { attemptId, endpoints: ordered });

      provider.on('connected', () => {
        if (connectAttemptRef.current !== attemptId) {
          logWs('provider:connected:stale', { attemptId, currentAttempt: connectAttemptRef.current });
          return;
        }
        const ep = (provider as unknown as { endpoint: string }).endpoint ?? ordered[0];
        logWs('provider:connected', { attemptId, endpoint: ep });
        setActiveEndpointLocal(ep);
        setStoreActiveEndpoint(ep);
        // Reset failover counter on successful connection
        failoverAttemptsRef.current = 0;
        if (failoverTimerRef.current) {
          clearTimeout(failoverTimerRef.current);
          failoverTimerRef.current = null;
        }
      });

      provider.on('disconnected', () => {
        if (connectAttemptRef.current !== attemptId) {
          logWs('provider:disconnected:stale', { attemptId, currentAttempt: connectAttemptRef.current });
          return;
        }
        logWs('provider:disconnected', { attemptId });
        setConnectionStatus('disconnected');
        setIsReady(false);

        // --- Auto-failover: try switching to another node after a delay ---
        if (!failoverTimerRef.current && endpointsRef.current.length > 1) {
          const attempt = ++failoverAttemptsRef.current;
          // Exponential backoff: 5s, 10s, 20s, max 30s
          const delay = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
          logWs('failover:scheduled', { attempt, delay });
          failoverTimerRef.current = setTimeout(async () => {
            failoverTimerRef.current = null;
            // Probe all endpoints to find a healthy one
            const candidates = endpointsRef.current;
            logWs('failover:probing', { attempt, candidates });
            const results = await probeEndpointsBatch(candidates, 3, NODE_HEALTH_CONFIG.discoveryProbeTimeout);
            for (const r of results) {
              recordProbeSuccess(r.endpoint, r.latencyMs, r.blockHeight);
            }
            const best = selectBestNode(results);
            if (best) {
              logWs('failover:switching', { attempt, endpoint: best.endpoint });
              // Disconnect stale provider/api before switching
              if (apiRef.current) {
                apiRef.current.disconnect().catch(() => {});
                apiRef.current = null;
              }
              if (providerRef.current) {
                providerRef.current.disconnect().catch(() => {});
                providerRef.current = null;
              }
              setApi(null);
              setActiveEndpointLocal(null);
              const nodes = useNodeHealthStore.getState().nodes;
              const rest = candidates.filter((e) => e !== best.endpoint);
              const reordered = [best.endpoint, ...orderEndpoints(rest, null, nodes)];
              createConnection(reordered);
            } else {
              logWs('failover:no-healthy-node', { attempt });
            }
          }, delay);
        }
      });

      provider.on('error', (providerError) => {
        if (connectAttemptRef.current !== attemptId) {
          logWs('provider:error:stale', { attemptId, currentAttempt: connectAttemptRef.current });
          return;
        }
        const errorDetails = providerError instanceof Event
          ? {
              type: providerError.type,
              targetUrl: (providerError.target as WebSocket | null)?.url,
              readyState: (providerError.target as WebSocket | null)?.readyState,
            }
          : providerError instanceof Error
            ? { message: providerError.message, stack: providerError.stack }
            : { value: String(providerError) };
        logWs('provider:error', {
          attemptId,
          error: errorDetails,
        });
        setConnectionStatus('error');
        setError('WebSocket connection error');
      });

      logWs('api:create:start', { attemptId });
      ApiPromise.create({ provider, types: customTypes, runtime: runtimeDefs })
        .then((apiInstance) =>
          apiInstance.isReady.then(() => {
            if (connectAttemptRef.current !== attemptId) {
              logWs('api:isReady:stale', { attemptId, currentAttempt: connectAttemptRef.current });
              apiInstance.disconnect().catch(() => {});
              return;
            }
            logWs('api:isReady', { attemptId });
            providerRef.current = provider;
            apiRef.current = apiInstance;
            setApi(apiInstance);
            setIsReady(true);
            setConnectionStatus('connected');
          }),
        )
        .catch((err) => {
          if (connectAttemptRef.current !== attemptId) {
            logWs('api:create:error:stale', { attemptId, currentAttempt: connectAttemptRef.current });
            return;
          }
          provider.disconnect().catch(() => {});
          logWs('api:create:error', { attemptId, error: err instanceof Error ? err.message : String(err) });
          setConnectionStatus('error');
          setError(err instanceof Error ? err.message : 'Failed to connect');
        });
    },
    [setStoreActiveEndpoint],
  );

  // -----------------------------------------------------------------------
  // Initial connection
  // -----------------------------------------------------------------------
  const connect = useCallback(() => {
    const seeds = getSeedEndpoints();
    const trustedEndpoints = endpoint ? filterAllowedEndpoints([endpoint]) : getConfiguredEndpoints();
    endpointsRef.current = trustedEndpoints;
    discoveredEndpointsRef.current = [];

    // Initialize store: trusted auto-connect endpoints vs discovered-only endpoints
    const seedSet = new Set(seeds);
    const seedEndpoints = trustedEndpoints.filter((e) => seedSet.has(e));
    const nonSeedTrustedEndpoints = trustedEndpoints.filter((e) => !seedSet.has(e));
    const discoveredEndpoints: string[] = [];
    initNodes(
      seedEndpoints.length > 0 ? seedEndpoints : trustedEndpoints,
      [...nonSeedTrustedEndpoints, ...discoveredEndpoints],
    );
    setDiscoveredNodeCount(discoveredEndpointsRef.current.length);

    // If user has a preferred endpoint, connect to it directly
    const currentState = useNodeHealthStore.getState();
    if (currentState.preferredEndpoint) {
      const ordered = orderEndpoints(trustedEndpoints, currentState.preferredEndpoint, currentState.nodes);
      createConnection(ordered);
      return;
    }

    // Probe all endpoints first, then connect to the fastest one
    setConnectionStatus('connecting');
    logWs('connect:probing-all', { endpoints: trustedEndpoints });
    probeEndpointsBatch(trustedEndpoints, trustedEndpoints.length, NODE_HEALTH_CONFIG.discoveryProbeTimeout)
      .then((results) => {
        for (const r of results) {
          recordProbeSuccess(r.endpoint, r.latencyMs, r.blockHeight);
        }
        const best = selectBestNode(results);
        if (best) {
          logWs('connect:fastest', { endpoint: best.endpoint, latencyMs: best.latencyMs });
          const rest = trustedEndpoints.filter((e) => e !== best.endpoint);
          const nodes = useNodeHealthStore.getState().nodes;
          const ordered = [best.endpoint, ...orderEndpoints(rest, null, nodes)];
          createConnection(ordered);
        } else {
          // All probes failed, fall back to default order
          logWs('connect:probe-all-failed');
          createConnection(trustedEndpoints);
        }
      })
      .catch(() => {
        createConnection(trustedEndpoints);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  useEffect(() => {
    logWs('effect:connect');
    connect();
    return () => {
      connectAttemptRef.current += 1;
      logWs('effect:cleanup', { currentAttempt: connectAttemptRef.current });
      if (probeTimerRef.current) clearInterval(probeTimerRef.current);
      if (bgProbeTimerRef.current) clearInterval(bgProbeTimerRef.current);
      if (discoveryTimerRef.current) clearInterval(discoveryTimerRef.current);
      if (failoverTimerRef.current) { clearTimeout(failoverTimerRef.current); failoverTimerRef.current = null; }
      providerRef.current?.disconnect().catch(() => {});
      providerRef.current = null;
      apiRef.current?.disconnect().catch(() => {});
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connect]);

  // -----------------------------------------------------------------------
  // Active node probe (every 15s)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (probeTimerRef.current) clearInterval(probeTimerRef.current);
    if (!isReady || !api || !activeEndpoint) return;

    const probe = async () => {
      const currentApi = apiRef.current;
      const ep = activeEndpoint;
      if (!currentApi || !ep) return;

      const start = performance.now();
      try {
        const header = await currentApi.rpc.chain.getHeader();
        const latency = Math.round(performance.now() - start);
        const blockHeight = header.number.toNumber();
        recordProbeSuccess(ep, latency, blockHeight);
      } catch {
        recordProbeFailure(ep);
      }
    };

    probe();
    probeTimerRef.current = setInterval(probe, NODE_HEALTH_CONFIG.probeInterval);

    return () => {
      if (probeTimerRef.current) clearInterval(probeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, api, activeEndpoint]);

  // -----------------------------------------------------------------------
  // Background probe for inactive nodes (every 30s)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (bgProbeTimerRef.current) clearInterval(bgProbeTimerRef.current);
    if (!isReady || !activeEndpoint) return;

    const bgProbe = async () => {
      const currentNodes = useNodeHealthStore.getState().nodes;
      const inactiveEndpoints = endpointsRef.current.filter((ep) => ep !== activeEndpoint);

      if (inactiveEndpoints.length === 0) return;

      const results = await probeEndpointsBatch(
        inactiveEndpoints,
        3,
        NODE_HEALTH_CONFIG.discoveryProbeTimeout,
      );

      const probedSet = new Set<string>();
      for (const r of results) {
        probedSet.add(r.endpoint);
        recordProbeSuccess(r.endpoint, r.latencyMs, r.blockHeight);
      }

      // Mark non-responsive endpoints
      for (const ep of inactiveEndpoints) {
        if (!probedSet.has(ep)) {
          recordProbeFailure(ep);
        }
      }

      // --- Auto-switch check ---
      const state = useNodeHealthStore.getState();
      const currentNode = state.nodes.find((n) => n.endpoint === activeEndpoint) ?? null;
      // Combine active probe data with background results for best-node selection
      const allResults = [
        ...results,
        ...(currentNode && currentNode.latencyMs != null && currentNode.blockHeight != null
          ? [{ endpoint: currentNode.endpoint, latencyMs: currentNode.latencyMs, blockHeight: currentNode.blockHeight }]
          : []),
      ];
      const best = selectBestNode(allResults, activeEndpoint);
      if (shouldAutoSwitch(currentNode, best, state.preferredEndpoint, activeEndpoint)) {
        autoSwitchNode(best!.endpoint);
      }
    };

    bgProbe();
    bgProbeTimerRef.current = setInterval(bgProbe, NODE_HEALTH_CONFIG.backgroundProbeInterval);

    return () => {
      if (bgProbeTimerRef.current) clearInterval(bgProbeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, activeEndpoint]);

  // -----------------------------------------------------------------------
  // Peer discovery cycle (every 60s): discover new nodes, probe, add to store
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (discoveryTimerRef.current) clearInterval(discoveryTimerRef.current);
    if (!isReady || !api) return;

    const runDiscovery = async () => {
      const currentApi = apiRef.current;
      if (!currentApi) return;

      setIsDiscovering(true);
      try {
        // 1. Discover peer endpoints from the connected node
        const newEndpoints = await discoverPeers(currentApi);

        // 2. Merge with cached nodes
        const cached = loadCachedNodes();
        const merged = mergeCachedNodes(cached, newEndpoints);
        saveCachedNodes(merged);

        // 3. Collect all unique discovered endpoints (new + cached)
        const allDiscovered = Array.from(new Set(merged.map((n) => n.endpoint)));
        discoveredEndpointsRef.current = allDiscovered;
        setDiscoveredNodeCount(allDiscovered.length);

        // 4. Probe discovered endpoints to check availability
        const results = await probeEndpointsBatch(
          allDiscovered,
          3,
          NODE_HEALTH_CONFIG.discoveryProbeTimeout,
        );

        // 5. Add reachable nodes to the store and endpoint list
        for (const r of results) {
          addNodeToStore(r.endpoint, 'discovered');
          recordProbeSuccess(r.endpoint, r.latencyMs, r.blockHeight);
          if (!endpointsRef.current.includes(r.endpoint)) {
            endpointsRef.current.push(r.endpoint);
          }
        }

        // 6. Re-init store with updated endpoint lists
        const seeds = getSeedEndpoints();
        const seedSet = new Set(seeds);
        initNodes(
          endpointsRef.current.filter((e) => seedSet.has(e)),
          endpointsRef.current.filter((e) => !seedSet.has(e)),
        );

        // 7. Auto-switch check with newly discovered nodes
        const state = useNodeHealthStore.getState();
        const currentNode = state.nodes.find((n) => n.endpoint === activeEndpoint) ?? null;
        const allResults = [
          ...results,
          ...(currentNode && currentNode.latencyMs != null && currentNode.blockHeight != null
            ? [{ endpoint: currentNode.endpoint, latencyMs: currentNode.latencyMs, blockHeight: currentNode.blockHeight }]
            : []),
        ];
        const best = selectBestNode(allResults, activeEndpoint ?? undefined);
        if (best && shouldAutoSwitch(currentNode, best, state.preferredEndpoint, activeEndpoint)) {
          autoSwitchNode(best.endpoint);
        }
      } catch {
        // Discovery failure is non-fatal
      } finally {
        setIsDiscovering(false);
      }
    };

    // Run first discovery after a short delay to let the connection stabilize
    const initialTimer = setTimeout(runDiscovery, 5_000);
    discoveryTimerRef.current = setInterval(runDiscovery, NODE_HEALTH_CONFIG.discoveryInterval);

    return () => {
      clearTimeout(initialTimer);
      if (discoveryTimerRef.current) clearInterval(discoveryTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, api, activeEndpoint]);

  // -----------------------------------------------------------------------
  const autoSwitchNode = useCallback(
    (ep: string) => {
      if (apiRef.current) {
        apiRef.current.disconnect().catch(() => {});
        apiRef.current = null;
      }
      setApi(null);
      setIsReady(false);
      setActiveEndpointLocal(null);

      const endpoints = endpointsRef.current;
      const nodes = useNodeHealthStore.getState().nodes;
      // Put the target endpoint first, then order the rest
      const rest = endpoints.filter((e) => e !== ep);
      const ordered = [ep, ...orderEndpoints(rest, null, nodes)];

      createConnection(ordered);
    },
    [createConnection],
  );

  // -----------------------------------------------------------------------
  // switchNode: user-initiated — persist preference, reconnect
  // -----------------------------------------------------------------------
  const switchNode = useCallback(
    (ep: string) => {
      setPreferredEndpoint(ep);

      if (apiRef.current) {
        apiRef.current.disconnect().catch(() => {});
        apiRef.current = null;
      }
      setApi(null);
      setIsReady(false);
      setActiveEndpointLocal(null);

      const endpoints = endpointsRef.current;
      const nodes = useNodeHealthStore.getState().nodes;
      const ordered = orderEndpoints(endpoints, ep, nodes);

      createConnection(ordered);
    },
    [setPreferredEndpoint, createConnection],
  );

  // -----------------------------------------------------------------------
  // addManualNode: probe first, add if reachable
  // -----------------------------------------------------------------------
  const addManualNode = useCallback(
    async (ep: string): Promise<boolean> => {
      const allowedEndpoints = filterAllowedEndpoints([ep]);
      if (allowedEndpoints.length === 0) return false;

      const [allowedEndpoint] = allowedEndpoints;
      const results = await probeEndpointsBatch([allowedEndpoint], 1, NODE_HEALTH_CONFIG.discoveryProbeTimeout);
      if (results.length === 0) return false;

      return true;
    },
    [],
  );

  return (
    <ApiContext.Provider
      value={{
        api,
        isReady,
        connectionStatus,
        error,
        activeEndpoint,
        switchNode,
        reconnect: connect,
        discoveredNodeCount,
        isDiscovering,
        addManualNode,
      }}
    >
      {children}
    </ApiContext.Provider>
  );
}

/** Hook to access the Polkadot.js API instance */
export function useApi(): ApiContextValue {
  return useContext(ApiContext);
}
