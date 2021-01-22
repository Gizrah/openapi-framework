import { isEqual } from 'lodash-es'

type Iterable<T, Y> = any | Record<string, unknown> | Y[] | [T, Y][] | Set<Y> | Map<T, Y>

export class List<T> extends Set {
	/**
	 * @augments Set<T>
	 * @summary
	 * Extends Set with the option to use anything in the set besides numbers
	 * and strings and adds methods from Array.prototype as well as other
	 * useful tidbits. Constructor supers to Set. Available methods are:
	 * > `first`: get the first item in the map, returns `Y`
	 *
	 * > `last`: get the last item in the map, returns `Y`
	 *
	 * > `delete`: extended with comparator function as parameter
	 *
	 * > `index`: get the entry at the given index, returns `T`
	 *
	 * > `indexOf`: get the index of supplied key, returns `number` or `-1`
	 *
	 * > `concat`: concatenate any iterable to the map, returns `List<T>`
	 *
	 * > `slice`: use keys to slice the map, returns `List<T>`
	 *
	 * > `some`: Array.some, matches callback fn, returns `boolean`
	 *
	 * > `every`: Array.every, matches callback fn, returns `boolean`
	 *
	 * > `includes`: Array.includes, matches callback fn, returns boolean.
	 *
	 * > `find`: Array.find, matches callback fn, returns `T`
	 *
	 * > `map`: Array.map, matches callback fn, returns `T[]`
	 *
	 * > `filter`: Array.filter, matches callback fn, returns `List<T>`
	 *
	 * > `forEach`: extends Set.forEach, callback fn has access to the default
	 * value, key and list, as well as the next and previous key and the index of
	 * the current item
	 *
	 * > `toArray`: returns `T[]`
	 *
	 * @param iterable Iterable (array, tuple-array, Set-like, Map-like)
	 * @param isNotMap Iterable is NOT Map-like (array with arrays)
	 */
	constructor(iterable?: any | any[], isNotMap?: boolean) {
		super()
		this.__parseIterable(iterable, isNotMap)
	}

	/**
	 * Disguises itself as Set by default
	 */
	static get [Symbol.species]() {
		return Set
	}

	/**
	 * @summary
	 * Return the first value in the map
	 *
	 * @returns T
	 */
	get first(): T {
		for (const [key] of this.entries()) {
			return key
		}
	}

	/**
	 * @summary
	 * Return the last value in the map
	 *
	 * @returns T
	 */
	get last(): T {
		let i = 0

		for (const [key] of this.entries()) {
			i++
			if (i === this.size) return key
		}
	}

	/**
	 * @augments super.has
	 * @summary
	 * Extends super.has by using lodash's `isEqual` method to compare items in
	 * the list.
	 *
	 * @param item item to check for
	 *
	 * @returns boolean
	 */
	public has(item: T): boolean {
		for (const [key] of this.entries()) {
			if (isEqual(key, item)) return true
		}

		return false
	}

	/**
	 * @augments super.add
	 * @summary
	 * Extends the super.add method with an internal check to the custom `has`
	 * function.
	 *
	 * @param item item to add
	 *
	 * @returns List<T>
	 */
	public add(item: T): this {
		if (!this.has(item)) super.add(item)
		return this
	}

	/**
	 * @augments super.delete
	 * @summary
	 * Extends the super.delete method that allows an item or a comparator
	 * function delete.
	 *
	 * @param item item to delete or comparator function
	 *
	 * @returns boolean
	 */
	public delete(item: T | ((key: T) => any)): boolean {
		const comparator = typeof item === 'function' ? (item as (key: T) => any) : isEqual

		for (const [key] of this.entries()) {
			if (comparator(key, item)) return super.delete(key)
		}

		return false
	}

	/**
	 * @summary
	 * Return the key and value at the given index of the map.
	 *
	 * @param index index number
	 *
	 * @returns T
	 */
	public index(index: number): T {
		let idx: number = -1

		for (const [key] of this.entries()) {
			idx++
			if (index === idx) return key
		}

		return undefined
	}

	/**
	 * @summary
	 * Similar to Array.indexOf, returns the index of the given key in the map.
	 *
	 * @param key Key to get the indexOf
	 *
	 * @returns number || -1
	 */
	public indexOf(key: T): number {
		let index: number = -1

		for (const [k] of this.entries()) {
			index++
			if (k === key) return index
		}

		return -1
	}

	/**
	 * @summary
	 * Implements Array.concat functionality, allowing for any iterable to be
	 * added. Only adds values if the parameter value is Map-like, unless the
	 * `isNotMap` boolean is set -- e.g. the iterable is an array of arrays.
	 *
	 * @param iterable Iterable (array, tuple-array, Set-like, Map-like)
	 * @param isNotMap Iterable is NOT map-like
	 *
	 * @returns this
	 */
	public concat(iterable: Iterable<unknown, T>, isNotMap?: boolean): this {
		this.__parseIterable(iterable, isNotMap)

		return this
	}

	/**
	 * @summary
	 * Similar to Array.slice, but instead of using the index, the values of the
	 * list or comparator functions are used for determining where to start
	 * and/or end the slicing.
	 *
	 * @param start starting key or comparator function
	 * @param end ending key or comparator function
	 *
	 * @returns List<T>
	 */
	public slice(start?: T | ((key: T) => any), end?: T | ((key: T) => any)): List<T> {
		const list: List<T> = new List()
		const begin: boolean = this.__hasValue(start)
		const final: boolean = this.__hasValue(end)

		if (!begin && !final) return this

		const startFn: boolean = begin && typeof start === 'function'
		const endFn: boolean = final && typeof end === 'function'

		let first: boolean = false

		for (const [key] of this.entries()) {
			if (begin || final) {
				if (!begin && final) first = true

				if (begin) {
					const fn = start as (key: T) => any
					if ((startFn && fn(key)) || isEqual(key, start)) {
						first = true
						list.add(key)
					}
				}

				if (final) {
					const fn = end as (key: T) => any
					if ((endFn && fn(key)) || isEqual(key, end)) {
						first = false
						list.add(key)
					}
				}

				if (first) {
					list.add(key)
				} else break
			}
		}

		return list
	}

	/**
	 * @summary
	 * Implements Array.some functionality, returns true on the first
	 * confirmation by the callback function supplied.
	 *
	 * @param callbackFn callback function
	 *
	 * @returns boolean
	 */
	public some(callbackFn: (key: T) => any): boolean {
		for (const [key] of this.entries()) {
			if (callbackFn(key)) return true
		}

		return false
	}

	/**
	 * @summary
	 * Implements Array.every functionality, returns false on the first
	 * inversed confirmation by the callback function supplied.
	 *
	 * @param callbackFn callback function
	 *
	 * @returns boolean
	 */
	public every(callbackFn: (key: T) => any): boolean {
		for (const [key] of this.entries()) {
			if (!callbackFn(key)) return false
		}

		return true
	}

	/**
	 * @summary
	 * Implements Array.includes functionality, returns true on the first
	 * confirmation by the callback function supplied.
	 *
	 * @param callbackFn callback function
	 *
	 * @returns boolean
	 */
	public includes(callbackFn: (key: T) => any): boolean {
		for (const [key] of this.entries()) {
			if (callbackFn(key)) return true
		}

		return false
	}

	/**
	 * @summary
	 * Implements Array.find functionality, parses the list for the first
	 * confirmed callback function hit.
	 *
	 * @param callbackFn callback function
	 *
	 * @returns T
	 *
	 * @example
	 * ```
	 * 	const found: T = myList.find((item) => item.id === myId)
	 * ```
	 */
	public find(callbackFn: (key: T) => any): T {
		for (const [key] of this.entries()) {
			if (callbackFn(key)) return key
		}

		return
	}

	/**
	 * @summary
	 * Implements the Array.map functionality, but converts the List to an
	 * array of values based on confirmed callback function hits.
	 *
	 * @param callbackFn callback function
	 *
	 * @returns Array<unknown>
	 *
	 * @example
	 * ```
	 * 	const myArray = myList.map((key, value) => value.property)
	 * ```
	 */
	public map(callbackFn: (key: T, index: number) => any): any[] {
		const results = []
		let index = -1
		for (const [key] of this.entries()) {
			index++
			results.push(callbackFn(key, index))
		}

		return results
	}

	/**
	 * @summary
	 * Implements the Array.filter functionality, returning the filtered List
	 * based on confirmed callback function hits.
	 *
	 * @returns List<T>
	 * @example
	 * ```
	 * 	const filterList = myList.filter((key, value) => value !== undefined)
	 * ```
	 */
	public filter(callbackFn: (key: T, index: number) => any): List<T> {
		const map: List<T> = new List()
		let index = -1

		for (const [key] of this.entries()) {
			index++
			if (callbackFn(key, index)) map.add(key)
		}

		return map
	}

	/**
	 * @augments super.forEach
	 * @summary
	 * Extends Map.forEach functionality, by adding the next and previous keys
	 * as well as the index to the callback function.
	 *
	 * @returns void
	 *
	 * @example
	 * ```
	 * 	myList.forEach((value, key, list, next, previous, index) => {
	 * 		const nextItem: T = myList.get(next)
	 * 		const previousItem: T = myList.get(previous)
	 * 		const atIndex: T = myList.index( index + 2 )
	 * 	})
	 * ```
	 */
	public forEach(
		callbackFn: (
			value: T,
			value2: T,
			list: List<T>,
			next?: T,
			previous?: T,
			index?: number,
		) => any,
	): void {
		let index = -1
		const idxMap: Map<number, T> = new Map()
		for (const [key] of this.entries()) {
			index++
			idxMap.set(index, key)
		}

		index = -1

		for (const [value1, value2] of this.entries()) {
			index++
			const nextKey = idxMap.get(index + 1)
			const lastKey = idxMap.get(index - 1)

			callbackFn(value1, value2, this, nextKey, lastKey, index)
		}
	}

	/**
	 * @summary
	 * Convert the list to an unfiltered array with only the values.
	 *
	 * @returns
	 * Array of values
	 */
	public toArray(): T[] {
		return Array.from(this)
	}

	/**
	 * @summary
	 * Parse any iterable to create values in the List. Skips if the iterable
	 * has a method called apply, since it's a function at that point. If the
	 * iterable has a function `forEach` it is treated as an iterable. If the
	 * iterable is an object, the object keys are parsed. If the iterable is
	 * Map-like, only values are store unless `isNotMap` is true.
	 *
	 * @param iterable any iterable
	 * @param isNotMap Iterable is NOT map-like
	 */
	private __parseIterable(iterable: Iterable<unknown, T>, isNotMap?: boolean): void {
		if (!iterable) return
		if (typeof iterable === 'function') return

		if (iterable['forEach'] && typeof iterable['forEach'] === 'function') {
			if (Array.isArray(iterable)) {
				if (!iterable.length) return
				iterable.forEach((value) => {
					if (
						Array.isArray(value) &&
						this.__hasValue(value[0]) &&
						value.length === 2 &&
						!isNotMap
					) {
						this.add(value[1])
					} else {
						this.add(value)
					}
				})
			} else if (iterable['add'] && typeof iterable['add'] === 'function') {
				if (!iterable.size) return
				Array.from(iterable).forEach((value: T) => this.add(value))
			} else if (iterable['set'] && typeof iterable['set'] === 'function') {
				if (!iterable.size) return
				iterable.forEach((value: T) => {
					this.add(value)
				})
			}
		} else if (typeof iterable === 'object') {
			for (const key in iterable) {
				const value = iterable[key]
				if (value) this.add(value)
			}
		}
	}

	/**
	 * @summary
	 * Implements a not-null-or-undefined check on the supplied value. Takes in
	 * to account if the value is an array and if it has length.
	 *
	 * @param val value to check
	 *
	 * @returns boolean
	 */
	private __hasValue(val: any): boolean {
		if (typeof val === 'string' || Array.isArray(val)) return val.length > 0
		return val !== undefined && val !== null && val !== ''
	}
}
