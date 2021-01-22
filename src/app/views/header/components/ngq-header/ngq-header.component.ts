import { filter, map, switchMap, takeUntil } from 'rxjs/operators'

import { Component, OnDestroy, OnInit } from '@angular/core'
import { MatDialog } from '@angular/material/dialog'
import { FadeInOutAnimation } from '@quebble/animations'
import { ExMap } from '@quebble/models'
import { OpenApi } from '@quebble/openapi'
import { asArray } from '@quebble/scripts'
import { NgqLoginDialogComponent } from 'app/dialogs/login-dialog/login-dialog.component'
import { combineLatest, Subject } from 'rxjs'

interface MenuItem {
	route: string[]
	view?: string
	operationId: string
	locked: boolean
	custom?: boolean
	tag?: string
	subs?: number
}

@Component({
	selector: 'ngq-header',
	animations: [...FadeInOutAnimation],
	templateUrl: './ngq-header.component.html',
	styleUrls: ['./ngq-header.component.scss'],
})
export class NgqHeaderComponent implements OnInit, OnDestroy {
	private _tags: string[] = [
		'providers',
		'provider',
		'organization',
		'persons',
		'person',
		'users',
		'user',
		'planning',
		'longterm',
	]

	public prefix: string = 'view'

	public menuItems: MenuItem[] = []
	public nodes: Map<string, MenuItem[]> = new Map()

	public current: string
	public active: string
	public loggedin: boolean = false

	private _provider: any
	private _nodematch: ExMap<string, string> = new ExMap()
	private _head: string
	private destroy$: Subject<void> = new Subject()

	constructor(private openapi: OpenApi.OpenApiService, private dialog: MatDialog) {}

	public ngOnInit(): void {
		this.primeSubscriptions()
	}

	public ngOnDestroy(): void {
		this.destroy$.next()
		this.destroy$.complete()
	}

	protected primeSubscriptions(): void {
		this.openapi.update
			.pipe(
				filter((state) => !!state),
				switchMap(() =>
					combineLatest([
						this.openapi.loggedin(),
						this.openapi.workspacestream,
						this.openapi.chunkgroup,
					]),
				),
				map((r) => {
					if (!r[1]) r[1] = { workspace: null }
					return r
				}),
				takeUntil(this.destroy$),
			)
			.subscribe(([state, { workspace }, group]) => {
				this.loggedin = state
				this.parsePaths(state, workspace).then(() => this.fullChunkRoute(group))
			})

		this.openapi.update
			.pipe(
				filter((state) => !!state),
				switchMap(() => this.openapi.chunkgroup),
				filter((group) => !!group),
				takeUntil(this.destroy$),
			)
			.subscribe((group) => this.fullChunkRoute(group))
	}

	private fullChunkRoute(group: OpenApi.ChunkGroup): void {
		if (!group?.chunks?.size) return
		const viewroute = group.current.viewroute
		const fullroute = [group.routecomp, group.component, ...viewroute].join('/')
		this.checkRoute(`/${fullroute}`)
	}

	private checkRoute(chunkRoute: string): void {
		if (chunkRoute && this._nodematch.size) {
			const [, current] = this._nodematch.find((tag, path) => {
				return chunkRoute.startsWith(path) || chunkRoute.endsWith(path)
			}) ?? [null, null]

			if (current) {
				if (this.nodes.get(current)?.length > 1) {
					this.current = this.active = current
				} else {
					this.current = undefined
					this.active = current
				}
			}
		}
	}

	/**
	 * @extends NgqHeader.menuItems
	 * @summary
	 * ADD CUSTOM MENUITEMS IN HERE
	 *
	 * Parameters:
	 * Route, TranslationString
	 *
	 * Usage:
	 * ServerTag: For grouping items under a single name, if more than one
	 * Route: The routerlink as an array
	 * TranslationString: Any (translatable) string. This is shown as text
	 *
	 * Note:
	 * Adding more items to a tag will attempt to find a translation. You
	 * can add these in the language file under "tag".
	 */
	private customMenuItems(): MenuItem[] {
		return [
			this.addCustomMenuItem('planning', ['/', 'planning'], 'Planning'),
			this.addCustomMenuItem('planning', ['/', 'longterm'], 'Langetermijn'),
		]
	}

	/**
	 * @summary
	 * Expand the menu items from the PathService with valid routes
	 *
	 * @param loggedIn user is logged in
	 * @param provider current environment
	 */
	private parsePaths(loggedIn?: boolean, provider?: any): Promise<boolean> {
		// const paths = loggedIn ? this.openapi.paths : this.openapi.passing
		const paths = this.openapi.paths

		const customItems = this.customMenuItems()
		const menuItems = paths.map((p) => this.convertPathMenuItem(p)).concat(customItems)

		this.menuItems = this.sortMenu(menuItems)

		return Promise.resolve(true)
	}

	/**
	 * @summary
	 * Convert the supplied PathMenuItem to a MenuItem with the correct route.
	 * If the route requires the user to have a workspace selected, these values
	 * are prefilled.
	 *
	 * @param item PathMenuItem
	 */
	private convertPathMenuItem(
		item: OpenApi.PathMenuItem,
		valmap?: ExMap<number | string, any>,
	): MenuItem {
		if (!item?.length) return
		// Destructure ftw
		const [tags, operationId, locked, subs] = item

		const operation = this.openapi.getOperation(operationId)
		if (!operation) return null
		const view = this.openapi.weighPreference(operation.route)
		const { route } = operation

		/**
		 * Prefill route with values from its parent via a simple map with path
		 * parameters or indices and their values.
		 *
		 * @param route route to prefill
		 * @param values map with path params/idx and their values
		 *
		 * @returns string[]
		 */
		const prefillRoute = (route: string[], values: ExMap<number | string, any>): string[] => {
			return route.map((part, idx) => values.get(idx) ?? values.get(part) ?? part)
		}

		// Clone the values, so branching paths don't overwrite the same values
		const values = new ExMap<string | number, any>(valmap)

		// Workspace selected? Apply it to the route
		if (this._provider?.id) {
			// Check if the map doesn't have provider_id and/or the index for
			// ['provider', '{id}']
			if (!values.has('{provider_id}') || !values.has(1)) {
				if (route.includes('provider')) {
					const idx = route.indexOf('provider')
					const isId = route[idx + 1] === '{id}'
					if (isId) {
						values.set(1, this._provider.id)
						values.set('{provider_id}', this._provider.id)
					}
				}
			}
		}

		// Map the submenus
		const converted = asArray(subs).map((s) => this.convertPathMenuItem(s, values))
		const submenus = this.sortMenu(converted)
		this.nodes.set(operationId, submenus)

		// Create the menu item
		const menuItem = {
			route: ['/', this.prefix, view, ...prefillRoute(route, values)],
			operationId,
			locked: locked && !this.loggedin,
			subs: submenus.length,
			tag: asArray(tags)[0],
		}

		return menuItem
	}

	/**
	 * @summary
	 * Sort the given menu items by preferenced position in the _tags list
	 *
	 * @param items MenuItem array
	 * @returns same items
	 */
	private sortMenu(items: MenuItem[]): MenuItem[] {
		return items.sort((a, b) => this._tags.indexOf(a.tag) - this._tags.indexOf(b.tag))
	}

	/**
	 * @summary
	 * Convert a custom item to MenuItem
	 *
	 * @param route Route to use
	 * @param tlstring title or translation string
	 */
	private addCustomMenuItem(tag: string, route: string[], tlstring: string): MenuItem {
		const customtag = {
			route,
			operationId: tlstring,
			locked: false,
			custom: true,
			subs: 0,
			tag,
		}

		return customtag
	}

	/**
	 * @summary
	 * Open the login window and use the intended link as the redirect uri for
	 * the keycloak service
	 *
	 * @param item MenuItem
	 */
	public doLogin(item: MenuItem): void {
		const host = window.location.hostname
		const hasport = window.location.port
		const port = hasport ? `:${hasport}` : ''
		const prot = window.location.protocol
		const redirect = [`${prot}/`, host + port, ...item.route.filter((a) => a !== '/')].join('/')

		this.dialog.open(NgqLoginDialogComponent, {
			data: {
				item: {
					redirectUri: redirect,
				},
			},
		})
	}

	public toggle(operationId: string): void {
		this.current = this.current === operationId ? undefined : operationId
	}

	public check(nested: boolean): void {
		if (nested) return
		else this.toggle(null)
	}

	// ::DEV::
	get devmode(): boolean {
		// return !environment.production
		return true
	}

	public __log(): void {
		if (this.devmode) this.openapi.__log()
	}
}
