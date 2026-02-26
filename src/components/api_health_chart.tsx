import { Skeleton } from "@/components/ui/skeleton"
import type { ApiHealthCheck } from "@/types/status"
import { useMemo, useState } from "react"

const CHART_W = 800
const CHART_H = 120
const DOT_ROW_H = 16
const PAD = { top: 8, right: 48, bottom: 4, left: 40 }

const INNER_W = CHART_W - PAD.left - PAD.right
const INNER_H = CHART_H - PAD.top - PAD.bottom

const HEALTH_COLOR = "var(--color-emerald-500, #10b981)"
const DATA_COLOR = "var(--color-indigo-500, #6366f1)"

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

	const hasDataLatency = useMemo(() => recent.some((c) => c.dataLatencyMs > 0), [recent])

	const maxHealthLatency = useMemo(() => {
		if (recent.length === 0) return 1000
		return Math.max(...recent.map((c) => c.latencyMs), 200)
	}, [recent])

	const maxDataLatency = useMemo(() => {
		if (recent.length === 0 || !hasDataLatency) return 1000
		return Math.max(...recent.map((c) => c.dataLatencyMs || 0), 500)
	}, [recent, hasDataLatency])

	const uptimePct = useMemo(() => {
		if (checks.length === 0) return 100
		const ok = checks.filter((c) => c.ok).length
		return Number(((ok / checks.length) * 100).toFixed(2))
	}, [checks])

	const currentHealth = recent.length > 0 ? (recent[recent.length - 1]?.latencyMs ?? null) : null
	const currentData = recent.length > 0 ? (recent[recent.length - 1]?.dataLatencyMs ?? null) : null

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

	// Build SVG points for health latency (left Y axis)
	const healthPoints = recent.map((c, i) => {
		const x = PAD.left + (i / (recent.length - 1 || 1)) * INNER_W
		const y = PAD.top + INNER_H - (c.latencyMs / maxHealthLatency) * INNER_H
		return { x, y, check: c }
	})

	// Build SVG points for data latency (right Y axis)
	const dataPoints = hasDataLatency
		? recent.map((c, i) => {
				const x = PAD.left + (i / (recent.length - 1 || 1)) * INNER_W
				const y = PAD.top + INNER_H - ((c.dataLatencyMs || 0) / maxDataLatency) * INNER_H
				return { x, y }
			})
		: []

	const healthPath = healthPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
	const dataPath =
		dataPoints.length > 0
			? dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
			: ""

	// biome-ignore lint/style/noNonNullAssertion: guarded by early return
	const lastPt = healthPoints[healthPoints.length - 1]!
	// biome-ignore lint/style/noNonNullAssertion: guarded by early return
	const firstPt = healthPoints[0]!
	const healthAreaPath = `${healthPath} L${lastPt.x},${PAD.top + INNER_H} L${firstPt.x},${PAD.top + INNER_H} Z`

	// Left Y-axis ticks (health)
	const healthTicks = [0, Math.round(maxHealthLatency / 2), Math.round(maxHealthLatency)]
	// Right Y-axis ticks (data)
	const dataTicks = hasDataLatency
		? [0, Math.round(maxDataLatency / 2), Math.round(maxDataLatency)]
		: []

	const hovered = hoverIdx !== null ? healthPoints[hoverIdx] : null
	const hoveredData = hoverIdx !== null && dataPoints.length > 0 ? dataPoints[hoverIdx] : null

	return (
		<div className="space-y-3">
			{/* Stats row */}
			<div className="flex items-center gap-6 text-sm">
				{currentHealth !== null && (
					<span className="font-mono">
						<span
							className="inline-block size-2 rounded-full mr-1"
							style={{ backgroundColor: HEALTH_COLOR }}
						/>
						<span className="text-muted-foreground">Health: </span>
						<span style={{ color: latencyColor(currentHealth) }}>{currentHealth}ms</span>
					</span>
				)}
				{hasDataLatency && currentData !== null && currentData > 0 && (
					<span className="font-mono">
						<span
							className="inline-block size-2 rounded-full mr-1"
							style={{ backgroundColor: DATA_COLOR }}
						/>
						<span className="text-muted-foreground">Data: </span>
						<span style={{ color: DATA_COLOR }}>{currentData}ms</span>
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
				{/* Left Y-axis labels (health) */}
				{healthTicks.map((tick) => {
					const y = PAD.top + INNER_H - (tick / maxHealthLatency) * INNER_H
					return (
						<g key={`h-${tick}`}>
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

				{/* Right Y-axis labels (data) */}
				{dataTicks.map((tick) => {
					const y = PAD.top + INNER_H - (tick / maxDataLatency) * INNER_H
					return (
						<text
							key={`d-${tick}`}
							x={CHART_W - PAD.right + 4}
							y={y + 3}
							textAnchor="start"
							style={{ fill: DATA_COLOR }}
							className="text-[9px]"
							opacity={0.7}
						>
							{tick}
						</text>
					)
				})}

				{/* Health area fill */}
				<path d={healthAreaPath} fill="url(#healthGrad)" opacity={0.15} />

				{/* Health line */}
				<path d={healthPath} fill="none" stroke={HEALTH_COLOR} strokeWidth={1.5} />

				{/* Data latency line */}
				{dataPath && (
					<path
						d={dataPath}
						fill="none"
						stroke={DATA_COLOR}
						strokeWidth={1.5}
						strokeOpacity={0.7}
					/>
				)}

				{/* Gradient defs */}
				<defs>
					<linearGradient id="healthGrad" x1="0" x2="0" y1="0" y2="1">
						<stop offset="0%" stopColor={HEALTH_COLOR} />
						<stop offset="100%" stopColor={HEALTH_COLOR} stopOpacity={0} />
					</linearGradient>
				</defs>

				{/* Uptime dots */}
				{healthPoints.map((p, i) => (
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
				{healthPoints.map((p, i) => (
					<rect
						key={`hover-${recent[i]?.t}`}
						x={i === 0 ? PAD.left : ((healthPoints[i - 1]?.x ?? 0) + p.x) / 2}
						y={0}
						width={
							i === 0 || i === healthPoints.length - 1
								? INNER_W / recent.length
								: ((healthPoints[Math.min(i + 1, healthPoints.length - 1)]?.x ?? 0) -
										(healthPoints[Math.max(i - 1, 0)]?.x ?? 0)) /
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
						{/* Health dot */}
						<circle
							cx={hovered.x}
							cy={hovered.y}
							r={3}
							fill={latencyColor(hovered.check.latencyMs)}
						/>
						{/* Data dot */}
						{hoveredData && (
							<circle cx={hoveredData.x} cy={hoveredData.y} r={3} fill={DATA_COLOR} />
						)}
						{/* Tooltip */}
						<rect
							x={Math.min(hovered.x + 8, CHART_W - 180)}
							y={Math.max(hovered.y - 36, 2)}
							width={170}
							height={hovered.check.dataLatencyMs > 0 ? 34 : 24}
							rx={4}
							className="fill-popover stroke-border"
							strokeWidth={0.5}
						/>
						<text
							x={Math.min(hovered.x + 14, CHART_W - 174)}
							y={Math.max(hovered.y - 20, 16)}
							className="fill-foreground text-[9px]"
						>
							{new Date(hovered.check.t).toLocaleTimeString()} — Health: {hovered.check.latencyMs}ms
						</text>
						{hovered.check.dataLatencyMs > 0 && (
							<text
								x={Math.min(hovered.x + 14, CHART_W - 174)}
								y={Math.max(hovered.y - 8, 28)}
								style={{ fill: DATA_COLOR }}
								className="text-[9px]"
							>
								Data: {hovered.check.dataLatencyMs}ms
							</text>
						)}
					</g>
				)}
			</svg>
		</div>
	)
}
