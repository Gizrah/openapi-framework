import {
	FormlyValidatorService,
	IFormlyJSONOptions as FormlyOptions,
	isConst,
	NgqFieldConfig,
	reverseDeepMerge,
} from '@quebble/formly'
import { asArray, hasValue, rndStr } from '@quebble/scripts'
import { filter, map, switchMap } from 'rxjs/operators'

import { Injectable } from '@angular/core'
import { AbstractControl, FormControl } from '@angular/forms'
import { ExMap, List } from '@quebble/models'
import { Observable, of, Subscription } from 'rxjs'

import { TransLinkService } from '../../translation/service/translink.service'
import { SchemaObject } from '../interfaces/schema.interface'
import { SchemaName } from '../types/openapi.types'
import { OpenApiCoreService } from './core.service'
import { OpenApiService } from './openapi.service'
import { OpenApiOperationService } from './operation.service'
import { OpenApiSchemaService } from './schema.service'

type FormId = string

@Injectable({
	providedIn: 'root',
})
export class OpenApiFormlyService {
	/**
	 * Formly field map for all forms currently displayed, using a randomly
	 * generated Form Id
	 */
	private _fields: Map<FormId, ExMap<string, NgqFieldConfig>> = new Map()

	/**
	 * OpenAPI multiple choice values in the Schema Object are parsed using this
	 * array of keys, to quickly traverse the relevant options.
	 */
	private _of: string[] = ['anyOf', 'oneOf', 'allOf']

	/**
	 * In-service subscription to the FormState subject in the StorageService,
	 * used to self-update
	 */
	private states$: Subscription

	constructor(
		private core: OpenApiCoreService,
		private openapi: OpenApiService,
		private translate: TransLinkService,
		private schema: OpenApiSchemaService,
		private operation: OpenApiOperationService,
		private validators: FormlyValidatorService,
	) {}

	public ngOnDestroy(): void {
		this.states$?.unsubscribe()
	}

	/**
	 * @summary
	 * Convert an OpenAPI Schema Object to a Formly-ready list of NgqFormFields,
	 * using the (nested) schema titles and property keys to create translated
	 * labels for each of the input fields and nested forms.
	 *
	 * @param schema Schema Object
	 *
	 * @returns
	 * Observable with an NgqFieldConfig and translated/translatable labels
	 */
	public create(
		schema?: SchemaObject | SchemaName,
		style?: 'dialog' | 'cards',
	): Observable<NgqFieldConfig> {
		const schemaObject = typeof schema === 'string' ? { $ref: schema } : schema
		const [config, tllist] = this.fields(schemaObject, true) as [NgqFieldConfig, List<string>]
		if (style === 'dialog') {
			const current = asArray(config.wrappers)
			config.wrappers = ['nested-single', ...current]
		}

		return this.translate.get(tllist.toArray()).pipe(
			map((tlobj) => new ExMap(tlobj)),
			filter((map) => !!map && map.size > 0),
			switchMap((tlobj: ExMap<string, string | Record<string, unknown>>) => {
				const change = this.changeLabel(config, tlobj)
				return of(change)
			}),
		)
	}

	/**
	 * @summary
	 * Convert an OpenAPI SChema Object to a Formly-ready NgqFieldConfig object.
	 * Optionally returns a tuple with the field config and a list of labels
	 * that can be translated. This method generates a random ID for the current
	 * field.
	 *
	 * @param schema Schema Object
	 * @param list return list toggle
	 *
	 * @returns
	 * NgqFieldConfig or [NgqFieldConfig, List]
	 */
	public fields(
		schema: SchemaObject,
		list?: boolean,
	): NgqFieldConfig | [NgqFieldConfig, List<string>] {
		const formId: string = rndStr('form-')
		const tllist: List<string> = new List()
		const config = this.toFieldConfig(schema, { schema, ...{} }, tllist, formId)

		this._fields.set(formId, new ExMap())

		return list ? [config, tllist] : config
	}

	/**
	 * @summary
	 * Use the supplied map or object to traverse the supplied NgqFieldConfig
	 * and set the label for the field, or title for the nested object/array in
	 * the `templateOptions` and/or the `ngqOptions`.
	 *
	 * @param config NgqFieldConfig
	 * @param map map with the translated label or object to use
	 *
	 * @returns
	 * NgqFieldConfig
	 */
	private changeLabel(
		config: NgqFieldConfig,
		map: ExMap<string, string | Record<string, unknown>>,
	): NgqFieldConfig {
		if (!hasValue(config)) return config
		if (!hasValue(config.fieldGroup)) return config

		const fieldLabel = (configkey: string): any => {
			const labellink: string | Record<string, unknown> = map.get(configkey)
			const asobj =
				labellink && typeof labellink !== 'string'
					? (labellink as Record<string, unknown>)
					: null
			const label = asobj ? asobj['__title'] : labellink
			return label
		}

		config.templateOptions.label =
			fieldLabel(config.templateOptions.label) ?? config.templateOptions.label

		config.fieldGroup.forEach((field) => {
			field.templateOptions.label =
				fieldLabel(field.templateOptions.label) ?? field.templateOptions.label

			switch (field.type) {
				case 'array':
					field = this.changeLabel(field.fieldArray, map)
					break
				case 'object':
					field = this.changeLabel(field, map)
					break

				case 'enum':
					field.templateOptions.options.forEach((item) => {
						item['label'] = map.get(item['label'])
					})
					break
				case 'radio': {
					const options = field.templateOptions.options as { value: any; label: any }[]
					const mapkey = field?.ngqOptions?.tlprefix + '.' + field.key
					const mapitem = map.get(mapkey)
					const itemlabel = fieldLabel(mapkey)
					field.templateOptions.label = itemlabel ?? field.templateOptions.label

					field.templateOptions.options = options.map(({ value, label }) => {
						const keys = label.split('.')
						const key = keys[keys.length - 1]
						const itemlabel = map.get(label) ?? mapitem[key]
						return {
							value,
							label: itemlabel,
						}
					})

					break
				}
			}
		})

		return config
	}

	/**
	 * @summary
	 * Converts the Schema format to a different input type, if applicable.
	 *
	 * @param schema
	 *
	 * @returns string
	 */
	private getInputType(schema: SchemaObject): string {
		if (!schema.type) return

		if (schema.type === 'string') {
			const { format } = schema
			switch (format) {
				case 'date':
				case 'date-time':
					return 'datepicker'
				case 'multiline':
					return 'textarea'
				default:
					break
			}
		}

		return schema.type
	}

	/**
	 * @summary
	 * Changed version of the JSONSchema service from Formly. Uses the OpenAPI
	 * standard instead of JSONSchema. Converts (part of) the Schema Object to
	 * a NGQ-based FormlyFieldConfig.
	 *
	 * Adds its own label to the supplied list to be translated and groups each
	 * field by adding the supplied Form ID to the `ngqOptions`. The key prefix
	 * is used to denote the translation prefix of the current schema's title.
	 * The key is used to determine the translatable label.
	 *
	 * @param schema Schema Object
	 * @param options Formly options interface
	 * @param tllist List with translatable labels
	 * @param formId current form's ID
	 * @param keyprefix current translation prefix string
	 * @param key current key to append to the prefix
	 *
	 * @returns NgqFieldConfig, FormlyFieldConfig
	 */
	public toFieldConfig(
		schema: SchemaObject,
		options: FormlyOptions,
		tllist: List<string>,
		formId: string,
		keyprefix?: string,
		key?: string,
	): NgqFieldConfig {
		schema = this.resolveSchema(schema)

		const input: string = this.getInputType(schema)
		const format: string = schema.format

		let field: NgqFieldConfig = {
			type: schema.type,
			defaultValue: schema.default,
			className: `ngq-formly--${format || input}`,
			templateOptions: {
				label: null,
				readonly: schema.readOnly,
				description: schema.description,
			},
			ngqOptions: {
				formId,
				...this.schema.getSchemaSubjectInfo(schema),
			},
		}

		if (!['checkbox', 'radio', 'boolean'].includes(input)) {
			field.templateOptions.placeholder = null
		}

		if (options.autoClear) {
			field['autoClear'] = true
		}

		switch (field.type) {
			case 'null': {
				this.addValidator(field, 'null', ({ value }) => value === null)
				break
			}
			case 'number':
			case 'integer': {
				field.parsers = [(v) => (!hasValue(v) ? null : Number(v))]
				if ('minimum' in schema) {
					field.templateOptions.min = schema.minimum
				}

				if ('maximum' in schema) {
					field.templateOptions.max = schema.maximum
				}

				if ('exclusiveMinimum' in schema) {
					field.templateOptions.exclusiveMinimum = schema.exclusiveMinimum
					this.addValidator(
						field,
						'exclusiveMinimum',
						({ value }) => !hasValue(value) || value > schema.exclusiveMinimum,
					)
				}

				if ('exclusiveMaximum' in schema) {
					field.templateOptions.exclusiveMaximum = schema.exclusiveMaximum
					this.addValidator(
						field,
						'exclusiveMaximum',
						({ value }) => !hasValue(value) || value < schema.exclusiveMaximum,
					)
				}

				if ('multipleOf' in schema) {
					field.templateOptions.step = schema.multipleOf
					this.addValidator(
						field,
						'multipleOf',
						({ value }) => !hasValue(value) || value % schema.multipleOf === 0,
					)
				}
				break
			}
			case 'string': {
				;['minLength', 'maxLength', 'pattern'].forEach((prop) => {
					if (prop in schema) {
						field.templateOptions[prop] = schema[prop]
					}
				})
				if (schema.format) {
					if (schema.format === 'textarea') {
						field.type = 'textarea'
						field.wrappers = ['row-label-input', 'form-field']
						field.templateOptions.autosizeMinRows = 3
						field.templateOptions.autosizeMaxRows = 8
						field.templateOptions.autosize = true
					} else {
						field.templateOptions.type = schema.format
					}
				}
				break
			}
			case 'object': {
				field.fieldGroup = []

				const name = this.schema.stripMethodFromSchema(schema.title)
				const tlprefix = `schema.${name}.`

				field = this.setWidgetType(field, name)

				Object.keys(schema.properties || {}).forEach((key) => {
					const inschema = schema.properties[key] as SchemaObject
					let infield = this.toFieldConfig(
						inschema,
						options,
						tllist,
						formId,
						tlprefix,
						key,
					)
					infield.key = key

					if (key === 'id') infield.hide = true

					const req = (schema: SchemaObject, field: NgqFieldConfig): NgqFieldConfig => {
						if (field.type === 'object') return field

						const list = asArray(schema.required)
						const req = field.templateOptions.required
						field.templateOptions.required = req ?? list.includes(field.key as string)
						return field
					}

					infield = this.checkWidgetType(field, infield)
					infield = req(schema, infield)

					field.fieldGroup.push(infield)
				})

				break
			}
			case 'array': {
				if ('minItems' in schema) {
					field.templateOptions.minItems = schema.minItems
					this.addValidator(
						field,
						'minItems',
						({ value }) => !hasValue(value) || value.length >= schema.minItems,
					)
				}
				if ('maxItems' in schema) {
					field.templateOptions.maxItems = schema.maxItems
					this.addValidator(
						field,
						'maxItems',
						({ value }) => !hasValue(value) || value.length <= schema.maxItems,
					)
				}
				if ('uniqueItems' in schema) {
					field.templateOptions.uniqueItems = schema.uniqueItems
					this.addValidator(field, 'uniqueItems', ({ value }) => {
						if (!hasValue(value) || !schema.uniqueItems) {
							return true
						}

						const uniqueItems = Array.from(
							new Set(value.map((v: any) => JSON.stringify(v))),
						)

						return uniqueItems.length === value.length
					})
				}

				// resolve items schema needed for isEnum check
				if (schema.items && !Array.isArray(schema.items)) {
					schema.items = this.resolveSchema(schema.items as SchemaObject)
					const { subject, info } = this.schema.getSchemaSubjectInfo(schema.items)
					if (subject || info) {
						field.ngqOptions.subject = subject ?? field.ngqOptions.subject
						field.ngqOptions.info = info ?? field.ngqOptions.info
					}
				}

				// TODO: remove isEnum check once adding an option to skip extension
				if (!this.isEnum(schema)) {
					const length = field.fieldGroup ? field.fieldGroup.length : 0
					const fromarray = schema.items[length]
						? schema.items[length]
						: schema.additionalProperties

					const itemschema = !Array.isArray(schema.items) ? schema.items : fromarray

					const fieldconfig =
						this.toFieldConfig(
							itemschema as SchemaObject,
							options,
							tllist,
							formId,
							keyprefix,
							key,
						) ?? {}

					field.fieldArray = fieldconfig
				}

				break
			}
		}

		if (this.isEnum(schema)) {
			field.templateOptions.multiple = field.type === 'array'
			field.type = 'enum'
			field.templateOptions.options = this.toEnumOptions(
				schema,
				keyprefix && key ? `enum.${key}.` : null,
			).map((item) => {
				tllist.add(item['label'])
				return item
			})
		}

		// map in possible formlyConfig options from the widget property
		if (schema['widget'] && schema['widget'].formlyConfig) {
			field = reverseDeepMerge(schema['widget'].formlyConfig, field)
		}

		if (keyprefix && key) {
			field.ngqOptions.tlprefix =
				field.ngqOptions.tlprefix ?? String(keyprefix).slice(0, keyprefix.length - 1)

			if (field.type !== 'object' || (field.type === 'object' && !schema.title)) {
				field.templateOptions.label = keyprefix + key
			} else {
				if (!field.ngqOptions) field.ngqOptions = {}
				field.ngqOptions.tlstring = keyprefix + key
			}
		}
		if (keyprefix && key && field.type !== 'object') {
			field.templateOptions.label = keyprefix + key
		} else {
			if (schema.title) {
				const name = this.schema.stripMethodFromSchema(schema.title)
				const tlprefix = `schema.${name}.`
				field.templateOptions.label = tlprefix + '__title'
			}
		}

		if (field.templateOptions.label) tllist.add(field.templateOptions.label)

		field = this.checkValidator(field)

		// if there is a map function passed in, use it to allow the user to
		// further customize how fields are being mapped
		return options.map ? options.map(field, schema) : field
	}

	/**
	 * @summary
	 * Resolve the right schema if a SchemaObject property is a ReferenceObject
	 * and check if the given schema reference is a JSONApi object, in which
	 * case the SchemaObject for the Response.Resource.Atttributes is returned
	 * instead.
	 *
	 * @param schema Schema Object
	 * @param options Formly options interface
	 *
	 * @returns
	 * Schema Object
	 */
	private resolveSchema(schema: SchemaObject): SchemaObject {
		if (schema.$ref) {
			const jsonop = this.schema.getJsonApiSchemaNames(schema.$ref)
			const { attributes } = jsonop

			if (attributes) schema = this.schema.getSchema(attributes)
			else schema = this.schema.getSchema(schema.$ref)
		} else {
			if (schema.properties) {
				const { data, links, meta } = schema.properties
				if (data || links || meta) {
					// do something here once it's relevant
				}
			}
		}

		return schema
	}

	/**
	 * @summary
	 * Validator method that applies specific validators to fields that would
	 * normally have no validator or a default validator that doesn't apply.
	 * Currently only used for `email` and `checkbox`
	 *
	 * @param field current field
	 *
	 * @returns
	 * NgqFieldConfig
	 */
	private checkValidator(field: NgqFieldConfig): NgqFieldConfig {
		if (!field) return field

		if (field.type === 'string' && field.templateOptions.type === 'email') {
			this.addValidator(field, 'email', (c: FormControl) =>
				this.validators.validators.email(c),
			)
		}

		if (field.type === 'boolean' || field.type === 'checkbox') {
			this.addValidator(field, field.type, (c: FormControl) =>
				this.validators.validators.boolean(c),
			)
		}

		return field
	}

	/**
	 * @summary
	 * Formly method to add validators. Modifies the object in place.
	 *
	 * @param field current field
	 * @param name key name
	 * @param validator validator method
	 */
	private addValidator(
		field: NgqFieldConfig,
		name: string,
		validator: (control: AbstractControl) => boolean,
	): void {
		field.validators = field.validators || {}
		field.validators[name] = validator
	}

	/**
	 * @summary
	 * Formly method to check for enums
	 *
	 * @param schema Schema Object
	 *
	 * @returns
	 * Truthy/falsy statement
	 */
	private isEnum(schema: SchemaObject) {
		return (
			schema.enum ||
			(schema.anyOf && schema.anyOf.every(isConst)) ||
			(schema.oneOf && schema.oneOf.every(isConst)) ||
			(schema.uniqueItems &&
				schema.items &&
				!Array.isArray(schema.items) &&
				this.isEnum(schema.items as SchemaObject))
		)
	}

	/**
	 * @summary
	 * Convert the enum to (translated) options in the `templateOptions` of the
	 * field that calls this method.
	 *
	 * @param schema Schema Object
	 * @param prefix translation prefix
	 *
	 * @returns
	 * Array with strings or label/value objects
	 */
	private toEnumOptions(schema: SchemaObject, prefix?: string): any[] {
		if (schema.enum) {
			const tlstring = (val) =>
				[prefix, val]
					.filter((a) => hasValue(a))
					.join('.')
					.replace('..', '.')

			return asArray(schema.enum).map((value) => ({
				value,
				label: prefix ? this.translate.instant(tlstring(value)) : value,
			}))
		}

		const toEnum = (s: SchemaObject) => {
			const value = s.enum[0]

			return { value, label: s.title || value }
		}

		if (schema.anyOf) {
			return schema.anyOf.map(toEnum)
		}

		if (schema.oneOf) {
			return schema.oneOf.map(toEnum)
		}

		return this.toEnumOptions(schema.items as SchemaObject)
	}

	/**
	 * @summary
	 * Checks the parent and current fields for possible widget matches, like
	 * address. Otherwise, checks for field-specific widget implementations.
	 *
	 * @param parent the parent NgqFieldConfig
	 * @param field the current NgqFieldConfig
	 *
	 * @returns
	 * Current NgqFieldConfig
	 */
	private checkWidgetType(parent: NgqFieldConfig, field: NgqFieldConfig): NgqFieldConfig {
		if (!parent || !field) return field

		switch (parent.type) {
			case undefined: {
				if (parent.wrappers.includes('address-wrapper')) {
					const key = field.key as string
					const { templateOptions } = field
					const { pattern } = templateOptions

					if (pattern) {
						field.modelOptions = {
							updateOn: 'blur',
							debounce: { default: 50 },
						}
					}

					switch (key) {
						case 'postal_code': {
							field.validators = field.validators ?? {}
							field.validators.pattern = (fc: AbstractControl) => {
								// Cast the value to string
								let value = String(fc.value)
								// Replace any space with nothing
								value = value.replace(' ', '')
								// Set value to all uppercase
								value = value.toUpperCase()

								// Create the RegExp and test the value
								const rx = new RegExp(pattern)
								const tested = rx.test(value)

								if (tested) {
									// If it's correct and the formControl's value isn't
									// the same as the cleaned up value, update it
									if (fc.value !== value) {
										fc.setValue(value, { emitEvent: false })
									}
								}
								return tested
							}
							field.templateOptions = field.templateOptions ?? {}
							field.templateOptions.maxLength = 7
							field.validation = field.validation ?? { messages: {} }
							field.validation.messages = {
								pattern: this.validators.messages.pattern(),
								maxLength: this.validators.messages.maxLength(null, field),
							}
							delete field.templateOptions.pattern
							break
						}
						case 'street_number': {
							field.validators = field.validators ?? {}
							field.validators.pattern = (f: FormControl) => {
								// Make sure it's a number
								const isnumber = !isNaN(f?.value)
								// Make sure it's a number and less than 99990
								const rightlength = isnumber && f.value < 99999
								return rightlength ? true : false
							}
							field.templateOptions = field.templateOptions ?? {}
							field.templateOptions.maxLength = 5
							field.validation = field.validation ?? { messages: {} }
							field.validation.messages = {
								pattern: this.validators.messages.pattern(),
								maxLength: this.validators.messages.maxLength(null, field),
							}
							delete field.templateOptions.pattern
							break
						}
						case 'street_number_additional': {
							field.validators = field.validators ?? {}
							field.validators.pattern = (f: FormControl) => {
								const { value } = f
								if (!hasValue(value)) return true

								const rx = new RegExp(pattern)
								return rx.test(value)
							}
							field.validation = field.validation ?? { messages: {} }
							field.validation.messages = {
								pattern: this.validators.messages.pattern(),
							}
							delete field.templateOptions.pattern
							delete field.templateOptions.required
							break
						}

						default:
							break
					}
				}
				break
			}
			case 'object': {
				field = this.setWidgetType(field, null)
				break
			}
			default:
				break
		}

		return field
	}

	/**
	 * @summary
	 * Checks for specific widget types for certain keys and applies a different
	 * type or wrapper.
	 *
	 * @param field current NgqFieldConfig
	 * @param schema optional schema title
	 *
	 * @returns
	 * NgqFieldConfig
	 */
	private setWidgetType(field: NgqFieldConfig, schema: string): NgqFieldConfig {
		if (!field) return field

		if (hasValue(schema)) {
			if (schema && schema.indexOf('Address') === 0) {
				field.ngqOptions = field.ngqOptions ?? {}
				field.type = undefined
				field.wrappers = ['address-wrapper']
				field.modelOptions = field.modelOptions ?? {}
				field.modelOptions.updateOn = 'blur'
			}
		}

		if (field.key === 'gender' && field.type !== 'radio') {
			field.type = 'radio'
			field.className = `ngq-formly--radio`
			field.wrappers = ['row-label-input', 'form-field']
			field.templateOptions.appearance = 'outline'
			delete field.templateOptions.description

			const genders = this.translate.instant('enum.gender')
			field.templateOptions.options = genders.map((item, index) => {
				return {
					value: index,
					label: item,
				}
			})
		}

		// TODO:
		// object-or-select should be set when there's a link to an operation
		// that returns an array _with_ a search query param _and_ the field
		// type is an object
		// if (field.key === 'contact') {
		// 	field.ngqOptions.tlprefix = 'schema.User'
		// 	field.type = undefined
		// 	field.wrappers = ['object-or-select']
		// }

		if (field.wrappers?.includes('object-or-select')) field.type = undefined

		return field
	}
}
