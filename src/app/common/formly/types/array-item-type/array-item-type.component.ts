import { Component, Input } from '@angular/core'
import { StorageKeys } from '@quebble/consts'
import { hasValue } from '@quebble/scripts'
import { StorageService } from '@quebble/services'

import { NgqFieldType } from '../../classes/formly.extend'
import { ArrayTypeComponent } from '../array-type/array-type.component'

@Component({
	selector: 'formly-array-item',
	template: `
		<div class="item_type">
			<div class="item_type-titlebar">
				<ng-template [ngIf]="label">
					<ng-template [ngIf]="devmode">
						<label
							matTooltip="::DEV:: Log ArrayItemComponent to console"
							(click)="__log()"
						>
							{{ model && model[subject] ? model[subject] : (label | translink) }}
						</label>
					</ng-template>

					<ng-template [ngIf]="!devmode">
						<label>
							{{ model && model[subject] ? model[subject] : (label | translink) }}
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
						*ngIf="deletable"
					></ngq-button>

					<ngq-button
						[icon]="['times']"
						[color]="['accent-alt']"
						(click)="cancel()"
					></ngq-button>
				</ng-template>
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
export class ArrayItemTypeComponent extends NgqFieldType {
	@Input() public ids: string[] = []

	private _instance: ArrayTypeComponent

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
		return (hasValue(this.model) && hasValue(this.model['id'])) || this.resetable
	}

	public ngOnInit(): void {
		super.ngOnInit()
		this.formControl.enable()
		this.formControl.updateValueAndValidity()
	}

	public ngAfterContentInit(): void {
		super.ngAfterContentInit()

		const { parent } = this.field
		const { ngqOptions } = parent ?? {}
		const { component } = ngqOptions
		this._instance = component
	}

	public ngOnDestroy(): void {
		this.field?.parent?.ngqOptions?.component?.checkItem(this.field)
		this.formControl?.disable()
	}

	private close(state?: boolean): void {
		this._instance?.completeItem(state)
		this.storage.cache.set(StorageKeys.Form.Field, this.getNestedField(this.field, 'close'))
	}

	public save(): void {
		if (!this.valid) return
		this.close(true)
	}

	public cancel(): void {
		this.reset()
		this.close(false)
	}

	public reset(): void {
		this.resetModel()
	}

	public delete(): void {
		this._instance?.removeItem(this.field, true)
	}
}
