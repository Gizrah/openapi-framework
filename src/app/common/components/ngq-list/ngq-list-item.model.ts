import { ExMap, List } from '@quebble/models'
import { hasValue } from '@quebble/scripts'

export class NgqListItem {
	[key: string]: any

	public __state: boolean = true
	public __index: number = 0
	public __idkey: any = 'id'
	public __indent: number = 1
	public __toggles: ExMap<any, boolean>
	public __selected: List<any>
	public __ancestors: List<any>
	public __children: List<any>

	constructor(
		item: any,
		togglemap: ExMap<any, boolean>,
		selected: List<any>,
		ancestors: List<any>,
	) {
		if (!item) return

		for (const key in item) {
			this[key] = item[key]
		}

		this.__toggles = togglemap ?? new ExMap()
		this.__selected = selected ?? new List()
		this.__ancestors = new List(ancestors?.toArray() ?? [])
	}

	public __toggle(state?: boolean): void {
		this.__state = hasValue(state) ? state : !this.__state
		this.__toggles.set(this[this.__idkey], this.__state)
	}

	get __parent(): boolean {
		return this.__children?.size > 0 ?? false
	}

	get __visible(): boolean {
		for (const ancestor of this.__ancestors) {
			if (!this.__toggles?.get(ancestor)) return false
		}

		return true
	}

	get __subactive(): boolean {
		if (!this.__parent) return false
		return this.__children.some((child) => this.__selected.has(child))
	}
}
