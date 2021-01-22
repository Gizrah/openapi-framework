import { delay, filter, switchMap } from 'rxjs/operators'

import { ChangeDetectorRef, Component } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { FadeInOutAnimation } from '@quebble/animations'
import { StorageKeys } from '@quebble/consts'
import { hasValue, noNull } from '@quebble/scripts'
import { StorageService } from '@quebble/services'
import { NgqFieldWrapper } from 'app/common/formly/classes/formly.extend'
import { AddressObject, AddressService } from 'app/common/services/address/address.service'
import { BehaviorSubject, Subscription } from 'rxjs'

@Component({
	selector: 'formly-address-wrapper',
	animations: FadeInOutAnimation,
	templateUrl: 'address.wrapper.html',
	styleUrls: ['./address.wrapper.scss'],
	providers: [AddressService],
})
export class AddressWrapperComponent extends NgqFieldWrapper {
	public labels: {
		postal_code: string
		street_number: string
		street_number_additional: string
	} = {} as any
	public addressForm: FormGroup
	public addressCount: number
	public selected: AddressObject
	public current: AddressObject
	public tlstring: string

	private value$: Subscription
	private form$: Subscription

	constructor(
		private cdRef: ChangeDetectorRef,
		private storage: StorageService,
		private address: AddressService,
	) {
		super()
	}

	get valid(): boolean {
		return this.addressForm.valid && this.resetable
	}

	get resetable(): boolean {
		return (
			(!this.addressForm.pristine || this.addressForm.touched || this.addressForm.dirty) &&
			hasValue(noNull(this.addressForm.value))
		)
	}

	get deletable(): boolean {
		return this.existing || this.resetable
	}

	get existing(): boolean {
		return hasValue(this.field?.parent?.model[this.field?.key as string])
	}

	public ngOnInit(): void {
		super.ngOnInit()

		// Using the DisplayKeys principle, create a view for the ListType's
		// nested NgqListComponent's items. Outputs as:
		// Streetname 1 a
		// 13456 Somewhere
		this.ngq.viewkeys = [
			['street', 'street_number', 'street_number_additional'],
			['postal_code', 'city'],
		]
	}

	public ngAfterContentInit(): void {
		super.ngAfterContentInit()

		if (hasValue(noNull(this._values))) this.current = this._values

		this.setForm()

		// Watch for value changes and call the AddressService if the zipcode
		// and number values are valid
		this.value$ = this.addressForm.valueChanges
			.pipe(
				filter(
					(f) =>
						hasValue(f) &&
						hasValue(f.postal_code) &&
						hasValue(f.street_number) &&
						this.addressForm.valid &&
						!this.ngq.state &&
						!this.current,
				),
				switchMap((form) => {
					const { postal_code, street_number, street_number_additional } = form
					return this.address.get(
						postal_code,
						street_number,
						null,
						street_number_additional,
					)
				}),
			)
			.subscribe((addresses) => {
				this.addressCount = addresses.length
				if (addresses.length > 1) {
					this.ngq.data = new BehaviorSubject(addresses)
				} else {
					if (addresses.length === 1) {
						this.selected = addresses[0]
						this.current = undefined
					}
				}

				this.cdRef.detectChanges()
			})

		// Check for forced updates and/or resets to the main form, i.e. when
		// using autocomplete or when the parent form is cleared
		this.form$ = this.formControl.valueChanges
			.pipe(
				delay(250),
				filter(() => !this.ngq.state),
			)
			.subscribe((form) => {
				const { pristine, disabled } = this.formControl
				if (disabled) {
					this.current = form
				} else if (pristine) {
					// So the form is pristine again, check if the value is cleared
					// i.e. all controls have null/undefined as value
					const nonull = noNull(form)
					if (!nonull) {
						// If no content is found, reset all the things
						this.current = undefined
						this.selected = undefined
					} else {
						// Otherwise, we've updated the values and reset the form
						// to initial state, so we've "selected" an item from the
						// list of addresses
						this.selected = form
						this.current = undefined
					}
				}

				this.cdRef.detectChanges()
			})
	}

	public ngOnDestroy(): void {
		this.value$?.unsubscribe()
		this.form$?.unsubscribe()
	}

	/**
	 * Use the FormGroup in the FieldConfig to dupe the required fields for the
	 * custom addressForm
	 */
	private setForm(): void {
		const group = this.formControl as FormGroup
		this.addressForm = new FormGroup({})

		// Loop through the available fields and set the addressForm with the
		// supplied formControls that match the keys shown in the wrapper's
		// custom form.
		this.field.fieldGroup?.forEach((field) => {
			const key = field.key as string
			const fc = group?.get(key)

			const { templateOptions } = field
			const { label } = templateOptions

			if (!this.tlstring) {
				this.tlstring =
					field.ngqOptions.tlprefix ??
					field.ngqOptions.tlstring ??
					label.replace(`.${key}`, '')
			}

			switch (key) {
				case 'postal_code':
				case 'street_number':
				case 'street_number_additional': {
					this.addressForm.setControl(key, fc)
					this.labels[key] = label
					break
				}

				default:
					break
			}
		})
	}

	/**
	 * Simple boolean check to prevent template errors from the ngLanguageServer
	 * which can't tell the type of the value, so it'll give type warnings for
	 * checking the value for empty string or 0.
	 *
	 * @param item the item from the Angular KeyValue pipe
	 */
	public kvHasValue(item: Record<any, any>): boolean {
		const { key, value } = item
		return hasValue(key) && hasValue(value) && value !== 0
	}

	/**
	 *
	 * @param item
	 */
	public kvKey(item: Record<any, any>): string {
		const { key } = item
		return key as string
	}

	/**
	 * Open the custom nested form to customize the address
	 */
	public customize(): void {
		if (this.ngq.state) return
		if (!this.selected && !this.current && this.resetable) return

		if (this.current && !this.selected) {
			this.current = this.selected
			this.current = undefined
			this.formControl.markAsPristine()
			this.formControl.markAsUntouched()
			this.cdRef.detectChanges()
			return
		}

		this.storage.cache.set(
			StorageKeys.Form.Field,
			this.getNestedField(this.field, 'address-item'),
		)
	}

	/**
	 * Open the list view
	 */
	public select(): void {
		// Workaround for ListType, since the formControl is set to invalid
		// while all controls are valid 🤷🏻‍♂️
		this.formControl.updateValueAndValidity()

		this.storage.cache.set(
			StorageKeys.Form.Field,
			this.getNestedField(this.field, 'select-item'),
		)
	}

	/**
	 * Reset the addressForm and clean-up the address count, selected item,
	 * current item and the stored address data
	 */
	public clear(): void {
		this.addressForm.reset()
		this.formControl.reset({ emitEvent: false })
		this.overwriteModel(undefined)

		this.addressCount = undefined
		this.selected = undefined
		this.current = undefined

		const data = this.ngq.data as BehaviorSubject<any[]>
		data?.next(null)
	}

	/**
	 * Apply the filled in values from the FormGroup. Called by the AddressType
	 * to apply the `save()` action to AddressWrapper
	 */
	public apply(): void {
		const { value } = this.formControl
		this.selected = value
		this.current = undefined
	}

	/**
	 * Cancel the customization. Called by the AddressType. (Re)sets the _values
	 * and, if they have content, sets current again.
	 */
	public cancel(): void {
		if (!this.formControl.pristine) this.resetModel()
		if (hasValue(this._values)) {
			if (!this.selected) this.current = this._values
			else this.selected = this._values
			this.addressForm.patchValue(this._values, { emitEvent: false })
		}
	}

	/**
	 * Show the input fields when they are hidden by current
	 */
	public unlock(): void {
		this.selected = this.current
		this.current = undefined
		this.addressForm.markAsTouched()
		this.addressForm.markAsDirty()
		this.formControl.markAsPristine()
	}

	/**
	 * Confirm the selected value as the current value. Clear the data and
	 * overwrite the old _values with the new address values.
	 */
	public confirm(): void {
		this.current = this.selected
		this.selected = undefined
		this.addressCount = undefined

		const data = this.ngq.data as BehaviorSubject<any[]>
		data?.next(null)

		this.overwriteModel(this.current)
	}
}
