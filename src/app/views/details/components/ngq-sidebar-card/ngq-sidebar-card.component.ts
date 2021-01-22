import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core'
import { DialogData } from '@quebble/interfaces'
import { OpenApi } from '@quebble/openapi'

@Component({
	selector: 'ngq-sidebar-card',
	template: `
		<ngq-card
			*ngIf="!!objectDef.data"
			[title]="
				objectDef.title && !operations?.length
					? (objectDef.title | translink)
					: objectDef.data[operation?.subject]
			"
			mode="light"
			type="tile"
		>
			<ngq-actions [operations]="operations" (select)="buttonAction($event)"></ngq-actions>

			<div class="ngq_tile-content" *ngIf="operation">
				<ng-content></ng-content>

				<ng-template [ngIf]="objectDef?.refs.length">
					<ngq-object [objectDef]="objectDef" [operation]="operation"></ngq-object>
				</ng-template>
			</div>
		</ngq-card>
	`,
	styleUrls: ['./ngq-sidebar-card.component.scss'],
})
export class NgqSidebarCardComponent {
	@Output() public dialog: EventEmitter<DialogData> = new EventEmitter()

	@Input() public operation: OpenApi.Operation
	@Input() public operations: OpenApi.Operation[] = []
	@Input() public objectDef: OpenApi.ObjectDef
	@Input() public schema: OpenApi.SchemaObject

	constructor(private elRef: ElementRef) {
		this.__componentClass()
	}

	public buttonAction(operation: OpenApi.Operation): void {
		if (!operation) return
		this.dialog.emit({
			operation,
			item: this.objectDef.data,
			subject:
				this.objectDef.data[operation.subject] ??
				this.objectDef.data[operation.info] ??
				null,
		})
	}

	private __componentClass(): void {
		const el = this.elRef.nativeElement as HTMLElement
		el.classList.add('ngq_tile')
	}
}
