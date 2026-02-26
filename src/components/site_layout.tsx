import { Link, Outlet, useLocation } from "react-router-dom"

export function SiteLayout() {
	const location = useLocation()
	const isHome = location.pathname === "/"

	return (
		<div className="min-h-screen bg-background flex flex-col">
			{/* Header */}
			<header className="border-b bg-card">
				<div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
					<Link to="/" className="text-sm font-display font-medium hover:text-foreground/80">
						OpenElectricity Status
					</Link>
					{!isHome && (
						<Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
							All Systems
						</Link>
					)}
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
						Powered by OpenElectricity API
					</span>
					<a
						href="https://api.openelectricity.org.au"
						target="_blank"
						rel="noopener noreferrer"
						className="text-[10px] text-muted-foreground hover:text-foreground font-mono"
					>
						api.openelectricity.org.au
					</a>
				</div>
			</footer>
		</div>
	)
}
