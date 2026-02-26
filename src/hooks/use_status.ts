import { JSON_REFETCH_MS } from "@/lib/constants"
import type { CurrentStatus, StatusHistory } from "@/types/status"
import { useQuery } from "@tanstack/react-query"

const BASE_URL = import.meta.env.VITE_BLOB_BASE_URL || "/data"

async function fetchJson<T>(path: string): Promise<T> {
	const res = await fetch(`${BASE_URL}/${path}`)
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
