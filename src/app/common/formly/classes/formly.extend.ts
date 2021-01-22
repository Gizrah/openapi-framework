import { Directive, Input, ViewContainerRef } from '@angular/core'
import { AbstractControl, FormArray, FormControl, FormGroup } from '@angular/forms'
import { FieldArrayType, FormlyFieldConfig } from '@ngx-formly/core'
import { FieldType } from '@ngx-formly/material'
import { environment } from '@quebble/environment'
import { List } from '@quebble/models'
import { OpenApi } from '@quebble/openapi'
import { asArray, hasValue, isPrimitive, noNull } from '@quebble/scripts'
import { cloneDeep } from 'lodash-es'
import { Observable } from 'rxjs'

export interface NgqFieldOptions {
	label?: string
	state?: boolean
	formId?: string
	tlstring?: string
	tlprefix?: string
	subject?: string
	info?: string

	operationId?: string
	component?: any

	tl?: NgqTLOptions

	type?: OpenApi.XQuebbleType
	keys?: OpenApi.XQuebbleKeys
	data?: Observable<any[]>
	viewkeys?: any[]

	valid?: boolean
}

export interface INgqSemantics {
	singular?: string
	plural?: string
}

export interface NgqTLOptions {
	source?: {
		origin?: any
		semantics?: INgqSemantics
		linked?: boolean
		title?: string
	}
	linked?: boolean
	translated?: boolean
	semantics?: INgqSemantics
	keys?: {
		tl?: string
		semantic?: string
	}
}

type NestedType =
	| 'field'
	| 'array-item'
	| 'select-item'
	| 'address-item'
	| 'object-select'
	| 'close'
	| 'special'
export interface NestedField {
	formId: string
	type: NestedType
	special?: 'list'
	fieldId?: string
	field: NgqFieldConfig
}

export interface NestedList {
	[key: string]: any
}

export interface NgqFieldConfig extends FormlyFieldConfig {
	ngqOptions?: NgqFieldOptions
	fieldGroup?: NgqFieldConfig[]
	fieldArray?: NgqFieldConfig
	parent?: NgqFieldConfig
	expressionProperties?: {
		[property: string]:
			| string
			| ((model: any, formState: any, field?: NgqFieldConfig) => any)
			| Observable<any>
	}
	hideExpression?:
		| string
		| boolean
		| ((model: any, formstate: any, field: NgqFieldConfig) => boolean)
}

const getNestedField = (field: NgqFieldConfig, type: NestedType = 'field') => {
	return {
		formId: field.ngqOptions?.formId ?? null,
		type,
		field,
	}
}

@Directive()
export abstract class NgqFieldType<G extends NgqFieldConfig = NgqFieldConfig> extends FieldType {
	@Input() public field: G

	protected _values: any
	protected _keyin: boolean = false

	get ngq() {
		return this.field.ngqOptions ?? {}
	}

	get label(): string {
		return this.to?.label ?? this.ngq?.tlstring ?? this.ngq?.label ?? undefined
	}

	get subject(): string {
		return this.ngq?.subject ?? this.ngq?.info
	}

	public ngOnInit(noSelfSet?: boolean): void {
		if (!this.field) return
		this.field.ngqOptions = this.field.ngqOptions ?? {}
		if (!noSelfSet) this.ngq.component = this
	}

	/**
	 * Use the Angular life-cycle hook to determine if the current available
	 * data in the model has a value and that it's not an empty object.
	 *
	 * Using a workaround to get the correct model value, by referencing the
	 * parent's model with the current field's key, since the model can
	 * sometimes reference the entire model, instead of its own key.
	 */
	public ngAfterContentInit(): void {
		if (!hasValue(this.field?.model)) return
		const key = this.field?.key as string
		let model = this.field.parent?.model[key]

		if (!hasValue(model) || !Object.entries(model).length) {
			if (this.to.multiple) model = []
			else model = undefined
		}

		this.setOriginalValues(model)
	}

	/**
	 * Set the NgqFieldType private _values, that is used to reset nested object
	 * values and to determine if the nested form and/or field had a previous
	 * value at all.
	 *
	 * @param original value to use
	 */
	protected setOriginalValues(original: any): void {
		if (!hasValue(original, true)) return

		let values = original
		if (this.to.multiple) values = asArray(original)
		if (this.field.type === 'array') values = asArray(original)
		this._values = cloneDeep(values)
	}

	/**
	 * Make the NestedField object with the supplied or default values. Used by
	 * the Form's view wrapper to adjust the state of nested fields.
	 *
	 * @param field NgqFieldConfig to use
	 * @param type type of field
	 */
	protected getNestedField(
		field: NgqFieldConfig = this.field,
		type: NestedType = 'field',
	): NestedField {
		return getNestedField(field, type)
	}

	/**
	 * Reset all nested FormControl items, recursively going through both data
	 * and controls to make sure values exist and controls don't try to fill
	 * data with x-of-null.
	 */
	protected resetModel(): void {
		if (!hasValue(this._values)) {
			this.formControl?.reset()
			this.overwriteModel(undefined)
		} else {
			this.parseValue(this._values, this.formControl)
			this.overwriteModel(this._values)
		}
	}

	/**
	 * Overwrite the current FormlyField.model value for this field, to make
	 * sure any changes are pushed through completely.
	 *
	 * @param model model value to overwrite the current value with
	 * @param noOrigin whether or not to overwrite the original values
	 */
	protected overwriteModel(model: any, noOrigin?: boolean): void {
		this.field.parent.model[this.field.key as string] = model
		if (!noOrigin) this._values = model
	}

	/**
	 * Custom model reset function, since Formly allows you to reset the model
	 * only for the entire model, not for a nested part of the model.
	 *
	 * Removes all empty key/values and objects from the supplied value. If no
	 * value remains, the FormGroup is reset. Otherwise, the controls in the
	 * FormGroup are parsed similarly, so no nested controls will get errors
	 * when attempting to get x of null.
	 *
	 * @param value current part of the value object or primitive to parse
	 * @param ac any AbstractControl
	 *
	 * @returns technically nothing
	 */
	protected parseValue(
		value: any,
		ac: FormControl | FormGroup | FormArray | AbstractControl,
		type?: 'reset' | 'setValue' | 'patchValue',
	): any {
		if (!hasValue(ac)) return
		if (ac.disabled) ac.enable({ emitEvent: false })

		const doreset = (
			fc: FormControl | FormGroup | FormArray | AbstractControl,
			v: any = undefined,
		) => {
			const variant = type ?? 'reset'

			if (variant !== 'reset') {
				fc.markAsPristine({ onlySelf: true })
				fc.markAsUntouched({ onlySelf: true })
			}

			fc[variant](v, { emitEvent: false })
			return
		}

		if (!hasValue(value)) {
			return doreset(ac, undefined)
		}

		if (isPrimitive(value)) {
			return doreset(ac, value)
		} else {
			const parsed = noNull(value)
			const nulled = !hasValue(parsed)

			if (Array.isArray(parsed)) {
				const fa = ac as FormArray
				const ctrls = fa?.controls

				if (Array.isArray(ctrls)) {
					const fa = ac as FormArray
					if (fa.controls.length > parsed.length) {
						for (let i = parsed.length; i < fa.controls.length; i++) {
							fa.removeAt(i)
						}
					}

					parsed.forEach((v, i) => {
						if (ctrls[i]) this.parseValue(v, ctrls[i], type)
						else {
							const nulled = noNull(v)
							if (nulled) fa.setValue(nulled, { emitEvent: false })
						}
					})
				} else {
					return fa.setValue(parsed)
				}
			} else {
				const fg = ac as FormGroup
				const ctrls = fg?.controls ?? {}
				if (nulled) return doreset(fg)
				if (typeof value !== 'object') return doreset(fg)

				const controls = Object.entries(ctrls)

				for (const [key, ctrl] of controls) {
					const val = noNull(value[key])
					if (!hasValue(val)) doreset(ctrl)
					else this.parseValue(val, ctrl, type)
				}
			}
		}
	}

	// ::DEV::
	get devmode() {
		return !environment.production
	}

	public __log(f?): void {
		if (this.devmode) console.log(f ?? this)
	}
}

@Directive()
export abstract class NgqFieldWrapper<
	F extends NgqFieldConfig = NgqFieldConfig
> extends NgqFieldType {
	public fieldComponent: ViewContainerRef
	public field: F

	// ::DEV::
	public __log(f?): void {
		if (this.devmode) {
			console.log(this)
			if (f) console.log(f)
		}
	}
}

@Directive()
export abstract class NgqFieldArray<
	G extends NgqFieldConfig = NgqFieldConfig
> extends FieldArrayType {
	public defaultOptions: G
	public field: G

	protected _originals: List<any> = new List()
	public valids: List<any> = new List()

	public ngOnInit(): void {
		if (!this.field) return
		this.field.ngqOptions = this.field.ngqOptions ?? {}

		this.ngq.component = this
	}

	public ngAfterContentInit(): void {
		this._originals = new List()
		this.field?.fieldGroup?.forEach((group, index) => {
			this._originals.add(group.id)
			this.valids.add(group.id)
		})

		this.formControl.clear()
	}

	get ngq() {
		return this.field.ngqOptions ?? {}
	}

	get label(): string {
		return this.ngq?.tlstring ?? this.to?.label ?? undefined
	}

	protected getNestedField(
		field: NgqFieldConfig = this.field,
		type: NestedType = 'field',
	): NestedField {
		return getNestedField(field, type)
	}

	// ::DEV::
	get devmode() {
		return !environment.production
	}

	public __log(): void {
		if (!environment.production) console.log(this)
	}
}
