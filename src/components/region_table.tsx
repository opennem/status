import type { RegionStatus } from "@/types/status"
import { HealthDot } from "./health_dot"

interface RegionTableProps {
	regions: RegionStatus[]
}

function formatLag(minutes: number): string {
	if (minutes < 0) return "—"
	if (minutes < 60) return `${minutes}m`
	const h = Math.floor(minutes / 60)
	const m = minutes % 60
	return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function RegionTable({ regions }: RegionTableProps) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b text-left">
						<th className="px-4 py-2 text-xs font-medium text-muted-foreground">Region</th>
						<th className="px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
						<th className="px-4 py-2 text-xs font-medium text-muted-foreground text-right">
							Coverage
						</th>
						<th className="px-4 py-2 text-xs font-medium text-muted-foreground text-right">Lag</th>
					</tr>
				</thead>
				<tbody>
					{regions.map((r) => (
						<tr
							key={r.region}
							className="border-b last:border-0 transition-colors hover:bg-muted/50"
						>
							<td className="px-4 py-2.5 font-mono font-medium">{r.region}</td>
							<td className="px-4 py-2.5">
								<HealthDot status={r.status} />
							</td>
							<td className="px-4 py-2.5 text-right font-mono stat-value">{r.coverage}%</td>
							<td className="px-4 py-2.5 text-right font-mono stat-value text-muted-foreground">
								{formatLag(r.lagMinutes)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
