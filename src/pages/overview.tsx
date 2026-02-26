import { SeriesRow } from "@/components/series_row"
import { StatusHeader } from "@/components/status_header"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentStatus, useStatusHistory } from "@/hooks/use_status"
import { HISTORY_DAYS, SERIES_DEFINITIONS } from "@/lib/constants"
import { formatShortDate } from "@/lib/uptime"
import { AlertCircle } from "lucide-react"

export function OverviewPage() {
	const { data: current, isLoading: loadingCurrent, error: currentError } = useCurrentStatus()
	const { data: history, isLoading: loadingHistory } = useStatusHistory()

	const isLoading = loadingCurrent || loadingHistory
	const error = currentError

	return (
		<>
			<StatusHeader
				series={current?.series}
				checkedAt={current?.checkedAt}
				isLoading={loadingCurrent}
			/>

			<div className="border-b bg-card">
				{error ? (
					<div className="flex items-center gap-2 px-6 py-8 text-destructive">
						<AlertCircle className="h-4 w-4" />
						<span className="text-sm">
							Failed to fetch status: {error instanceof Error ? error.message : "Unknown error"}
						</span>
					</div>
				) : isLoading ? (
					<div className="divide-y">
						{Array.from({ length: 7 }).map((_, i) => (
							<div key={`sk-${i}`} className="px-6 py-4 space-y-2">
								<div className="flex items-center gap-3">
									<Skeleton className="h-2.5 w-2.5 rounded-full" />
									<Skeleton className="h-4 w-40" />
									<div className="flex-1" />
									<Skeleton className="h-3 w-20" />
								</div>
								<Skeleton className="h-8 w-full" />
							</div>
						))}
					</div>
				) : (
					<div className="divide-y">
						{SERIES_DEFINITIONS.map((def) => {
							const series = current?.series.find((s) => s.id === def.id)
							const days = history?.series[def.id] ?? []
							if (!series) return null
							return <SeriesRow key={def.id} series={series} days={days} />
						})}
					</div>
				)}
			</div>

			<div className="px-6 py-3">
				<div className="flex justify-between">
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
		</>
	)
}
