import { Component, HostBinding, HostListener } from '@angular/core'
import { StorageKeys } from '@quebble/consts'
import { ExMap } from '@quebble/models'
import { OpenApi } from '@quebble/openapi'
import { hasValue } from '@quebble/scripts'
import { filter } from 'rxjs/operators'

import { ResponseEvent } from './common/services/response/service/response.service'
import { StorageService } from './common/services/storage/storage.service'

@Component({
	selector: 'ngq-root',
	template: `
		<ngq-header></ngq-header>
		<router-outlet></router-outlet>
		<ngq-footer></ngq-footer>
	`,
	styles: [],
})
export class AppComponent {
	private _blockEvents: boolean

	constructor(
		private storage: StorageService,
		private openapi: OpenApi.OpenApiService,
		private openroute: OpenApi.OpenApiRouteService,
	) {
		this.setupViews()
		this.setupBlockEvents()
		this.openroute.init()
	}

	public ngOnInit(): void {
		this.openapi.init()
	}

	/**
	 * @summary
	 * Define available views and compatibility with content. Views are defined
	 * in the OpenApi types file and are used by the different ancestral view
	 * components to determine which component to show.
	 *
	 * A view is made up of an array of options and a list of requirements for
	 * those options.
	 *
	 * @example
	 * A view with a sidebar, a selectable header and items from
	 * the sidebar that can be selected would look like so:
	 *
	 * **List key:** `['object', 'array', 'object']`
	 * The header is an object that can be selected and is the 'owner' of the
	 * selectable array of items in the sidebar. The content of items from the
	 * sidebar when selected is also an object.
	 *
	 * As for the requirements per key in the list, only the first object in
	 * this example would get one: `'header'`. This is so the content can be
	 * divided properly between the two objects.
	 *
	 * @todo
	 * Could use some improvements. Remove XQuebble stuff. Use JSONApi links
	 * and relations instead.
	 *
	 * Defining keys and options would then be slightly different, but still in
	 * the same idea.
	 */
	private setupViews(): void {
		const views: OpenApi.ViewType[] = ['details', 'person', 'list', 'tiles']

		views.forEach((view) => {
			// Single array view
			const arrmap = new Map()
			arrmap.set('array', null)

			// Single object view
			const objmap = new Map()
			objmap.set('object', null)

			// Array and object view
			const arrobj = new Map()
			arrobj.set('array', null)
			arrobj.set('object', null)

			const list: OpenApi.ViewMap = new ExMap()

			switch (view) {
				case 'tiles':
				case 'list':
					// Just an array view
					list.set(['array'], arrmap)
					break
				case 'details': {
					// Sidebar view

					// Single object, requires a nested link to 'tree'
					// in the XQuebble object
					objmap.set('object', ['header'])
					list.set(['object'], objmap)

					// Single array input, no constraints, no header
					list.set(['array'], arrmap)

					// No-header list and selected item from list
					list.set(['array', 'object'], arrobj)

					// Object with nested array
					// Selects object default if subjects overlap
					// for childop array get
					const headerarobj = new Map(arrobj)
					headerarobj.set('object', ['header'])
					list.set(['object', 'array'], headerarobj)

					// Header, sidebar list and selected item
					const oaomap = new Map()
					oaomap.set('array', [null])
					oaomap.set('object', ['header', null])
					list.set(['object', 'array', 'object'], oaomap)

					// Tiles, selected (header), nested list
					const aoamap = new Map()
					aoamap.set('array', ['ignore', null])
					aoamap.set('object', ['header'])
					list.set(['array', 'object', 'array'], aoamap)

					// Tiles, selected (header), nested list, selected list item
					const aoaomap = new Map()
					aoaomap.set('array', ['ignore', null])
					aoaomap.set('object', ['header', null])
					list.set(['array', 'object', 'array', 'object'], aoaomap)
					break
				}
				case 'person':
					// Just a person selected, no family
					list.set(['object'], objmap)

					// Family, no selection
					list.set(['array'], arrmap)

					// Family and selected person
					list.set(['array', 'object'], arrobj)
					break
			}

			// this.openapi.views.set(view, list)
			this.openapi.view = [view, list]
		})
	}

	/**
	 * @summary
	 * Setup an observable that observes StorageKeys.Response.BlockEvents in the
	 * storage cache, and updates the _blockEvents property. This is used to
	 * block user interaction when certain errors occur. Such as no internet
	 * connection being available.
	 */
	private setupBlockEvents(): void {
		this.storage.cache
			.get<boolean>(StorageKeys.Response.BlockEvents)
			.pipe(filter((val) => hasValue(val)))
			.subscribe((val) => (this._blockEvents = val))
	}

	@HostListener('window:online', ['$event'])
	@HostListener('window:offline', ['$event'])
	public onNavigatorOnline(event: Event): void {
		this.storage.cache.set<ResponseEvent>(StorageKeys.Response.Global, { status: event.type })
	}

	/**
	 * @summary
	 * Globally set the click event available for all components for easy access
	 * to prevent many eventListeners having to be created.
	 */
	@HostListener('document:click', ['$event'])
	public onClick(event: MouseEvent): void {
		this.storage.cache.set(StorageKeys.Document.Click, event.target)
	}

	/**
	 * @summary
	 * Globally set the currently pressed modifier and meta keys for easy access
	 * in all components, to allow {key}+click actions.
	 */
	@HostListener('document:keydown', ['$event'])
	public onKeyUp(event: KeyboardEvent): void {
		const { ctrlKey, shiftKey, metaKey } = event
		if (event.key === 'Control' || event.key === 'Shift' || event.key === 'Meta') {
			this.storage.cache.set(StorageKeys.Document.Modifiers, { ctrlKey, shiftKey, metaKey })
		}
	}

	@HostBinding('class.no-events')
	get __componentClass(): boolean {
		return this._blockEvents
	}
}
