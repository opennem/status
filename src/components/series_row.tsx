import { UptimeBars } from "@/components/uptime_bars"
import { SERIES_DEFINITIONS } from "@/lib/constants"
import { formatUptime, uptimePercent } from "@/lib/uptime"
import type { HistoryDay, SeriesStatus } from "@/types/status"
import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { HealthDot } from "./health_dot"

interface SeriesRowProps {
	series: SeriesStatus
	days: HistoryDay[]
}

export function SeriesRow({ series, days }: SeriesRowProps) {
	const uptime = uptimePercent(days)
	const name = SERIES_DEFINITIONS.find((d) => d.id === series.id)?.name ?? series.id

	return (
		<Link to={`/${series.id}`} className="block px-6 py-4 transition-colors hover:bg-muted/50">
			<div className="flex items-center gap-3 mb-2">
				<HealthDot status={series.status} size="md" pulse={series.status === "operational"} />
				<span className="flex-1 text-sm font-medium">{name}</span>
				<span className="text-xs font-mono text-muted-foreground stat-value">
					{formatUptime(uptime)}
				</span>
				<ChevronRight className="h-4 w-4 text-muted-foreground/50" />
			</div>
			<UptimeBars days={days} />
		</Link>
	)
}
