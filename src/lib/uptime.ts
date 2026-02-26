import type { HealthStatus, HistoryDay, RegionDayCounts } from "@/types/status"

/** Determine overall status for a single day.
 * Orange only for "down" checks (real outages). Degraded alone stays green. */
export function dayStatus(day: HistoryDay): HealthStatus {
	if (day.down > 0) return "degraded"
	return "operational"
}

/** Patch today's history entry with live status so stale down/degraded counts
 *  from pre-grace-period checks don't taint today's bar or uptime %. */
export function patchTodayLive(days: HistoryDay[], liveStatus: HealthStatus): HistoryDay[] {
	if (liveStatus !== "operational") return days
	const todayStr = new Date().toISOString().slice(0, 10)
	return days.map((d) => {
		if (d.date !== todayStr) return d
		const regions: Record<string, RegionDayCounts> = {}
		for (const [key, rc] of Object.entries(d.regions)) {
			const total = rc.ok + rc.degraded + rc.down
			regions[key] = { ...rc, down: 0, degraded: 0, ok: total }
		}
		return { ...d, down: 0, degraded: 0, ok: d.checks, regions }
	})
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
