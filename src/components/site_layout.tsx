import { Github, Home, LayoutDashboard, LineChart } from "lucide-react"
import { Link, Outlet } from "react-router-dom"
import { OeIcon } from "./oe_icon"

export function SiteLayout() {
	return (
		<div className="min-h-screen bg-background flex flex-col">
			{/* Header */}
			<header className="border-b bg-card">
				<div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
					<Link
						to="/"
						className="flex items-center gap-2 text-sm font-display font-medium hover:text-foreground/80"
					>
						<OeIcon className="h-5 w-5" />
						Open Electricity Status
					</Link>
					<nav className="flex items-center gap-4">
						<Link
							to="/"
							className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
						>
							<Home className="h-3.5 w-3.5" />
							Home
						</Link>
						<a
							href="https://explore.openelectricity.org.au/"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
						>
							<LineChart className="h-3.5 w-3.5" />
							Tracker
						</a>
						<a
							href="https://platform.openelectricity.org.au/"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
						>
							<LayoutDashboard className="h-3.5 w-3.5" />
							Platform
						</a>
					</nav>
				</div>
			</header>

			{/* Content */}
			<main className="flex-1">
				<div className="mx-auto max-w-5xl">
					<Outlet />
				</div>
			</main>

			{/* Footer */}
			<footer className="border-t bg-card">
				<div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
					<span className="text-[10px] text-muted-foreground font-mono">
						Powered by Open Electricity
					</span>
					<a
						href="https://github.com/opennem/status"
						target="_blank"
						rel="noopener noreferrer"
						className="text-muted-foreground hover:text-foreground"
					>
						<Github className="h-4 w-4" />
					</a>
				</div>
			</footer>
		</div>
	)
}
