import type { SeriesId } from "../types/status.js"

export const NEM_REGIONS = ["NSW1", "QLD1", "VIC1", "SA1", "TAS1"] as const

export const HISTORY_DAYS = 30

export const JSON_REFETCH_MS = 60_000 // 1 minute

export interface SeriesDefinition {
	id: SeriesId
	name: string
	description: string
	dataInterval: string
}

/** Cron runs 2min after each 5min boundary — subtract from raw lag for display */
export const CRON_OFFSET_MINUTES = 2

/** Trailing missing intervals → status thresholds */
export const STATUS_THRESHOLDS = {
	operational: 3, // ≤3 missing = operational (grace window)
	degraded: 12, // 4–11 = degraded, ≥12 = down
} as const

export const SERIES_DEFINITIONS: SeriesDefinition[] = [
	{
		id: "generation",
		name: "Generation",
		description: "Dispatch generation",
		dataInterval: "5m",
	},
	{
		id: "rooftop_aemo",
		name: "Rooftop Solar (AEMO)",
		description: "Rooftop forecast",
		dataInterval: "30m",
	},
	{
		id: "rooftop_apvi",
		name: "Rooftop Solar (APVI)",
		description: "Rooftop actual",
		dataInterval: "5m",
	},
	{
		id: "price",
		name: "Price",
		description: "Spot price",
		dataInterval: "5m",
	},
	{
		id: "demand",
		name: "Demand",
		description: "Operational demand",
		dataInterval: "5m",
	},
	{
		id: "interconnectors",
		name: "Interconnectors",
		description: "Interconnector flows",
		dataInterval: "5m",
	},
	{
		id: "emissions",
		name: "Emissions",
		description: "Emissions intensity",
		dataInterval: "5m",
	},
]
