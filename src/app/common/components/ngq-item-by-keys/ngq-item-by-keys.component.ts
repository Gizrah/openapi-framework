import { Component, ElementRef, Input, Renderer2 } from '@angular/core'
import { DisplayItem } from '@quebble/interfaces'
import { hasValue } from '@quebble/scripts'

@Component({
	selector: 'ngq-item-by-keys',
	template: `
		<ng-container *ngFor="let type of keys">
			<ng-container *ngTemplateOutlet="switchtype; context: { type: type }"></ng-container>
		</ng-container>

		<ng-template #switchtype let-type="type">
			<ng-container [ngSwitch]="type.type">
				<ng-container *ngSwitchCase="'object'">
					<ng-container
						*ngTemplateOutlet="typeobject; context: { type: type }"
					></ng-container>
				</ng-container>
				<ng-container *ngSwitchCase="'row'">
					<ng-container
						*ngTemplateOutlet="typerow; context: { type: type }"
					></ng-container>
				</ng-container>
				<ng-container *ngSwitchCase="'key'">
					<ng-container
						*ngTemplateOutlet="typekey; context: { type: type }"
					></ng-container>
				</ng-container>
				<ng-container *ngSwitchCase="'value'">
					<ng-container
						*ngTemplateOutlet="typevalue; context: { type: type }"
					></ng-container>
				</ng-container>
				<ng-container *ngSwitchCase="'description'">
					<ng-container
						*ngTemplateOutlet="typedescription; context: { type: type }"
					></ng-container>
				</ng-container>
			</ng-container>
		</ng-template>

		<ng-template #typedescription let-type="type">
			<ng-template
				[ngIf]="item.hasOwnProperty(type.value) || item.hasOwnProperty(type.label)"
			>
				<ngq-description [title]="item[type.label] || prefix + type.label | translink">
					<ngq-generic
						[value]="item[type.value]"
						[key]="type.value"
						[justvalue]="true"
					></ngq-generic>
				</ngq-description>
			</ng-template>
		</ng-template>

		<ng-template #typevalue let-type="type">
			<span *ngIf="item.hasOwnProperty(type.value)">
				<ngq-generic
					[value]="item[type.value]"
					[key]="type.value"
					[justvalue]="true"
				></ngq-generic>
			</span>
		</ng-template>

		<ng-template #typekey let-type="type">
			<div class="ngq_ibk-kv" *ngIf="hasValue(item[type.value])">
				<label>
					{{ prefix + type.label | translink }}
				</label>
				<span>
					<ngq-generic
						[value]="item[type.value]"
						[key]="type.value"
						[justvalue]="true"
					></ngq-generic>
				</span>
			</div>
		</ng-template>

		<ng-template #typerow let-type="type">
			<div
				class="ngq_ibk-row"
				[style.gridTemplateColumns]="
					asrow ? null : 'repeat(' + type.value?.length + ', 1fr)'
				"
			>
				<ng-container *ngFor="let val of type.value">
					<ng-container
						*ngTemplateOutlet="switchtype; context: { type: val }"
					></ng-container>
				</ng-container>
			</div>
		</ng-template>

		<ng-template #typeobject let-type="type">
			<div class="ngq_ibk-label">
				<ng-template [ngIf]="item[type?.label]" [ngIfElse]="notinitem">
					<ngq-generic
						[value]="item[type.label]"
						[key]="type.label"
						[justvalue]="true"
					></ngq-generic>
				</ng-template>
				<ng-template #notinitem>
					{{ prefix + type.label | translink }}
				</ng-template>
			</div>
			<ng-container
				*ngTemplateOutlet="switchtype; context: { type: type.value }"
			></ng-container>
		</ng-template>
	`,
	styleUrls: ['./ngq-item-by-keys.component.scss'],
})
export class NgqItemByKeysComponent {
	@Input() public item: any
	@Input() public keys: DisplayItem[] = []

	@Input() set prefix(prefix: string) {
		if (prefix) {
			const parsed = prefix.charAt(prefix.length - 1) === '.' ? prefix : prefix + '.'
			this._prefix = parsed
		} else {
			this._prefix = ''
		}
	}
	get prefix(): string {
		return this._prefix
	}

	@Input() set rowstyle(type: 'row' | 'column') {
		const style = type ?? 'column'
		this.asrow = type === 'row'
		if (style === 'row') {
			this.setRowStyle()
		} else {
			this.setColumnsStyle()
		}
	}

	public asrow: boolean = false
	public columns: string = null

	private _prefix: string

	constructor(private elRef: ElementRef, private render: Renderer2) {}

	public hasValue(what: any): boolean {
		return hasValue(what)
	}

	private setRowStyle(): void {
		this.render.addClass(this.elRef.nativeElement, 'ngq_ibk-asrow')
		this.render.removeClass(this.elRef.nativeElement, 'ngq_ibk-ascolumns')
	}

	private setColumnsStyle(): void {
		this.render.addClass(this.elRef.nativeElement, 'ngq_ibk-ascolumns')
		this.render.removeClass(this.elRef.nativeElement, 'ngq_ibk-asrow')
	}
}
