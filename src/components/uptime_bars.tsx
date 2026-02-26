import { DayTooltip } from "@/components/day_tooltip"
import { HISTORY_DAYS } from "@/lib/constants"
import { dayStatus, formatShortDate } from "@/lib/uptime"
import { cn } from "@/lib/utils"
import type { HistoryDay } from "@/types/status"
import { useCallback, useRef, useState } from "react"

const STATUS_COLORS = {
	operational: "bg-emerald-500",
	degraded: "bg-amber-500",
	down: "bg-red-500",
	empty: "bg-red-500",
} as const

interface UptimeBarsProps {
	days: HistoryDay[]
	showLabels?: boolean
	selectedDate?: string | null
	onDayClick?: (day: HistoryDay) => void
}

export function UptimeBars({
	days,
	showLabels = false,
	selectedDate,
	onDayClick,
}: UptimeBarsProps) {
	const [hovered, setHovered] = useState<{ day: HistoryDay; x: number; y: number } | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	// Pad or slice to exactly HISTORY_DAYS slots (oldest first)
	const slots: (HistoryDay | null)[] = []
	for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
		const d = new Date()
		d.setDate(d.getDate() - i)
		const dateStr = d.toISOString().slice(0, 10)
		const found = days.find((day) => day.date === dateStr)
		slots.push(found ?? null)
	}

	const handleMouseEnter = useCallback((day: HistoryDay, e: React.MouseEvent) => {
		const rect = (e.target as HTMLElement).getBoundingClientRect()
		setHovered({ day, x: rect.left + rect.width / 2, y: rect.top })
	}, [])

	const handleMouseLeave = useCallback(() => setHovered(null), [])

	return (
		<div>
			<div ref={containerRef} className="flex gap-px h-8">
				{slots.map((slot, i) => {
					const key = slot?.date ?? `empty-${i}`
					const color = slot ? STATUS_COLORS[dayStatus(slot)] : STATUS_COLORS.empty

					const isSelected = slot && selectedDate === slot.date

					return (
						<div
							key={key}
							role={slot && onDayClick ? "button" : undefined}
							tabIndex={slot && onDayClick ? 0 : undefined}
							className={cn(
								"flex-1 min-w-0 rounded-[1px] transition-opacity",
								color,
								onDayClick && slot && "cursor-pointer hover:opacity-80",
								isSelected && "ring-2 ring-foreground ring-offset-1 ring-offset-background",
							)}
							onMouseEnter={slot ? (e) => handleMouseEnter(slot, e) : undefined}
							onMouseLeave={handleMouseLeave}
							onClick={slot && onDayClick ? () => onDayClick(slot) : undefined}
							onKeyDown={
								slot && onDayClick
									? (e) => {
											if (e.key === "Enter" || e.key === " ") onDayClick(slot)
										}
									: undefined
							}
						/>
					)
				})}
			</div>
			{showLabels && (
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
			)}
			{hovered && <DayTooltip day={hovered.day} x={hovered.x} y={hovered.y} />}
		</div>
	)
}
