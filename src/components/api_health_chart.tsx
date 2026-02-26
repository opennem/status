import { Skeleton } from "@/components/ui/skeleton"
import type { ApiHealthCheck } from "@/types/status"
import { useMemo, useState } from "react"

const CHART_W = 800
const CHART_H = 120
const DOT_ROW_H = 16
const PAD = { top: 8, right: 8, bottom: 4, left: 40 }

const INNER_W = CHART_W - PAD.left - PAD.right
const INNER_H = CHART_H - PAD.top - PAD.bottom

function latencyColor(ms: number) {
	if (ms < 500) return "var(--color-emerald-500, #10b981)"
	if (ms < 2000) return "var(--color-amber-500, #f59e0b)"
	return "var(--color-red-500, #ef4444)"
}

interface Props {
	checks: ApiHealthCheck[]
	isLoading: boolean
}

export function ApiHealthChart({ checks, isLoading }: Props) {
	const [hoverIdx, setHoverIdx] = useState<number | null>(null)

	// Filter to last 24h
	const recent = useMemo(() => {
		const cutoff = Date.now() - 24 * 60 * 60 * 1000
		return checks.filter((c) => new Date(c.t).getTime() >= cutoff)
	}, [checks])

	const maxLatency = useMemo(() => {
		if (recent.length === 0) return 1000
		return Math.max(...recent.map((c) => c.latencyMs), 200)
	}, [recent])

	const uptimePct = useMemo(() => {
		if (checks.length === 0) return 100
		const ok = checks.filter((c) => c.ok).length
		return Number(((ok / checks.length) * 100).toFixed(2))
	}, [checks])

	const currentLatency = recent.length > 0 ? (recent[recent.length - 1]?.latencyMs ?? null) : null

	if (isLoading) {
		return (
			<div className="space-y-3">
				<div className="flex items-center gap-4">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-4 w-20" />
				</div>
				<Skeleton className="h-[140px] w-full" />
			</div>
		)
	}

	if (recent.length === 0) {
		return <p className="text-sm text-muted-foreground">No health check data yet.</p>
	}

	// Build SVG path for latency sparkline
	const points = recent.map((c, i) => {
		const x = PAD.left + (i / (recent.length - 1 || 1)) * INNER_W
		const y = PAD.top + INNER_H - (c.latencyMs / maxLatency) * INNER_H
		return { x, y, check: c }
	})

	const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
	// Safe: we return early above if recent.length === 0, so points is non-empty
	// biome-ignore lint/style/noNonNullAssertion: guarded by early return
	const lastPt = points[points.length - 1]!
	// biome-ignore lint/style/noNonNullAssertion: guarded by early return
	const firstPt = points[0]!
	const areaPath = `${linePath} L${lastPt.x},${PAD.top + INNER_H} L${firstPt.x},${PAD.top + INNER_H} Z`

	// Y-axis ticks
	const yTicks = [0, Math.round(maxLatency / 2), Math.round(maxLatency)]

	const hovered = hoverIdx !== null ? points[hoverIdx] : null

	return (
		<div className="space-y-3">
			{/* Stats row */}
			<div className="flex items-center gap-6 text-sm">
				{currentLatency !== null && (
					<span className="font-mono">
						<span className="text-muted-foreground">Latency: </span>
						<span style={{ color: latencyColor(currentLatency) }}>{currentLatency}ms</span>
					</span>
				)}
				<span className="font-mono">
					<span className="text-muted-foreground">Uptime: </span>
					<span
						className={
							uptimePct >= 99.9
								? "text-emerald-500"
								: uptimePct >= 99
									? "text-amber-500"
									: "text-red-500"
						}
					>
						{uptimePct}%
					</span>
				</span>
				<span className="text-muted-foreground font-mono text-xs">{checks.length} checks</span>
			</div>

			{/* SVG chart */}
			<svg
				viewBox={`0 0 ${CHART_W} ${CHART_H + DOT_ROW_H}`}
				className="w-full"
				role="img"
				aria-label="API health latency chart"
				onMouseLeave={() => setHoverIdx(null)}
			>
				{/* Y-axis labels */}
				{yTicks.map((tick) => {
					const y = PAD.top + INNER_H - (tick / maxLatency) * INNER_H
					return (
						<g key={tick}>
							<text
								x={PAD.left - 4}
								y={y + 3}
								textAnchor="end"
								className="fill-muted-foreground text-[9px]"
							>
								{tick}
							</text>
							<line
								x1={PAD.left}
								x2={CHART_W - PAD.right}
								y1={y}
								y2={y}
								stroke="currentColor"
								strokeOpacity={0.08}
							/>
						</g>
					)
				})}

				{/* Area fill */}
				<path d={areaPath} fill="url(#healthGrad)" opacity={0.15} />

				{/* Line */}
				<path
					d={linePath}
					fill="none"
					stroke="var(--color-emerald-500, #10b981)"
					strokeWidth={1.5}
				/>

				{/* Gradient def */}
				<defs>
					<linearGradient id="healthGrad" x1="0" x2="0" y1="0" y2="1">
						<stop offset="0%" stopColor="var(--color-emerald-500, #10b981)" />
						<stop offset="100%" stopColor="var(--color-emerald-500, #10b981)" stopOpacity={0} />
					</linearGradient>
				</defs>

				{/* Uptime dots */}
				{points.map((p, i) => (
					<rect
						key={`dot-${recent[i]?.t}`}
						x={p.x - INNER_W / recent.length / 2}
						y={CHART_H + 2}
						width={Math.max(INNER_W / recent.length - 0.5, 1)}
						height={DOT_ROW_H - 4}
						rx={1}
						fill={
							p.check.ok ? "var(--color-emerald-500, #10b981)" : "var(--color-red-500, #ef4444)"
						}
						opacity={p.check.ok ? 0.6 : 1}
					/>
				))}

				{/* Hover overlay — invisible rects for mouse tracking */}
				{points.map((p, i) => (
					<rect
						key={`hover-${recent[i]?.t}`}
						x={i === 0 ? PAD.left : ((points[i - 1]?.x ?? 0) + p.x) / 2}
						y={0}
						width={
							i === 0 || i === points.length - 1
								? INNER_W / recent.length
								: ((points[Math.min(i + 1, points.length - 1)]?.x ?? 0) -
										(points[Math.max(i - 1, 0)]?.x ?? 0)) /
									2
						}
						height={CHART_H + DOT_ROW_H}
						fill="transparent"
						onMouseEnter={() => setHoverIdx(i)}
					/>
				))}

				{/* Hover indicator */}
				{hovered && (
					<g>
						<line
							x1={hovered.x}
							x2={hovered.x}
							y1={PAD.top}
							y2={PAD.top + INNER_H}
							stroke="currentColor"
							strokeOpacity={0.2}
							strokeDasharray="2,2"
						/>
						<circle
							cx={hovered.x}
							cy={hovered.y}
							r={3}
							fill={latencyColor(hovered.check.latencyMs)}
						/>
						<rect
							x={Math.min(hovered.x + 8, CHART_W - 140)}
							y={Math.max(hovered.y - 28, 2)}
							width={130}
							height={24}
							rx={4}
							className="fill-popover stroke-border"
							strokeWidth={0.5}
						/>
						<text
							x={Math.min(hovered.x + 14, CHART_W - 134)}
							y={Math.max(hovered.y - 12, 18)}
							className="fill-foreground text-[9px]"
						>
							{new Date(hovered.check.t).toLocaleTimeString()} — {hovered.check.latencyMs}ms
						</text>
					</g>
				)}
			</svg>
		</div>
	)
}
