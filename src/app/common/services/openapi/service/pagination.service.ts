import { HttpEvent, HttpEventType } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Params } from '@angular/router'
import { hasValue } from '@quebble/scripts'
import { Observable, of, Subject } from 'rxjs'
import { catchError, defaultIfEmpty, map } from 'rxjs/operators'

import { ParameterObject } from '../interfaces/parameter.interface'
import { OperationId } from '../types/openapi.types'

@Injectable({
	providedIn: 'root',
})
export class OpenApiPaginationService {
	private _pagination: Map<OperationId, Map<number, [number, boolean]>> = new Map()
	private _pagestream: Subject<[OperationId, number, boolean]> = new Subject()

	constructor() {}

	private update(operationId: OperationId, limit: number, update: number, lock?: boolean): void {
		this._pagination.get(operationId).set(limit, [update, lock])
		this._pagestream.next([operationId, limit, lock])
	}

	private check(operationId: OperationId, limit: number): void {
		const exists = this._pagination.has(operationId)
		if (!exists) this._pagination.set(operationId, new Map())
		const operation = this._pagination.get(operationId)
		if (!operation.get(limit)) operation.set(limit, [1, false])
	}

	private fetch(operationId: OperationId, limit: number): number {
		const current = this._pagination.get(operationId)
		if (!current) return null
		const [stored] = current.get(limit)
		return stored || null
	}

	public increase(operationId: OperationId, limit: number = 10, offset: number): void {
		this.check(operationId, limit)
		let current = this.fetch(operationId, limit)
		if (current >= 0 && offset / limit + 1 > current) current++
		this.update(operationId, limit, current)
	}

	public decrease(operationId: OperationId, limit: number = 10, offset: number): void {
		this.check(operationId, limit)
		let current = this.fetch(operationId, limit)
		if (current > 0 && offset / limit + 1 === current) current--
		this.update(operationId, limit, current, true)
	}

	public get(operationId: OperationId, limit: number = 10): [number, boolean] {
		this.check(operationId, limit)
		return this._pagination.get(operationId).get(limit)
	}

	public stream(): Observable<[OperationId, number, boolean]> {
		return this._pagestream
	}

	public params(
		operationId: OperationId,
		parammap: Map<string, string> /* Params as map, sent with the current request */,
		pageparams: ParameterObject[] /* Pagination params as defined in the request */,
	): Params {
		if (!pageparams.length) return
		const pnparams: Params = {}
		const limitparam = pageparams.find((inparam) => inparam.name === 'limit')
		const schema = limitparam.schema
		const getLimit = schema ? parseInt(schema['default']) : 10
		const limit = !isNaN(getLimit) ? getLimit : 10
		const getOffset = parseInt(parammap.get('offset'))
		const offset = !isNaN(getOffset) ? getOffset : 0

		pageparams.forEach((param) => {
			if (param.name === 'limit') {
				pnparams[param.name] = 1
			}
			if (param.name === 'offset') {
				pnparams[param.name] = offset + limit
			}
		})

		if (hasValue(pnparams.offset)) {
			const current = pnparams.offset / limit
			const [known, last] = this.get(operationId, limit)
			if (current < known || last) return null
		}

		if (hasValue(pnparams.limit) || hasValue(pnparams.offset)) return pnparams

		return null
	}

	public monitor(
		call: Observable<any>,
		operationId: OperationId,
		limit: number,
		offset: number,
	): void {
		// It might be prudent to store this preload of data, but idk
		call.pipe(
			catchError(() => {
				// Set the response message based on the reply
				return of().pipe(defaultIfEmpty(null))
			}),
			map((paginated: HttpEvent<any>) => {
				// If we have a pagination event
				if (paginated?.type === HttpEventType.Response) {
					if (hasValue(paginated.body)) {
						// If there's content, it means that there is a new page,
						// so store the current limit and offset for this operation
						this.increase(operationId, limit, offset)
					} else {
						// If not, that means the last offset and limit were the
						// max, so decrease and set it as last.
						this.decrease(operationId, limit, offset)
					}
				}

				// Just return the call result, the paginated content isn't important
				return paginated
			}),
		).subscribe()
	}
}
