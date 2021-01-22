import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core'
import { DialogData } from '@quebble/interfaces'
import { OpenApi } from '@quebble/openapi'
import { asArray, hasValue } from '@quebble/scripts'
import {
	DefaultComponentClass,
	SetupChunkOptions,
} from 'app/common/classes/default-component.class'

@Component({
	selector: 'ngq-overview-list',
	template: `
		<ng-container [response]="operation?.id" *ngIf="operation?.id"></ng-container>

		<div class="ngq_list_overview" [class.ngq_list_overview-columns]="!!selected">
			<ngq-card
				[title]="'common.overview' | translink"
				mode="light"
				class="ngq_list_overview-card"
				icon="list"
			>
				<ngq-list
					[chunk]="chunk"
					[array]="array"
					[show-header]="false"
					[show-sorting]="true"
					[show-search]="true"
					[show-edit]="false"
					[show-filter]="false"
					[show-ops]="false"
					[show-avatar]="true"
					[output-event]="true"
					[full-select]="false"
					[multiple-select]="false"
					[expand-select]="true"
					[focus-search]="false"
					(select)="doSelect($event)"
					(search)="doSearch($event)"
					class="list-embedded"
				></ngq-list>
			</ngq-card>

			<div class="ngq_list_overview-details">
				<ngq-card
					*ngIf="!!selected"
					[title]="operation?.id ? selected[operation.subject] : null"
					class="ngq_list_overview-card"
				>
					<ngq-object
						[objectDef]="objectDef"
						[operation]="getop"
						*ngIf="objectDefs.length"
					></ngq-object>

					<ng-template [ngIf]="getop?.id">
						<div
							class="ripple-color ngq_list_overview-link"
							mat-ripple
							(click)="doLink()"
						>
							{{ 'common.gotodetails' | translink }}
						</div>
					</ng-template>
				</ngq-card>
			</div>
		</div>

		<ng-template #cardActions>
			<div class="ngq_list_overview-pagination">
				<ngq-pagination
					[operation]="operation"
					[shade]="false"
					(page)="page.emit(['array', $event])"
				></ngq-pagination>
			</div>
		</ng-template>
	`,
	styleUrls: ['./ngq-overview-list.component.scss'],
})
export class NgqOverviewListComponent extends DefaultComponentClass {
	@Input() set array(items: any | any[]) {
		super.array = items
	}
	get array() {
		return super.array
	}
	@Input() set chunk(chunk: OpenApi.Chunk) {
		super.chunk = chunk
	}
	get chunk() {
		return super.chunk
	}

	@Output() public dialog: EventEmitter<DialogData> = new EventEmitter()
	@Output() public page: EventEmitter<[string, any]> = new EventEmitter()
	@Output() public search: EventEmitter<
		[number, OpenApi.ParameterObject, string]
	> = new EventEmitter()

	private _selected: any
	private setupChunkOptions: SetupChunkOptions = {
		useGetOp: true,
		propsFlatList: true,
		propsIgnoreKeys: ['providers'],
		propsSkipDates: true,
	}

	constructor(protected openapi: OpenApi.OpenApiService) {
		super(openapi)
	}

	get objectDef(): OpenApi.ObjectDef {
		return asArray(this.objectDefs)[0]
	}

	get selected(): any {
		return this._selected?.attributes ?? this._selected
	}

	public doDialog(action: DialogData): void {
		this.dialog.emit({ ...action, chunk: this._chunk })
	}

	public async doSelect(event: any): Promise<void> {
		if (hasValue(event)) {
			if (this.selected?.id === event) {
				this._selected = undefined
				return
			}
			const item = this.array.find((item) => item.id === event)

			if (item && this.getop) {
				await this.setupObjectDefinitions(item.attributes ?? item, this.setupChunkOptions)
				this._selected = item
			}
		} else {
			this._selected = undefined
		}
	}

	public doLink(): void {
		this.openapi.chunkNavigation(this._chunk, this._selected)
	}

	public doSearch(value: [number, OpenApi.ParameterObject, string]): void {
		if (hasValue(value[2]) && this.selected) this._selected = undefined
		this.search.emit(value)
	}

	protected setupChunk(chunk: OpenApi.Chunk): void {
		super.setupChunk(chunk, this.setupChunkOptions)
	}

	@HostBinding('class.ngq-embedded')
	public __componentClass: boolean = true
}
