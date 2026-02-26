import type { HistoryDay } from "@/types/status"
import { format, parseISO } from "date-fns"

interface DayTooltipProps {
	day: HistoryDay
	x: number
	y: number
}

export function DayTooltip({ day, x, y }: DayTooltipProps) {
	const date = format(parseISO(day.date), "MMM d, yyyy")
	const total = day.checks

	return (
		<div
			className="fixed z-50 pointer-events-none rounded-md border bg-popover px-3 py-2 text-xs shadow-md"
			style={{ left: x, top: y - 48 }}
		>
			<p className="font-medium">{date}</p>
			<p className="text-muted-foreground mt-0.5">
				{day.ok}/{total} checks OK
			</p>
		</div>
	)
}
