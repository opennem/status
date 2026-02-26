import type { HealthStatus, HistoryDay } from "@/types/status"

/** Determine overall status for a single day.
 * Orange only for "down" checks (real outages). Degraded alone stays green. */
export function dayStatus(day: HistoryDay): HealthStatus {
	if (day.down > 0) return "degraded"
	return "operational"
}

/** Calculate uptime percentage — only "down" checks count as failures */
export function uptimePercent(days: HistoryDay[]): number {
	let totalChecks = 0
	let downChecks = 0
	for (const d of days) {
		totalChecks += d.checks
		downChecks += d.down
	}
	if (totalChecks === 0) return 100
	return ((totalChecks - downChecks) / totalChecks) * 100
}

/** Format uptime percentage for display */
export function formatUptime(pct: number): string {
	if (pct >= 99.995) return "100%"
	if (pct >= 99.9) return `${pct.toFixed(2)}%`
	return `${pct.toFixed(1)}%`
}

/** Format a Date as short label e.g. "27 Jan" */
export function formatShortDate(d: Date): string {
	return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
}

/** Parse interval bitmap string to boolean array */
export function parseIntervals(bitmap: string): boolean[] {
	return bitmap.split("").map((c) => c === "1")
}
