import type { HealthStatus, HistoryDay } from "@/types/status"

/** Determine overall status for a single day.
 * red (down) = no data at all; orange (degraded) = some data missing; green = all ok */
export function dayStatus(day: HistoryDay): HealthStatus {
	if (day.ok === 0 && day.degraded === 0) return "down"
	if (day.down > 0 || day.degraded > 0) return "degraded"
	return "operational"
}

/** Calculate uptime percentage from an array of history days */
export function uptimePercent(days: HistoryDay[]): number {
	let totalChecks = 0
	let okChecks = 0
	for (const d of days) {
		totalChecks += d.checks
		okChecks += d.ok
	}
	if (totalChecks === 0) return 100
	return (okChecks / totalChecks) * 100
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
