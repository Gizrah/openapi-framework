import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { DialogData } from '@quebble/interfaces'
import { OpenApi } from '@quebble/openapi'
import { DefaultComponentClass } from 'app/common/classes/default-component.class'

@Component({
	selector: 'ngq-tiles',
	template: `
		<ng-container [response]="operation?.id" *ngIf="operation?.id"></ng-container>
		<div class="ngq-embedded">
			<ngq-pagination
				[operation]="operation"
				[shade]="true"
				(page)="page.emit(['array', $event])"
			></ngq-pagination>
			<div class="ngq_tiles" masonry="masonry-" columns="4">
				<ng-container *ngFor="let item of array; let index = index">
					<ngq-tile
						[item]="item.attributes || item"
						[operation]="getop"
						[schema]="schema"
						[prefix]="prefix"
						(click)="doSelect(item)"
						class="masonry-4"
					></ngq-tile>
				</ng-container>
			</div>
		</div>
	`,
	styleUrls: ['./ngq-tiles.component.scss'],
})
export class NgqTilesComponent extends DefaultComponentClass {
	@Input() set array(items: any | any[]) {
		super.array = items
	}
	get array() {
		return super.array
	}
	@Input() set chunk(chunk: OpenApi.Chunk) {
		super.chunk = chunk
	}

	@Output() public dialog: EventEmitter<DialogData> = new EventEmitter()
	@Output() public page: EventEmitter<[string, any]> = new EventEmitter()

	public schema: OpenApi.SchemaObject
	public prefix: string

	constructor(private active: ActivatedRoute, protected openapi: OpenApi.OpenApiService) {
		super(openapi)
	}

	public doSelect(item: any): void {
		this.openapi.chunkNavigation(this._chunk, item)
		// this.openapi.chunkNavigation(this.active, this._chunk, this.getop, id, true, 'id')
	}

	protected setupChunk(chunk: OpenApi.Chunk): void {
		super.setupChunk(chunk, { useGetOp: true })

		this.schema = this.getop?.schemas?.get('get')
		this.prefix = this.getop?.prefix
	}

	@HostBinding('class.ngq-component')
	public __componentClass: boolean = true
}
