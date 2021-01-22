import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop'
import { EventEmitter, Injectable } from '@angular/core'
import { DisplayItem } from '@quebble/interfaces'
import { ExMap, List } from '@quebble/models'
import { OpenApi } from '@quebble/openapi'
import { asArray, hasValue, Methods } from '@quebble/scripts'
import { orderBy } from 'lodash-es'
import { BehaviorSubject, Subscription } from 'rxjs'

import { NgqListItem } from './ngq-list-item.model'

export interface ListOptions {
	header: boolean
	sorting: boolean
	search: boolean
	edit: boolean
	filter: boolean
	ops: boolean
	avatar: boolean
	output: boolean
	multiple: boolean
	expand: boolean
	focus: boolean
	full: boolean
	index: boolean
}

export interface ListItemStyle {
	style: Record<string, any> | null
	key: any | any[]
}

interface ItemHistory {
	id: any
	array: any[]
	history: any[]
}

type Key = string
type Icon = string
type ItemParam = string
type Direction = 'asc' | 'desc'
type Color = string

@Injectable()
export class ListStateService {
	public operation: OpenApi.Operation = new OpenApi.Operation()
	public operations: OpenApi.Operation[] = []
	public getop: OpenApi.Operation = new OpenApi.Operation()

	public headercols: [Key, Icon, ItemParam][] = []
	public headercolscount: string
	public opsearch: boolean
	public rowcount: number = 1

	private _chunk: OpenApi.Chunk
	private _loader: string[] = []
	private _options: ListOptions = {} as any
	private _sorting: List<[Key, Icon, Direction]> = new List()
	private _actions: ExMap<Key, [Key, Icon, ItemParam, Color]> = new ExMap()
	private _states: ExMap<Key, boolean> = new ExMap()
	private _history: ExMap<number, ItemHistory> = new ExMap()
	private _itemstyle: ExMap<any, Record<string, any>> = new ExMap()

	private _treelike: boolean = false
	private _editable: boolean = false
	private _indented: boolean = true
	private _searchidt: boolean = true
	private _searchstate: boolean = false
	private _editstate: boolean = false
	private _dragstate: boolean = false
	private _avatar: boolean = false
	private _small: boolean = false
	private _index: boolean = false

	private _reduced: string[] = []
	private _condensed: string[] = []
	private _display: DisplayItem[]
	private _displayalt: DisplayItem[]
	private _viewkeys: any[] = []
	private _fontsize: number = Methods.FontSize()
	private _maxwidth: number
	private _dragitem: NgqListItem
	private _undostep: number = 0
	private _redostep: number = 0

	private _header: any
	private _title: any
	private _originals: ExMap<string | number, any> = new ExMap()
	private _sorted: NgqListItem[] = []
	private _selected: List<any> = new List()
	private _items: ExMap<any, NgqListItem> = new ExMap()

	private _parentId = 'parent_id'
	private _order = 'order'
	private _idKey = 'id'

	public select: EventEmitter<any | any[]> = new EventEmitter()
	public action: EventEmitter<any> = new EventEmitter()
	public search: EventEmitter<[number, OpenApi.ParameterObject, string]> = new EventEmitter()
	public dialog: EventEmitter<any> = new EventEmitter()
	public page: EventEmitter<[string, any]> = new EventEmitter()

	private condensed$: BehaviorSubject<number> = new BehaviorSubject(0)
	private consub$: Subscription
	private items$: BehaviorSubject<NgqListItem[]> = new BehaviorSubject([])

	constructor(private openapi: OpenApi.OpenApiService) {
		this.consub$ = this.condensed$.subscribe((num) => {
			if (!this._maxwidth) this._maxwidth = 25 * this._fontsize
			this._small = num <= this._maxwidth
		})
	}

	set options(options: ListOptions) {
		this._options = options ?? ({} as any)
	}

	get options() {
		return this._options
	}

	set resize(num: number) {
		if (!isNaN(parseInt(num as any))) this.condensed$.next(num)
	}

	get chunk(): OpenApi.Chunk {
		return this._chunk
	}

	get loaders(): string[] {
		return this._loader
	}

	get display(): DisplayItem[] {
		return this.condensed ? this._displayalt : this._display
	}

	get columns(): boolean {
		return this.options.sorting && !this.condensed && !!this.headercols?.length
	}

	get actionbar(): boolean {
		return this.options.sorting && this.condensed && !!this._actions.size
	}

	get avatar(): boolean {
		return this._avatar && this.options.avatar
	}

	get searchstate(): boolean {
		return this._searchstate
	}

	get headerselect(): boolean {
		return !!this._header?.id
	}

	get condensed(): boolean {
		return this._small
	}

	get viewkeys(): string[] {
		return this.condensed ? this._condensed : this._reduced
	}

	get originalvk(): any[] {
		return this._viewkeys
	}

	get actions(): any[] {
		return this._actions?.toArray()
	}

	get indented(): boolean {
		return this._indented
	}

	get itemsstream() {
		return this.items$
	}

	get header() {
		return this._title
	}

	get editable() {
		return this._editable
	}

	get edit() {
		return this._editstate
	}

	get flatten() {
		return this._treelike
	}

	get undo() {
		const size = this._history.size
		if (!size || size === 1) return false
		const nochange = this._undostep === 0 && this._redostep === 0
		if (nochange) return true

		return this._undostep > 0
	}

	get redo() {
		const size = this._history.size
		if (!size || size === 1) return false
		if (this._undostep === this._redostep) return false
		const changed =
			!!size && this._redostep > this._undostep && this._redostep < this._history.size
		if (changed) return true
		const notlast = size - 1 !== this._undostep
		return notlast
	}

	get save() {
		return !!this._history.size && this._history.size > 1 && this._undostep > 0
	}

	get clear() {
		return !!this._history.size && this._history.size > 1
	}

	get selected() {
		const parse = (item: any): any => {
			if (!item) return null
			if (this._index) return item['__index']
			return (item ?? {})[this._idKey] ?? item?.id ?? item?.__index
		}

		return {
			has: (check: any): boolean => {
				return this._selected.has(parse(check))
			},
			add: (check: any): any => {
				return this._selected.add(parse(check))
			},
			delete: (check: any): boolean => {
				return this._selected.delete(parse(check))
			},
			clear: () => {
				return this._selected.clear()
			},
			toArray: this._selected.toArray(),
			size: this._selected.size,
			first: this._selected.first,
			last: this._selected.last,
		}
	}

	get itemstyle() {
		const parse = (item: any): any => {
			if (!item) return null
			if (this._index) return item['__index']
			return (item ?? {})[this._idKey] ?? item?.id ?? item?.__index
		}

		return {
			has: (check: any): boolean => {
				return this._itemstyle.has(parse(check))
			},
			get: (check: any): any => {
				return this._itemstyle.get(parse(check)) ?? null
			},
		}
	}

	public ngOnDestroy(): void {
		this.condensed$?.next(null)
		this.condensed$?.complete()
		this.consub$?.unsubscribe()
	}

	/**
	 * @summary
	 * Initialize the service based on the supplied Chunk or OperationModel (if
	 * supplied) and the ListOptions object. Does the initial setup for toggles
	 * and states.
	 *
	 * @param base Chunk or OperationModel
	 * @param options ListOptions object
	 */
	public init(base: OpenApi.Chunk | OpenApi.Operation, options: ListOptions): void {
		const chunk = base instanceof OpenApi.Chunk ? base : null
		const operation =
			base instanceof OpenApi.Operation ? base : chunk?.operation ?? new OpenApi.Operation()
		const getop = chunk?.linkops?.find((op) => op.type === 'get')
		const schema = getop?.schemas?.get('get') ?? operation?.schemas?.get ?? ({} as any)
		const { avatar, image, gender } = schema?.properties ?? {}
		const hasAvatar = !!avatar || !!image || !!gender
		const parent = this._parentId in (schema?.properties ?? {})
		const editable = this._order in (schema?.properties ?? {}) ?? parent

		this._chunk = chunk
		this._avatar = hasAvatar
		this._treelike = parent
		this._editable = editable
		this._index = options?.index ?? false
		this._options.avatar = options?.avatar && hasAvatar
		this._options.edit = options?.edit && editable
		this.options = options
		this.operation = operation
		this.getop = getop ?? new OpenApi.Operation()
		this.operations = [...(chunk?.operations ?? []), ...(chunk?.linkops ?? [])]
			.filter((op) => op.type === 'post' || op.type === 'delete')
			.sortBy((item: any) => item.type)
			.reverse()

		this._loader = (chunk
			? [chunk.viewchunks.get('array')?.operation?.id, ...this.operations.map((a) => a.id)]
			: [operation?.id]
		).filter((a) => !!a)

		this.opsearch = operation?.params.some((param) => param.name === 'search')

		this.setupDisplay()
		this.setupHeaderColumns()
	}

	/**
	 * @summary
	 * Update booleans and states based on the various inputs of the main
	 * component. Reinitializes the view, columns, header and actions right
	 * after, so the view reflects the changes in the options. Useful for rights
	 * and/or state changes in the main application that (dis)allow certain
	 * actions.
	 *
	 * @param options ListOptions object
	 */
	public update(options: ListOptions): void {
		this._options = options

		this._options.avatar = this.options.avatar && this._avatar
		this._options.edit = this.options.edit && this._editable

		this._index = this.options.index
		this._idKey = this.options.index ? '__index' : this._idKey

		this.setupDisplay()
		this.setupHeaderColumns()
		this.setupHeader(this._header)
		this.setupActions()
	}

	/**
	 * @summary
	 * Reinitialize the array and update the list. Since the idKey has been
	 * updated, the selected items are no longer valid.
	 */
	public changeIdKey(): void {
		this._selected.clear()
		if (this._originals.size) this.setupArray(this._originals.map((a) => a))
	}

	/**
	 * @summary
	 * Initializes the view based on the Chunk and possible configurations in
	 * the Chunk's operation of the currently set operation if no operation is
	 * found in the Chunk.
	 *
	 * Uses the DisplayItem viewstyle to create views.
	 *
	 * Creates a condensed view and a wide view. The condensed view is based on
	 * the available subject or info fields available in the OperationModel and
	 * this is also used to generate a fallback wide view if no display keys are
	 * found in the custom settings in the OperationModel.
	 *
	 * Based on the display keys, the amount of visible rows per item is also
	 * set, which will be used in setting the height of each item in the list.
	 *
	 * @param chnk Chunk
	 */
	private setupDisplay(chnk?: OpenApi.Chunk): void {
		const operation = chnk?.operation ?? this.operation

		if (!operation?.id) return

		const { subject, info } = operation
		const condensed: any = [[subject ?? info]]
		const fallback: any = [[subject, info].filter((a) => !!a)]

		this._displayalt = condensed
			.map((item) => {
				const key = this.openapi.getDisplayItems(item) ?? null
				return key
			})
			.filter((a) => !!a)

		const keys = fallback
		this._viewkeys = keys
		const display = keys
			.map((item) => {
				const key = this.openapi.getDisplayItems(item) ?? null
				return key
			})
			.filter((a) => !!a)

		this._display = display ?? []
		this._condensed = [subject ?? info]

		this.rowcount = keys.length

		const viewset: List<string> = new List()
		const doreduce = (items: DisplayItem[]) => {
			for (const item of items) {
				if (item.label) viewset.add(item.label)

				if (Array.isArray(item.value)) {
					doreduce(item.value)
				}
			}
		}

		doreduce(display)
		this._reduced = viewset.toArray()
	}

	/**
	 * @summary
	 * Set a custom view based on the DisplayItem viewstyle. If no Chunk or
	 * OperationModel is available, a view still needs to be set in order for
	 * the item rows to display any text.
	 *
	 * Applies the same values as the `setupDisplay` method, except there's less
	 * fallback trickery.
	 *
	 * @param small boolean toggle for view type (condensed/default)
	 * @param viewkeys the DisplayItem viewstyle item
	 */
	public setupCustomView(small: boolean, viewkeys: any | any[]): void {
		this._viewkeys = asArray(viewkeys)
		const mapped = asArray(viewkeys)
			.map((item) => {
				const key = this.openapi.getDisplayItems(item) ?? null
				return key
			})
			.filter((a) => !!a)

		if (!mapped.length) return

		const viewset: List<string> = new List()
		const doreduce = (items: DisplayItem[]) => {
			for (const item of items) {
				if (item.label) viewset.add(item.label)

				if (Array.isArray(item.value)) {
					doreduce(item.value)
				}
			}
		}

		doreduce(mapped)
		const arrayed = viewset.toArray()

		if (small) {
			this._display = mapped
			this._displayalt = mapped
			this._condensed = arrayed
			this._reduced = arrayed
		} else {
			this._reduced = arrayed
			this._display = mapped
		}

		this.rowcount = mapped.length
	}

	/**
	 * @summary
	 * Initialize the list's header columns. Each column is a tuple with the
	 * translation string if available, the Font Awesome icon and the label that
	 * was set in the DisplayItems list set by the view setup methods.
	 */
	private setupHeaderColumns(): void {
		if (!this.options.sorting) return

		const prefix = this.operation?.prefix
		const tlprefix = prefix ? `schema.${prefix}.` : ''

		const mapped: [string, string, string][] = this._reduced.map((item) => [
			tlprefix + item,
			'unsorted',
			item,
		])

		const headers = mapped ?? []
		this.headercols = this.options.avatar ? [[null, null, null], ...headers] : headers

		const repeat = `repeat(${mapped.length}, 1fr)`
		this.headercolscount = this.options.avatar ? `3em ${repeat}` : repeat
	}

	/**
	 * @summary
	 * Initialize the actions from the available settings and values.
	 *
	 * If operations are available and set to show, POST and DELETE actions are
	 * created. These are visible next to the search bar if no other actions are
	 * available. Otherwise, they're shown in the actions bar.
	 *
	 * Add/delete, sorting, editing, collapsing and filter are the available
	 * actions. If none of the actions are set or available through options or
	 * lack of settings, no actions will be displayed.
	 *
	 * Actions are refreshed every time an option is changed.
	 */
	private setupActions(): void {
		const { subject, info } = this.operation ?? {}
		const tuple = [null, null, subject ?? info, null]

		if (this.options.sorting && this.viewkeys.length) {
			const alpha: [Key, Icon, ItemParam, Color] = [
				'alpha',
				'sort-alpha-asc',
				tuple[2],
				'grey-alt',
			]
			const num: [Key, Icon, ItemParam, Color] = [
				'numeric',
				'sort-numeric-asc',
				this._order,
				'grey-alt',
			]

			this._actions.set('alpha', alpha)
			this._actions.set('numeric', num)
			this._actions.set('split_sort', null)
		} else {
			this._actions.delete('alpha')
			this._actions.delete('numeric')
			this._actions.delete('split_sort')
		}

		if (this._treelike) {
			const flat: [Key, Icon, ItemParam, Color] = ['flatten', 'dedent', tuple[2], 'info-alt']
			this._actions.set('flatten', flat)
			this._actions.set('flatten_sort', null)
		} else {
			this._actions.delete('flatten')
			this._actions.delete('flatten_sort')
		}

		if (this.options.edit && !this._editstate) {
			const edit: [Key, Icon, ItemParam, Color] = ['editable', 'pencil', null, 'success-alt']
			this._actions.set('editable', edit)
			this._actions.set('editable_sort', null)
		} else {
			this._actions.delete('editable')
			this._actions.delete('editable_sort')
		}
	}

	/**
	 * @summary
	 * Sets the header (title) of the list if available. Uses the current Chunk,
	 * if available, to check if there's an operation with subject or info to
	 * use for displaying the object.
	 *
	 * @param item the header object
	 *
	 * @todo
	 * Fallback for non-selectable title only
	 */
	public setupHeader(item: any): void {
		this._header = item
		if (!item) {
			this._title = undefined
			return
		}

		const tree: OpenApi.Chunk = this._chunk?.viewchunks.get('header')
		if (!tree) {
			this._title = undefined
			return
		}

		const content = item.attributes ?? item
		const operation = tree.operation ?? ({} as any)
		const { subject, info } = operation
		this._title = content[subject ?? info] ?? undefined
	}

	/**
	 * @summary
	 * Setup the array to use in the list. Parses the items and checks for a key
	 * that can be used as the index. Uses `id` if available and `index-select`
	 * has not been set to true in the main component. Otherwise falls back to
	 * the index, as stored in the added `__index` property.
	 *
	 * This id key is used throughout the service to (de)select and modify items
	 * in the array.
	 *
	 * The array is parsed for child/parent relations and if these are available
	 * the list is setup as a collapsable tree.
	 *
	 * Each item holds a list of children as well as a list of ancestors. Each
	 * item in the list has a reference to the service's list of states and
	 * selected items. This allows for quick access to changed states for each
	 * item in the list.
	 *
	 * Updates to the array reset the current history states.
	 *
	 * @param items list of items to be used for the list
	 *
	 * @todo
	 * Notification that the array has been updated and the current history
	 * states are invalidated.
	 */
	public setupArray(items: any[]): void {
		const unsorted = asArray(items)
		const idKeys = new List<string>()
		const array = unsorted.map((item, index) => {
			const clone: any = {}
			for (const key in item) {
				clone[key] = item[key]
			}

			clone['__index'] = index
			clone['__idkey'] = 'id' in item ? 'id' : '__index'
			idKeys.add(clone.__idkey)

			const original = this._index ? '__index' : clone['__idkey']
			this._originals.set(clone[original], item)

			return clone
		})

		this._idKey = this._index ? '__index' : !idKeys.has('id') ? idKeys.first : 'id'

		const sorted = []
		let maxindent = 1

		const findchildren = (item: any): void => {
			const parent_id = (item ?? {})[this._idKey]
			if (!parent_id) return

			const indent = item.__indent ?? 1
			const children = array.filter(
				(item) => (item.attributes ?? item)[this._parentId] === parent_id,
			)
			if (children.length) {
				item.__state = true
				this._states.set(item[this._idKey], true)

				children.forEach((initem) => {
					const child = new NgqListItem(
						initem,
						this._states,
						this._selected,
						item.__ancestors,
					)
					child.__indent = indent + 1
					if (child.__indent > maxindent) maxindent = child.__indent
					child.__ancestors.add(item[this._idKey])
					this._states.set(child[this._idKey], true)

					sorted.push(child)
					findchildren(child)
				})
			}
		}

		const orphans = array.filter((item) => !hasValue((item.attributes ?? item)[this._parentId]))
		const samesize = orphans.length === array.length
		orphans.forEach((item) => {
			const cast = new NgqListItem(item, this._states, this._selected, new List())
			cast.__indent = 1
			sorted.push(cast)
			if (!samesize) findchildren(cast)
		})

		this._treelike = maxindent > 1
		this._indented = maxindent > 1

		this._sorted = sorted
		this._items = new ExMap<any, NgqListItem>()
		this._items.from(this._sorted, this._idKey)

		this._undostep = 0
		this._redostep = 0
		this.historyAction()

		this._items?.forEach((item) => {
			item.__ancestors.forEach((anc) => {
				const ancestor = this._items.get(anc)
				ancestor.__children = ancestor.__children ?? new List()
				ancestor.__children.add(item[this._idKey])
			})
		})
		this.items$.next(this._sorted)
	}

	/**
	 * @summary
	 * Set a specific NgStyle compatible object for one or more items in the
	 * list. Useful for validation feedback to the component. If no keys are
	 * present, the list is cleared.
	 *
	 * @param lis ListItemStyle object
	 */
	public applyItemStyle(lis: ListItemStyle): void {
		if (!lis) return
		const { style, key } = lis
		const keys = asArray(key)
		if (!keys.length) {
			this._itemstyle.clear()
		} else {
			keys.forEach((key) => this._itemstyle.set(key, style))
		}
	}

	/**
	 * @summary
	 * Select an item and output the results to the parent component of the
	 * list. Uses the getter for `selected` to make sure that the selection is
	 * according to the options.
	 *
	 * @param item list item
	 */
	public selectItem(item: any): void {
		if (item === null) {
			this.selected.clear()
			this.select.emit(null)
			return
		}

		if (this.options.multiple) {
			if (this.selected.has(item)) this.selected.delete(item)
			else this.selected.add(item)

			if (this.options.output) {
				const selected = this._selected.map((idx) =>
					this.options.full ? this._originals.get(idx) : idx,
				)
				if (selected.length) this.select.emit(selected)
				else this.select.emit(null)
			}
		} else {
			if (this.selected.has(item)) this.selected.clear()
			else {
				this.selected.clear()
				this.selected.add(item)
			}

			if (this.options.output) {
				const first = this._selected.first
				const item = this.options.full ? this._originals.get(first) : first
				this.select.emit(item ?? null)
			}
		}
	}

	/**
	 * @summary
	 * Check the search type to use. If there's an operation available, uses the
	 * search emitter with the default searhc tuple with the Chunk index, the
	 * Parameter Object and the search value. If no operation is available, the
	 * current list will be searched.
	 *
	 * @param value tuple with the Parameter Object and the search value
	 */
	public checkSearch(value: [OpenApi.ParameterObject, string]): any {
		if (this.opsearch) {
			if (this.options.output) this.search.emit([this._chunk?.index, value[0], value[1]])
			else {
				console.log('eh what')
				// internal call
			}
		} else {
			const search = value[1]
			this.listSearch(search)
		}
	}

	/**
	 * @summary
	 * Search the current list of NgqListItems for the parameter supplied. If no
	 * parameter is supplied, the search is reset. The search is performed on
	 * all available `viewkeys`.
	 *
	 * @param val value to search for
	 */
	public listSearch(val: string): void {
		if (!hasValue(val)) {
			this._searchstate = false
			this._indented = this._searchidt
			this.items$.next(
				this._indented ? this._sorted.filter((item) => item.__visible) : this._sorted,
			)
			return
		}

		this._indented = false
		this._searchstate = true
		const value = String(val).toUpperCase()

		const match = (val) => {
			if (hasValue(val)) return String(val).toLocaleUpperCase().includes(value)
			return false
		}

		const filtered = this._sorted.filter((item) => {
			const content = item.attributes ?? item
			for (const key of this.viewkeys) {
				if (match(item[key]) || match(content[key])) return true
			}

			return false
		})

		this.items$.next(filtered)
	}

	/**
	 * @summary
	 * Sorts the list based on the direction and key. If the list is treelike,
	 * the list is also grouped by child/parent relation after the initial
	 * sorting has been done.
	 *
	 * If the list is treelike, the list is also filtered by currently visible
	 * items.
	 *
	 * @param direction
	 * @param key
	 */
	private listSortMethod(direction: 'asc' | 'desc', key: any): any {
		const longsorting = this._treelike && this._indented && this.condensed
		const sorted = orderBy(this._sorted, [key ?? this._order], [direction ?? 'asc'])

		if (longsorting) {
			const ordened = []
			const findchildren = (item: any): void => {
				const parent_id = (item ?? {})[this._idKey]
				if (!parent_id) return

				const children = sorted.filter(
					(item) => (item.attributes ?? item)[this._parentId] === parent_id,
				)
				if (children.length) {
					children.forEach((child) => {
						ordened.push(child)
						findchildren(child)
					})
				}
			}

			sorted
				.filter((item) => !hasValue((item.attributes ?? item)[this._parentId]))
				.forEach((item) => {
					ordened.push(item)
					findchildren(item)
				})

			return ordened.filter((item) => item.__visible)
		} else {
			return this._indented ? sorted.filter((item) => item.__visible) : sorted
		}
	}

	/**
	 * @summary
	 * Clicking on a header column item sorts the list based on that column.
	 * Switches between descending, ascending and unsorted states. When clicked,
	 * other columns are reset to unsorted.
	 *
	 * @param header header tuple [Key, Icon, Direction]
	 */
	public listSortHeader(header: [Key, Icon, Direction]): void {
		let [, type, key] = header // eslint-disable-line
		let array

		switch (type) {
			case 'unsorted':
				type = 'sort-desc'
				array = this._sorted
				break
			case 'sort-asc':
				type = 'unsorted'
				array = this.listSortMethod('desc', key)
				break
			case 'sort-desc':
				type = 'sort-asc'
				array = this.listSortMethod('asc', key)
				break
		}

		this.headercols.forEach((item) => {
			if (item[2] === key) item[1] = type
			else item[1] = 'unsorted'
		})

		this.items$.next(array)
	}

	/**
	 * @summary
	 * Sort the list using the actions bar buttons. Each action that isn't the
	 * current is reset to unsorted.
	 *
	 * @param mapkey the action to use
	 */
	public listSort(mapkey: string): void {
		const header = this._actions.get(mapkey)
		let [action, type, key, color] = header // eslint-disable-line
		let array
		let direction: 'asc' | 'desc' = 'asc'

		this._sorting.clear()

		if (type === `sort-${action}-asc`) {
			if (color === 'grey-alt') {
				color = 'success-alt'
				type = `sort-${action}-asc`
				direction = 'asc'
				array = this.listSortMethod(direction, key)
			} else if (color === 'success-alt') {
				type = `sort-${action}-desc`
				direction = 'desc'
				array = this.listSortMethod(direction, key)
			}
			this._sorting.add([key, action, direction])
		} else if (type === `sort-${action}-desc`) {
			color = 'grey-alt'
			type = `sort-${action}-asc`
			array = this._sorted
		}

		this._actions
			.filter((action, name) => ['numeric', 'alpha'].includes(name))
			.forEach((action, name) => {
				if (name === mapkey) {
					action[1] = type
					action[3] = color
				} else {
					action[1] = action[1].replace('desc', 'asc')
					action[3] = 'grey-alt'
				}
			})

		this.items$.next(array)
	}

	/**
	 * @summary
	 * Toggle an item in the array if the list is treelike. Collapses or expands
	 * the selected item. Children have their own state in the list, so these
	 * are not updated. If you collapse a parent in the list, the child items
	 * state will remain the same.
	 *
	 * @param item list item to use
	 * @param state optional forced state
	 */
	public listItemToggle(item: NgqListItem, state?: boolean): void {
		if (hasValue(state) && item.__state === state) return
		item.__toggle(state)
		const sorted = this._sorted.filter((item) => item.__visible)
		this.items$.next(sorted)
	}

	/**
	 * @summary
	 * Flatten or indent the entire list. Shows collapsed items if the list is
	 * flattened.
	 *
	 * @param state optional forced state
	 */
	public listIndent(state?: boolean): void {
		this._indented = hasValue(state) ? state : !this._indented
		this._searchidt = this._indented
		const [key, , direction] = this._sorting.first ?? [null, null, null]
		const array = key && direction ? this.listSortMethod(direction, key) : this._sorted

		this._actions.forEach((action, key) => {
			if (key === 'flatten') action[1] = this._indented ? 'dedent' : 'indent'
		})
		this.items$.next(array)
	}

	/**
	 * @summary
	 * Expand the tree until the selected child is visible again.
	 *
	 * @param item parent item to expand
	 */
	public listExpandToChild(item: NgqListItem): void {
		if (!item) return

		this._selected.forEach((index) => {
			const child = this._items.get(index)
			if (child?.__ancestors.has((item ?? {})[this._idKey])) {
				child.__ancestors.forEach((anc) => {
					this._items.get(anc)?.__toggle(true)
				})
			}
		})

		const sorted = this._sorted.filter((item) => item.__visible)
		this.items$.next(sorted)
	}

	/**
	 * @summary
	 * Scroll to the parameter item. Checks for the position of the item in the
	 * current list of visible items and returns its index.
	 *
	 * @param check item to scroll to
	 *
	 * @returns
	 * Index of item
	 */
	public listScrollTo(check: NgqListItem | any): number {
		if (!hasValue(check)) return 0

		const item = hasValue(check[this._idKey]) ? check : this._items.get(check)
		return this._sorted.indexOf(item)
	}

	/**
	 * @summary
	 * Toggle the edit action buttons or the default actions bar. If edit is
	 * enabled, the default actions are hidden and the edit actions are shown
	 * instead.
	 *
	 * @param state optional forced state
	 */
	public editToggle(state?: boolean): void {
		this._editstate = hasValue(state) ? state : !this._editstate

		this._actions.clear()
		if (this._editstate) {
			const actions = [
				['editable', ['pencil', 'ban'], null, ['grey-alt', 'error-alt']],
				null,
				['undo', 'undo', null, 'info-alt'],
				['redo', 'repeat', null, 'info-alt'],
				null,
				['save', 'save', null, 'success-alt'],
				['clear', 'times', null, 'error-alt'],
			]

			actions.forEach((action, idx) => {
				if (!action) {
					const [key] = actions[idx - 1]
					this._actions.set(`${key}-sort`, null)
				} else {
					const [key] = action
					this._actions.set(key as string, action as [Key, Icon, ItemParam, Color])
				}
			})

			if (!this._history.size) {
				this.historyAction()
			}
		} else {
			this.setupActions()
			if (hasValue(state) && !state && !this.clear) this.editClear()
		}
	}

	/**
	 * @summary
	 * Drag-and-drop start, sets the state on the item and sets the current
	 * item as the dragging item. If the item has children, they are collapsed
	 * immediately.
	 *
	 * @param item item to drag
	 */
	public editDragStart(item: NgqListItem): void {
		this._dragstate = item.__state
		this._dragitem = item

		this.listItemToggle(item, false)
	}

	/**
	 * @summary
	 * When an item is dropped, the item and its children are adjusted based on
	 * the offset of the drag item's original and current index. This offset is
	 * applied to all children.
	 *
	 * The item and its children have their list of ancestors adjusted. The
	 * original parent of the item will have its child list adjusted.
	 *
	 * The new parent is decided solely based on adjecent items. This could be
	 * refined.
	 *
	 * @param cdk CdkDragDrop action
	 *
	 * @todo
	 * Drag/drop parent could be defined better.
	 */
	public editItem(cdk: CdkDragDrop<NgqListItem>): void {
		const { previousIndex, currentIndex, item } = cdk
		const { data } = item ?? {}
		const dragitem = data ?? this._dragitem
		const diffidx = currentIndex - previousIndex

		const current = this.items$.getValue()
		const curidx = current.indexOf(dragitem)
		const realidx = this._sorted.indexOf(dragitem)
		const wantedidx = curidx + diffidx
		const nextitem = current[wantedidx]
		const actualidx = this._sorted.indexOf(nextitem)
		const myorder = dragitem[this._order]

		const diff = actualidx - realidx

		// Set the history state before doing anything with the
		// current array
		this.historyAction(dragitem)

		moveItemInArray(this._sorted, realidx, actualidx)

		const parent = this._items.get(dragitem[this._parentId])
		let previous = current[wantedidx - 1] ?? null
		let prefref = this._items.get((previous ?? {})[this._idKey])
		let isself: boolean = false
		if ((previous ?? {})[this._idKey] === (dragitem ?? {})[this._idKey]) {
			previous = current[wantedidx] ?? null
			prefref = this._items.get((previous ?? {})[this._idKey])
			isself = true
		}
		const ancestors = new List()

		let indent
		let ancestor: any = { id: null }

		// If there's a previous item in the array
		if (previous) {
			// If previous has children and is expanded
			if (previous.__parent && previous.__state) {
				ancestor = previous
			}
			// If previous isn't a parent or hasn't expanded
			else if (!previous.__state || !previous.__parent) {
				// Get the shared ancestor
				const parent = this._items.get(previous[this._parentId])
				// Check if the parent is set
				if (parent) {
					// The ancestor will be the previous' parent if
					// it exists
					ancestor = parent
				}
			}

			// Check if the previous' parent is the same
			// as the current parent
			if ((ancestor ?? {})[this._idKey] === (dragitem ?? {})[this._parentId]) {
				// If the parent's still the same, we're
				// using the current drag item's ancestors
				ancestors.clear()
				ancestors.concat(dragitem.__ancestors)

				// Since we're moving inside the list of children,
				// update the order to be 1 after the previous item
				let order = previous[this._order] + 1

				// However, if the current 'previous' is actually
				// itself, we gotta change the 'previous' order to
				// match the actual order
				if (isself) {
					order = previous[this._order] ?? 1
					prefref[this._order] = order - 1
				}

				// Set the new order
				dragitem[this._order] = order

				// Filter the current list of items for matching
				// parent id's and order greater than or equal to
				// the new order
				this._sorted
					.filter(
						(item) =>
							item[this._parentId] === (ancestor ?? {})[this._idKey] &&
							item[this._order] >= order &&
							item[this._idKey] !== (dragitem ?? {})[this._idKey],
					)
					.forEach((item) => {
						item[this._order] = item[this._order] + 1
					})
			} else {
				if (ancestor?.__ancestors) {
					// The parent is not the same, so the drag item
					// needs a new ancestree
					ancestors.concat(ancestor.__ancestors ?? new List())
					ancestors.concat(ancestor[this._idKey])
				}
			}

			// Use the indentation of the ancestor or 0, then add 1
			// to make the nesting proper
			indent = (ancestor?.__indent ?? 0) + 1
			// Update the parent id
			dragitem[this._parentId] = (ancestor ?? {})[this._idKey] ?? null
		} else {
			// No previous item, it's the root.
			indent = 1
			dragitem[this._order] = 0
			dragitem[this._parentId] = null
		}

		// Update the ancestree
		dragitem.__ancestors = ancestors

		// If there's a parent, but it's not the same as the the
		// (new) parent of the drag item _and_ it's not in the
		// new set of ancestors
		if (
			parent &&
			parent[this._idKey] !== (dragitem ?? {})[this._parentId] &&
			!dragitem.__ancestors.has(parent[this._idKey])
		) {
			if (dragitem.__children) {
				// Remove all child ids from the parent
				dragitem.__children.forEach((idx) => parent.__children?.delete(idx))
			}
			// Remove the dragitem id from the parent
			parent.__children?.delete(dragitem[this._idKey])

			// Update the drag item's previous siblings to update
			// to the new order
			const siblings = this._sorted.filter(
				(sib) => sib[this._parentId] === parent[this._idKey],
			)
			if (siblings.length) {
				siblings.forEach((sib) => {
					if (sib[this._order] > myorder) sib[this._order]--
				})
			}
		}

		// Update the drag item's new family to update to the
		// new order of things
		const siblings = this._sorted.filter(
			(sib) =>
				sib[this._parentId] === (dragitem ?? {})[this._parentId] &&
				sib[this._idKey] !== (dragitem ?? {})[this._idKey],
		)
		if (siblings.length) {
			siblings.forEach((sib) => {
				if (sib[this._order] >= dragitem[this._order]) sib[this._order]++
				// Switched places in same list but no parent was set so stuff died?
				if (
					previous[this._idKey] === sib[this._idKey] &&
					sib[this._order] >= dragitem[this._order]
				) {
					const order = dragitem[this._order]
					dragitem[this._order] = sib[this._order]
					sib[this._order] = order
				}
			})
		}

		// Check the difference between then new indent and the
		// current indentation
		const diffidt = indent - dragitem?.__indent
		dragitem.__indent = indent

		// Update the children of the drag item
		dragitem?.__children?.forEach((cidx) => {
			// Get the actual item
			const child = this._items.get(cidx)
			// Get the current actual index
			const idx = this._sorted.indexOf(child)
			// Add the indent diff to the current
			child.__indent += diffidt

			// Slice the ancestors up to the drag item id
			const sliced = child?.__ancestors?.slice(dragitem[this._idKey])
			// Join the drag item ancestors with the slice
			child.__ancestors = new List().concat(dragitem?.__ancestors).concat(sliced)

			// Update the child item in the array based on
			// the actual index and the index diff from the
			// drag item
			moveItemInArray(this._sorted, idx, idx + diff)
		})

		// Toggle back the drag item's previous state
		dragitem?.__toggle(this._dragstate)

		// Update the history entry with the altered array
		this.historyUpdate()

		// Update the item list
		this.items$.next(this._sorted.filter((item) => item.__visible))
	}

	private historyAction(item?: NgqListItem): void {
		// New action was done, so increase the undo step
		// but only if an item was set, skipping the initial
		// history setup
		if (item) this._undostep++

		// If the undo step equals the redo step while smaller
		// than the history size (max index = size - 1), that
		// means we're adjusting the timeline, so slice history
		// to fit our needs
		if (this._undostep === this._redostep && this._undostep < this._history.size) {
			this._history = this._history.slice(null, this._undostep - 1, true)
		}

		// Create a new history action, copying the entire
		// current array
		const action = {
			id: (item ?? {})[this._idKey] ?? null,
			history: this.historyMapSorted(),
			array: [],
		}

		// If no item is set, just add the history array
		if (!item) action.array = action.history

		// Add the action the the history map by using auto-
		// increment with ExMap.only
		this._history.only(action)

		// Set the redo step to be the history size, locking it
		this._redostep = this._history.size
	}

	/**
	 * @summary
	 * Update the history after drag/drop has finished.
	 */
	private historyUpdate(): void {
		const history = this._history.last
		history.array = this.historyMapSorted()
	}

	/**
	 * @summary
	 * Update the sorted map after an action has been performed that updates the
	 * history. The items in the current sorted list are cloned with only the
	 * required keys and values.
	 *
	 * This list is used as a history state and each history step will use the
	 * values in that array to update the current sorted list.
	 */
	private historyMapSorted(): any[] {
		return this._sorted.map((item) => {
			const clone = {}
			for (const key in item) {
				switch (key) {
					case '__toggles':
					case '__toggle':
					case '__parent':
					case '__visible':
					case '__subactive':
						continue
					case '__selected':
					case '__ancestors':
					case '__children':
						clone[key] = new List().concat(item[key])
						continue
					case 'id':
						clone[key] = item[key]
						continue
					case '__indent':
						clone[key] = item[key] ?? 1
						continue
					case this._parentId:
						clone[key] = item[key] ?? null
						continue
					case this._order:
						clone[key] = item[key] ?? 0
						continue
					default:
						continue
				}
			}

			return clone
		})
	}

	/**
	 * @summary
	 * Undo or redo action if available in the list of history items. Parses the
	 * array of items in the history step and updates the current sorted list
	 * with the undo or redo step's values for children, ancestors, parent and
	 * array index position.
	 *
	 * @param action undo or redo action
	 */
	public editAction(action: 'undo' | 'redo'): void {
		let index
		if (action === 'undo') {
			index = this._undostep
			if (index < 1) {
				if (!this.undo) return
				else index = 1
			}

			this._redostep = index
			this._undostep = index - 1 > 0 ? index - 1 : 0
		} else if (action === 'redo') {
			index = this._redostep
			if (!this.redo) return
			if (index > this._history.size) return
			if (index < 1) index = 1

			this._undostep = index
			this._redostep = index + 1
		} else return

		const histitem = this._history.get(index)
		const { id, array, history } = histitem ?? {}
		this._dragitem = this._items.get(id) ?? ({} as any)

		const source = action === 'undo' ? history : array ?? []

		if (source.length) {
			const sorted = []
			source.forEach((item) => {
				const ref = this._sorted.find((ref) => ref[this._idKey] === item[this._idKey])
				for (const key in item) {
					switch (key) {
						case '__selected':
						case '__ancestors':
						case '__children':
							ref[key] = new List().concat(item[key])
							break
						case '__indent':
						case this._parentId:
						case this._order:
							ref[key] = item[key]
							break
						default:
							break
					}
				}
				sorted.push(ref)
			})
			this._sorted = sorted
			this.items$.next(this._sorted.filter((item) => item.__visible))
		} else {
			this._redostep = this._history.size
			this._undostep = 0
		}
	}

	/**
	 * @summary
	 * Apply the first step of the history, the initial state, and clear the
	 * list after the first step.
	 */
	public editClear(): void {
		this._undostep = 0
		this._redostep = 0

		const item = this._history.get(0)
		if (!item) return

		const source = item.history
		const sorted = []
		source.forEach((item) => {
			const ref = this._sorted.find((ref) => ref[this._idKey] === item[this._idKey])
			for (const key in item) {
				switch (key) {
					case '__selected':
					case '__ancestors':
					case '__children':
						ref[key] = new List().concat(item[key])
						break
					case '__indent':
					case this._parentId:
					case this._order:
						ref[key] = item[key]
						break
					default:
						break
				}
			}
			sorted.push(ref)
		})

		this._sorted = sorted

		this._history.clear()
		this.historyAction()

		this.items$.next(this._sorted.filter((item) => item.__visible))
	}

	/**
	 * @summary
	 * Parse the unmapped, original array of items and find all items that have
	 * different values for parent or order keys. These items are then going to
	 * be emitted to the parent component to be updated.
	 *
	 * @todo
	 * Either emit or update internally if the proper PATCH/PUT operations are
	 * available for use.
	 */
	public editSave(): void {
		const changed = []
		this._originals.forEach((item, idkey) => {
			const ref = this._items.get(idkey)
			let change: any
			if (ref) {
				if (
					item[this._parentId] !== ref[this._parentId] ||
					item[this._order] !== ref[this._order]
				) {
					change = change ?? { id: item[this._idKey], name: item.name }
					change[this._order] = ref[this._order]
					change[this._parentId] = ref[this._parentId]
				}
				if (change) changed.push(change)
			}
		})

		this._history.clear()
		this.historyAction()

		this.editToggle(false)

		console.log(changed)
	}
}
