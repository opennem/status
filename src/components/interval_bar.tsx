import { parseIntervals } from "@/lib/uptime"
import { cn } from "@/lib/utils"
import { useCallback, useRef, useState } from "react"

interface IntervalBarProps {
	/** Bitmap string of "1"/"0" — length 288 (5m) or 48 (30m) */
	bitmap: string
	/** Data interval for label rendering */
	dataInterval?: "5m" | "30m"
	/** Region label shown to the left */
	label?: string
	/** AEST start hour of the window (0 for midnight-based, e.g. 15.67 for 15:40) */
	startHourAest?: number
}

/** Format hour offset to HH label, wrapping at 24 */
function formatHourLabel(hour: number): string {
	return String(Math.floor(((hour % 24) + 24) % 24)).padStart(2, "0")
}

function intervalToTime(index: number, is30m: boolean, startHourAest: number): string {
	const minutesPerInterval = is30m ? 30 : 5
	const startMinutes = Math.round(startHourAest * 60)
	const totalMinutes = startMinutes + index * minutesPerInterval
	const wrapped = ((totalMinutes % 1440) + 1440) % 1440
	const h = String(Math.floor(wrapped / 60)).padStart(2, "0")
	const m = String(wrapped % 60).padStart(2, "0")
	return `${h}:${m}`
}

function buildHourLabels(startHourAest: number): string[] {
	const base = Math.ceil(startHourAest / 6) * 6
	return [0, 6, 12, 18].map((offset) => formatHourLabel(base + offset))
}

export function IntervalBar({
	bitmap,
	dataInterval = "5m",
	label,
	startHourAest = 0,
}: IntervalBarProps) {
	const intervals = parseIntervals(bitmap)
	const is30m = dataInterval === "30m"
	const intervalsPerHour = is30m ? 2 : 12
	const containerRef = useRef<HTMLDivElement>(null)
	const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

	const hourLabels = buildHourLabels(startHourAest)
	const endLabel = formatHourLabel(startHourAest + 24)

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			const container = containerRef.current
			if (!container) return
			const rect = container.getBoundingClientRect()
			const x = e.clientX - rect.left
			const idx = Math.floor((x / rect.width) * intervals.length)
			if (idx < 0 || idx >= intervals.length) {
				setTooltip(null)
				return
			}
			const time = intervalToTime(idx, is30m, startHourAest)
			const status = intervals[idx] ? "Present" : "Missing"
			setTooltip({
				text: `${time} — ${status}`,
				x: e.clientX,
				y: rect.top,
			})
		},
		[intervals, is30m, startHourAest],
	)

	const handleMouseLeave = useCallback(() => setTooltip(null), [])

	// Build cells grouped by hour for subtle dividers
	const cells: React.ReactNode[] = []
	for (let i = 0; i < intervals.length; i++) {
		const isHourBoundary = i > 0 && i % intervalsPerHour === 0
		cells.push(
			<div
				key={i}
				className={cn(
					"flex-1 min-w-0",
					intervals[i] ? "bg-emerald-500" : "bg-muted-foreground/15",
					isHourBoundary && "ml-px",
				)}
			/>,
		)
	}

	return (
		<div>
			{label && (
				<span className="text-xs font-mono font-medium text-muted-foreground mb-0.5 block">
					{label}
				</span>
			)}
			<div
				ref={containerRef}
				className="flex h-5 rounded-sm overflow-hidden cursor-crosshair"
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
			>
				{cells}
			</div>
			{/* Hour labels */}
			<div className="flex justify-between mt-0.5 px-0">
				{hourLabels.map((h, i) => (
					<span key={`${h}-${i}`} className="text-[9px] font-mono text-muted-foreground/60">
						{h}
					</span>
				))}
				<span className="text-[9px] font-mono text-muted-foreground/60">{endLabel}</span>
			</div>
			{tooltip && (
				<div
					className="fixed z-50 pointer-events-none rounded-md border bg-popover px-2 py-1 text-xs shadow-md"
					style={{ left: tooltip.x, top: tooltip.y - 32, transform: "translateX(-50%)" }}
				>
					{tooltip.text}
				</div>
			)}
		</div>
	)
}
