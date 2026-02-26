import { kv } from "@vercel/kv"
import type { VercelRequest, VercelResponse } from "@vercel/node"
import type { ApiHealthData } from "../src/types/status.js"

export default async function handler(_req: VercelRequest, res: VercelResponse) {
	const data = await kv.get<ApiHealthData>("api-health")
	return res.status(200).json(data ?? { checks: [] })
}
