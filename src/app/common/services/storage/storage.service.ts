import { filter, map, mergeAll, switchMap, takeWhile } from 'rxjs/operators'

import { Injectable } from '@angular/core'
import { cloneDeep, union } from 'lodash-es'
import { BehaviorSubject, from, iif, Observable, of, Subject } from 'rxjs'

import { asArray } from '../../scripts/asarray'
import { hasValue } from '../../scripts/hasvalue'

const watcher: Subject<StorageEvent> = new Subject()
const local: Storage = window.localStorage
const session: Storage = window.sessionStorage

window.addEventListener('storage', (event: StorageEvent) => {
	watcher.next(event)
})

@Injectable({
	providedIn: 'root',
})
export class StorageService {
	private _storage: Map<string, BehaviorSubject<any>> = new Map()
	private _watched: Map<string, Subject<number>> = new Map()
	private _locked: Set<string> = new Set()
	private _window: Set<string> = new Set()

	private readonly _prefix = 'ngq|'

	constructor() {}

	get cache(): {
		set: <T>(param: any, value: T, lock?) => void
		get: <T>(param: string, defaultIfEmpty?: T) => BehaviorSubject<T>
		val: <T>(param: string) => any
		join: <T>(params: string[]) => BehaviorSubject<T>[]
		merge: <T>(params: any, value: T, onKey?: string, remove?: any) => void | BehaviorSubject<T>
		clear: (param?: any) => void
		delete: (param: any) => void
		lock: (param: any, readonly: boolean) => void
	} {
		return {
			set: <T>(param: any, value: T, lock?): void => {
				this.cacheSet(param, value, lock)
			},
			get: <T>(param: string, defaultIfEmpty?: T): BehaviorSubject<T> => {
				return this.cacheGet(param, defaultIfEmpty) as BehaviorSubject<T>
			},
			val: <T>(param: string): any => {
				return this.cacheVal(param)
			},
			join: <T>(params: string[]): BehaviorSubject<T>[] => {
				const subjects = []
				const keys = asArray(params)
				for (const key of keys) {
					const subject = this.cacheGet(key)
					subjects.push(subject)
				}

				return subjects
			},
			merge: <T>(
				param: any,
				value: T,
				onKey?: string,
				remove?: string[],
			): void | BehaviorSubject<T> => {
				return this.cacheMerge(param, value, onKey, remove)
			},
			clear: (param?: any): void => {
				this.cacheClear(param)
			},
			delete: (param: any): void => {
				this.cacheDelete(param)
			},
			lock: (param: any, readonly: boolean): void => {
				this.cacheWrite(param, readonly)
			},
		}
	}

	private cacheSet<T>(param: any, value: T, lock?: { lock: boolean }): void {
		if (this.cacheDenied(param)) return

		const doUpdate = (param: any, value: any) => {
			if (this._storage.has(param)) {
				this._storage.get(param).next(value)
			} else {
				this._storage.set(param, new BehaviorSubject(value))
			}
		}

		if (Array.isArray(param)) {
			for (const id of param) {
				doUpdate(id, value)
			}
		} else {
			doUpdate(param, value)
		}

		if (lock && lock.lock) this.cacheWrite(param, lock.lock)
	}

	private cacheGet<T>(param: any, defaultIfEmpty?: T): BehaviorSubject<T> | Observable<T> {
		const check = (id) => {
			if (!this._storage.has(id)) {
				this._storage.set(id, new BehaviorSubject<T>(defaultIfEmpty ?? null))
			}

			return this._storage.get(id)
		}

		if (Array.isArray(param)) {
			const subjects = []

			for (const id in param) {
				const subject = check(id)
				subjects.push(subject)
			}

			return from(subjects).pipe(mergeAll())
		} else {
			check(param)
			return this._storage.get(param)
		}
	}

	private cacheVal<T>(param: any): any {
		const subject = this.cacheGet(param) as BehaviorSubject<T>
		return subject.getValue()
	}

	private cacheMerge<T>(
		params: any,
		value: T,
		onKey?: string,
		remove?: any,
	): void | BehaviorSubject<T> {
		if (this.cacheDenied(params) && !onKey) return

		const values: any = value

		const doMerge = (param: any, merge: any = values): void => {
			const subject = this.cacheGet<T>(param) as BehaviorSubject<T>
			const current = subject.getValue()
			if (!current) return

			if (Array.isArray(merge)) {
				if (Array.isArray(current)) {
					merge = union(current, merge)
				} else {
					merge = [cloneDeep(current)].concat(merge)
				}
			} else {
				if (Array.isArray(current)) {
					merge = cloneDeep(current).push(merge)
				} else if (typeof merge === 'object' && typeof current === 'object') {
					merge = Object.assign(merge, current)
				} else {
					merge = [current, merge]
				}
			}
		}

		const assign = (param: any, merge: any = values): void => {
			const subject = this.cacheGet<T>(param) as BehaviorSubject<T>
			subject.next(merge)
		}

		const array = Array.isArray(params) ? params : [params]
		array.forEach((param) => doMerge(param))
		if (onKey) {
			doMerge(onKey)
			assign(onKey)
		} else {
			array.forEach((param) => assign(param))
		}
		if (remove) {
			const removers = Array.isArray(remove) ? remove : [remove]
			array
				.filter((param) => removers.includes(param))
				.forEach((param) => this.cacheDelete(param))
		}
		if (onKey) {
			return this.cacheGet<T>(onKey) as BehaviorSubject<T>
		}
	}

	private cacheClear(param?: any, remove: boolean = false): void {
		const clean = (id) => {
			const exists = this._storage.get(id)
			if (exists) {
				exists.next(undefined)
				if (remove) {
					exists.complete()
					this._storage.delete(id)
					this._locked.delete(id)
				}
			}
		}

		if (Array.isArray(param)) {
			for (const id in param) {
				clean(id)
			}
		} else {
			if (param) clean(param)
			else {
				this._locked.clear()
				this._storage.clear()
			}
		}
	}

	private cacheDelete(param: any): void {
		this.cacheClear(param, true)
	}

	private cacheWrite(param: any, readonly: boolean): void {
		const update = (id: string, state: boolean) => {
			if (state) {
				this._locked.add(id)
			} else {
				this._locked.delete(id)
			}
		}

		if (Array.isArray(param)) {
			for (const id of param) {
				update(id, readonly)
			}
		} else {
			update(param, readonly)
		}
	}

	private cacheDenied(param: any): boolean {
		if (Array.isArray(param)) {
			let denied = false
			for (const id of param) {
				if (denied) break
				denied = this._locked.has(id)
			}
			return denied
		} else {
			return this._locked.has(param)
		}
	}

	get local() {
		return this.storageMethods(local)
	}

	get session() {
		return this.storageMethods(session)
	}

	private storageMethods(
		type: Storage,
	): {
		set: <T>(key: any, value: T, watched?: boolean) => void
		get: <T>(key: any) => T
		join: <T>(key: string[]) => T[]
		clear: (key?: any, partial?: boolean) => void
		watch: (key: any) => void
		stream: <T>(key?: any) => Observable<T>
		observe: <T>(key: any) => Observable<T>
	} {
		return {
			set: <T>(key: any, value: T, watched?: boolean) => {
				this.storageSet<T>(type, key, value, watched)
			},
			get: <T>(key: string) => {
				return this.storageGet<T>(type, key) as T
			},
			join: <T>(keys: string[]) => {
				return this.storageGet<T>(type, keys) as T[]
			},
			clear: (key?: any, partial?: boolean) => {
				this.storageClear(type, key, partial)
			},
			watch: (key: any) => {
				if (!this._watched.has(key)) this._watched.set(key, new Subject())
			},
			stream: (key?: any) => {
				return this.storageStream(type, key)
			},
			observe: <T>(key: any) => {
				return this.storageObserve<T>(type, key)
			},
		}
	}

	private storageSet<T>(type: Storage, key: any, value: T, watched?: boolean): void {
		const set = (id, val) => {
			let parsed = val
			try {
				const check = JSON.parse(val)
				if (check && typeof check === 'object') parsed = val
			} catch (error) {
				parsed = JSON.stringify(val)
			}

			type.setItem(this._prefix + id, parsed)
			this._window.add(id)

			if (watched && !this._watched.has(id)) this._watched.set(id, new Subject())

			this.storageWatch(id, parsed.length)
		}

		if (Array.isArray(key)) {
			for (const id in key) {
				set(id, value)
			}
		} else {
			set(key, value)
		}
	}

	private storageGet<T>(type: Storage, key: any): T | T[] {
		const get = (id): T => {
			const val = type.getItem(this._prefix + id)
			this._window.add(id)

			try {
				const check = JSON.parse(val)
				if (check && typeof check === 'object') return check
			} catch (error) {
				return val as any
			}
		}

		if (Array.isArray(key)) {
			const list = []
			for (const id in key) {
				list.push(get(id))
			}
			return list.filter((item) => item !== null) as T[]
		} else {
			return get(key)
		}
	}

	private storageClear(type: Storage, key?: any, partial?: boolean): void {
		const remove = (id): void => {
			try {
				const val = type.getItem(this._prefix + id)
				if (val) {
					type.removeItem(this._prefix + id)
				}
			} catch (error) {}

			this._window.delete(id)
		}

		const frompartial = (prefix) => {
			const arr = []
			for (let i = 0; i < type.length; i++) {
				const key = type.key(i)
				if (key.indexOf(prefix) > -1) arr.push(key)
			}

			arr.forEach((key) => {
				type.removeItem(key)
			})

			return
		}

		if (partial) return frompartial(key)

		if (Array.isArray(key)) {
			for (const id in key) {
				remove(id)
			}
		} else {
			if (!key) {
				this._window.forEach((item) => remove(item))
			} else {
				remove(key)
			}
		}
	}

	private storageWatch(key: any, length: number): void {
		if (!key) return
		if (this._watched.has(key)) {
			this._watched.get(key).next(length)
		}
	}

	private storageStream<T>(type: Storage, key: any): Observable<T> {
		if (!key) return
		if (!this._watched.has(key)) this._watched.set(key, new Subject())

		return this._watched
			.get(key)
			.pipe(
				switchMap((num) =>
					iif(() => hasValue(num), of(this.storageGet<T>(type, key)), of(undefined)),
				),
			) as Observable<T>
	}

	private storageObserve<T>(type: Storage, key: any): Observable<T> {
		const watchlist = Array.isArray(key) ? key : [key]
		const mapped = watchlist.map((item) => this._prefix + item)
		const subject = watcher.pipe(
			filter((event) => event.storageArea === type),
			filter((event) => mapped.indexOf(event.key) > -1),
			map((event) => {
				if (event) {
					try {
						const parsed = JSON.parse(event.newValue)
						if (parsed && typeof parsed === 'object') return parsed
					} catch (e) {
						try {
							const parsed = JSON.parse(event.oldValue)
							if (parsed && typeof parsed === 'object') return parsed
						} catch (e) {
							return null
						}
						return null
					}
				}
			}),
			takeWhile(() => watcher.observers.length > 0),
		)

		return subject as Observable<T>
	}
}
