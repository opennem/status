import { Home } from "lucide-react"
import { Link } from "react-router-dom"

export function NotFoundPage() {
	return (
		<div className="flex flex-col items-center justify-center py-24 px-6 text-center">
			<h1 className="text-6xl font-bold font-mono text-muted-foreground/40">404</h1>
			<p className="mt-3 text-sm text-muted-foreground">Page not found</p>
			<Link
				to="/"
				className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
			>
				<Home className="h-3.5 w-3.5" />
				Back to status
			</Link>
		</div>
	)
}
