export type HealthStatus = "operational" | "degraded" | "down"

/** Single API health check point */
export interface ApiHealthCheck {
	t: string // ISO timestamp
	latencyMs: number // response time in ms
	ok: boolean // /health returned OK
}

/** Rolling window of API health checks */
export interface ApiHealthData {
	checks: ApiHealthCheck[]
}

export type SeriesId =
	| "generation"
	| "rooftop_aemo"
	| "rooftop_apvi"
	| "price"
	| "demand"
	| "interconnectors"
	| "emissions"

/** Per-region current status snapshot */
export interface RegionStatus {
	region: string
	status: HealthStatus
	lagMinutes: number
	coverage: number
	/** Interval bitmap: "1"=data present, "0"=missing. Length=288 (5m) or 48 (30m) */
	intervals: string
}

/** Per-series current status with regions */
export interface SeriesStatus {
	id: SeriesId
	status: HealthStatus
	lagMinutes: number
	lastUpdate: string | null
	coverage: number
	regions: RegionStatus[]
}

/** current.json schema */
export interface CurrentStatus {
	v: 1
	checkedAt: string
	apiLatencyMs: number
	series: SeriesStatus[]
}

/** Per-region daily check counts */
export interface RegionDayCounts {
	ok: number
	degraded: number
	down: number
	/** Interval bitmap: "1"=data present, "0"=missing. Length=288 (5m) or 48 (30m) */
	intervals: string
}

/** Single day aggregate for a series */
export interface HistoryDay {
	date: string
	checks: number
	ok: number
	degraded: number
	down: number
	regions: Record<string, RegionDayCounts>
}

/** history.json schema */
export interface StatusHistory {
	v: 1
	updatedAt: string
	series: Record<string, HistoryDay[]>
}
