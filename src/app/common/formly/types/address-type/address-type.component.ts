import { Component } from '@angular/core'
import { FormControl, FormGroup } from '@angular/forms'
import { FadeInOutAnimation } from '@quebble/animations'
import { StorageKeys } from '@quebble/consts'
import { hasValue } from '@quebble/scripts'
import { StorageService } from '@quebble/services'
import { AddressService, ICountry } from 'app/common/services/address/address.service'
import { Subject } from 'rxjs'

import { NgqFieldConfig, NgqFieldType } from '../../classes/formly.extend'
import { AddressWrapperComponent } from '../../wrappers/nested/address/address.wrapper'

@Component({
	selector: 'formly-address-item',
	animations: FadeInOutAnimation,
	template: `
		<div class="item_type">
			<div class="item_type-titlebar">
				<ng-template [ngIf]="label">
					<ng-template [ngIf]="devmode">
						<label
							matTooltip="::DEV:: Log AddressTypeComponent to console"
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

			<div
				class="item_type-fields formly-custom-fields item_type-address"
				[loader]="!formControl"
			>
				<ng-template [ngIf]="!!formControl">
					<div *ngIf="fields.s">
						<formly-field [field]="fields.s"></formly-field>
					</div>

					<div class="custom-fields-row" *ngIf="fields.sn && fields.sna">
						<div class="field-row-inputs">
							<div class="field-row-inputs-column">
								<label class="accent">
									{{ fields.pc.templateOptions.label | translink }}
								</label>
								<mat-form-field appearance="outline">
									<input matInput [formControl]="controls.pc" />
								</mat-form-field>
							</div>
							<div class="field-row-inputs-column">
								<label class="accent">
									{{ fields.sn.templateOptions.label | translink }}
								</label>
								<mat-form-field appearance="outline">
									<input matInput [formControl]="controls.sn" />
								</mat-form-field>
							</div>

							<div class="field-row-inputs-column">
								<label class="accent">
									{{ fields.sna.templateOptions.label | translink }}
								</label>
								<mat-form-field appearance="outline">
									<input matInput [formControl]="controls.sna" />
								</mat-form-field>
							</div>
						</div>
					</div>

					<div *ngIf="fields.c && fields.p">
						<formly-field [field]="fields.c"></formly-field>
						<formly-field [field]="fields.p"></formly-field>
					</div>

					<div *ngIf="fields.country">
						<div class="custom-fields-row-label">
							<label class="accent">
								{{ fields.country.templateOptions.label | translink }}
							</label>
							<formly-autocomplete
								[field]="fields.country"
								[inline]="true"
								[noup]="true"
								[subject]="'name'"
								(search)="search($event)"
								(select)="select($event)"
							></formly-autocomplete>
						</div>
					</div>
				</ng-template>
			</div>
		</div>
	`,
	styleUrls: ['../item-type.component.scss'],
	providers: [AddressService],
})
export class AddressTypeComponent extends NgqFieldType {
	private _fields: Record<string, NgqFieldConfig> = {}
	private _instance: AddressWrapperComponent

	constructor(private storage: StorageService, private address: AddressService) {
		super()
	}

	/**
	 * Getter for all NgqFieldConfig items, for making the template far more
	 * readable and easier to maintain.
	 */
	get fields(): Record<'s' | 'sn' | 'sna' | 'pc' | 'c' | 'p' | 'country', NgqFieldConfig> {
		// Get a field if it's known, or set it and then return it
		const getfield = (key: string): NgqFieldConfig => {
			if (!this._fields[key] && this.field?.fieldGroup) {
				const f = this.field?.fieldGroup?.find((field) => field.key === key)
				this._fields[key] = f
				if (key === 'country') {
					// For the autocomplete component, empty Subject that will
					// be filled
					if (!f.ngqOptions.data) f.ngqOptions.data = new Subject<ICountry[]>()
				}
			}

			return this._fields[key]
		}
		// Why the short letters instead of the overly verbose actual property
		// names? Well ... don't wanna.
		return {
			s: getfield('street'),
			sn: getfield('street_number'),
			sna: getfield('street_number_additional'),
			pc: getfield('postal_code'),
			c: getfield('city'),
			p: getfield('province'),
			country: getfield('country'),
		}
	}

	/**
	 * Since referencing the formControls in the field config's field group
	 * array does not update the formControl in the main field, so this is a
	 * simple getter to return the controls needed for the custom inputs
	 */
	get controls(): Record<string, FormControl> {
		const fc = this.formControl as FormGroup
		return {
			sn: fc.controls.street_number as FormControl,
			sna: fc.controls.street_number_additional as FormControl,
			pc: fc.controls.postal_code as FormControl,
		}
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
		return hasValue(this._values)
	}

	public ngOnInit(): void {
		super.ngOnInit(true)
	}

	public ngAfterContentInit(): void {
		super.ngAfterContentInit()

		this._instance = this.ngq.component
	}

	private close(): void {
		this.storage.cache.set(StorageKeys.Form.Field, this.getNestedField(this.field, 'close'))
	}

	public save(): void {
		if (!this.valid) return
		this._instance?.apply()
		this.close()
	}

	public cancel(): void {
		this._instance?.cancel()
		this.close()
	}

	public reset(): void {
		this.resetModel()
	}

	public delete(): void {
		this.overwriteModel(undefined, true)
		this.formControl.reset()
		this.formControl.enable()
	}

	/**
	 * Call the AddressService's country Promise and update the subject in
	 * ngq.data of the country field config
	 * @param value
	 */
	public async search(value: string): Promise<void> {
		const list = await this.address.country(value)
		const subject = this.fields.country.ngqOptions.data as Subject<ICountry[]>
		subject.next(list)
	}

	public select(item: ICountry): void {
		this.fields.country.formControl.patchValue(item.name)
	}
}
