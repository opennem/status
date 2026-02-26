import { Skeleton } from "@/components/ui/skeleton"
import { computeOverallStatus } from "@/lib/compute"
import type { SeriesStatus } from "@/types/status"
import { formatDistanceToNowStrict } from "date-fns"
import { HealthDot } from "./health_dot"

const OVERALL_LABELS = {
	operational: "All Systems Operational",
	degraded: "Some Systems Degraded",
	down: "Major Outage Detected",
} as const

interface StatusHeaderProps {
	series: SeriesStatus[] | undefined
	checkedAt: string | undefined
	isLoading: boolean
}

export function StatusHeader({ series, checkedAt, isLoading }: StatusHeaderProps) {
	const overall = series ? computeOverallStatus(series) : "operational"
	const updatedStr = checkedAt
		? formatDistanceToNowStrict(new Date(checkedAt), { addSuffix: true })
		: null

	return (
		<div className="border-b bg-card px-6 py-8">
			<h1 className="text-2xl font-display">OpenElectricity Status</h1>
			{isLoading ? (
				<Skeleton className="mt-2 h-5 w-64" />
			) : (
				<div className="flex items-center gap-2 mt-2">
					<HealthDot status={overall} size="md" pulse={overall === "operational"} />
					<span className="text-sm font-medium">{OVERALL_LABELS[overall]}</span>
					{updatedStr && (
						<span className="text-xs text-muted-foreground ml-auto font-mono">
							Updated {updatedStr}
						</span>
					)}
				</div>
			)}
		</div>
	)
}
