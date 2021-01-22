import { Injectable } from '@angular/core'
import { ExMap } from '@quebble/models'

@Injectable({
	providedIn: 'root',
})
export class NgqBarService {
	private _items: ExMap<string, any> = new ExMap()

	constructor() {}

	public has(key: string): boolean {
		return this._items.has(key)
	}

	public val(key: string): boolean {
		return !!this._items.get(key)
	}

	public get(key: string): any {
		return this._items.get(key)
	}

	public set(key: string, value: any): void {
		this._items.set(key, value)
	}
}
