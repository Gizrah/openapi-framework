import { Component, ElementRef, Renderer2, ViewChild, ViewContainerRef } from '@angular/core'
import * as _moment from 'moment'

import { NgqFieldWrapper } from '../classes/formly.extend'
import { FormlyValidatorService } from '../classes/formly.validator'

export const moment = _moment
@Component({
	selector: 'ngq-row-label-input',
	template: `
		<label
			*ngIf="!!label"
			class="accent"
			(click)="__log()"
			matTooltip="::DEV:: Log NgqRowLabelInput to console"
			[matTooltipDisabled]="!devmode"
		>
			{{ label | translink }}<span class="required" *ngIf="to.required">*</span>
		</label>

		<ng-container #fieldComponent></ng-container>
	`,
})
export class NgqRowLabelInput extends NgqFieldWrapper {
	@ViewChild('fieldComponent', { read: ViewContainerRef, static: true })
	public fieldComponent: ViewContainerRef

	private _label: string

	constructor(
		private elRef: ElementRef<HTMLElement>,
		private render: Renderer2,
		private validate: FormlyValidatorService,
	) {
		super()
	}

	get label(): string {
		if (this.to.label && !this._label) {
			this._label = String(this.to.label).toString()
			this.ngq.label = this._label
			this.to.label = null
		}

		return this._label
	}

	public ngOnInit(): void {
		this.updateValidator()

		if (this.to) {
			if (!['checkbox', 'radio', 'boolean'].includes(this.field.type)) {
				Reflect.defineProperty(this.field.templateOptions, 'appearance', {
					value: 'outline',
				})
			}

			if (this.field.type === 'textarea' || this.field.type === 'radio') {
				this.render.addClass(this.elRef.nativeElement, 'input-textarea')
			}
		}
	}

	public ngOnDestroy(): void {
		if (this._label) {
			this.field.templateOptions.label = this._label
			delete this.field.ngqOptions.label
		}
	}

	private updateValidator(): void {
		this.field.validation = this.field.validation ?? { messages: {} }
		const keys = this.field.templateOptions

		for (const key in keys) {
			if (keys[key] && this.validate.messages[key])
				this.field.validation.messages[key] = this.validate.messages[key](null, this.field)
		}
	}
}
