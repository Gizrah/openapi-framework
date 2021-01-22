import { Component, ViewChild, ViewContainerRef } from '@angular/core'
import * as _moment from 'moment'
import { Observable } from 'rxjs'

import { NgqFieldWrapper } from '../classes/formly.extend'

export const moment = _moment
@Component({
	selector: 'ngq-formly-label-top',
	template: `
		<div class="label_top">
			<div class="label_top-label" *ngIf="!!label">
				{{ label | translink }}<span class="required" *ngIf="to.required">*</span>
			</div>

			<ng-container #fieldComponent></ng-container>
		</div>
	`,
	styles: [
		':host { width: 100% }',
		'.label_top { padding-top: 0.6em; position: relative; width: 100%; }',
		'.label_top-label { position: absolute; top: -0.4em; left: 0.3em; font-size: 0.8em; font-weight: 400; }',
	],
})
export class NgqLabelTop extends NgqFieldWrapper {
	@ViewChild('fieldComponent', { read: ViewContainerRef, static: true })
	public fieldComponent: ViewContainerRef

	get label(): string {
		return this.ngq && this.ngq.tlstring ? this.ngq.tlstring : this._label ?? undefined
	}

	get isasync(): boolean {
		return (this.to.label as any) instanceof Observable
	}

	private _label: string

	public ngOnInit(): void {
		if (this.to) {
			if (this.to.label) {
				this._label = this.to.label
				this.field.templateOptions.label = null
			}

			if (!['checkbox', 'radio', 'boolean'].includes(this.field.type)) {
				Reflect.defineProperty(this.field.templateOptions, 'appearance', {
					value: 'outline',
				})
			}
		}
	}

	public ngOnDestroy(): void {
		if (this._label) {
			this.field.templateOptions.label = this._label
		}
	}
}
