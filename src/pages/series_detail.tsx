import { HealthDot } from "@/components/health_dot"
import { IntervalBar } from "@/components/interval_bar"
import { RegionTable } from "@/components/region_table"
import { Skeleton } from "@/components/ui/skeleton"
import { UptimeBars } from "@/components/uptime_bars"
import { useCurrentStatus, useStatusHistory } from "@/hooks/use_status"
import { HISTORY_DAYS, NEM_REGIONS, SERIES_DEFINITIONS } from "@/lib/constants"
import { formatShortDate, formatUptime, patchTodayLive, uptimePercent } from "@/lib/uptime"
import { NotFoundPage } from "@/pages/not_found"
import type { HistoryDay, SeriesId } from "@/types/status"
import { format, parseISO } from "date-fns"
import { getNetworkTimezoneOffset } from "openelectricity"
import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"

const AEST_MS = getNetworkTimezoneOffset("NEM")
const DAY_MS = 24 * 60 * 60 * 1000
const INTERVAL_MS = 5 * 60 * 1000

const STATUS_LABELS: Record<string, string> = {
	operational: "Operational",
	degraded: "Degraded",
	down: "Down",
}

/** Extract per-region history days from series-level days */
function regionDays(days: HistoryDay[], region: string): HistoryDay[] {
	return days.map((d) => {
		const rc = d.regions[region]
		if (!rc) return { date: d.date, checks: 0, ok: 0, degraded: 0, down: 0, regions: {} }
		return {
			date: d.date,
			checks: rc.ok + rc.degraded + rc.down,
			ok: rc.ok,
			degraded: rc.degraded,
			down: rc.down,
			regions: {},
		}
	})
}

export function SeriesDetailPage() {
	const { seriesId } = useParams<{ seriesId: string }>()
	const { data: current, isLoading: loadingCurrent } = useCurrentStatus()
	const { data: history, isLoading: loadingHistory } = useStatusHistory()

	const isLoading = loadingCurrent || loadingHistory
	const definition = SERIES_DEFINITIONS.find((d) => d.id === seriesId)
	const series = current?.series.find((s) => s.id === (seriesId as SeriesId))
	const rawDays = history?.series[seriesId ?? ""] ?? []
	const days = series ? patchTodayLive(rawDays, series.status) : rawDays
	const uptime = uptimePercent(days)

	const todayStr = new Date().toISOString().slice(0, 10)
	const [selectedDate, setSelectedDate] = useState<string>(todayStr)
	const selectedDay = days.find((d) => d.date === selectedDate)
	const isToday = selectedDate === todayStr

	// For today, use live intervals from current.json (last 24h up to last complete interval)
	const getRegionBitmap = (region: string): string => {
		if (isToday && series) {
			const regionStatus = series.regions.find((r) => r.region === region)
			if (regionStatus?.intervals) return regionStatus.intervals
		}
		return selectedDay?.regions[region]?.intervals ?? ""
	}

	// Compute rolling window start hour in AEST for today's interval labels
	const todayStartHourAest = useMemo(() => {
		const nowAest = Date.now() + AEST_MS
		// Snap to last complete 5min interval (with 5min leeway)
		const snapped = Math.floor(nowAest / INTERVAL_MS) * INTERVAL_MS
		const windowStartAest = snapped - DAY_MS
		// Extract fractional hour-of-day
		const msInDay = ((windowStartAest % DAY_MS) + DAY_MS) % DAY_MS
		return msInDay / (60 * 60 * 1000)
	}, [])

	if (!definition) {
		return <NotFoundPage />
	}

	return (
		<>
			{/* Series header */}
			<div className="border-b bg-card px-6 py-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-xl font-display">{definition.name}</h1>
						<p className="text-xs text-muted-foreground mt-0.5">
							{definition.description} · {definition.dataInterval} intervals
						</p>
					</div>
					{isLoading ? (
						<Skeleton className="h-5 w-24" />
					) : series ? (
						<div className="flex items-center gap-2">
							<HealthDot status={series.status} size="md" pulse={series.status === "operational"} />
							<span className="text-sm font-medium">{STATUS_LABELS[series.status]}</span>
						</div>
					) : null}
				</div>
			</div>

			{/* Overall uptime bar */}
			<div className="bg-card border-b px-6 py-6">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-xs font-medium text-muted-foreground">{HISTORY_DAYS}-Day Status</h3>
					<span className="text-xs font-mono text-muted-foreground stat-value">
						{formatUptime(uptime)}
					</span>
				</div>
				<UptimeBars
					days={days}
					showLabels
					selectedDate={selectedDate}
					onDayClick={(day) => setSelectedDate(day.date)}
				/>
			</div>

			{/* Interval detail for selected day */}
			{(selectedDay || isToday) && definition && (
				<div className="bg-card border-b px-6 py-6 space-y-3">
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-medium text-muted-foreground">
							Interval Detail —{" "}
							{selectedDay
								? format(parseISO(selectedDay.date), "MMM d, yyyy")
								: format(new Date(), "MMM d, yyyy")}
							{isToday && <span className="text-muted-foreground/60 ml-1">(last 24h)</span>}
						</h3>
						<span className="text-[10px] font-mono text-muted-foreground">
							{definition.dataInterval} intervals
						</span>
					</div>
					{NEM_REGIONS.map((region) => {
						const bitmap = getRegionBitmap(region)
						if (!bitmap) return null
						return (
							<IntervalBar
								key={region}
								bitmap={bitmap}
								dataInterval={definition.dataInterval as "5m" | "30m"}
								label={region}
								startHourAest={isToday ? todayStartHourAest : 0}
								showGrace={isToday}
							/>
						)
					})}
				</div>
			)}

			{/* Per-region bars */}
			<div className="bg-card border-b px-6 py-6 space-y-4">
				<h3 className="text-xs font-medium text-muted-foreground">Per-Region History</h3>
				{NEM_REGIONS.map((region) => {
					const rd = regionDays(days, region)
					const rUptime = uptimePercent(rd)
					return (
						<div key={region}>
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs font-mono font-medium">{region}</span>
								<span className="text-[10px] font-mono text-muted-foreground stat-value">
									{formatUptime(rUptime)}
								</span>
							</div>
							<UptimeBars days={rd} />
						</div>
					)
				})}
				<div className="flex justify-between mt-1">
					<span className="text-[10px] text-muted-foreground font-mono">
						{formatShortDate(
							(() => {
								const d = new Date()
								d.setDate(d.getDate() - (HISTORY_DAYS - 1))
								return d
							})(),
						)}
					</span>
					<span className="text-[10px] text-muted-foreground font-mono">
						{formatShortDate(new Date())}
					</span>
				</div>
			</div>

			{/* Region table */}
			<div className="border-b bg-card">
				{isLoading ? (
					<div className="p-6 space-y-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={`sk-${i}`} className="h-8 w-full" />
						))}
					</div>
				) : series ? (
					<RegionTable regions={series.regions} />
				) : (
					<div className="p-6 text-sm text-muted-foreground">No data available</div>
				)}
			</div>
		</>
	)
}
