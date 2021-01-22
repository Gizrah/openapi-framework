import { ExMap } from '@quebble/models'
import { BehaviorSubject, combineLatest, EMPTY, from, Observable } from 'rxjs'
import { mergeAll } from 'rxjs/operators'

import { asArray } from '../scripts/asarray'

type JoinType = 'array' | 'merge'
type KeyType = 'array' | 'string'
type ArrayMerged<result extends Observable<any | any[]>> = result extends (
	...x: infer argumentsType
) => any[]
	? argumentsType
	: any

export abstract class StateServiceClass {
	private _states: ExMap<unknown, BehaviorSubject<unknown>> = new ExMap()

	private _jointype: JoinType = 'merge'
	private _keytype: KeyType = 'string'

	constructor(jointype?: JoinType, keytype?: KeyType) {
		this._jointype = jointype ?? 'merge'
		this._keytype = keytype ?? 'string'
	}

	private check<Y, T>(ids: Y | Y[], fallback: T = null): void {
		const checker =
			this._keytype === 'array'
				? Array.isArray(ids[0])
					? (ids as Y[])
					: ([ids] as Y[])
				: (asArray(ids) as Y[])

		checker.forEach((id) => {
			if (!this._states.has(id)) this._states.set(id, new BehaviorSubject(fallback))
		})
	}

	public get<Y, T>(operationIds: Y | Y[], fallback?: T): BehaviorSubject<T> | Observable<T> {
		if (!operationIds) return
		this.check(operationIds, fallback)

		const keys = asArray(operationIds)
		if (this._keytype === 'string') {
			return keys.length > 1
				? (this.join<Y, T>(keys) as Observable<T>)
				: (this._states.get(keys[0]) as BehaviorSubject<T>)
		}

		if (this._keytype === 'array') {
			return Array.isArray(keys[0])
				? keys.length > 1
					? (this.join<Y, T>(keys) as Observable<T>)
					: (this._states.get(keys[0]) as BehaviorSubject<T>)
				: (this._states.get(keys) as BehaviorSubject<T>)
		}
	}

	public set<Y, T>(operationId: Y, message: T): void {
		if (!operationId) return
		this.check(operationId)
		this._states.get(operationId).next(message)
	}

	public make<Y>(operationId: Y): void {
		if (!operationId) return
		this.check(operationId)
	}

	public join<Y, T>(operationIds: Y[]): ArrayMerged<Observable<T>> {
		if (!operationIds) return EMPTY
		const subjects: BehaviorSubject<T>[] = this._states
			.filter((val, key) => operationIds.includes(key as Y))
			.map((sj: BehaviorSubject<T>) => sj)

		if (this._jointype === 'merge') return from(subjects).pipe(mergeAll())
		if (this._jointype === 'array') return combineLatest(subjects)
	}

	public clear<Y>(operationIds?: Y | Y[], complete?: boolean, withValue?: any): void {
		if (!operationIds) {
			this._states.forEach((sj) => {
				sj?.next(withValue ?? null)
				if (complete) sj?.complete()
			})
			return
		}

		const ids = Array.isArray(operationIds) ? operationIds : [operationIds]

		ids.forEach((id) => {
			if (this._states.has(id)) this._states.get(id)?.next(withValue ?? null)
			if (complete) this._states.get(id)?.complete()
		})
	}
}
