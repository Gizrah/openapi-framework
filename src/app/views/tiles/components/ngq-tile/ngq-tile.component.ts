import { Component, ElementRef, Input } from '@angular/core'
import { OpenApi } from '@quebble/openapi'
import { hasValue } from '@quebble/scripts'

@Component({
	selector: 'ngq-tile',
	template: `
		<ngq-card
			*ngIf="!!item"
			[title]="item[operation?.subject]"
			mode="light"
			type="tile"
			[style.cursor]="!operation ? 'default' : 'pointer'"
			matRipple
			[matRippleDisabled]="!operation"
			class="ripple-flat"
		>
			<div class="ngq_tile-content" *ngIf="operation">
				<ng-template [ngIf]="operation.info">
					<ngq-description [title]="null">{{ item[operation.info] }}</ngq-description>
				</ng-template>
			</div>

			<ngq-button
				class="ngq_tile-select"
				icon="info-circle"
				[color]="['info-alt', 'primary-alt']"
				[noripple]="true"
			>
				{{ 'generic.details' | translink }}
			</ngq-button>
		</ngq-card>
	`,
	styleUrls: ['./ngq-tile.component.scss'],
})
export class NgqTileComponent {
	@Input() public item: any
	@Input() public operation: OpenApi.Operation
	@Input() public prefix: string
	@Input() public schema: OpenApi.SchemaObject

	constructor(private elRef: ElementRef) {
		this.__componentClass()
	}

	get avatar(): boolean {
		return hasValue(this.item?.avatar) || hasValue(this.item?.image)
	}

	private __componentClass(): void {
		const el = this.elRef.nativeElement as HTMLElement
		el.classList.add('ngq_tile')
	}
}
