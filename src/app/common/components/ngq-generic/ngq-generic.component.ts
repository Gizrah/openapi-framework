import { Component, ElementRef, Input, Renderer2, SimpleChanges } from '@angular/core'
import { hasValue } from '@quebble/scripts'

import { TransLinkService } from '../../services/translation/service/translink.service'

@Component({
	selector: 'ngq-generic',
	template: `
		<label class="accent" *ngIf="key && type !== 'list' && !justvalue">
			{{ translation | translink }}
		</label>

		<ng-template [ngIf]="type === 'row'">
			<ng-container [ngSwitch]="valtype">
				<div class="ngq_generic-value" *ngSwitchCase="'boolean'">
					{{ 'generic.' + value | translink }}
				</div>
				<div class="ngq_generic-value" *ngSwitchCase="'email'">
					<ngq-generic-link>
						{{ valprefix ? (valprefix + value | translate) : value }}
					</ngq-generic-link>
				</div>
				<div class="ngq_generic-value" *ngSwitchDefault>
					{{ valprefix ? (valprefix + value | translate) : value }}
				</div>
			</ng-container>
		</ng-template>

		<ng-template [ngIf]="type === 'date'">
			<div class="ngq_generic-value">{{ value | date: 'dd-MM-yyyy' }}</div>
		</ng-template>

		<ng-template [ngIf]="type === 'list'">
			<label class="primary">{{ translation | translink }}</label>
			<ng-container *ngFor="let item of value | keyvalue">
				<ngq-generic [prefix]="prefix" [key]="item.key" [value]="item.value"></ngq-generic>
			</ng-container>
		</ng-template>

		<ng-template [ngIf]="type === 'empty'">
			<div class="ngq_generic-value">
				<ng-content></ng-content>
			</div>
		</ng-template>
	`,
	styleUrls: ['./ngq-generic.component.scss'],
})
export class NgqGenericComponent {
	@Input() public prefix: string
	@Input() public key: string
	@Input() public value: any
	@Input() public valprefix: string
	// @Input() public justvalue: boolean = false
	@Input() set justvalue(state: boolean) {
		this._justvalue = state
		if (state) this.__componentClass()
	}

	get justvalue(): boolean {
		return this._justvalue
	}

	private _type: 'row' | 'list' | 'empty' | 'date'
	private _typeof: string
	private _translation: string
	private _justvalue: boolean

	constructor(
		private translate: TransLinkService,
		private elRef: ElementRef,
		private render: Renderer2,
	) {}

	get translation(): string {
		if (!this._translation) this.labelTranslation()
		return this._translation
	}

	get type(): 'row' | 'list' | 'empty' | 'date' {
		if (this._type) return this._type
		if (hasValue(this.value)) {
			const to = typeof this.value
			switch (to) {
				case 'string':
				case 'bigint':
				case 'number':
				case 'symbol':
				case 'boolean':
					this._type = 'row'
					break
				case 'object':
					if (this.value instanceof Date) {
						this._type = 'date'
						break
					}
					this._type = 'list'
					break
				case 'function':
				case 'undefined':
				default:
					this._type = 'empty'
					break
			}
			this._typeof = to
		} else {
			this._type = 'empty'
		}
		this.__componentClass()
	}

	get valtype(): string {
		return this._typeof ?? typeof this.value
	}

	public ngOnChanges(changes: SimpleChanges): void {
		if ('prefix' in changes) this.labelTranslation()
	}

	private labelTranslation(): void {
		const tlstring = this.prefix ? `schema.${this.prefix}.${this.key}` : this.key
		if (!tlstring) return

		const exists = this.translate.instant(tlstring)
		const type = typeof exists
		if (exists) {
			if (type !== 'string') this._translation = tlstring + '.__title'
			else this._translation = tlstring
		}
	}

	private __componentClass(): void {
		const list = 'ngq_generic-list'
		const row = 'ngq_generic-row'
		let css = this.justvalue ? list : row

		if (!this.justvalue) {
			switch (this.type) {
				case 'list':
					css = 'ngq_generic-list'
					break
				case 'row':
				case 'empty':
				default:
					css = 'ngq_generic-row'
					break
			}
		}

		const el = this.elRef.nativeElement
		const prev = this.justvalue ? row : list
		this.render.removeClass(el, prev)
		this.render.addClass(el, css)
	}
}
