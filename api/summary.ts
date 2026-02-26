import { list } from "@vercel/blob"
import type { VercelRequest, VercelResponse } from "@vercel/node"

const BLOB_PREFIX = "status/"

export default async function handler(_req: VercelRequest, res: VercelResponse) {
	try {
		const { blobs } = await list({ prefix: `${BLOB_PREFIX}summary.json` })
		const blob = blobs.find((b) => b.pathname === `${BLOB_PREFIX}summary.json`)
		if (!blob) {
			return res.status(404).json({ error: "summary not found" })
		}
		const data = await fetch(blob.url)
		res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300")
		res.setHeader("Access-Control-Allow-Origin", "*")
		return res.status(200).json(await data.json())
	} catch {
		return res.status(500).json({ error: "failed to read summary" })
	}
}
