import { NgModule } from '@angular/core'
import { RouterModule, Routes, UrlSegment } from '@angular/router'

import { NgqViewComponent } from './routing/ngq-view/ngq-view.component'
import { NgqPlanningComponent } from './views/planning/components/ngq-planning/ngq-planning.component'
import { NgqLongtermComponent } from './views/longterm/components/ngq-longterm/ngq-longterm.component'

const routes: Routes = [
	{
		path: '',
		component: NgqViewComponent,
	},
	{
		component: NgqViewComponent,
		matcher: (urls: UrlSegment[]) => {
			if (urls.length) {
				const isview = urls[0].path === 'view'
				if (!isview) return null
				const views = []
				let values = []
				const consumed = {
					consumed: urls,
					posParams: urls
						.filter((s, i) => i > 0)
						.reduce((ori, cur, i) => {
							switch (cur.path) {
								case 'tiles':
								case 'person':
								case 'tl':
								case 'details':
									views.push(cur.path)
									values = []
									ori[`view-${views.length}`] = cur
									break
								default:
									values.push(cur.path)
									ori[`view-${views.length}-${values.length}`] = cur
									break
							}
							return ori
						}, {}),
				}

				return consumed
			}
			return null
		},
	},
	{
		path: 'planning',
		component: NgqPlanningComponent,
	},
	{
		path: 'longterm',
		component: NgqLongtermComponent,
	},

	// {
	// 	path: '**',
	// 	redirectTo: '/',
	// },
]

@NgModule({
	imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' })],
	exports: [RouterModule],
})
export class AppRoutingModule {}
