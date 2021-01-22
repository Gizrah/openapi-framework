import { ExMap } from '@quebble/models'
import { hasValue } from '@quebble/scripts'

import { Route, ViewType } from '../types/openapi.types'
import { ChunkGroup } from './chunk-group.model'
import { Chunk } from './chunk.model'

export class ChunkView {
	public start: number
	public end: number
	public viewidx: number
	public component: ViewType

	public values: ExMap<string, any> = new ExMap()
	public chunks: ExMap<number, Chunk> = new ExMap()
	private _view: Chunk
	private _route: Route = []

	public chunkgroup: ChunkGroup

	constructor(attr?: ChunkView) {
		if (!attr) return
		for (const key in attr) {
			this[key] = attr[key]
		}
	}

	get view(): Chunk {
		if (this._view && this._view.index === this.viewidx) return this._view
		else {
			this._view = this.chunks.get(this.viewidx)
			return this._view
		}
	}

	get first(): Chunk {
		return this.chunks.first
	}

	get last(): Chunk {
		return this.chunks.last
	}

	get viewroute(): Route[] {
		return this._route
	}

	set viewchunks(input: Chunk | Chunk[] | Map<number, Chunk> | Set<Chunk>) {
		const inputmap = new ExMap(input)
		inputmap.forEach((chunk: Chunk) => {
			if (!hasValue(chunk?.index)) return
			const { values, index } = chunk
			chunk.chunkview = this

			const vals = new ExMap(values).filter((val, key) => key !== 'id' && key !== '{id}')
			this.values.concat(vals)

			this.chunks.set(index, chunk)
		})
		this.start = this.chunks.first.index
		this.end = this.chunks.last.index
		this.viewidx = this.end
		this.component = this.chunks.last.component

		this._route = this.chunks
			.map((chunk) => chunk.route)
			.reduce((joiner: any[], current: any[]) => joiner.concat(current), []) as Route
	}
}
