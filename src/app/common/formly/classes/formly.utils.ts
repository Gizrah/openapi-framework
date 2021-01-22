import { ComponentFactoryResolver, ComponentRef, Injector } from '@angular/core'
import {
	AbstractControl,
	AsyncValidatorFn,
	FormArray,
	FormControl,
	FormGroup,
	ValidatorFn,
} from '@angular/forms'
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core'
import { FieldType } from '@ngx-formly/material'
import { OpenApi } from '@quebble/openapi'
import { isObservable } from 'rxjs'

import { NgqFieldConfig } from './formly.extend'

export interface FormlyJsonschemaOptions {
	/**
	 * allows to intercept the mapping, taking the already mapped
	 * formly field and the original JSONSchema source from which it
	 * was mapped.
	 */
	map?: (mappedField: NgqFieldConfig, mapSource: OpenApi.SchemaObject) => NgqFieldConfig
}

export const isConst = (schema: OpenApi.SchemaObject) => {
	return schema.enum && schema.enum.length === 1
}

export const totalMatchedFields = (field: NgqFieldConfig): number => {
	if (field.key && !field.fieldGroup) {
		return getFieldInitialValue(field) !== undefined ? 1 : 0
	}

	return field.fieldGroup.reduce((s, f) => totalMatchedFields(f) + s, 0)
}

export const isFieldValid = (field: NgqFieldConfig): boolean => {
	if (field.key) {
		return field.formControl.valid
	}

	return field.fieldGroup.every((f) => isFieldValid(f))
}

export interface IFormlyJSONOptions extends FormlyJsonschemaOptions {
	schema: OpenApi.SchemaObject
	autoClear?: boolean
}

export function getFieldId(formId: string, field: FormlyFieldConfig, index: string | number) {
	if (field.id) return field.id
	let type = field.type
	if (!type && field.template) type = 'template'
	return [formId, type, field.key, index].join('_')
}

export const FORMLY_VALIDATORS = ['required', 'pattern', 'minLength', 'maxLength', 'min', 'max']

export function assignModelValue(model: any, paths: string[], value: any) {
	for (let i = 0; i < paths.length - 1; i++) {
		const path = paths[i]
		if (!model[path] || !isObject(model[path])) {
			model[path] = /^\d+$/.test(paths[i + 1]) ? [] : {}
		}

		model = model[path]
	}

	model[paths[paths.length - 1]] = clone(value)
}

export function getKeyPath(field: FormlyFieldConfigCache): string[] {
	if (!field.key) {
		return []
	}

	/* We store the keyPath in the field for performance reasons. This function will be called frequently. */
	if (!field._keyPath || field._keyPath.key !== field.key) {
		const key =
			String(field.key).indexOf('[') === -1
				? field.key
				: String(field.key).replace(/\[(\w+)\]/g, '.$1')

		field._keyPath = {
			key: field.key as any,
			path: String(key).indexOf('.') !== -1 ? (String(key).split('.') as any) : [key],
		}
	}

	return field._keyPath.path.slice(0)
}

export function getFieldInitialValue(field: FormlyFieldConfig) {
	let value = field.options['_initialModel']
	let paths = getKeyPath(field)
	while (field.parent) {
		field = field.parent
		paths = [...getKeyPath(field), ...paths]
	}

	for (const path of paths) {
		if (!value) {
			return undefined
		}
		value = value[path]
	}

	return value
}

export function assignFieldValue(field: FormlyFieldConfigCache, value: any) {
	let paths = getKeyPath(field)
	while (field.parent) {
		field = field.parent
		paths = [...getKeyPath(field), ...paths]
	}

	if (value == null && field['autoClear'] && !field.formControl.parent) {
		const k = paths.pop()
		const m = paths.reduce((model, path) => model[path] || {}, field.parent.model)
		delete m[k]
		return
	}

	assignModelValue(field.model, paths, value)
}

export function reverseDeepMerge(dest: any, ...args: any[]) {
	args.forEach((src) => {
		for (const srcArg in src) {
			if (isNullOrUndefined(dest[srcArg]) || isBlankString(dest[srcArg])) {
				dest[srcArg] = clone(src[srcArg])
			} else if (objAndSameType(dest[srcArg], src[srcArg])) {
				reverseDeepMerge(dest[srcArg], src[srcArg])
			}
		}
	})
	return dest
}

export function getFieldValue(field: FormlyFieldConfig): any {
	let model = field.parent.model
	for (const path of getKeyPath(field)) {
		if (!model) {
			return model
		}
		model = model[path]
	}

	return model
}

export function isNullOrUndefined(value: any) {
	return value === undefined || value === null
}

export function isUndefined(value: any) {
	return value === undefined
}

export function isBlankString(value: any) {
	return value === ''
}

export function isFunction(value: any) {
	return typeof value === 'function'
}

export function objAndSameType(obj1: any, obj2: any) {
	return (
		isObject(obj1) &&
		isObject(obj2) &&
		Object.getPrototypeOf(obj1) === Object.getPrototypeOf(obj2) &&
		!(Array.isArray(obj1) || Array.isArray(obj2))
	)
}

export function isObject(x: any) {
	return x != null && typeof x === 'object'
}

export function isPromise(obj: any): obj is Promise<any> {
	return !!obj && typeof obj.then === 'function'
}

export function clone(value: any): any {
	if (
		!isObject(value) ||
		isObservable(value) ||
		/* instanceof SafeHtmlImpl */ value.changingThisBreaksApplicationSecurity ||
		['RegExp', 'FileList', 'File', 'Blob'].indexOf(value.constructor.name) !== -1
	) {
		return value
	}

	// https://github.com/moment/moment/blob/master/moment.js#L252
	if (value._isAMomentObject && isFunction(value.clone)) {
		return value.clone()
	}

	if (value instanceof AbstractControl) {
		return null
	}

	if (value instanceof Date) {
		return new Date(value.getTime())
	}

	if (Array.isArray(value)) {
		return value.slice(0).map((v) => clone(v))
	}

	// best way to clone a js object maybe
	// https://stackoverflow.com/questions/41474986/how-to-clone-a-javascript-es6-class-instance
	const proto = Object.getPrototypeOf(value)
	let c = Object.create(proto)
	c = Object.setPrototypeOf(c, proto)
	// need to make a deep copy so we dont use Object.assign
	// also Object.assign wont copy property descriptor exactly
	return Object.keys(value).reduce((newVal, prop) => {
		const propDesc = Object.getOwnPropertyDescriptor(value, prop)
		if (propDesc.get) {
			Object.defineProperty(newVal, prop, propDesc)
		} else {
			newVal[prop] = clone(value[prop])
		}

		return newVal
	}, c)
}

export function defineHiddenProp(field, prop, defaultValue) {
	Object.defineProperty(field, prop, { enumerable: false, writable: true, configurable: true })
	field[prop] = defaultValue
}

export function wrapProperty<T = any>(field, prop, setFn: (newVal: T, oldVal?: T) => void) {
	let value = field[prop]
	setFn(value)

	Object.defineProperty(field, prop, {
		configurable: true,
		get: () => value,
		set: (newVal) => {
			if (newVal !== value) {
				setFn(newVal, value)
				value = newVal
			}
		},
	})
}

export function findControl(field: FormlyFieldConfig): AbstractControl {
	if (field.formControl) {
		return field.formControl
	}

	const form = field.parent.formControl as FormGroup

	return form ? form.get(getKeyPath(field)) : null
}

export function registerControl(field: FormlyFieldConfigCache, control?: any, emitEvent = false) {
	control = control || field.formControl
	if (!control['_fields']) {
		defineHiddenProp(control, '_fields', [])
	}
	if (control['_fields'].indexOf(field) === -1) {
		control['_fields'].push(field)
	}

	if (!field.formControl && control) {
		defineHiddenProp(field, 'formControl', control)

		field.templateOptions.disabled = !!field.templateOptions.disabled
		wrapProperty(field.templateOptions, 'disabled', ({ firstChange, currentValue }) => {
			if (!firstChange) {
				if (currentValue) field.formControl.disable()
				else field.formControl.enable()
			}
		})
		if (control.registerOnDisabledChange) {
			control.registerOnDisabledChange(
				(value: boolean) => (field.templateOptions['___$disabled'] = value),
			)
		}
	}

	let parent = field.parent.formControl as FormGroup
	if (!parent) {
		return
	}

	const paths = getKeyPath(field)
	if (!parent['_formlyControls']) {
		defineHiddenProp(parent, '_formlyControls', {})
	}
	parent['_formlyControls'][paths.join('.')] = control

	for (let i = 0; i < paths.length - 1; i++) {
		const path = paths[i]
		if (!parent.get([path])) {
			registerControl({
				key: path,
				formControl: new FormGroup({}),
				parent: { formControl: parent },
			})
		}

		parent = parent.get([path]) as FormGroup
	}

	if (
		field['autoClear'] &&
		field.parent &&
		!isUndefined(field.defaultValue) &&
		isUndefined(getFieldValue(field))
	) {
		assignFieldValue(field, field.defaultValue)
	}

	const value = getFieldValue(field)
	if (
		!(isNullOrUndefined(control.value) && isNullOrUndefined(value)) &&
		control.value !== value &&
		control instanceof FormControl
	) {
		control.patchValue(value)
	}
	const key = paths[paths.length - 1]
	if (!field._hide && parent.get([key]) !== control) {
		updateControl(parent, { emitEvent }, () => parent.setControl(key, control))
	}
}

export function unregisterControl(field: FormlyFieldConfig, emitEvent = false) {
	const form = field.formControl.parent as FormArray | FormGroup
	if (!form) {
		return
	}

	const control = field.formControl
	const opts = { emitEvent }
	if (form instanceof FormArray) {
		const key = form.controls.findIndex((c) => c === control)
		if (key !== -1) {
			updateControl(form, opts, () => form.removeAt(key))
		}
	} else if (form instanceof FormGroup) {
		const paths = getKeyPath(field)
		const key = paths[paths.length - 1]
		if (form.get([key]) === control) {
			updateControl(form, opts, () => form.removeControl(key))
		}
	}

	control.setParent(null)
	if (field['autoClear']) {
		if (field.parent.model) {
			delete field.parent.model[field.key as number]
		}
		control.reset(
			{ value: undefined, disabled: control.disabled },
			{ emitEvent: field.fieldGroup ? false : emitEvent, onlySelf: true },
		)
	}
}

function updateControl(
	form: FormGroup | FormArray,
	opts: { emitEvent: boolean },
	action: (...args) => any,
) {
	/**
	 *  workaround for https://github.com/angular/angular/issues/27679
	 */
	if (form instanceof FormGroup && !form['__patchForEachChild']) {
		defineHiddenProp(form, '__patchForEachChild', true)
		;(form as any)._forEachChild = (cb: (...args) => any) => {
			Object.keys(form.controls).forEach((k) => form.controls[k] && cb(form.controls[k], k))
		}
	}

	/**
	 * workaround for https://github.com/angular/angular/issues/20439
	 */
	const updateValueAndValidity = form.updateValueAndValidity.bind(form)
	if (opts.emitEvent === false) {
		form.updateValueAndValidity = (opts) => {
			updateValueAndValidity({ ...(opts || {}), emitEvent: false })
		}
	}

	action()

	if (opts.emitEvent === false) {
		form.updateValueAndValidity = updateValueAndValidity
	}
}

export interface ExpressionPropertyCache {
	expression: (model: any, formState: any, field: FormlyFieldConfigCache) => boolean
	expressionValueSetter: (value: any) => void
	expressionValue?: any
}

export interface FormlyFieldConfigCache extends FormlyFieldConfig {
	parent?: FormlyFieldConfigCache
	options?: FormlyFormOptionsCache
	_expressionProperties?: { [property: string]: ExpressionPropertyCache }
	_hide?: boolean
	_validators?: ValidatorFn[]
	_asyncValidators?: AsyncValidatorFn[]
	_componentRefs?: ComponentRef<FieldType>[]
	_keyPath?: {
		key: string
		path: string[]
	}
}

export interface FormlyFormOptionsCache extends FormlyFormOptions {
	_checkField?: (field: FormlyFieldConfigCache, ignoreCache?: boolean) => void
	_markForCheck?: (field: FormlyFieldConfigCache) => void
	_buildForm?: () => void
	_resolver?: ComponentFactoryResolver
	_injector?: Injector
	_hiddenFieldsForCheck?: FormlyFieldConfigCache[]
	_initialModel?: any
}
