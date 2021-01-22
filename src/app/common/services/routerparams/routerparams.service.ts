import { Injectable } from '@angular/core'
import {
	ActivatedRouteSnapshot,
	convertToParamMap,
	Event as RouterEvent,
	NavigationEnd,
	ParamMap,
	Params,
	Router,
} from '@angular/router'
import { isEqual } from 'lodash-es'
import { BehaviorSubject, Observable } from 'rxjs'
import { filter, map, withLatestFrom } from 'rxjs/operators'

@Injectable({
	providedIn: 'root',
})
export class RouterParamsService {
	private params$: BehaviorSubject<Params> = new BehaviorSubject({})
	private map$: BehaviorSubject<ParamMap>
	private url$: BehaviorSubject<string[]> = new BehaviorSubject([])

	private _paramsSnapshot: Params = {}
	private _mapSnapShot: ParamMap

	constructor(private router: Router) {
		this._mapSnapShot = convertToParamMap(this._paramsSnapshot)
		this.map$ = new BehaviorSubject(this._mapSnapShot)

		this.primeSubscriptions()
	}

	get map(): BehaviorSubject<ParamMap> {
		return this.map$
	}

	get all(): BehaviorSubject<Params> {
		return this.params$
	}

	get snapshot(): Params {
		return this._paramsSnapshot
	}

	get events(): Observable<RouterEvent> {
		// return this.router.events.pipe( filter(event => event instanceof NavigationEnd))
		return this.router.events
	}

	/**
	 * @todo
	 * refactor this shit to make sure the upto is matched, not just on
	 * the first touch
	 * @param key
	 * @param upto
	 */
	public matcher(
		key: string | string[],
		upto?: string | string[],
	): Observable<[string[], string[]]> {
		const mapit = (list: string[]): [string[], string[]] => {
			const normalized = list.map((item) => decodeURIComponent(item))
			const match = upto ? (Array.isArray(upto) ? upto : upto.split('/')) : []
			let index: number = list.length
			let matched: string = null

			if (match.length) {
				list.forEach((seg, idx) => {
					if (matched) return

					if (match.some((item) => item === seg)) {
						index = idx
						matched = seg
					}
				})
			}

			const keys = Array.isArray(key) ? key : key.split('/')
			const sliced = normalized.slice(list.indexOf(keys[keys.length - 1]) + 1, index)
			return [sliced, [matched]]
		}

		const includes = (list: string[]): boolean => {
			let matches: boolean = false
			const keys = Array.isArray(key) ? key : key.split('/')

			list.forEach((item, index) => {
				if (matches) return

				keys.forEach((inkey, idx) => {
					if (idx > 0 && !matches) return
					matches = list[index + idx] === inkey
				})
			})

			return matches
		}

		return this.url$.pipe(
			filter((list) => includes(list)),
			map((list) => mapit(list)),
		)
	}

	private primeSubscriptions(): void {
		this.events
			.pipe(
				filter((event: RouterEvent) => event instanceof NavigationEnd),
				withLatestFrom(this.params$),
				map(([router, current]) => {
					const event: NavigationEnd = router as NavigationEnd
					const root: ActivatedRouteSnapshot = this.router.routerState.snapshot.root
					this.url$.next(event.url.split('/'))
					return this.getParams(root)
				}),
				filter((params) => {
					const equals = isEqual(this._paramsSnapshot, params)
					return !equals
				}),
			)
			.subscribe((params) => this.updateState(params))
	}

	private updateState(params: Params): void {
		this._paramsSnapshot = params
		this._mapSnapShot = convertToParamMap(this._paramsSnapshot)

		this.updateSubjects(this._paramsSnapshot)
	}

	private updateSubjects(params: Params): void {
		this.params$.next(params)
		this.map.next(convertToParamMap(params))
	}

	private getParams(root: ActivatedRouteSnapshot): Params {
		let params: Params = {}

		const snap = (snapshot: ActivatedRouteSnapshot) => {
			params = { ...params, ...snapshot.params }
			snapshot.children.forEach((child) => snap(child))
		}

		snap(root)

		return params
	}
}
