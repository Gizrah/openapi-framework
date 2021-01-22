import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { DialogData } from '@quebble/interfaces'
import { OpenApi } from '@quebble/openapi'
import { hasValue } from '@quebble/scripts'
import { OpenApiService } from '@quebble/services'
import { DefaultComponentClass } from 'app/common/classes/default-component.class'

@Component({
	selector: 'ngq-sidebar-cards',
	template: `
		<ngq-list
			[header]="header"
			[array]="array"
			[selected]="object"
			[chunk]="chunk"
			[show-sorting]="true"
			[show-avatar]="false"
			[show-search]="true"
			[show-edit]="true"
			[full-select]="true"
			(select)="doSelect($event)"
			(action)="doAction($event)"
			class="list-detached list-sidebar list-stretch list-margin-half shade"
		></ngq-list>

		<div class="ngq-embedded" [response]="operation?.id" *ngIf="operation?.id">
			<ng-container *ngIf="selected">
				<div class="list-1" masonry="masonry-" columns="2">
					<ng-container *ngFor="let objectDef of objectDefs">
						<ng-container
							*ngTemplateOutlet="sbcard; context: { objectDef: objectDef }"
						></ng-container>

						<ng-template #sbcard let-objectDef="objectDef">
							<ngq-sidebar-card
								[objectDef]="objectDef"
								[operation]="getop"
								[operations]="objectDef.key === null ? operations : null"
								(dialog)="doDialog($event)"
								[loader]="getop?.id"
								class="masonry-2"
							>
								<ng-template [ngIf]="selectprovider && objectDef.key === null">
									<ngq-providerselect [provider]="header"></ngq-providerselect>
								</ng-template>
							</ngq-sidebar-card>
						</ng-template>
					</ng-container>
				</div>
			</ng-container>
		</div>
	`,
	styleUrls: ['./ngq-sidebar-cards.component.scss'],
})
export class NgqSidebarCardsComponent extends DefaultComponentClass {
	@Input()
	set array(array: any | any[]) {
		super.array = array
	}
	get array(): any | any[] {
		return super.array
	}
	@Input()
	set object(item: any) {
		super.object = item
	}
	get object(): any {
		return super.object
	}
	@Input()
	set header(item: any) {
		super.header = item
	}
	get header(): any {
		return super.header
	}

	@Input() set chunk(chunk: OpenApi.Chunk) {
		super.chunk = chunk
	}
	get chunk(): OpenApi.Chunk {
		return super.chunk
	}

	private _isProvider: boolean = false

	@Output() public dialog: EventEmitter<DialogData> = new EventEmitter()

	constructor(
		protected openapi: OpenApiService,
		private active: ActivatedRoute,
		private elRef: ElementRef,
	) {
		super(openapi)
		this.__componentClass()
	}

	get selected(): any {
		if (!this.object && !!this.header && typeof this.header === 'object') return this.header
		return this.object
	}

	get selectprovider(): boolean {
		return this._isProvider && this.selected?.id === this.header?.id
	}

	protected setupHeader(item: any): void {
		if (item?.id) {
			item.id = String(item.id).includes('header_') ? item.id : 'header_' + item.id
		}
		super.setupHeader(item)
	}

	protected setupChunk(chunk: OpenApi.Chunk): void {
		super.setupChunk(chunk, {
			noDelete: true,
			propsSkipDates: true,
			propsIgnoreKeys: ['name', 'units', 'providers'],
		})

		const header: OpenApi.Chunk = chunk.viewchunks.get('header')
		if (header) {
			this._isProvider = header?.operation?.id === 'get_provider'
		}
	}

	public doDialog(action: DialogData): void {
		if (!action.chunk) action.chunk = this._chunk
		if (!action.subject) {
			const opsubject = this.operation.subject ?? this.operation.info ?? null
			action.subject = this.selected && opsubject ? this.selected[opsubject] : null
		}

		const headerchunk = this._chunk.viewchunks.get('header')
		if (headerchunk && headerchunk.ismine(action.operation.id)) action.chunk = headerchunk

		this.dialog.emit(action)
	}

	public doSelect(item: any): void {
		this.openapi.chunkNavigation(this._chunk, item, hasValue(this.object))
		// this.openapi.chunkNavigation(this.active, this._chunk, this.operation, id)
	}

	public doAction(event: OpenApi.Operation): void {
		if (!event?.id) return
		const data: DialogData = {
			operation: event,
			item: event.type === 'post' ? null : this.selected,
			subject: null,
			chunk: this._chunk,
		}

		const opsubject = event?.subject ?? event?.info ?? null
		data.subject = this.selected && opsubject ? this.selected[opsubject] : null

		const headerchunk = this._chunk.viewchunks.get('header')
		if (headerchunk && headerchunk.ismine(event.id)) data.chunk = headerchunk

		this.doDialog(data)
	}

	private __componentClass(): void {
		const el = this.elRef.nativeElement as HTMLElement
		el.classList.add('ngq-component')
	}
}
