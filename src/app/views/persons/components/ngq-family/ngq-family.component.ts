import {
	Component,
	ElementRef,
	EventEmitter,
	Input,
	Output,
	Renderer2,
	SimpleChanges,
} from '@angular/core'
import { DialogData } from '@quebble/interfaces'
import { OpenApi } from '@quebble/openapi'
import { hasValue } from '@quebble/scripts'
import { DefaultComponentClass } from 'app/common/classes/default-component.class'

@Component({
	selector: 'ngq-family',
	templateUrl: './ngq-family.component.html',
	styleUrls: ['./ngq-family.component.scss'],
})
export class NgqFamilyComponent extends DefaultComponentClass {
	@Input() set array(items: any | any[]) {
		super.array = items
	}
	get array() {
		return super.array
	}
	@Input() set object(item: any) {
		super.object = item
	}
	get object() {
		return super.object
	}
	@Input() set chunk(chunk: OpenApi.Chunk) {
		super.chunk = chunk
	}

	@Output() public dialog: EventEmitter<DialogData> = new EventEmitter()

	public multiple: boolean = false
	public avatars: any[] = []

	constructor(
		protected openapi: OpenApi.OpenApiService,
		private elRef: ElementRef,
		private render: Renderer2,
	) {
		super(openapi)
		this.__componentClass()
	}

	public ngOnChanges(changes: SimpleChanges): void {
		if ('array' in changes && this.getop) {
			const simplify = (items: any[]): any[] => {
				return items?.map((content) => {
					const item = content.attributes ?? content

					const simple: any = {}
					if (this.getop.subject) simple[this.getop.subject] = item[this.getop.subject]
					if (this.avatar) simple[this.avatar] = item[this.avatar]
					if ('id' in content) simple.id = content.id

					return simple
				})
			}

			this.avatars = this.multiple
				? this.array.map((items) => simplify(items))
				: simplify(this.array)
		}

		if ('object' in changes && this.getop) this.setupObjectDefinitions(this.object)
	}

	public selectItem(item: any): void {
		this.openapi.chunkNavigation(this._chunk, item, hasValue(this.object))
		// this.openapi.chunkNavigation(this.active, this._chunk, this.getop, item?.id)
	}

	public doDialog(operation: OpenApi.Operation): void {
		const data: DialogData = {
			operation,
			item: this.object,
			subject:
				this.object[operation.subject] ??
				this.object[this.operation.subject] ??
				this.object[operation.info] ??
				this.object[this.operation.info],
			chunk: this._chunk.viewchunks.get('object') ?? this._chunk,
		}

		if (operation.type === 'post') {
			data.item = undefined
			data.subject = undefined
		}

		this.dialog.emit(data)
	}

	protected setupArray(items: any | any[]): void {
		this.multiple = hasValue(items) ? Array.isArray(items[0]) : false
	}

	private __componentClass(): void {
		const el = this.elRef.nativeElement
		this.render.addClass(el, 'ngq-component-vertical')
	}
}
