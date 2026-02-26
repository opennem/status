import { list, put } from "@vercel/blob"
import type { VercelRequest, VercelResponse } from "@vercel/node"
import { OpenElectricityClient, getNetworkTimezoneOffset } from "openelectricity"
import { computeCurrentStatus, updateHistory } from "../../src/lib/compute"
import type { StatusHistory } from "../../src/types/status"

const AEST_MS = getNetworkTimezoneOffset("NEM")

/** Convert UTC Date to AEST-naive ISO string (no Z suffix) for the OE API */
const toAestNaive = (d: Date) => new Date(d.getTime() + AEST_MS).toISOString().slice(0, 19)

const BLOB_PREFIX = "status/"

async function readBlob<T>(filename: string): Promise<T | null> {
	try {
		const { blobs } = await list({ prefix: `${BLOB_PREFIX}${filename}` })
		const blob = blobs.find((b) => b.pathname === `${BLOB_PREFIX}${filename}`)
		if (!blob) return null
		const res = await fetch(blob.url)
		return (await res.json()) as T
	} catch {
		return null
	}
}

async function writeBlob(filename: string, data: unknown): Promise<void> {
	await put(`${BLOB_PREFIX}${filename}`, JSON.stringify(data), {
		access: "public",
		addRandomSuffix: false,
		contentType: "application/json",
	})
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	const cronSecret = process.env.CRON_SECRET
	if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
		return res.status(401).json({ error: "Unauthorized" })
	}

	const apiKey = process.env.OPENELECTRICITY_API_KEY
	if (!apiKey) {
		return res.status(500).json({ error: "OPENELECTRICITY_API_KEY not set" })
	}

	const client = new OpenElectricityClient({ apiKey })
	const now = new Date()
	const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)

	const dateStart = toAestNaive(windowStart)
	const dateEnd = toAestNaive(now)

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

	const current = computeCurrentStatus(
		networkResponse.response.data,
		marketResponse.response.data,
		windowStart,
		now,
		apiLatencyMs,
	)

	const existingHistory = await readBlob<StatusHistory>("history.json")
	const history = updateHistory(existingHistory, current)

	await Promise.all([writeBlob("current.json", current), writeBlob("history.json", history)])

	return res.status(200).json({ ok: true, checkedAt: current.checkedAt, apiLatencyMs })
}
