import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { OpenElectricityClient, getNetworkTimezoneOffset } from "openelectricity"
import { computeCurrentStatus, updateHistory } from "../src/lib/compute"
import type { StatusHistory } from "../src/types/status"

const OUT_DIR = resolve(import.meta.dirname, "../public/data")
const CURRENT_PATH = resolve(OUT_DIR, "current.json")
const HISTORY_PATH = resolve(OUT_DIR, "history.json")

const AEST_MS = getNetworkTimezoneOffset("NEM")

/** Convert UTC Date to AEST-naive ISO string (no Z suffix) for the OE API */
const toAestNaive = (d: Date) => new Date(d.getTime() + AEST_MS).toISOString().slice(0, 19)

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
	const now = new Date()
	const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)

	const dateStart = toAestNaive(windowStart)
	const dateEnd = toAestNaive(now)

	console.log(`Fetching NEM data (${dateStart} → ${dateEnd})...`)

	const start = performance.now()

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

	const apiLatencyMs = Math.round(performance.now() - start)
	console.log(`API responded in ${apiLatencyMs}ms`)

	const current = computeCurrentStatus(
		networkResponse.response.data,
		marketResponse.response.data,
		windowStart,
		now,
		apiLatencyMs,
	)

	let existingHistory: StatusHistory | null = null
	if (existsSync(HISTORY_PATH)) {
		existingHistory = JSON.parse(readFileSync(HISTORY_PATH, "utf-8")) as StatusHistory
	}

	const history = updateHistory(existingHistory, current)

	writeFileSync(CURRENT_PATH, JSON.stringify(current, null, 2))
	writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2))

	console.log(`Wrote ${CURRENT_PATH}`)
	console.log(`Wrote ${HISTORY_PATH}`)

	for (const s of current.series) {
		console.log(`  ${s.id}: ${s.status} (lag ${s.lagMinutes}m, coverage ${s.coverage}%)`)
	}
}

main()
