import { cn } from "@/lib/utils"
import type { HealthStatus } from "@/types/status"

const STATUS_COLORS: Record<HealthStatus, string> = {
	operational: "bg-emerald-500",
	degraded: "bg-amber-500",
	down: "bg-red-500",
}

interface HealthDotProps {
	status: HealthStatus
	size?: "sm" | "md"
	pulse?: boolean
	className?: string
}

export function HealthDot({ status, size = "sm", pulse, className }: HealthDotProps) {
	return (
		<span
			className={cn(
				"inline-block rounded-full",
				STATUS_COLORS[status],
				size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
				pulse && status === "operational" && "pulse-live",
				className,
			)}
		/>
	)
}
