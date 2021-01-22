import { CdkDragDrop } from '@angular/cdk/drag-drop'
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling'
import {
	ChangeDetectorRef,
	Component,
	EventEmitter,
	Input,
	OnChanges,
	Output,
	SimpleChanges,
	ViewChild,
} from '@angular/core'
import { environment } from '@quebble/environment'
import { OpenApi } from '@quebble/openapi'
import { asArray } from '@quebble/scripts'

import { NgqListItem } from './ngq-list-item.model'
import { ListItemStyle, ListStateService } from './ngq-list-state.service'

@Component({
	selector: 'ngq-list',
	templateUrl: './ngq-list.component.html',
	styleUrls: ['./ngq-list.component.scss'],
	providers: [ListStateService],
})
export class NgqListComponent implements OnChanges {
	@ViewChild(CdkVirtualScrollViewport) public viewport: CdkVirtualScrollViewport

	@Input('header') set header(item: any) {
		if (item) this.state.setupHeader(item)
	}
	get header() {
		return this.state.header
	}
	@Input() set selected(item: any | any[]) {
		if (item) {
			const list = asArray(item)
			list.forEach((item) => this.selected.add(item))
		}
	}
	get selected() {
		return this.state.selected
	}
	@Input() set deselect(state: boolean) {
		if (state) this.state.selected.clear()
	}
	@Input() set array(items: any[]) {
		if (items) this.state.setupArray(items)
	}
	@Input() set chunk(chunk: OpenApi.Chunk) {
		if (chunk) this.init(chunk)
	}
	@Input('operation') set op(operation: OpenApi.Operation) {
		if (operation) this.init(operation)
	}
	@Input('view-small') set viewSmall(view: any) {
		if (view) this.state.setupCustomView(true, view)
	}
	@Input('view-wide') set viewWide(view: any) {
		if (view) this.state.setupCustomView(false, view)
	}
	@Input('apply-style') set applyStyle(style: ListItemStyle) {
		if (style) this.state.applyItemStyle(style)
	}
	@Input('show-header') public showHeader: boolean = true
	@Input('show-sorting') public showSorting: boolean = true
	@Input('show-search') public showSearch: boolean = true
	@Input('show-edit') public showEdit: boolean = false
	@Input('show-filter') public showFilter: boolean = false
	@Input('show-ops') public showOps: boolean = true
	@Input('show-avatar') public showAvatar: boolean = true
	@Input('output-event') public outputEvent: boolean = true
	@Input('full-select') public fullSelect: boolean = false
	@Input('multiple-select') public multipleSelect: boolean = false
	@Input('expand-select') public expandSelect: boolean = false
	@Input('index-select') public indexSelect: boolean = false
	@Input('focus-search') public focusSearch: boolean = true

	@Output() public select: EventEmitter<any | any[]> = this.state.select
	@Output() public action: EventEmitter<any> = this.state.action
	@Output() public search: EventEmitter<[number, OpenApi.ParameterObject, string]> = this.state
		.search
	@Output() public dialog: EventEmitter<any> = this.state.dialog
	@Output() public page: EventEmitter<[string, any]> = this.state.page

	public clearSearch$: EventEmitter<any> = new EventEmitter()

	constructor(public state: ListStateService, private cdRef: ChangeDetectorRef) {}

	public ngOnChanges(changes: SimpleChanges): void {
		if (
			'showHeader' in changes ||
			'showSorting' in changes ||
			'showSearch' in changes ||
			'showEdit' in changes ||
			'showFilter' in changes ||
			'showOps' in changes ||
			'showAvatar' in changes ||
			'outputEvent' in changes ||
			'fullSelect' in changes ||
			'multipleSelect' in changes ||
			'expandSelect' in changes ||
			'focusSearch' in changes
		)
			this.init()

		if ('indexSelect' in changes) this.state.changeIdKey()
	}

	private init(base?: OpenApi.Chunk | OpenApi.Operation): void {
		const options = {
			header: this.showHeader,
			sorting: this.showSorting,
			search: this.showSearch,
			edit: this.showEdit,
			// filter: this.showFilter,
			filter: false,
			ops: this.showOps,
			avatar: this.showAvatar,
			// output: this.outputEvent,
			output: true,
			multiple: this.multipleSelect,
			expand: this.expandSelect,
			focus: this.focusSearch,
			full: this.fullSelect,
			index: this.indexSelect,
		}

		if (!base) this.state.update(options)
		else this.state.init(base, options)
	}

	public doSearch(value: [OpenApi.ParameterObject, string]): void {
		this.state.checkSearch(value)
		if (!value[1] && this.state.selected.size) {
			this.doScroll(this.state.selected.first)
		}
	}

	public doAction(operation: OpenApi.Operation): void {
		if (operation.type === 'delete' && !this.selected?.size) return
		if (this.outputEvent) this.action.emit(operation)
	}

	public doSelect(item: any): void {
		this.state.selectItem(item)
	}

	public doSortHeader(header: [string, string, 'asc' | 'desc']): void {
		if (this.state.searchstate) return
		this.state.listSortHeader(header)
	}

	public doSortAction(key: string) {
		if (this.state.searchstate) return
		switch (key) {
			case 'flatten':
				return this.state.listIndent()
			case 'alpha':
			case 'numeric':
				return this.state.listSort(key)
			case 'editable':
				return this.state.editToggle()
			case 'undo':
			case 'redo':
				return this.state.editAction(key)
			case 'clear':
				return this.state.editClear()
			case 'save':
				return this.state.editSave()
		}
	}

	public doResize(amount: any): void {
		this.state.resize = amount
		this.cdRef.detectChanges()
	}

	public doToggle(item: NgqListItem): void {
		this.state.listItemToggle(item)
	}

	public doExpandToChild(item: NgqListItem): void {
		this.state.listExpandToChild(item)
	}

	public doScroll(item: NgqListItem | any): void {
		if (this.viewport) {
			const index = this.state.listScrollTo(item)
			if (index > -1) {
				if (this.state.searchstate) this.clearSearch$.emit(new Date().toISOString())
				setTimeout(() => this.viewport.scrollToIndex(index, 'smooth'), 250)
			}
		}
	}

	public onDrop(item: CdkDragDrop<NgqListItem>): void {
		this.state.editItem(item)
	}

	public onDragStart(item: NgqListItem): void {
		this.state.editDragStart(item)
	}

	// ::DEV::
	get devmode(): boolean {
		return !environment.production
	}

	public __log(): void {
		if (this.devmode) console.log(this)
	}

	get devkeys(): any {
		const keys = this.state.originalvk
		return JSON.stringify(keys, null, 2)
	}

	public _viewkeys_: boolean = false
	public __viewkeys(state?: boolean, value?: any): void {
		if (this.devmode) {
			if (state && value) {
				this._viewkeys_ = false
				const replaced = String(value).replace(/\s/g, '')
				const parsed = JSON.parse(replaced)

				this.viewSmall = parsed
			} else {
				this._viewkeys_ = !this._viewkeys_
			}
		}
	}
}
