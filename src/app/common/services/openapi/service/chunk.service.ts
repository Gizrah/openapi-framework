import { asArray, dolog, hasValue, rndStr } from '@quebble/scripts'

import { Injectable } from '@angular/core'
import { ExMap, List } from '@quebble/models'
import { DateTime } from 'luxon'
import { BehaviorSubject } from 'rxjs'

import { ParameterObject } from '../interfaces/parameter.interface'
import { ChunkGroup } from '../models/chunk-group.model'
import { ChunkView } from '../models/chunk-view.model'
import { Chunk } from '../models/chunk.model'
import { Operation } from '../models/operation.model'
import {
	OperationId,
	OperationType,
	Route,
	SchemaType,
	ViewMap,
	ViewType,
} from '../types/openapi.types'
import { OpenApiDataService } from './data.service'
import { OpenApiOperationService } from './operation.service'
import { OpenApiPathService } from './path.service'
import { OpenApiSchemaService } from './schema.service'

type ChunkMetaKey = 'previous' | 'next' | 'part' | 'prevpart' | 'nextpart' | 'operationId'
type ChunkIndex = number
type ParamKey = string
type ParamValue = any
type PathMap = ExMap<string[], Map<OperationType, OperationId>>
export type ChunkMeta = Map<ChunkMetaKey, any>

@Injectable({
	providedIn: 'root',
})
export class OpenApiChunkService {
	public instance = rndStr('', 5)
	/**
	 * All the views the application has with the supported content types for
	 * each view as a map. The map contains information for each view and the
	 * restrictions that apply per view.
	 */
	private _views: ExMap<string, ViewMap> = new ExMap()
	/**
	 * Reverse view list, using the combined items for a view as the key and the
	 * available views as the value.
	 *
	 * E.g.: [array, object]: ('details', 'person')
	 */
	private _types: ExMap<SchemaType[], Set<string>> = new ExMap()

	/**
	 * Active ChunkGroup, ChunkView, Chunks and Values
	 */
	private _chunkgroup: ChunkGroup
	private _chunkviews: ExMap<number, ChunkView> = new ExMap()
	private _chunks: ExMap<number, Chunk> = new ExMap()
	private _values: ExMap<string, any> = new ExMap()

	/**
	 * Last used user after the view prefix, as an array
	 */
	private _route: Route
	/**
	 * Route cut up in parts, stored by Chunk index
	 */
	private _routeparts: ExMap<ChunkIndex, Route> = new ExMap()
	/**
	 * Metadata for each chunk, stored by Chunk index
	 */
	private _metadata: ExMap<ChunkIndex, ChunkMeta> = new ExMap()

	/**
	 * Internal HEAD check for the last update of the application
	 */
	private _lastupdate: string

	/**
	 * Observable for the current ChunkGroup
	 */
	private current$: BehaviorSubject<ChunkGroup> = new BehaviorSubject(null)

	/**
	 * Observable for the current Chunk that's in view
	 */
	private viewchunk$: BehaviorSubject<Chunk> = new BehaviorSubject(null)

	/**
	 * @extends ResponseService
	 * @errorcodes **vulcanic rock**
	 * @used
	 *
	 * `andesite`, `basalt`, `dacite`, `komatiite`, `picrite`
	 *
	 */
	constructor(
		private operation: OpenApiOperationService,
		private path: OpenApiPathService,
		private schema: OpenApiSchemaService,
		private data: OpenApiDataService,
	) {}

	/**
	 * @returns views map
	 */
	get views() {
		return this._views
	}

	/**
	 * Set the view map
	 */
	set view(view: [string, ViewMap]) {
		this._views.set(view[0], view[1])
		if (view[0] === 'tl') return

		view[1].forEach((map, types: SchemaType[]) => {
			if (!this._types.has(types as SchemaType[])) {
				this._types.set(types, new List())
			}
			const list = this._types.get(types)
			list.add(view[0])
		})
	}

	/**
	 * Get the stream of current Chunk that's used as view
	 */
	get viewchunk(): BehaviorSubject<Chunk> {
		return this.viewchunk$
	}

	/**
	 * @returns Observable with current ChunkGroup
	 */
	get current(): BehaviorSubject<ChunkGroup> {
		return this.current$
	}

	/**
	 * @returns ChunkGroup immediately
	 */
	get group(): ChunkGroup {
		return this._chunkgroup
	}

	/**
	 * @returns Current view Chunk's route
	 */
	get chunkroute(): Route {
		return this._chunkgroup?.view?.viewroute(null, true) ?? []
	}

	/**
	 * @returns Current map of Chunks
	 */
	get chunks(): ExMap<number, Chunk> {
		return this._chunks
	}

	/**
	 * @summary
	 * Class initializer that (re)sets the current ChunkGroup. When reinit is
	 * set and the current ChunkGroup is available, the currently stored route
	 * is used as a base. If no ChunkGroup is available, that means no view
	 * component has been loaded and no route is available, in which case
	 * nothing is done.
	 *
	 * @param reinit recreate the ChunkGroup
	 * @param head last update of application
	 *
	 * @returns Promise
	 */
	public async init(reinit?: boolean, head?: string): Promise<any> {
		if (!this.operation.map.size) return Promise.resolve(['Chunks saw no available Operations'])
		if (reinit) {
			if (head && head !== this._lastupdate) {
				this._lastupdate = head
			}

			if (this._chunkgroup) {
				this.getChunkGroup(this._route, 'get', this._chunkgroup.routecomp)
			}
		}

		return Promise.resolve([])
	}

	/**
	 * @summary
	 * Convert the url provided to a ChunkGroup that splits up all parts of the
	 * url in their own respective chunks, with the operations associated with
	 * each part. Based on the last part of the url, the view is decided and the
	 * application can show the right page.
	 *
	 * @param route The current url
	 * @param operationType get/post/put/delete, etc, defaults to get
	 *
	 * @returns ChunkGroup
	 */
	public getChunkGroup(
		route: Route,
		operationType: OperationType = 'get',
		routeComponent: string,
	): ChunkGroup {
		const group = new ChunkGroup()
		if (!hasValue(route)) return group

		this._route = route
		const parts = this.splitRouteInParts(route)
		if (!parts.size) return group
		this._chunks.clear()
		this._chunkviews.clear()
		this._values.clear()

		this._routeparts = parts
		group.routecomp = routeComponent
		this._chunkgroup = group
		this._chunkgroup.chunks = this._chunks
		this._chunkgroup.views = this._chunkviews
		this._chunkgroup.values = this._values

		this.makeChunksFromRouteParts(operationType)
		this.matchComponentsToChunks()

		this.current$.next(this._chunkgroup)

		return this._chunkgroup
	}

	/**
	 * @summary
	 * Update the ChunkGroup, Chunks, ChunkViews and Values starting from the
	 * given Chunk index. Keeps the Chunks and values for the Chunks that are
	 * at or before the given last index. Regenerates the _routeparts with the
	 * given route and generates Chunks according to the new parts.
	 *
	 * @param last keep up-to-here
	 * @param type operation type
	 * @param route new route
	 *
	 * @returns array of Chunk indices
	 */
	public updateChunkGroup(last: number, type: OperationType, route: Route): number[] {
		const parts = this.splitRouteInParts(route)
		this._routeparts = parts

		const index = last > -1 ? last : null
		if (hasValue(index)) {
			this._chunks = this._chunks.slice(null, (v, key) => {
				if (key <= index) return true
				v.cleardata(true)
				v.values.forEach((value, key) => {
					if (this._values.has(key)) this._values.delete(key)
				})
				return false
			})
		} else {
			this._chunks.clear()
		}

		this.makeChunksFromRouteParts(type, index)
		this.matchComponentsToChunks()

		this.current$.next(this._chunkgroup)

		const newidx = this._chunks.map((v, key) => key).filter((a) => a > last)
		return newidx
	}

	/**
	 * @summary
	 * Split the route in to chunks based on the known main
	 * paths from the spec
	 *
	 * @param route the current route
	 *
	 * @returns
	 * Map based on the path's index in the route, with its
	 * slice of the route
	 */
	private splitRouteInParts(route: Route): ExMap<ChunkIndex, Route> {
		const paths: ExMap<ChunkIndex, Route> = new ExMap()

		route.forEach((item, index) => {
			if (this.path.map.has(item)) paths.set(index, item)
		})

		const chunks: ExMap<ChunkIndex, Route> = new ExMap()
		paths.forEach((a, key, b, next) => {
			chunks.set(key, next ? route.slice(key, next) : route.slice(key))
		})

		return chunks
	}

	/**
	 * @summary
	 * Parses the RouteParts ExMap and assigns the operation associated with
	 * each part of the route, including dependencies on previous route parts.
	 * Makes a Chunk for each matching operation and, using the addchunk method
	 * in the ChunkGroup, assigns the right route and smart route for the Chunk.
	 *
	 * @param type method type
	 * @param skipbefore if regenerating, skip all parts before and including
	 * given index
	 */
	private makeChunksFromRouteParts(type: OperationType, skipbefore?: number): void {
		this._routeparts.forEach((part, partkey, a, nextpart, prevpart) => {
			if (hasValue(skipbefore) && partkey < skipbefore) return

			const previous = hasValue(prevpart)

			part.forEach((i, index) => {
				if (hasValue(skipbefore) && partkey + index <= skipbefore) return

				const inroute = part.slice(0, index + 1)
				const operation = this.matchRouteToOperation(inroute, type, part, previous)
				const chunk = this.createChunk(operation, inroute, type)

				if (!chunk) return

				chunk.index = partkey
				if (this._chunks.has(partkey)) chunk.index += index
				chunk.chunkgroup = this._chunkgroup

				const prevchunk = this.addChunkToMap(chunk)
				chunk.metadata = this.setChunkMetaData(
					chunk.index,
					prevchunk,
					partkey,
					prevpart,
					nextpart,
					operation?.id,
				)

				if (hasValue(skipbefore)) {
				}
			})
		})
	}

	/**
	 * @summary
	 * Add a Chunk to the map of Chunks. Updates the Chunk's route, viewkey and
	 * smartroute properties. Sets the Chunk's route with a version that has
	 * prefilled known values for the route's path parameters. If the Chunk's
	 * viewkey hasn't been set, the Chunk's operation's view is used. The
	 * Chunk's smartroute is created by joining the routes of all Chunks in the
	 * map.
	 *
	 * The ChunkGroup value map is update with the values from the Chunk,
	 * skipping ambiguous values like {id}, and the Chunk is added to the map.
	 * The ChunkGroup route is updated with the newly added Chunk's route.
	 *
	 * @param chunk Chunk to add
	 *
	 * @todo
	 * Make compatible with RESTful nested links that have repeating path params
	 * like /route/{id}/child/{id}
	 */
	private addChunkToMap(chunk: Chunk): number {
		const first = this._chunks.size === 0
		const match = first ? chunk : this._chunks.last
		const prevkey = first ? -1 : this._chunks.last.index
		if (chunk.operation.id === match.operation.id && !first) return

		const parsed = chunk.operation.route.map((item, idx) => {
			if (idx === 0 && match.route[0] === item) return first ? item : undefined
			if (match.values.has(item)) {
				if (this._values.has(item)) return undefined
				return first ? chunk.values.get(item) : undefined
			}
			if (chunk.values.has(item)) {
				if (this._values.has(item)) return undefined
				return chunk.values.get(item)
			}
			return item
		})

		chunk.route = parsed.filter((item) => !!item)
		chunk.viewkey = chunk.viewkey ?? chunk.operation.view
		chunk.smartroute = this._chunks
			.filter((inchunk, idx) => chunk.index > idx)
			.map((chunk) => chunk.route)
			.reduce((route, curr) => route.concat(curr), [])
			.concat(chunk.route)

		const values = chunk.values.filter((val, key) => key !== 'id' && key !== '{id}')
		this._values.concat(values)

		this._chunks.set(chunk.index, chunk)
		this._chunkgroup.routing()

		return prevkey
	}

	/**
	 * @summary
	 * Match the current route to an operation, by checking the length of the
	 * route and, if applicable, checking the value map of the current
	 * ChunkGroup for matches and finding an operation that's dependant on that
	 * combination.
	 *
	 * @param route (part of the) url to match
	 * @param type get/post/put/patch/delete operation type
	 *
	 * @returns
	 * OperationModel that matches the input, or nothing
	 */
	private matchRouteToOperation(
		route: Route,
		type: OperationType,
		fullroute: Route,
		previous?: boolean,
	): Operation {
		if (!hasValue(route)) return

		const paths = this.path.map.get(route[0])
		if (!paths || !paths.size) {
			dolog('error', '[ChunkService]', `No existing route found for ${route[0]}`)
			return
		}

		let match: PathMap = paths.filter((map) => map.has(type))
		const found = new Set<string>()

		if (previous) {
			const longer = match.filter((map, path) => path.length > route.length)
			const filtered = longer.filter((map, path) => {
				found.clear()
				let count = 0

				path.forEach((item) => {
					if (this._chunkgroup.values.has(item)) found.add(item)
					if (item.match(/{.+}?/gi)) count++
				})

				if (found.size === count && route.length > count) return false
				if (route.length + found.size === path.length) return true
				return false
			})
			if (!filtered.size) {
				match = match.filter((map, path) => path.length === route.length)
			} else {
				match = filtered
			}
		} else {
			match = match.filter((map, path) => path.length === route.length)
		}

		if (!match.size) return

		for (const [, map] of match) {
			const operationId = map.get(type)
			const operation = this.operation.map.get(operationId)
			let extended = route

			if (operation && previous && found.size) {
				if (operation.route.length <= fullroute.length) {
					const start = fullroute.indexOf(operation.route[0])
					extended = []
					operation.route.forEach((item, index) => {
						if (item === fullroute[index + start]) extended.push(item)
						else if (item.match(/{.+?}/gi)) extended.push(fullroute[index + start])
					})
				} else {
					let addidx: number = 0
					extended = []
					operation.route.forEach((item, index) => {
						if (found.has(item)) {
							extended.push(this._chunkgroup.values.get(item))
							addidx++
						} else {
							extended.push(route[index - addidx])
						}
					})
				}
			}
			const matches = this.operation.routeContainsMatch(operation, extended)

			if (matches.length) {
				return operation
			}
		}

		return
	}

	/**
	 * @summary
	 * Create a Chunk model based on the supplied parameters, checks for
	 * operations of the same axis, like POST, PATCH or DELETE operations for a
	 * GET. Also looks for possible child operations, like the operations for
	 * each item in an array.
	 *
	 * @param operation OperationModel for the chunk
	 * @param route current slice of the route
	 * @param type OperationType
	 *
	 * @returns
	 * Chunk or nothing
	 */
	public createChunk(operation: Operation, route: Route, type: OperationType): Chunk {
		if (!operation) return

		const { id } = operation
		const maps = this.getRouteValues(operation, route)
		const { values, valueidx } = maps
		const datakey = [operation.id, ...(this.chunkDataCheck(operation, values) ?? route)]

		const stream = this.data.get(datakey, [null, null]) as BehaviorSubject<[DateTime, unknown]>
		const chunk = new Chunk(stream)

		chunk.operation = operation
		chunk.schematype = operation.view
		chunk.values = values
		chunk.valueidx = valueidx
		chunk.operations = this.operation.getOperations(id, type)
		chunk.linkops = this.operation
			.getChildOperations(id)
			.filter((op) => !chunk.operations.some((inop) => inop.id === op.id))
		chunk.relationops = this.getNestedOperations(chunk)

		return chunk
	}

	/**
	 * @summary
	 * Parses the operation route and the valuemap made from the current route
	 * to create a datakey for getting the current BehaviorSubject with the
	 * data, which is used in the DataService.
	 *
	 * @param operation OperationModel
	 * @param values values map from current route
	 *
	 * @returns
	 * Route or nothing
	 */
	private chunkDataCheck(operation: Operation, values: ExMap<string, any>): Route {
		if (!operation || !values.size) return
		const datakey = operation.route.map((item) => values.get(item) ?? item)
		return datakey
	}

	/**
	 * @summary
	 * Match the values from the current route slice to the parameters in the
	 * operation's route and convert them in to a map with all values.
	 *
	 * Adds `{param}` and `param` as key. If available, adds the schema name as
	 * well with both `{name_param}` and `name_param`
	 *
	 * @param operation OperationModel to compare
	 * @param route current slice of the route
	 *
	 * @returns
	 * Value map with the parameter keys and their value.
	 *
	 * @todo
	 * If operation and route have different vars for vars that are available in
	 * the _current values map, the current map should prioritize the id from
	 * this part of the route.
	 */
	private getRouteValues(
		operation: Operation,
		route: Route,
	): { values: ExMap<ParamKey, ParamValue>; valueidx: ExMap<ParamKey, number> } {
		const values: ExMap<ParamKey, ParamValue> = new ExMap()
		const valueidx: ExMap<ParamKey, number> = new ExMap()
		const obj = { values, valueidx }
		if (!operation || !route?.length) return obj
		const idx = route.indexOf(operation.route[0])

		let addidx: number = 0 // eslint-disable-line
		operation.route.forEach((item, index) => {
			let current = route[idx + index - addidx] // eslint-disable-line
			if (current === item) return
			if (operation.route.length !== route.length) {
				// TODO: check for multiple instances of variables and only
				// apply if there's one instance
				// if (this._current?.values?.has(item)) {
				// 	addidx++
				// 	current = this._current.values.get(item)
				// }
			}

			const iparam: ParameterObject = operation.params.find(
				(key: ParameterObject) => key.name && item === `{${key.name}}`,
			)
			if (iparam) {
				values.set(`{${iparam.name}}`, current)
				values.set(`${iparam.name}`, current)
				valueidx.set(`{${iparam.name}}`, index)
				valueidx.set(`${iparam.name}`, index)

				if (iparam.name.indexOf('_') > -1) return

				const schema = this.schema.stripMethodFromSchema(operation.schema, true)
				if (schema) {
					values.set(`{${schema}_${iparam.name}}`, current)
					values.set(`${schema}_${iparam.name}`, current)
					valueidx.set(`{${schema}_${iparam.name}}`, index)
					valueidx.set(`${schema}_${iparam.name}`, index)
				}
			}
		})

		return obj
	}

	/**
	 * @summary
	 * Find nested operations for the current main operation by using the
	 * operation's nested list as well as parsing the operation's schema and the
	 * operation's opposing schema for references and matching the current
	 * operation type's type (object/array) to the available actions the
	 * referenced schema has.
	 *
	 * @param chunk current chunk to check
	 *
	 * @returns
	 * Array of Operation Models that are nested references
	 *
	 * @todo
	 * Nested operations should be deprecated in favor of relations and links
	 * from the JSONApi spec.
	 */
	private getNestedOperations(chunk: Chunk): Operation[] {
		if (!chunk) return
		const nestedops = []

		const { view, type, schemas } = chunk.operation

		let reverse
		switch (type) {
			case 'get':
				reverse = 'post'
				break
			case 'post':
			case 'patch':
			case 'put':
			default:
				reverse = 'get'
				break
		}

		const oppop = chunk.operations.find((op) => op.type === reverse)
		if (!oppop) return nestedops

		const schema = schemas.get(type)
		const opposite = oppop.schemas.get(reverse)
		if (!schema?.properties || !opposite?.properties) return nestedops

		for (const key in schema.properties) {
			const mine = schema.properties[key]
			const other = opposite.properties[key]

			const myref = mine?.$ref ?? mine?.items?.$ref ?? null
			const otherref = other?.$ref ?? other?.items?.$ref ?? null

			const mytype = mine?.type ?? null
			const othertype = other?.type ?? null

			const myname = this.schema.getSchemaName(myref)
			const othername = this.schema.getSchemaName(otherref)

			let usedset: List<[OperationId, SchemaType, OperationType | string | number]>
			const useview = mytype ?? othertype ?? view
			if (view === 'array' && mine?.type === 'array') continue

			if (myref) {
				usedset = this.schema.usedin.get(myname)
			} else if (!myref && otherref) {
				usedset = this.schema.usedin.get(othername)
			} else continue

			for (const [usedOp, usedView, usedType] of usedset) {
				if (usedView === 'array' && mine?.type === 'array') continue
				if (usedView === useview && usedType === type) {
					const operation = this.operation.map.get(usedOp)
					if (operation && !nestedops.some((op) => op.id === operation.id)) {
						operation.parent = chunk.operation.id
						nestedops.push(operation)
					}
				}
			}
		}

		return nestedops
	}

	/**
	 * @summary
	 * Set the metadata for each chunk, which includes the next and previous
	 * chunk keys, the current route part as well as the previous and next
	 * route parts.
	 *
	 * @param key current chunk's key
	 * @param prevkey previous chunk's key
	 * @param route current route part
	 * @param prevpart previous part's key
	 * @param nextpart next part's key
	 */
	private setChunkMetaData(
		key: number,
		prevkey: number,
		part: number,
		prevpart: number,
		nextpart: number,
		operationId: OperationId,
	): ChunkMeta {
		const map: ChunkMeta = new Map()
		map.set('next', null)
		map.set('previous', prevkey > -1 ? prevkey : null)
		map.set('part', part)
		map.set('prevpart', prevpart ?? null)
		map.set('nextpart', nextpart ?? null)
		map.set('operationId', operationId)
		this._metadata.set(key, map)

		if (prevkey > -1) {
			const prevmap = this._metadata.get(prevkey)
			prevmap.set('next', key)
			prevmap.set('nextpart', part)
		}

		return this._metadata.get(key)
	}

	/**
	 * @summary
	 * Matches route parts with Chunks and finds if there's overlap and
	 * connection between the Chunks, parts and components available and
	 * combines these into Chunk 'chains', that are turned into ChunkViews
	 */
	private matchComponentsToChunks(): void {
		if (!this._chunks.size) return

		const partchunks: ExMap<number, List<[number, string]>> = new ExMap()

		this._chunks.forEach((chunk, key) => {
			const meta = this._metadata.get(key)
			const partkey = meta.get('part')
			if (!partchunks.has(partkey)) partchunks.set(partkey, new List())
			const list = partchunks.get(partkey)
			list.add([key, chunk.operation.view])
		})

		const chains: ExMap<number, List<[number, string]>> = new ExMap()

		partchunks.forEach((list, partkey, a, nextpart, prevpart) => {
			const thispart = this._routeparts.get(partkey)
			const prevlist: List<[number, string]> = partchunks.get(prevpart) ?? new List()

			const checkchain = (slice) => {
				if (!chains.has(partkey)) {
					chains.set(partkey, new List())
				}

				const thischain = chains.get(partkey)
				thischain.concat(list)

				if (slice.length > list.size) {
					const prevlist = partchunks.get(prevpart) ?? new List()
					const joinlist = new List<[number, string]>(prevlist).concat(thischain)
					chains.set(partkey, joinlist)
					chains.delete(prevpart)
				}
			}

			list.forEach(([key], a, b, c, d, idx) => {
				const inlist = list.filter((key, inidx) => idx >= inidx)
				const mypart = thispart.filter((item, inidx) => idx >= inidx)
				const route = this._chunks.get(key)?.smartroute
				const part = route.length ? route : mypart

				const myslice = this.parseParts(part, inlist, prevlist) ?? []
				checkchain(myslice)
			})
		})

		this.makeChunkViewsFromChains(chains)
	}

	/**
	 * @summary
	 * Checks the part's weighed preference, finds out the nearest matching
	 * component. Uses the previous route part to check for chains.
	 *
	 * Each part is either the whole, or part of the actual route part, so each
	 * actual part of the route part is assigned the proper view component.
	 *
	 * Once all chunks that make up the view are determined, a check is done to
	 * make sure that all those view chunks match their viewchunks map with the
	 * current view.
	 *
	 * @param part the route part to match
	 * @param list the list of Chunks of the route part
	 * @param prevlist the previous route part's Chunk list
	 *
	 * @returns
	 * [Chunk index, SchemaType] tuple array that matches the view component's
	 * constraints. If the slice is longer than the route part's list, then it's
	 * a chained view.
	 */
	private parseParts(
		part: Route,
		list: List<[number, string]>,
		prevlist: List<[number, string]>,
	): [number, SchemaType][] {
		const checkslice = (viewname, viewmap, slice, types): string => {
			const matchlist = this.matchViewTypeMap(viewmap, slice, types) ?? new List()

			if (matchlist.size) {
				const [chunkkey] = slice[slice.length - 1] ?? [null, null]
				const chunk: Chunk = this._chunks.get(chunkkey)
				const viewops: ExMap<SchemaType, Chunk> = new ExMap()

				matchlist.forEach(([chunkkey, viewtype]) => {
					if ((viewtype as string) === 'ignore') return
					if (chunkkey === chunk.index) chunk.viewkey = viewtype
					const inchunk = this._chunks.get(chunkkey)
					if (inchunk && this.addViewOp(chunk, inchunk)) {
						inchunk.viewkey = inchunk.viewkey ?? viewtype
						viewops.set(viewtype as SchemaType, inchunk)
					}
				})

				viewops.forEach((inchunk) => {
					inchunk.viewchunks.forEach((vc, st) => {
						if (!viewops.has(st)) viewops.set(st, vc)
					})
				})

				chunk.viewchunks.concat(viewops)
				chunk.component = viewname

				return viewname
			}

			return
		}

		const preference = this.weighPreference(part)
		const prefmap = this._views.get(preference) ?? new ExMap()
		const alltypes: [number, SchemaType][] = prevlist
			.concat(list)
			.map(([key, type]) => [key, type])

		let viewname
		let slice
		for (let i = 0; i <= alltypes.length; i++) {
			slice = alltypes.slice(i)
			const types: SchemaType[] = slice.map(([, type]) => type)

			if (prefmap.size) {
				viewname = checkslice(preference, prefmap, slice, types)
				if (viewname) break
			} else {
				const viewlist = this._types.get(types) ?? new List()
				if (viewlist.size) {
					viewlist.forEach((view) => {
						if (viewname) return
						const viewmap = this._views.get(view)
						viewname = checkslice(view, viewmap, slice, types)
					})
				}
				if (viewname) break
			}
		}

		return slice
	}

	/**
	 * @summary
	 * Check if the viewop can be added, or if it should be ignored instead
	 *
	 * @param chunk current Chunk
	 * @param matchto Chunk to match
	 */
	private addViewOp(chunk: Chunk, matchto: Chunk): boolean {
		if (chunk.schematype === 'object' && matchto.component === 'list') return false

		return true
	}

	/**
	 * @summary
	 * Find a matching map from the current _view map that matches the TypeTuple
	 * and TypeSlice. Also checks for nested items, or if an item itself is
	 * nested.
	 *
	 * Assigns all Chunk/SchemaType matches to the Chunk.viewchunks and also
	 * checks for backwards assignment options for nested items and the like.
	 *
	 * @param viewmap the view component schematype map
	 * @param typetuple the [Chunk Index, SchemaType] array
	 * @param typeslice the slice of SchemaTypes to match
	 *
	 * @returns
	 * List of [ChunkIndex, SchemaType | XQuebbleType] that matches
	 * the input typetuple in length, or nothing.
	 *
	 * @todo
	 * Extend checks for related chunks, options, operations and information
	 * based on the JSONApi relations, links, et cetera.
	 */
	private matchViewTypeMap(
		viewmap: ViewMap,
		typetuple: [number, SchemaType][],
		typeslice: SchemaType[],
	): List<[ChunkIndex, SchemaType]> {
		if (!viewmap?.size) return
		if (!typetuple?.length) return

		const typemap = viewmap.get(typeslice) ?? new ExMap()
		const matchlist: List<[ChunkIndex, SchemaType]> = new List()
		const allchunks = typetuple.map(([key]) => this._chunks.get(key))

		const lastindex = allchunks[allchunks.length - 1]?.index
		const lastchunk: Chunk = this._chunks.get(lastindex)

		if (lastchunk?.operation?.parent) {
			this._chunks
				.filter((chunk) => chunk.operation.id === lastchunk.operation.parent)
				.forEach((chunk) => {
					if (!chunk.viewchunks.has(lastchunk.viewkey as SchemaType)) {
						chunk.viewchunks.set(lastchunk.viewkey as SchemaType, lastchunk)
					}
				})
		}

		// TODO: relations, links, etc. from JSONApi
		typemap.forEach((qtype, schematype) => {
			const chunks = typetuple
				.filter(([, type]) => type === schematype)
				.map(([key]) => this._chunks.get(key))

			const qtypes = asArray(qtype)

			chunks.forEach((chunk, idx) => {
				if (!qtypes[idx]) {
					matchlist.add([chunk.index, schematype])
					return
				} else if (qtypes[idx] === 'ignore') {
					matchlist.add([chunk.index, qtypes[idx]])
					return
				}
			})
		})

		return matchlist.size === typetuple.length ? matchlist : undefined
	}

	/**
	 * @summary
	 * Converts the Chunk chain map to ChunkViews
	 *
	 * @param chains Chunk chains as set by matchComponentsToChunks
	 */
	private makeChunkViewsFromChains(chains: ExMap<number, List<[number, string]>>): void {
		const views: ExMap<number, ChunkView> = new ExMap()

		chains.forEach((partlist) => {
			const view: ChunkView = new ChunkView()
			view.viewchunks = partlist.map(([key]) => this._chunks.get(key))
			view.chunkgroup = this._chunkgroup
			views.set(view.start, view)
		})

		this._chunkviews.clear()
		this._chunkviews.concat(views)

		this._chunkgroup.component = this._chunkgroup.view.component
		this._chunkgroup.routing()

		this._chunks.forEach((chunk) => this.createChunkLink(chunk))
	}

	/**
	 * @summary
	 * Check and weigh preference for certain paths. Parses the supplied
	 * path for matches in the paths map from the PathService to remove all
	 * kinds of ids and other additions before matching the last item in
	 * that list to a preferred viewtype.
	 *
	 * @param route string array
	 *
	 * @returns
	 * Preferred viewtype
	 */
	public weighPreference(route: Route): ViewType {
		const pathsonly = new List(route.filter((item: string) => this.path.map.has(item)))

		switch (pathsonly.last) {
			case 'provider':
			case 'units':
			case 'unit':
				return 'details'
			case 'providers': {
				if (route.length > 1) {
					if (route.indexOf(pathsonly.last) !== route.length - 1) return 'person'
				}
				return 'tiles'
			}
			case 'user':
			case 'person':
			case 'parent':
			case 'child':
				return 'person'
			case 'persons': {
				if (route.length > 1) {
					if (route.indexOf(pathsonly.last) !== route.length - 1) return 'person'
				}
				return 'list'
			}
			case 'users':
			case 'parents':
			case 'children':
				return 'list'

			default:
				return
		}
	}

	/**
	 * @summary
	 * Update the view with given Chunk. Does not update data, path or other
	 * values outside of the given Chunk.
	 *
	 * @param chunk Chunk to use as view
	 */
	public setViewChunk(chunk: Chunk): void {
		if (!chunk) return

		this.viewchunk$.next(chunk)
	}

	/**
	 * @summary
	 * Fill the selfroute, changeroute and if available the linkroute for the
	 * given Chunk. The selfroute is the Chunk's full route including filled in
	 * parameters. The changeroute is the Chunk's full route with path parameter
	 * strings. The linkroute is for Chunks that have link operations, like
	 * clickable array items.
	 *
	 * @param chunk Chunk to fill
	 */
	private createChunkLink(chunk: Chunk): void {
		if (!chunk) return
		if (chunk.selfroute) return

		const self = chunk.smartroute
		const link = [...self]

		chunk.selfroute = link

		if (chunk.valueidx.size) {
			const oproute = chunk.operation.route
			const changeroute = []
			const viewidx = chunk.chunkview?.start ?? 0

			chunk.smartroute.forEach((item, i) => {
				const idx = i - viewidx
				if (idx < 0) {
					changeroute.push(item)
					return
				}

				if (idx >= oproute.length) return

				const inop = oproute[idx]
				const val = chunk.valueidx.get(inop)
				changeroute.push(hasValue(val) ? inop : item)
			})

			chunk.changeroute = changeroute
		}

		const getop = chunk.linkops.find((op) => op.type === 'get')
		if (!getop) return

		const oproute = chunk.operation.route
		const getroute = getop.route
		const linkroute = [...link]

		getroute.forEach((item, idx) => {
			const inop = oproute[idx]
			if (inop && inop === item) return
			linkroute.push(item)
		})

		chunk.linkroute = linkroute

		return
	}
}
