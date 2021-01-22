import { Component, Input, ViewChild } from '@angular/core'
import { StorageKeys } from '@quebble/consts'
import { hasValue } from '@quebble/scripts'
import { StorageService } from '@quebble/services'

import { NgqFieldType } from '../../classes/formly.extend'
import { AutocompleteTypeComponent } from '../autocomplete-type/autocomplete-type.component'

@Component({
	selector: 'formly-object-select',
	template: `
		<div class="item_type">
			<div class="item_type-titlebar">
				<ng-template [ngIf]="label">
					<ng-template [ngIf]="devmode">
						<label
							matTooltip="::DEV:: Log ObjectOrSelectTypeComponent to console"
							(click)="__log()"
						>
							{{ label | translink }}
						</label>
					</ng-template>

					<ng-template [ngIf]="!devmode">
						<label>
							{{ label | translink }}
						</label>
					</ng-template>
				</ng-template>

				<div class="ngq-label-line"></div>

				<ng-template [ngIf]="!!field.formControl">
					<ngq-button
						[icon]="['save', 'check']"
						[color]="['info-alt', 'success-alt']"
						[disabled]="!valid"
						(click)="save()"
					></ngq-button>

					<ngq-button
						[icon]="['undo']"
						[color]="['warning-alt']"
						[disabled]="!resetable"
						(click)="reset()"
					></ngq-button>

					<ngq-button
						[icon]="['trash']"
						[color]="['error-alt']"
						(click)="delete()"
						*ngIf="deletable || resetable"
					></ngq-button>

					<ngq-button
						[icon]="['times']"
						[color]="['accent-alt']"
						(click)="cancel()"
					></ngq-button>
				</ng-template>
			</div>

			<div class="item_type-autocomplete">
				<formly-autocomplete [field]="field" #autocomplete></formly-autocomplete>
			</div>

			<div class="item_type-fields">
				<ng-container *ngFor="let f of field.fieldGroup">
					<formly-field
						[field]="f"
						[class.nested_single-field-active]="ids.includes(f.id)"
						[class.nested_single-field-invalid]="
							!ids.includes(f.id) && !f.formControl?.valid && !f.formControl?.pristine
						"
					></formly-field>
				</ng-container>
			</div>
		</div>
	`,
	styleUrls: ['../item-type.component.scss'],
})
export class ObjectOrSelectTypeComponent extends NgqFieldType {
	@Input() public ids: string[] = []
	@ViewChild(AutocompleteTypeComponent) private _autocomplete: AutocompleteTypeComponent

	constructor(private storage: StorageService) {
		super()
	}

	get valid(): boolean {
		return (
			(this.formControl.valid || (!this.formControl.invalid && this.formControl.disabled)) &&
			this.resetable
		)
	}

	get resetable(): boolean {
		return !this.formControl.pristine || this.formControl.touched || this.formControl.dirty
	}

	get deletable(): boolean {
		return hasValue(this.model) && hasValue(this.model['id'])
	}

	public ngOnInit(): void {
		super.ngOnInit(true)
		this.formControl.enable()
		this.formControl.updateValueAndValidity()
	}

	public ngAfterContentInit(): void {
		super.ngAfterContentInit()

		if (this.deletable) this.formControl?.disable()
	}

	public ngOnDestroy(): void {
		this.formControl?.disable()
	}

	private close(): void {
		this.storage.cache.set(StorageKeys.Form.Field, this.getNestedField(this.field, 'close'))
	}

	public save(): void {
		if (!this.valid) return
		this.close()
	}

	public cancel(): void {
		this.reset()
		this.close()
	}

	public reset(): void {
		this.resetModel()
		this._autocomplete.autocomplete.reset()
	}

	public delete(): void {
		this._autocomplete.autocomplete.reset()

		this.overwriteModel(undefined, true)
		this.formControl.reset()
		this.formControl.enable()
	}
}
