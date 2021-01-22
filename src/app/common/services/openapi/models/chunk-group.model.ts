import { ExMap } from '@quebble/models'

import { ViewType } from '../types/openapi.types'
import { ChunkView } from './chunk-view.model'
import { Chunk } from './chunk.model'

export class ChunkGroup {
	public values: ExMap<string, any> = new ExMap()
	public route: string[] = []

	public views: ExMap<number, ChunkView> = new ExMap()
	public chunks: ExMap<number, Chunk> = new ExMap()

	public component: ViewType
	public routecomp: string

	constructor() {}

	/**
	 * @returns the last ChunkView in the list
	 */
	get current(): ChunkView {
		return this.views.last ?? new ChunkView()
	}

	/**
	 * @returns the last Chunk in the last ChunkView
	 */
	get view(): Chunk {
		return this.views.last?.view
	}

	/**
	 * @summary
	 * Get the previous ChunkView in the list
	 *
	 * @param key ChunkView key
	 *
	 * @returns ChunkView
	 */
	public previous(key: number): ChunkView {
		const prevkey = this.views.previous(key)
		return this.views.get(prevkey)
	}

	/**
	 * @summary
	 * Get the next ChunkView in the list
	 *
	 * @param key ChunkView key
	 *
	 * @returns ChunkView
	 */
	public next(key: number): ChunkView {
		const nextkey = this.views.next(key)
		return this.views.get(nextkey)
	}

	/**
	 * @summary
	 * Create a route array for the entire list of Chunks in this ChunkGroup.
	 */
	public routing(): void {
		this.route = this.chunks
			.map((chunk) => chunk.route)
			.reduce((route, curr) => route.concat(curr), [])
	}
}
