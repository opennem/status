import { JSON_REFETCH_MS } from "@/lib/constants"
import type { ApiHealthData, CurrentStatus, StatusHistory } from "@/types/status"
import { useQuery } from "@tanstack/react-query"

const BASE_URL = import.meta.env.VITE_BLOB_BASE_URL || "/data"
const HEALTH_URL = import.meta.env.VITE_BLOB_BASE_URL ? "/api/health-data" : "/data/api-health.json"

async function fetchJson<T>(path: string): Promise<T> {
	const res = await fetch(`${BASE_URL}/${path}?t=${Date.now()}`)
	if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
	return res.json() as Promise<T>
}

export function useCurrentStatus() {
	return useQuery<CurrentStatus>({
		queryKey: ["current-status"],
		queryFn: () => fetchJson<CurrentStatus>("current.json"),
		refetchInterval: JSON_REFETCH_MS,
		staleTime: JSON_REFETCH_MS - 5_000,
		retry: 2,
	})
}

export function useStatusHistory() {
	return useQuery<StatusHistory>({
		queryKey: ["status-history"],
		queryFn: () => fetchJson<StatusHistory>("history.json"),
		refetchInterval: JSON_REFETCH_MS,
		staleTime: JSON_REFETCH_MS - 5_000,
		retry: 2,
	})
}

async function fetchHealth(): Promise<ApiHealthData> {
	const res = await fetch(`${HEALTH_URL}?t=${Date.now()}`)
	if (!res.ok) throw new Error(`Failed to fetch health data: ${res.status}`)
	return res.json() as Promise<ApiHealthData>
}

export function useApiHealth() {
	return useQuery<ApiHealthData>({
		queryKey: ["api-health"],
		queryFn: fetchHealth,
		refetchInterval: JSON_REFETCH_MS,
		staleTime: JSON_REFETCH_MS - 5_000,
		retry: 2,
	})
}
