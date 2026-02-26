import type { SeriesId } from "../types/status.js"

export const NEM_REGIONS = ["NSW1", "QLD1", "VIC1", "SA1", "TAS1"] as const

export const HISTORY_DAYS = 30

export const JSON_REFETCH_MS = 60_000 // 1 minute

export interface SeriesDefinition {
	id: SeriesId
	name: string
	description: string
	dataInterval: string
	/** Minutes */
	thresholds: { ok: number; warning: number }
}

export const SERIES_DEFINITIONS: SeriesDefinition[] = [
	{
		id: "generation",
		name: "Generation",
		description: "Dispatch generation",
		dataInterval: "5m",
		thresholds: { ok: 20, warning: 30 },
	},
	{
		id: "rooftop_aemo",
		name: "Rooftop Solar (AEMO)",
		description: "Rooftop forecast",
		dataInterval: "30m",
		thresholds: { ok: 55, warning: 75 },
	},
	{
		id: "rooftop_apvi",
		name: "Rooftop Solar (APVI)",
		description: "Rooftop actual",
		dataInterval: "5m",
		thresholds: { ok: 25, warning: 45 },
	},
	{
		id: "price",
		name: "Price",
		description: "Spot price",
		dataInterval: "5m",
		thresholds: { ok: 20, warning: 30 },
	},
	{
		id: "demand",
		name: "Demand",
		description: "Operational demand",
		dataInterval: "5m",
		thresholds: { ok: 20, warning: 30 },
	},
	{
		id: "interconnectors",
		name: "Interconnectors",
		description: "Interconnector flows",
		dataInterval: "5m",
		thresholds: { ok: 20, warning: 30 },
	},
	{
		id: "emissions",
		name: "Emissions",
		description: "Emissions intensity",
		dataInterval: "5m",
		thresholds: { ok: 20, warning: 30 },
	},
]

export const COVERAGE_THRESHOLDS = {
	ok: 98,
	warning: 90,
} as const
