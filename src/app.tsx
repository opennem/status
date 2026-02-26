import { SiteLayout } from "@/components/site_layout"
import { OverviewPage } from "@/pages/overview"
import { SeriesDetailPage } from "@/pages/series_detail"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes } from "react-router-dom"

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
})

export function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<Routes>
					<Route element={<SiteLayout />}>
						<Route path="/" element={<OverviewPage />} />
						<Route path="/:seriesId" element={<SeriesDetailPage />} />
					</Route>
				</Routes>
			</BrowserRouter>
		</QueryClientProvider>
	)
}
