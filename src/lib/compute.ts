import type { INetworkTimeSeries, ITimeSeriesResult } from "openelectricity"
import { getNetworkTimezoneOffset } from "openelectricity"
import type {
	CurrentStatus,
	HealthStatus,
	RegionDayCounts,
	RegionStatus,
	SeriesStatus,
	StatusHistory,
} from "../types/status.js"
import { COVERAGE_THRESHOLDS, NEM_REGIONS, SERIES_DEFINITIONS } from "./constants.js"

const AEST_MS = getNetworkTimezoneOffset("NEM")

function lagToStatus(lagMinutes: number, okThreshold: number, warnThreshold: number): HealthStatus {
	if (lagMinutes <= okThreshold) return "operational"
	if (lagMinutes <= warnThreshold) return "degraded"
	return "down"
}

function coverageToStatus(coverage: number): HealthStatus {
	if (coverage >= COVERAGE_THRESHOLDS.ok) return "operational"
	if (coverage >= COVERAGE_THRESHOLDS.warning) return "degraded"
	return "down"
}

function worstStatus(a: HealthStatus, b: HealthStatus): HealthStatus {
	const rank: Record<HealthStatus, number> = { operational: 0, degraded: 1, down: 2 }
	return rank[a] >= rank[b] ? a : b
}

function expectedIntervals(dataInterval: string): number {
	if (dataInterval === "30m") return 48
	return 288
}

function intervalMs(dataInterval: string): number {
	if (dataInterval === "30m") return 30 * 60 * 1000
	return 5 * 60 * 1000
}

function analyzeRegionData(
	results: ITimeSeriesResult[],
	dataInterval: string,
	windowStart: Date,
): { lastUpdate: Date | null; coverage: number; intervals: string } {
	const totalExpected = expectedIntervals(dataInterval)
	const intMs = intervalMs(dataInterval)

	// API returns AEST-naive timestamps — align grid in AEST space
	const windowStartAest = windowStart.getTime() + AEST_MS
	const alignedStart = Math.ceil(windowStartAest / intMs) * intMs

	const timestamps = new Set<number>()
	let latestTs: number | null = null

	for (const result of results) {
		for (const [ts, val] of result.data) {
			if (val !== null) {
				// API timestamps are AEST-naive — parse as UTC to get AEST-space epoch
				const naive = `${ts}`.replace(/[Z+].*$/, "")
				const t = new Date(`${naive}Z`).getTime()
				timestamps.add(t)
				if (latestTs === null || t > latestTs) latestTs = t
			}
		}
	}

	const bits: string[] = []
	let presentCount = 0
	for (let i = 0; i < totalExpected; i++) {
		const t = alignedStart + i * intMs
		if (timestamps.has(t)) {
			bits.push("1")
			presentCount++
		} else {
			bits.push("0")
		}
	}

	const coverage = totalExpected > 0 ? (presentCount / totalExpected) * 100 : 0

	return {
		lastUpdate: latestTs ? new Date(latestTs - AEST_MS) : null,
		coverage,
		intervals: bits.join(""),
	}
}

function filterResults(
	results: ITimeSeriesResult[],
	column: string,
	value: string,
): ITimeSeriesResult[] {
	return results.filter((r) => r.columns[column] === value)
}

function filterResultsExclude(
	results: ITimeSeriesResult[],
	column: string,
	excludeValues: string[],
): ITimeSeriesResult[] {
	return results.filter((r) => !excludeValues.includes(r.columns[column] as string))
}

function buildRegionStatus(
	region: string,
	results: ITimeSeriesResult[],
	dataInterval: string,
	windowStart: Date,
	now: Date,
	okThreshold: number,
	warnThreshold: number,
): RegionStatus {
	const { lastUpdate, coverage, intervals } = analyzeRegionData(results, dataInterval, windowStart)

	const lagMinutes = lastUpdate
		? (now.getTime() - lastUpdate.getTime()) / 60000
		: Number.POSITIVE_INFINITY

	const lagStatus = lagToStatus(lagMinutes, okThreshold, warnThreshold)
	const covStatus = coverageToStatus(coverage)

	return {
		region,
		status: worstStatus(lagStatus, covStatus),
		lagMinutes: Math.round(lagMinutes === Number.POSITIVE_INFINITY ? -1 : lagMinutes),
		coverage: Math.round(coverage * 10) / 10,
		intervals,
	}
}

function getSeriesResults(
	seriesId: string,
	region: string,
	powerSeries: INetworkTimeSeries | undefined,
	emissionsSeries: INetworkTimeSeries | undefined,
	priceSeries: INetworkTimeSeries | undefined,
	demandSeries: INetworkTimeSeries | undefined,
): ITimeSeriesResult[] {
	switch (seriesId) {
		case "generation": {
			if (!powerSeries) return []
			const regionData = filterResults(powerSeries.results, "region", region)
			// Exclude battery charging and pumps (consumption, not generation)
			return filterResultsExclude(regionData, "fueltech_group", ["battery_charging", "pumps"])
		}
		case "rooftop_aemo":
		case "rooftop_apvi": {
			if (!powerSeries) return []
			const regionData = filterResults(powerSeries.results, "region", region)
			return filterResults(regionData, "fueltech_group", "solar")
		}
		case "price": {
			if (!priceSeries) return []
			return filterResults(priceSeries.results, "region", region)
		}
		case "demand": {
			if (!demandSeries) return []
			return filterResults(demandSeries.results, "region", region)
		}
		case "interconnectors": {
			// Use demand as proxy for interconnector health — they share the same data source
			if (!demandSeries) return []
			return filterResults(demandSeries.results, "region", region)
		}
		case "emissions": {
			if (!emissionsSeries) return []
			return filterResults(emissionsSeries.results, "region", region)
		}
		default:
			return []
	}
}

/** Compute current status from raw API data */
export function computeCurrentStatus(
	networkData: INetworkTimeSeries[],
	marketData: INetworkTimeSeries[],
	windowStart: Date,
	now: Date,
	apiLatencyMs: number,
): CurrentStatus {
	const powerSeries = networkData.find((s) => s.metric === "power")
	const emissionsSeries = networkData.find((s) => s.metric === "emissions")
	const priceSeries = marketData.find((s) => s.metric === "price")
	const demandSeries = marketData.find((s) => s.metric === "demand")

	const series: SeriesStatus[] = []

	for (const def of SERIES_DEFINITIONS) {
		const regions: RegionStatus[] = []

		for (const region of NEM_REGIONS) {
			const regionResults = getSeriesResults(
				def.id,
				region,
				powerSeries,
				emissionsSeries,
				priceSeries,
				demandSeries,
			)
			regions.push(
				buildRegionStatus(
					region,
					regionResults,
					def.dataInterval,
					windowStart,
					now,
					def.thresholds.ok,
					def.thresholds.warning,
				),
			)
		}

		const overallStatus = regions.reduce<HealthStatus>(
			(worst, r) => worstStatus(worst, r.status),
			"operational",
		)
		const overallLag = Math.max(...regions.map((r) => r.lagMinutes))
		const maxCoverage = Math.max(...regions.map((r) => r.coverage))

		series.push({
			id: def.id,
			status: overallStatus,
			lagMinutes: overallLag,
			lastUpdate: now.toISOString(),
			coverage: Math.round(maxCoverage * 10) / 10,
			regions,
		})
	}

	return {
		v: 1,
		checkedAt: now.toISOString(),
		apiLatencyMs,
		series,
	}
}

/** Update history with a new check result */
export function updateHistory(
	existing: StatusHistory | null,
	current: CurrentStatus,
): StatusHistory {
	const today = current.checkedAt.slice(0, 10) // YYYY-MM-DD
	const history: StatusHistory = existing ?? {
		v: 1,
		updatedAt: current.checkedAt,
		series: {},
	}

	history.updatedAt = current.checkedAt

	for (const s of current.series) {
		if (!history.series[s.id]) {
			history.series[s.id] = []
		}

		const days = history.series[s.id] ?? []
		let todayEntry = days.find((d) => d.date === today)

		if (!todayEntry) {
			todayEntry = { date: today, checks: 0, ok: 0, degraded: 0, down: 0, regions: {} }
			days.unshift(todayEntry)
		}

		todayEntry.checks++
		const seriesField = s.status === "operational" ? "ok" : s.status
		todayEntry[seriesField]++

		for (const r of s.regions) {
			if (!todayEntry.regions[r.region]) {
				todayEntry.regions[r.region] = { ok: 0, degraded: 0, down: 0, intervals: "" }
			}
			const rc = todayEntry.regions[r.region] as RegionDayCounts
			const regionField = r.status === "operational" ? "ok" : r.status
			rc[regionField]++
			// Overwrite intervals each check — last check of the day has the most complete view
			rc.intervals = r.intervals
		}
	}

	return history
}

/** Compute overall status across all series */
export function computeOverallStatus(series: SeriesStatus[]): HealthStatus {
	return series.reduce<HealthStatus>((worst, s) => worstStatus(worst, s.status), "operational")
}
