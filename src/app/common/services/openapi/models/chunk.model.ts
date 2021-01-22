import { ExMap } from '@quebble/models'
import { DateTime } from 'luxon'
import { BehaviorSubject, Observable } from 'rxjs'
import { filter, map } from 'rxjs/operators'

import { ChunkMeta } from '../service/chunk.service'
import { Route, SchemaType, ViewType } from '../types/openapi.types'
import { ChunkGroup } from './chunk-group.model'
import { ChunkView } from './chunk-view.model'
import { Operation } from './operation.model'

export class Chunk {
	public index: number

	// The current RoutePart
	public route: Route = []
	// The entire route-up-to-here
	public smartroute: Route = []
	// The route-up-to-here which defines a link to itself
	public selfroute: Route
	// The route for itself and all that's needed to create a route for a linked
	// operation, including path parameters
	public linkroute: Route
	// The route for itself, but the path values are replaced by the parameters
	public changeroute: Route

	// The current operation
	public operation: Operation
	// Available operations (post, delete, etc.) besides the current one
	public operations: Operation[] = []
	// Optional linked operations, like single GET if this is a list
	public linkops: Operation[] = []
	// Optional relation operations, like address or contact information
	public relationops: Operation[] = []

	// A map with all the path parameters and associated values
	public values: ExMap<string, any> = new ExMap()
	// A map with all the path parameters and the indices in the route
	public valueidx: ExMap<string, number> = new ExMap()

	// The current type of schema (array, object, etc.)
	public schematype: SchemaType
	// The current view component
	public component: ViewType

	// Payload
	public data: any
	// Last update of payload
	public datatime: DateTime
	// Payload stream with last update and content
	private data$: BehaviorSubject<[DateTime, unknown]>

	// The current type of view (object could be header, etc.)
	public viewkey: SchemaType
	// All the Chunks that are part of this view, including this one
	public viewchunks: ExMap<SchemaType, Chunk> = new ExMap()

	// The ChunkView this Chunk is part of
	public chunkview: ChunkView
	// The ChunkGroup for the application
	public chunkgroup: ChunkGroup

	// Metadata for its location in the list of Chunks
	private _metadata: ChunkMeta

	constructor(stream?: BehaviorSubject<[DateTime, unknown]>) {
		if (stream) {
			this.data$ = stream
			const [dt, val] = stream?.getValue() ?? [null, null]
			this.datatime = dt
			this.data = val
		}
	}

	get datastream(): Observable<unknown> {
		return this.data$.pipe(
			filter((content) => !!content),
			map(([dt, val]) => {
				if (!this.datatime) this.datatime = dt
				if (!this.data) this.data = val
				return val
			}),
		)
	}

	/**
	 *
	 * @param type
	 * @param usethis
	 * @param payload
	 *
	 * @todo
	 * Refactor to take RESTful in mind with multiple {id} path params.
	 * Maybe use the current chunk's route or smartroute.
	 */
	public viewroute(type: SchemaType, usethis?: boolean, payload?: any): string[] {
		const chunk = usethis ? this : this.viewchunks.get(type)
		if (chunk) {
			return chunk.operation.route.map((item) => {
				if (payload) {
					if (payload[item]) return payload[item]
				}
				if (this.values.has(item)) return this.values.get(item)
				if (chunk.values.has(item)) return chunk.values.get(item)
				return item
			})
		}

		return []
	}

	/**
	 * @summary
	 * Set the current data stream and latest datatime
	 *
	 * @param payload any
	 */
	public setdata(payload: any): void {
		this.data = payload
		const datatime = DateTime.local()
		this.datatime = datatime
		this.data$?.next([datatime, payload])
	}

	/**
	 * @summary
	 * Check if the data needs to be invalidated and/or return the stored data
	 * in the chunk.
	 */
	public getdata(): any {
		if (!this.datatime) return

		const now = DateTime.local()
		const { seconds } = now.diff(this.datatime, 'seconds')
		if (seconds > 120) {
			this.cleardata()
			return
		} else return this.data
	}

	/**
	 * @summary
	 * Clear the data and datatime.
	 */
	public cleardata(c?: boolean): void {
		this.data = undefined
		this.datatime = undefined
		this.data$.next(null)
		if (c) this.data$.complete()
	}

	/**
	 * @summary
	 * Create an Angular Router route based on the View prefix and the currently
	 * stored view component and smart route.
	 *
	 * @param prefix overal View prefix (e.g. `view`, `settings`, etc.)
	 *
	 * @returns string[]
	 */
	public chunkroute(prefix: string): string[] {
		return ['/', prefix, this.component, ...this.smartroute]
	}

	/**
	 * @summary
	 * Check if the given operation id is part of the current combined array of
	 * operations, child operations and nested operations of this Chunk. Helps
	 * to determine the right Chunk with associated data when creating forms,
	 * links to child objects, et cetera.
	 *
	 * @param operationId operation id to check
	 *
	 * @returns boolean
	 */
	public ismine(operationId: string): boolean {
		if (this.operation.id === operationId) return true

		const allops = [...this.operations, ...this.linkops, ...this.relationops]
		return allops.some((op) => op.id === operationId)
	}

	/**
	 * @returns previous Chunk in the list, if available
	 */
	get previous(): Chunk {
		return this.chunkgroup?.chunks?.get(this._metadata?.get('previous')) ?? null
	}

	/**
	 * @returns next Chunk in the list, if available
	 */
	get next(): Chunk {
		return this.chunkgroup?.chunks?.get(this._metadata?.get('next')) ?? null
	}

	/**
	 * Set metadata for given thunk
	 */
	set metadata(meta: ChunkMeta) {
		this._metadata = meta
	}
}
