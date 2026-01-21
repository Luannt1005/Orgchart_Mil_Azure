/**
 * Custom Hook: useOrgData
 * Provides global organization data with SWR caching
 * Time-based revalidation: 60 seconds
 */

'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { useRef } from 'react';
import { OrgNode, ApiResponse } from '@/types/orgchart';
import { swrFetcher } from '@/lib/api-client';
import { GET_DATA_API } from '@/constant/api';

// Cache configuration
const CACHE_REVALIDATE_INTERVAL = parseInt(
  process.env.NEXT_PUBLIC_CACHE_REVALIDATE_INTERVAL || '60000'
);
const DEDUPING_INTERVAL = 15 * 60 * 1000; // 15 minutes - keep cache active for this duration
const FOCUS_THROTTLE_INTERVAL = 15 * 60 * 1000; // 15 minutes - don't revalidate when focusing tab

interface UseOrgDataOptions extends SWRConfiguration {
  onSuccess?: (data: OrgNode[]) => void;
  onError?: (error: Error) => void;
}

export function useOrgData(options?: UseOrgDataOptions) {
  // Track if we've already attempted to revalidate empty data
  const revalidateAttemptedRef = useRef(false);

  // Build SWR config safely, avoiding callback conflicts
  const baseConfig: SWRConfiguration = {
    // Conservative caching strategy - prioritize cache over fresh data
    revalidateOnFocus: false, // Don't revalidate when tab regains focus
    revalidateOnReconnect: false, // Don't revalidate on reconnect
    revalidateIfStale: false, // Don't auto-revalidate if stale
    revalidateOnMount: true, // Fetch data if not in cache on mount
    shouldRetryOnError: false, // Don't retry on error automatically
    focusThrottleInterval: FOCUS_THROTTLE_INTERVAL,
    dedupingInterval: DEDUPING_INTERVAL, // Deduplicate requests within 5 minutes
    compare: (a, b) => {
      // Custom comparison to avoid unnecessary re-renders
      return JSON.stringify(a) === JSON.stringify(b);
    },
    onSuccess: (fetchedData) => {
      // Log successful fetch
      const dataLength = fetchedData?.data?.length || 0;
      console.log(`✅ Data fetched successfully: ${dataLength} items`);
      // Reset revalidate attempt flag when we get new data
      if (dataLength > 0) {
        revalidateAttemptedRef.current = false;
      }
    },
    onError: (error) => {
      console.error('❌ Error fetching data:', error.message);
    },
  };

  // Merge options without spreading callbacks multiple times
  const swrConfig: SWRConfiguration = {
    ...baseConfig,
    ...(options && {
      ...options,
      // Only set callbacks if they exist
      ...(options.onSuccess && { onSuccess: options.onSuccess }),
      ...(options.onError && { onError: options.onError }),
    }),
  };

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<OrgNode>>(
    GET_DATA_API,
    swrFetcher,
    swrConfig
  );


  // Extract nodes array from response
  const nodes = data?.data ?? [];

  // Extract unique group names (dept)
  const groups = Array.from(
    new Set(
      nodes
        .map(node => node.dept)
        .filter((d): d is string => typeof d === "string" && d.trim() !== "")
    )
  ).sort();

  return {
    nodes,
    groups,
    loading: isLoading,
    error: error as Error | null,
    mutate, // Manual revalidation trigger
    rawData: data,
  };
}

/**
 * Helper hook to get filtered data by group
 * Uses cached global data to avoid extra API calls
 */
export function useFilteredOrgData(groupName?: string) {
  const { nodes, loading, error, mutate } = useOrgData();

  // Perform client-side filtering from cached data
  const filteredNodes = groupName
    ? filterNodesByGroup(nodes, groupName)
    : nodes;

  return {
    nodes: filteredNodes,
    loading,
    error,
    mutate,
    allNodes: nodes,
  };
}

/**
 * DFS filtering function to get nodes for a specific group
 * Finds ALL nodes with matching dept/name and returns all their descendants
 */
function filterNodesByGroup(
  nodes: OrgNode[],
  groupName: string
): OrgNode[] {
  // Find ALL nodes that match this group name (could be multiple with same name but different IDs)
  const targetNodes: OrgNode[] = [];

  // Priority 1: Find all group nodes by dept
  const groupNodesByDept = nodes.filter(
    n => n.dept === groupName && (n.type === "group" || (Array.isArray(n.tags) && n.tags.includes("group")))
  );
  if (groupNodesByDept.length > 0) {
    targetNodes.push(...groupNodesByDept);
  }

  // Priority 2: Find by name if it's a group (if we haven't found any yet)
  if (targetNodes.length === 0) {
    const groupNodesByName = nodes.filter(
      n => n.name === groupName && Array.isArray(n.tags) && n.tags.includes('group')
    );
    if (groupNodesByName.length > 0) {
      targetNodes.push(...groupNodesByName);
    }
  }

  // Priority 3: Find all nodes with matching dept (if still no matches)
  if (targetNodes.length === 0) {
    const nodesByDept = nodes.filter(n => n.dept === groupName);
    if (nodesByDept.length > 0) {
      targetNodes.push(...nodesByDept);
    }
  }

  if (targetNodes.length === 0) {
    console.warn(`No nodes found for group: ${groupName}`);
    return [];
  }

  const filtered: OrgNode[] = [];
  const visited = new Set<string | number>();
  const allNodes = nodes;

  function dfs(nodeId: string | number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const current = allNodes.find((n: any) => n.id === nodeId);
    if (current) filtered.push(current);

    allNodes.forEach((n: any) => {
      // Direct children (pid relationship) - get ALL nodes
      if (n.pid === nodeId) {
        dfs(n.id);
      }
      // Staff members (stpid relationship) - get ALL nodes
      if (n.stpid === nodeId) {
        dfs(n.id);
      }
    });
  }

  // Traverse from ALL matching nodes
  targetNodes.forEach(targetNode => {
    dfs(targetNode.id);
  });

  console.log(`✅ Found ${targetNodes.length} root node(s) for "${groupName}", filtered ${filtered.length} total nodes`);
  return filtered;
}

/**
 * Hook to manually trigger cache revalidation
 * Useful after create/update/delete operations
 * Note: Only use this after mutations (add/update/delete)
 */
export function useRevalidateOrgData() {
  const { mutate } = useOrgData();

  const revalidate = async (shouldRevalidate = true) => {
    try {
      // Only revalidate when explicitly needed (after mutations)
      if (shouldRevalidate) {
        console.log('🔄 Revalidating org data after mutation...');
        await mutate(undefined, {
          revalidate: true, // Force fresh data from server
        });
      }
      return true;
    } catch (error) {
      console.error('Failed to revalidate org data:', error);
      return false;
    }
  };

  return { revalidate };
}
