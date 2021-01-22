import { filter, map, switchMap, takeUntil } from 'rxjs/operators'

import { Location } from '@angular/common'
import { Injectable } from '@angular/core'
import { NavigationEnd, Params, Router, RouterEvent } from '@angular/router'
import { StorageKeys } from '@quebble/consts'
import { environment } from '@quebble/environment'
import { ExMap, List } from '@quebble/models'
import { asArray, dolog, hasValue } from '@quebble/scripts'
import { isEqual } from 'lodash-es'
import { BehaviorSubject, Observable, Subject } from 'rxjs'

import { ResponseService } from '../../response/service/response.service'
import { StorageService } from '../../storage/storage.service'
import { Chunk } from '../models/chunk.model'
import { Operation } from '../models/operation.model'
import { SchemaName, SchemaType } from '../types/openapi.types'
import { OpenApiChunkService } from './chunk.service'
import { GeneratorOptions, GeneratorService } from './generator.service'
import { OpenApiSchemaService } from './schema.service'
import { OpenApiWebService } from './web.service'

interface UrlState {
	url: string[]
	params: string
}

@Injectable({
	providedIn: 'root',
})
export class OpenApiRouteService {
	private url$: BehaviorSubject<UrlState> = new BehaviorSubject(null)
	private destroy$: Subject<void> = new Subject()

	constructor(
		private storage: StorageService,
		private web: OpenApiWebService,
		private chunk: OpenApiChunkService,
		private schema: OpenApiSchemaService,
		private genny: GeneratorService,
		private router: Router,
		private location: Location,
		private response: ResponseService,
	) {}

	public async init(): Promise<void> {
		this.cleanUp()
		this.watchRoute()
		this.watchUrl()
	}

	private cleanUp(): void {
		this.destroy$.next()
		this.destroy$.complete()
		this.destroy$ = new Subject()
	}

	/**
	 * @summary
	 * Watches the current Router events, filters for NavigationEnd and parses
	 * the resulting URL by splitting it on Keycloak appendages and possible
	 * QueryParameters, before sending it off to the local url$ BehaviorSubject.
	 */
	private watchRoute(): void {
		this.router.events
			.pipe(
				filter((event: RouterEvent) => event instanceof NavigationEnd),
				takeUntil(this.destroy$),
			)
			.subscribe((navi: NavigationEnd) => {
				const event: NavigationEnd = navi
				// Remove possible Keycloak appendages
				const nohash = event.url.split('#')[0]
				// Split the nohash on possible query params
				const params = nohash.split('?')
				// Split the first part of the params on / and filter for
				// non-values, since url[0] will be an empty string if the url
				// starts with a /.
				const url = params[0].split('/').filter((a) => hasValue(a))

				// Forward and store the current url in the url$ observable,
				// so when the application is ready the url$ will pick it up.
				this.url$.next({ url, params: params[1] })
			})
	}

	/**
	 * @summary
	 * Watch for changes in the URL as defined by the Router events watcher and
	 * create a ChunkGroup based on the changed URL.
	 */
	private watchUrl(): void {
		this.storage.cache
			.get(StorageKeys.OpenApi.State)
			.pipe(
				filter((state) => !!state),
				switchMap(() => this.url$),
				filter((url) => !!url),
				takeUntil(this.destroy$),
			)
			.subscribe(({ url, params }) => {
				const link = asArray(url)
				// The first part of the url consists of the main view and the
				// nested view component (e.g. 'view', 'details')
				const [view, component] = link.slice(0, 2) ?? [null, null]
				const route = link.slice(2) ?? []
				// Create a param map from the given parameters
				const parammap = this.createParamMap(params)

				// Create the ChunkGroup for the route
				const chunkgroup = this.chunk.getChunkGroup(route, 'get', view)
				if (chunkgroup) {
					dolog('success', '[ChunkGroup]', chunkgroup)
					this.chunk.viewchunk.next(chunkgroup.view)
				}
			})
	}

	/**
	 * @summary
	 * Convert a query parameter string to a map with key/value pairs for easier
	 * access and handling.
	 *
	 * @param params string
	 *
	 * @returns Map<string, whatever>
	 */
	private createParamMap(params: string): Map<string, unknown> {
		if (!params) return new Map()

		const initial = params.replace('?', '')
		const toarray = initial.split('&')
		const parammap: Map<string, unknown> = new Map()

		toarray.forEach((param) => {
			const [key, value] = param.split('=') ?? [null, null]
			// TODO:
			// Add support for proper value parameter strings
			if (key) parammap.set(key, value)
		})

		return parammap
	}

	/**
	 * @summary
	 * Parses the current chunk group's chunks, then loops through the chunk's
	 * viewchunks to assign data to each chunk in the list.
	 *
	 * This method is used by all components that require the data from the
	 * chunk stack. The current view's chunk is ignored, since that data is
	 * loaded in the component that determines the current user interface's data
	 * streams.
	 */
	public resolveChunkData(force?: boolean): void {
		const subject: Subject<void> = new Subject()
		const indices: List<number> = new List()

		this.chunk.current
			.pipe(
				filter((a) => !!a),
				map((group) => {
					const { chunks } = group
					indices.clear()
					indices.concat(chunks?.map((chunk) => chunk.index))

					return chunks
				}),
				takeUntil(subject),
			)
			.subscribe((chunks) => {
				chunks.forEach((chunk, key) => {
					if (!chunk.getdata() || force) {
						const [sub] = this.resolveChunkOperation(chunk, null, null, null, force)
						if (sub) sub.subscribe()
					}
				})
			})
	}

	/**
	 * @summary
	 * Parse a list of indices for newly added Chunks and generate the data for
	 * each, automatically forced to update.
	 *
	 * @param newidx array of Chunk indices
	 */
	private chunkGenerateForRoute(newidx: number[]): void {
		const indices = asArray(newidx)
		indices.forEach((i) => {
			const chunk = this.chunk.chunks.get(i)
			if (chunk) {
				const [sub] = this.resolveChunkOperation(chunk, null, null, null, true)
				if (sub) sub.subscribe()
			}
		})
	}

	/**
	 * @summary
	 * Default getter method for Chunk-based call that is auto-mapped to the
	 * right type of value and sets the data to the chunk. If a match is
	 * supplied to check params agains, the stream is automatically selected
	 * based on cached data in the Chunk.
	 *
	 * @param chunk selected Chunk
	 * @param viewkey optional SchemaType/view key
	 * @param params possible params
	 * @param paramsmatch params to match with
	 * @param force force a call regardless of match
	 *
	 * @returns
	 * Tuple with the stream and the updated params object
	 */
	public resolveChunkOperation(
		chunk: Chunk,
		viewkey?: SchemaType,
		params?: any,
		parammatch?: any,
		force?: boolean,
	): [Observable<any>, Params] {
		const route = chunk.viewroute(viewkey, !viewkey)
		const operation = chunk.operation
		const type = viewkey ?? chunk.viewkey
		const returnparams = params ? { ...params } : undefined

		if (environment.generate) {
			if (!chunk.getdata() || force) {
				const stream = this.resolveGeneratedData(chunk, force)
				if (stream) {
					chunk.setdata(chunk.data)
					return [chunk.datastream, returnparams]
				}
			} else {
				return [chunk.datastream, returnparams]
			}
		}

		if (parammatch && !!chunk.getdata() && isEqual(params, parammatch) && !force)
			return [chunk.datastream, returnparams]

		const call = this.web.operationActionByModel(operation, null, route, params).pipe(
			map((value) => {
				let returnvalue = type === 'array' ? { data: [] } : { data: null }
				if (!hasValue(value)) {
					chunk.setdata(returnvalue)
					return returnvalue
				}

				returnvalue = value

				if (type === 'header') {
					const checkop = chunk.viewchunks.get('object') ?? chunk.viewchunks.get('array')
					const subject = checkop?.operation?.subject ?? checkop?.operation?.info
					if (subject && value[subject]) returnvalue = value
					else returnvalue = value[operation.subject] ?? value[operation.info] ?? value
				}

				chunk.setdata(returnvalue)
				return chunk.data
			}),
		)

		return [call, returnparams]
	}

	/**
	 * @summary
	 * Parse the viewchunks of the Chunk and return generated data.
	 *
	 * @param chunk Chunk to parse
	 *
	 * @returns boolean
	 */
	private resolveGeneratedData(chunk: Chunk, force?: boolean): boolean {
		const schemaName = chunk.operation.schema
		const schema = this.schema.getSchema(schemaName)
		if (!schema) return false

		chunk.viewchunks.forEach((chunk) => {
			if (chunk.getdata() && !force) return

			const schemaName = chunk.operation.jsonapi?.response ?? chunk.operation.schema
			const generated = this.generateDataForSchema(schemaName, chunk.viewkey, chunk.values)
			if (generated) chunk.setdata(generated)
		})

		return true
	}

	/**
	 * @summary
	 * Generate data for the given SchemaName and type. Optional includes of
	 * value map from Chunk.
	 *
	 * @param schemaName name of schema
	 * @param type schema type
	 * @param values value map from Chunk
	 * @param searchFor WIP: search string
	 *
	 * @returns
	 * Generated data
	 */
	public generateDataForSchema(
		schemaName: SchemaName,
		type: SchemaType,
		values?: ExMap<string, any>,
		searchFor?: string,
	): any | any[] {
		if (!schemaName) return
		if (!this.schema.map.has(schemaName)) return

		const jsonop = this.schema.getJsonApiSchemaNames(schemaName)
		const schema = this.schema.getCompoundSchema(jsonop.attributes ?? schemaName)
		const base = jsonop.attributes ? { data: type === 'array' ? [] : {} } : null
		const resource = { attributes: null }

		let options: GeneratorOptions = {
			autoIncrement: 'id',
			sortType: 'asc',
		}

		const layering = {
			layering: {
				layers: 2,
				idKey: 'id',
				parentKey: 'parent_id',
				sortKey: 'order',
				rangeMin: -3,
				rangeMax: 3,
				firstMin: 1,
				firstMax: 3,
				firstParent: null,
			},
		}

		if (/user|person|child|parent/gim.test(schemaName)) {
			options = {
				...options,
				type: {
					rangeMin: 0,
					rangeMax: 3,
				},
				personType: {
					rangeMin: 0,
					rangeMax: 3,
				},
				gender: {
					rangeMin: 0,
					rangeMax: 3,
				},
			}
		}

		if (/provider(?!list)/gi.test(schemaName)) {
			options = {
				units: {
					...layering,
				},
			}
		}

		if (type === 'header' || type === 'object') {
			const object = this.genny.generateSchemaData(schema, options)

			values?.forEach((value, param) => {
				if (param in object) {
					object[param] = value
				}
			})

			if (jsonop.attributes) {
				const item = {
					...resource,
					attributes: object,
					id: 1,
					type: this.schema.stripMethodFromSchema(schema.title),
				}
				base.data = item
				return base
			}

			return object
		}

		if (type === 'array') {
			options.rangeMin = 1
			options.rangeMax = 10

			if (/unit/gim.test(schemaName)) {
				options = {
					...layering,
				}
			}

			const array = this.genny.generateSchemaData(schema, options, true, searchFor)

			if (jsonop.attributes) {
				base.data = array.map((item, idx) => {
					return {
						attributes: item,
						id: idx + 1,
						type: this.schema.stripMethodFromSchema(schema.title),
					}
				})
				return base
			}

			return array
		}
	}

	/**
	 * @summary
	 * Change the current view with the given Chunk and update the url
	 * accordingly.
	 *
	 * @param chunk Chunk to change view to
	 */
	public chunkSwitch(chunk: Chunk): void {
		if (!chunk?.selfroute || chunk?.selfroute?.includes(undefined)) {
			this.response.handleErrorEvent(
				{ status: 'basalt' },
				{
					component: chunk?.component ?? 'null',
					route: (chunk?.smartroute ?? []).join('/'),
				},
			)
			return
		}
		const view = chunk.chunkgroup?.routecomp
		const comp = chunk.component

		const path = [view, comp, ...chunk.selfroute].join('/')

		this.location.replaceState(path)
		this.chunk.setViewChunk(chunk)
	}

	/**
	 * @summary
	 * Use the given Chunk and its linkroute or changeroute to navigate to a
	 * different part of the app and generate new Chunks accordingly.
	 *
	 * @param chunk Chunk to use
	 * @param payload payload to grab the path params from
	 * @param change use the changeroute, even if a linkroute is available
	 * @param back traverse back to previous Chunk if available
	 */
	public chunkNavigation(chunk: Chunk, payload: any, change?: boolean, back?: boolean): void {
		// Prefill error message parameters
		const params: Record<string, any> = {
			operationId: chunk?.operation?.id ?? null,
			component: chunk?.component ?? 'null',
			route: (chunk?.smartroute ?? []).join('/'),
		}

		if (!hasValue(payload)) {
			this.response.handleErrorEvent({ status: 'andesite' }, params)
			return
		}

		let route: any[]
		let operation: Operation
		let lastchunk: number = chunk.previous?.index ?? -1

		if (chunk.linkroute?.length && !change && !back) {
			// Check if we're going down the linked operations, not changing and
			// not going back a step. Set the operation to the getop and the
			// route to the linkroute
			operation = chunk.linkops.find((op) => op.type === 'get')
			route = chunk.linkroute
			lastchunk = chunk.index
		} else if (chunk.changeroute?.length && !back) {
			// Check if we're changing the route and not going back, then set
			// route to the changeroute and the operation to the Chunk's.
			route = chunk.changeroute
			operation = chunk.operation
		} else if (back) {
			// If we're going back a step, grab the previous Chunk by using the
			// oddly specific getter for this situation: previous
			const previous = chunk.previous
			// Use the selfroute or double empty string that joins as a /
			route = previous?.selfroute ?? ['', '']
		}

		// If no route is set, that means something broke.
		if (!route) {
			this.response.handleErrorEvent({ status: 'picrite' }, params)
			return
		}

		// If we're not going back to a previous Chunk
		if (!back) {
			// Check if there's an operation with parameter objects to parse
			if (!operation) {
				this.response.handleErrorEvent({ status: 'dacite' }, params)
				return
			}

			// Update the error message operation id just in case
			params.operationId = operation.id

			// Parse the params list for matching path parameters and return the
			// value if found
			operation.params.forEach((param) => {
				if (param.in === 'path') {
					const value = payload[param.name]
					if (hasValue(value)) {
						route = route.map((item) => {
							if (item === `{${param.name}}`) return value.toString()
							return item
						})
					}
				}
			})
		}

		// Check if route contains path params by matching `{anything}`. If any
		// are still found, that means the params weren't in the payload.
		const notdone = route.filter((item) => String(item).match(/{.+?}/gi))
		if (notdone.length) {
			// Set the params in the error message
			params.param = notdone.join(', ')
			this.response.handleErrorEvent({ status: 'komatiite' }, params)
			return
		}

		// Get an array of indices by updating the ChunkGroup with the new route
		const newidx = this.chunk.updateChunkGroup(lastchunk, operation.type, route)
		// Get the data for each of the new Chunks
		this.chunkGenerateForRoute(newidx)

		// Update the current view Chunk and set the path
		const view = this.chunk.group.view
		this.chunkSwitch(view)
	}
}
