import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { OpenElectricityClient, getNetworkTimezoneOffset } from "openelectricity"
import type { INetworkTimeSeries, ITimeSeriesResult } from "openelectricity"
import { NEM_REGIONS, SERIES_DEFINITIONS } from "../src/lib/constants"
import type { HistoryDay, RegionDayCounts, StatusHistory } from "../src/types/status"

const OUT_DIR = resolve(import.meta.dirname, "../public/data")
const HISTORY_PATH = resolve(OUT_DIR, "history.json")

const AEST_MS = getNetworkTimezoneOffset("NEM")
const DAY_MS = 24 * 60 * 60 * 1000
const BACKFILL_DAYS = 30

function expectedIntervals(dataInterval: string): number {
	return dataInterval === "30m" ? 48 : 288
}

function intervalMs(dataInterval: string): number {
	return dataInterval === "30m" ? 30 * 60 * 1000 : 5 * 60 * 1000
}

function buildIntervalBitmap(
	results: ITimeSeriesResult[],
	dataInterval: string,
	dayStartAest: string,
): string {
	const total = expectedIntervals(dataInterval)
	const intMs = intervalMs(dataInterval)
	const startMs = new Date(`${dayStartAest}Z`).getTime() // parse as UTC since it's already AEST-naive

	const timestamps = new Set<number>()
	for (const result of results) {
		for (const [ts, val] of result.data) {
			if (val !== null) {
				// API returns AEST-naive — parse same way
				const naive = `${ts}`.replace(/[Z+].*$/, "")
				timestamps.add(new Date(`${naive}Z`).getTime())
			}
		}
	}

	const bits: string[] = []
	for (let i = 0; i < total; i++) {
		bits.push(timestamps.has(startMs + i * intMs) ? "1" : "0")
	}
	return bits.join("")
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

function statusFromBitmap(bitmap: string): "operational" | "degraded" | "down" {
	const ones = bitmap.split("").filter((b) => b === "1").length
	const coverage = bitmap.length > 0 ? (ones / bitmap.length) * 100 : 0
	if (coverage >= 98) return "operational"
	if (coverage >= 90) return "degraded"
	return "down"
}

async function main() {
	const apiKey = process.env.OPENELECTRICITY_API_KEY
	if (!apiKey) {
		console.error("OPENELECTRICITY_API_KEY not set. Add it to .env")
		process.exit(1)
	}

	if (!existsSync(OUT_DIR)) {
		mkdirSync(OUT_DIR, { recursive: true })
	}

	const client = new OpenElectricityClient({ apiKey })

	// Get current AEST date
	const nowUtc = Date.now()
	const nowAest = new Date(nowUtc + AEST_MS)
	const todayAest = nowAest.toISOString().slice(0, 10)

	const history: StatusHistory = {
		v: 1,
		updatedAt: new Date().toISOString(),
		series: {},
	}

	for (const def of SERIES_DEFINITIONS) {
		history.series[def.id] = []
	}

	for (let dayOffset = BACKFILL_DAYS - 1; dayOffset >= 0; dayOffset--) {
		const dayDate = new Date(nowAest.getTime() - dayOffset * DAY_MS)
		const dateStr = dayDate.toISOString().slice(0, 10)
		const dateStart = `${dateStr}T00:00:00`
		const dateEnd =
			dayOffset === 0
				? nowAest
						.toISOString()
						.slice(0, 19) // partial today
				: `${dateStr}T23:59:59`

		console.log(`Backfilling ${dateStr} (${dateStart} → ${dateEnd})...`)

		const [networkResponse, marketResponse] = await Promise.all([
			client.getNetworkData("NEM", ["power", "emissions"], {
				interval: "5m",
				primaryGrouping: "network_region",
				secondaryGrouping: ["fueltech_group"],
				dateStart,
				dateEnd,
			}),
			client.getMarket("NEM", ["price", "demand"], {
				interval: "5m",
				primaryGrouping: "network_region",
				dateStart,
				dateEnd,
			}),
		])

		const powerSeries = networkResponse.response.data.find((s) => s.metric === "power")
		const emissionsSeries = networkResponse.response.data.find((s) => s.metric === "emissions")
		const priceSeries = marketResponse.response.data.find((s) => s.metric === "price")
		const demandSeries = marketResponse.response.data.find((s) => s.metric === "demand")

		for (const def of SERIES_DEFINITIONS) {
			const regions: Record<string, RegionDayCounts> = {}
			let seriesOk = 0
			let seriesDegraded = 0
			let seriesDown = 0

			for (const region of NEM_REGIONS) {
				const regionResults = getSeriesResults(
					def.id,
					region,
					powerSeries,
					emissionsSeries,
					priceSeries,
					demandSeries,
				)
				const bitmap = buildIntervalBitmap(regionResults, def.dataInterval, `${dateStr}T00:00:00`)
				const status = statusFromBitmap(bitmap)

				regions[region] = {
					ok: status === "operational" ? 1 : 0,
					degraded: status === "degraded" ? 1 : 0,
					down: status === "down" ? 1 : 0,
					intervals: bitmap,
				}

				if (status === "operational") seriesOk++
				else if (status === "degraded") seriesDegraded++
				else seriesDown++
			}

			const day: HistoryDay = {
				date: dateStr,
				checks: 1,
				ok: seriesOk,
				degraded: seriesDegraded,
				down: seriesDown,
				regions,
			}

			history.series[def.id].push(day)
		}
	}

	writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2))
	console.log(`Wrote ${HISTORY_PATH}`)

	// Summary
	for (const def of SERIES_DEFINITIONS) {
		const days = history.series[def.id]
		console.log(`  ${def.id}: ${days.length} days backfilled`)
	}
}

main()
