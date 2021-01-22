import { asArray, faker, hasValue, isNaB, rndNum } from '@quebble/scripts'

import { Injectable } from '@angular/core'
import { orderBy } from 'lodash-es'
import { DateTime } from 'luxon'

import { SchemaObject } from '../interfaces/schema.interface'
import { DataFormatType, SchemaType } from '../types/openapi.types'

// faking faker, since it's unused if not generating, for treeshaking
// const faker: any = !environment.production && !environment.test ? faker_ : {}
// const faker = faker_

interface PropDef {
	type: SchemaType
	format?: DataFormatType
}

interface GeneratorKeyOptions {
	minimum?: number
	maximum?: number
	minItems?: number
	maxItems?: number
	minLength?: number
	maxLength?: number

	autoIncrement?: string
	sortKey?: string
	sortType?: 'asc' | 'desc'
	rangeMin?: number
	rangeMax?: number

	nullify?: string[] | boolean
	custom?: (value: any, key?: any) => any

	layering?: GeneratorLayerOptions
}

interface GeneratorLayerOptions {
	rangeMin?: number
	rangeMax?: number

	layers?: number
	idKey?: string
	parentKey?: string
	sortKey?: string
	firstMin?: number
	firstMax?: number
	firstParent?: any
}

type GeneratorSchema = SchemaObject & GeneratorKeyOptions

/**
 * @summary
 * Assign SchemaObject options to specific keys, or the inital items:
 *
 * * `minimum`: on numbers
 * * `maximum`: on numbers
 * * `minItems`: on arrays
 * * `maxItems`: on arrays
 * * `minLength`: on strings
 * * `maxLength`: on strings
 *
 * @example
 * ```javascript
 * {
 * 	users: {
 * 		minItems: 2,
 * 		maxItems: 10
 * 	},
 * 	username: {
 * 		minLength: 2,
 * 		maxLength: 24
 * 	},
 * }
 * ```
 * @summary
 * Additional generation options for pre/post generation. These options can
 * be applied without nesting them in a key.
 * * `autoIncrement`: key in array object or nested object
 * * `sortKey`: sort by specific key in object (overrides autoIncrement)
 * * `sortType`: 'asc' or 'desc'
 * * `rangeMin`: assign a minimum value for the randomization range
 * * `rangeMax`: assign a maximum value for the randomization range
 * * `nullify`: set properties to null
 * * `custom`: custom generation function. Only works for keys.
 *
 * @example
 * ```javascript
 * {
 * 	// These keys apply to the object or array items directly
 * 	autoIncrement: 'id',
 * 	sortKey: 'name',
 * 	sortType: 'desc',
 * 	nullify: ['description'],
 * 	// These are applied to keys in the object or array items
 * 	users: {
 * 		autoIncrement: 'id',
 * 		sortKey: 'username',
 * 		minItems: 4,
 * 		maxItems: 50
 * 	},
 * 	password: {
 * 		nullify: true
 * 	}
 * }
 * ```
 * @summary
 * In case of lists with parent/child selectors, add `layering` with the
 * following options:
 * * `rangeMin`: the minimum range of items for each layer's child count
 * * `rangeMax`: the maximum range of items for each layer's child count
 * * `layers`: the amount of layers to create
 * * `idKey`: the key to use as hook for parentKey
 * * `parentKey`: the key to assign the previous' layer's item id to
 * * `sortKey`: the key to assign the auto-incrementing order to
 * * `firstMin`: the first layer's minimum amount of items
 * * `firstMax`: the first layer's maximum amount of items
 * * `firstParent`: the intial layer's parent id
 *
 * @example
 * ```javascript
 * {
 * 	...options,
 * 	layering: {
 * 		layers: 4,
 * 		idKey: 'id',
 * 		parentKey: 'parent_id',
 * 		sortKey: 'order',
 * 		firstMin: 3,
 * 		firstMax: 5,
 * 		firstParent: null,
 * 		rangeMin: -3,
 * 		rangeMax: 8,
 * 	}
 * }
 * ```
 */
export type GeneratorOptions = Record<string | keyof GeneratorKeyOptions, any | GeneratorKeyOptions>

@Injectable({
	providedIn: 'root',
})
export class GeneratorService {
	private _timeRx: RegExp = new RegExp(/[T|\s][0-9]{2}:[0-9]{2}(:[0-9]{2})?/gim)
	private _emailRx = new RegExp(
		/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/gim, // eslint-disable-line
	)

	private _int32 = 2147483647

	constructor() {}

	/**
	 * @summary
	 * Regexp match for email
	 *
	 * @param val any value
	 *
	 * @returns
	 * boolean
	 */
	private email(val): boolean {
		if (!hasValue(val)) return true

		const str = String(val)
		return this._emailRx.test(str)
	}

	/**
	 * @summary
	 * Sets the first character of the string to uppercase and forcibly
	 * lowercases the rest.
	 *
	 * @param val any value
	 *
	 * @returns
	 * string
	 */
	private up(val): string {
		return hasValue(val)
			? String(val).charAt(0).toUpperCase() + String(val).slice(1).toLowerCase()
			: val
	}

	/**
	 * @summary
	 * Convert titles and/or keys to singular versions for keys of nested objects
	 * so `Units` becomes `Unit` to differentiate between the array and the single
	 * items.
	 *
	 * Works as such:
	 * * mysteries -> mystery: `ies` is replaced with `y`
	 * * clothes -> cloth: `es` is removed
	 * * tents -> tent: `s` is removed
	 *
	 * Since it's a catch-all method, keep in mind that unwanted transformations
	 * could occur.
	 *
	 * @param val any value
	 *
	 * @returns
	 * Pseudo-singular
	 */
	private singular(val): string {
		const str = String(val)
		const endIES = str.slice(str.length - 3).toLowerCase() === 'ies'
		const endES = str.slice(str.length - 2).toLowerCase() === 'es'
		const endS = str.charAt(str.length - 1).toLowerCase() === 's'
		if (endIES) return str.slice(0, str.length - 3) + 'y'
		if (endES) return str.slice(0, str.length - 2)
		if (endS) return str.slice(0, str.length - 1)
		return str
	}

	/**
	 * @summary
	 * Lowercases the value
	 *
	 * @param val any value
	 *
	 * @returns
	 * string
	 */
	private tlc(val): string {
		return hasValue(val) ? String(val).toLowerCase() : val
	}

	/**
	 * @summary
	 * Creates a Schema Object from any object, including nested fields.
	 * Use the randomize boolean toggle to enable or disable
	 * randomization of constraining properties (min/max, etc.).
	 *
	 * @param object any object
	 * @param title name to assign the new schema
	 * @param randomize randomize the requirements for each field
	 *
	 * @returns
	 * Schema Object
	 */
	public generateSchema(
		object: Record<string, unknown>,
		title?: string,
		randomize?: boolean,
	): SchemaObject {
		const schema: SchemaObject = this.parseObject(object, title ?? 'Test', randomize)
		return schema
	}

	/**
	 * @summary
	 * Create a Schema Object for object-type fields
	 *
	 * @param property string for the title
	 *
	 * @returns
	 * Schema Object
	 */
	private schemaObject(property: string): SchemaObject {
		const schema: SchemaObject = {
			title: this.up(property),
			type: 'object',
			required: [],
			properties: {},
		}

		return schema
	}

	/**
	 * @summary
	 * Create a Schema Object for array-type fields
	 *
	 * @param property string for the title
	 *
	 * @returns
	 * Schema Object
	 */
	private schemaArray(property: string): SchemaObject {
		const schema: SchemaObject = {
			title: this.up(property),
			type: 'array',
			items: {},
		}

		return schema
	}

	/**
	 * @summary
	 * Parses the given object and assigns Schema Types to each of the
	 * fields in the object, recursively making more Schema Objects if
	 * the types are array or object.
	 *
	 * @param object any object
	 * @param property key or title
	 * @param randomize randomize toggle
	 *
	 * @returns
	 * Schema Object
	 */
	private parseObject(
		object: Record<string, unknown>,
		property: string,
		randomize?: boolean,
	): SchemaObject {
		if (!object) return {}

		const schema: SchemaObject = this.schemaObject(property)

		for (const key in object) {
			const value = object[key]
			const def = this.propertyDefinition(value)

			switch (def.type) {
				case 'object': {
					const inschema = this.parseObject(value as any, key, randomize)
					schema.properties[key] = inschema
					break
				}
				case 'array': {
					const inschema = this.schemaArray(key)
					const unified = this.parseArray(value as any)
					inschema.items = this.parseObject(unified as any, this.singular(key), randomize)
					schema.properties[key] = inschema
					break
				}
				default: {
					schema.properties[key] = def
					if (randomize) {
						const item = schema.properties[key]
						schema.properties[key] = this.randomizeRequirements(item)
						if (item.required) {
							schema.required = asArray(schema.required) as string[]
							schema.required.push(key)
						}
					}
					break
				}
			}
		}

		return schema
	}

	/**
	 * @summary
	 * Parses the items in an array to normalize the available object
	 * fields across all items
	 *
	 * @param items array of items
	 *
	 * @returns
	 * Unified object to parse
	 */
	private parseArray(items: Record<string, unknown>[]): Record<string, unknown> {
		const unified: any = {}

		for (const item of items) {
			for (const key in item) {
				if (!(key in unified)) unified[key] = item[key]
			}
		}

		return unified
	}

	/**
	 * @summary
	 * Parses the given value for a type and format
	 *
	 * @param value any value
	 *
	 * @returns
	 * Partial Schema Object with only `type` and `format` fields
	 */
	private propertyDefinition(value: any): PropDef {
		if (!hasValue(value)) return { type: 'string' }

		const def: PropDef = {
			type: null,
		}

		const array = Array.isArray(value)
		if (array) {
			def.type = 'array'
			return def
		}

		const object = typeof value === 'object'
		if (object) {
			def.type = 'object'
			return def
		}

		const float = parseFloat(value)
		const integer = float.toString() === String(value).toString() && !isNaN(float)
		if (integer) {
			const isint = Number.isInteger(float)
			if (isint) {
				def.type = 'integer'
				def.format = float > this._int32 || float < -this._int32 ? 'int64' : 'int32'
			} else {
				def.type = 'number'
				def.format = 'double'
			}

			return def
		}

		const dateISO = DateTime.fromISO(value)
		const dateHTTP = DateTime.fromHTTP(value)
		if (dateISO.isValid || dateHTTP.isValid) {
			const time = this._timeRx.test(value)
			def.type = 'string'
			def.format = time ? 'date-time' : 'date'
			return def
		}

		const bool = !isNaB(value)
		if (bool) {
			def.type = 'boolean'
			return def
		}

		def.type = 'string'
		if (this.email(value)) def.format = 'email'

		return def
	}

	/**
	 * @summary
	 * If randomization is enabled, parses each type for optional
	 * Schema Object fields to add for each given type and format.
	 *
	 * @param schema Schema Object
	 *
	 * @returns
	 * Schema Object
	 *
	 * @todo
	 * Expand with more options
	 */
	private randomizeRequirements(schema: SchemaObject): SchemaObject {
		const doit = () => rndNum(-10, 10) >= 0
		const required = doit()
		if (required) schema.required = required

		switch (schema.type) {
			case 'object':
				break
			case 'array': {
				if (doit()) schema.maxItems = rndNum(0, 50)
				if (doit()) schema.minItems = rndNum(0, 5)
				break
			}
			case 'integer':
			case 'number': {
				if (doit()) schema.maximum = rndNum(0, 500000)
				if (doit()) schema.minimum = rndNum(0, 10)
				break
			}
			case 'string': {
				if (doit()) schema.maxLength = rndNum(0, 100)
				if (doit()) schema.minLength = rndNum(0, 5)
				break
			}
		}

		return schema
	}

	/**
	 * @summary
	 * Generate random data using Faker for a given Schema Object. If given the
	 * options of `rangeMin` and/or `rangeMax` and/or `layering`, the returned
	 * value will be an array of data.
	 *
	 * @param schema Schema Object
	 * @param options GeneratorOptions object
	 * @param randomize randomize amount of items to generate for nested items
	 * @param searchFor _VERY_ basic initial search-for-this-in-property, only
	 * applied to users and only in non-layered array generation
	 *
	 * @returns
	 * Object or array of data
	 */
	public generateSchemaData(
		schema: SchemaObject,
		options?: GeneratorOptions,
		randomize?: boolean,
		searchFor?: string,
	): any {
		const [opts, keyopts] = this.applyOptionsToSelf(options)
		const amount = hasValue(keyopts.rangeMin) || hasValue(keyopts.rangeMax)
		const layers = hasValue(keyopts.layering)

		if (layers) {
			const layers = this.generateLayer(schema, keyopts, randomize)
			return layers
		} else if (amount) {
			const result = []
			const { autoIncrement, sortType, sortKey, nullify, rangeMin, rangeMax } = keyopts

			for (let i = rangeMin ?? 0; i < rangeMax ?? 10; i++) {
				const object = this.parseSchema(schema, opts, randomize, null, searchFor)
				if (!object) continue
				if (autoIncrement) {
					if (autoIncrement && autoIncrement in object) {
						object[autoIncrement] = i
					}
				}

				if (nullify && isNaB(nullify)) {
					asArray(nullify).forEach((prop) => {
						if (prop in object) object[prop] = null
					})
				}

				result.push(object)
			}
			if (autoIncrement || sortKey) {
				return orderBy(result, [sortKey ?? autoIncrement], [sortType ?? 'asc'], null)
			} else return result
		} else {
			const object = this.parseSchema(schema, opts, randomize, null)
			return object
		}
	}

	/**
	 * @summary
	 * If the options object also holds self-keys for the array or initial object,
	 * they are picked from the options object.
	 *
	 * @param options GeneratorOptions object
	 *
	 * @returns
	 * Tuple with the stripped GeneratorOptions object and GeneratorKeyOptions object
	 */
	private applyOptionsToSelf(options: GeneratorOptions): [GeneratorOptions, GeneratorKeyOptions] {
		const keyopts: GeneratorKeyOptions = {}

		const watchfor = [
			'autoIncrement',
			'sortKey',
			'sortType',
			'nullify',
			'layering',
			'rangeMin',
			'rangeMax',
		]
		watchfor.forEach((key) => {
			if (key in options) {
				keyopts[key] = options[key]
				delete options[key]
			}
		})

		return [options, keyopts]
	}

	/**
	 * @summary
	 * Parse a Schema Object for type and generate data accordingly, or recursively
	 * parse the Schema Object if its type is object or array. Applies the options
	 * for each property (if set) in the options object.
	 *
	 * @param schema Schema Object
	 * @param options GeneratorOptions object
	 * @param randomize randomize amount of items to generate
	 * @param property object field to check
	 * @param includes WORKS ONLY FOR USERS, find part-of first/lastname
	 *
	 * @returns
	 * Garbage, really
	 */
	private parseSchema(
		schema: GeneratorSchema,
		options?: GeneratorOptions,
		randomize?: boolean,
		property?: string,
		includes?: string,
	): Record<string, unknown> {
		const joined = this.setOptionsOnSchema(options, schema, property)
		const { properties, items, type, title, nullify, rangeMin, rangeMax, custom } = joined ?? {}
		let object: any | any[] = {}

		switch (type) {
			case 'object': {
				if (!properties) break

				if (/user|person|child|parent/gim.test(this.tlc(title))) {
					object = this.generateUser(joined, joined, randomize, includes)
					break
				}

				if (/unit|provider/gim.test(this.tlc(title))) {
					properties['image'] = {
						title: 'Image',
						type: 'string',
					}
				}

				for (const key in properties) {
					object[key] = this.parseSchema(
						properties[key],
						options,
						randomize,
						key,
						includes,
					)
				}
				break
			}
			case 'array': {
				if (!items) break
				const { minItems, maxItems, autoIncrement, sortKey, sortType } = joined ?? {}
				const { layering } = joined ?? {}

				if (layering) {
					const result = this.generateLayer(items, joined, randomize)
					object = result
				} else {
					const result = []
					const max =
						rangeMax ?? maxItems ?? randomize
							? rndNum(rangeMin ?? 0, rangeMax ?? 50)
							: 5
					const min =
						rangeMin ?? minItems ?? randomize
							? rndNum(rangeMin ?? 0, Math.floor(max / 2))
							: 1

					for (let i = min; i <= max; i++) {
						const item = this.parseSchema(items, joined, randomize, null, includes)
						if (!item) continue
						if (autoIncrement && autoIncrement in item) {
							item[autoIncrement] = i + (0 - min)
						}

						if (nullify && isNaB(nullify)) {
							asArray(nullify).forEach((prop) => {
								if (prop in item) item[prop] = null
							})
						}

						result.push(item)
					}
					if (autoIncrement || sortKey) {
						object = orderBy(
							result,
							[sortKey ?? autoIncrement],
							[sortType ?? 'asc'],
							null,
						)
					} else {
						object = result
					}
				}
				break
			}
			default: {
				if (!isNaB(nullify)) return null
				object = this.generateData(schema, joined, randomize, property)
				break
			}
		}

		return object
	}

	/**
	 * @summary
	 * By setting the `layering` options either on the root or a key, the
	 * items are created layer by layer, assigning id's to parentKeys if
	 * available. If no keys are set for `idKey`, `parentKey` and `sortKey`,
	 * the results are probably going to be just an array of items.
	 *
	 * @param schema GeneratorSchema | Schema Object
	 * @param options GeneratorOptions object
	 * @param randomize randomzation toggle
	 *
	 * @returns
	 * Garbage array
	 */
	private generateLayer(
		schema: GeneratorSchema,
		options: GeneratorOptions,
		randomize?: boolean,
	): any[] {
		const { layering, autoIncrement, nullify } = options
		if (!layering) return []
		const {
			layers,
			idKey,
			parentKey,
			sortKey,
			rangeMax,
			rangeMin,
			firstMin,
			firstMax,
			firstParent,
		} = layering

		let result: any[] = []
		let lastidx: number = 0
		let level: number = 0

		const range = (altMin?: number, altMax?: number) => {
			const min = altMin ?? rangeMin ?? 0
			const max = randomize
				? rndNum(altMax ?? rangeMin ?? 0, rangeMax ?? 25)
				: altMax ?? rangeMax ?? 25

			return rndNum(min, max)
		}

		const addLayer = (items: any[]) => {
			let layer = []
			for (const item of items) {
				const list = addChildren(item[idKey ?? 'id'])
				layer = layer.concat(list)
			}

			result = result.concat(layer)

			if (level < layers ?? 3) {
				level++
				addLayer(layer)
			}
		}

		const addChildren = (parentId: any): any[] => {
			const count = level === 0 ? range(firstMin, firstMax) : range()
			const items = []
			if (count) {
				for (let i = 0; i <= count; i++) {
					lastidx++

					const item = this.parseSchema(schema, options, randomize)
					if (autoIncrement in item) item[autoIncrement] = lastidx
					if ((sortKey ?? 'order') in item) item[sortKey] = i
					if ((parentKey ?? 'parent_id') in item) item[parentKey] = parentId

					if (nullify && isNaB(nullify)) {
						asArray(nullify).forEach((prop) => {
							if (prop in item) item[prop] = null
						})
					}

					items.push(item)
				}
			}

			return items
		}

		const list = addChildren(firstParent ?? null)
		result = result.concat(list)
		addLayer(result)

		return result
	}

	/**
	 * @summary
	 * Assigns the options for a certain key to the Schema Object for easier
	 * spread syntax
	 *
	 * @param options GeneratorOptions object
	 * @param schema Schema Object
	 * @param key object field
	 *
	 * @returns
	 * Amalgamated Schema + GeneratorOptions object
	 */
	private setOptionsOnSchema(
		options: GeneratorOptions,
		schema: SchemaObject,
		key: string,
	): GeneratorSchema {
		if (!key || !options || !options[key]) return schema
		else {
			const opts = options[key]
			for (const modifier in opts) {
				schema[modifier] = opts[modifier]
			}
		}
		return schema
	}

	/**
	 * @summary
	 * Generates data for a certain Schema Object property field, applying the options
	 * for that specific property from the options object.
	 *
	 * Some specific keys are caught before randomizing, to allow for things like
	 * address details, images and phone numbers to be set properly instead of just a
	 * string.
	 *
	 * @param schema Schema Object
	 * @param options GeneratorOptions object
	 * @param randomize randomize amount of items to generate
	 * @param prop object field to check
	 *
	 * @returns
	 * Garbage!
	 */
	private generateData(
		schema: SchemaObject,
		options?: GeneratorOptions,
		randomize?: boolean,
		prop?: string,
	): any {
		const joined = this.setOptionsOnSchema(options, schema, prop)
		const { type, format, minLength, minimum, maximum, rangeMin, rangeMax } = joined ?? {}
		const key = prop ? this.tlc(prop) : null

		if (key) {
			if (/phone(number)?|tel(\w?phone)?/gim.test(key)) return faker.phone.phoneNumber()
			if (/(street|house)(.*){0,1}(number)(.*){0,1}(addition)/gim.test(key))
				return faker.random.boolean() ? faker.address.streetPrefix() : null
			if (/(street|house)(.*){0,1}(number)/gim.test(key)) return faker.random.number(500)
			if (/(street|house)/gim.test(key)) return faker.address.streetName()
			if (/(zipcode|postalcode|postal_code|zip_code)/gim.test(key))
				return faker.address.zipCode().replace(' ', '')
			if (/city/gim.test(key)) return faker.address.city()
			if (/province/gim.test(key)) return faker.address.state()
			if (/country/gim.test(key)) return faker.address.country()
			if (/image|picture|avatar|pfp/gim.test(key)) {
				const choose = [
					'abstract',
					'animals',
					'business',
					'cats',
					'city',
					'food',
					'nightlife',
					'fashion',
					'people',
					'nature',
					'sports',
					'technics',
					'transport',
				]
				const iPick = choose[faker.random.number(choose.length - 1)]
				if (/image|picture/gim.test(key)) return faker.image.imageUrl(750, 750, iPick)
				return faker.image.imageUrl(128, 128, iPick)
			}
			if (/description/gim.test(key)) return faker.lorem.paragraph()
			if (/birthday|date$/gim.test(key))
				return DateTime.fromJSDate(faker.date.past(rndNum(3, 50))).toISODate()
		}

		switch (type) {
			case 'number':
			case 'integer': {
				const num = () => {
					return faker.random.number({
						max: rangeMax ?? maximum ?? this._int32,
						min: rangeMin ?? minimum ?? randomize ? faker.random.number() : 1,
					})
				}
				return type === 'number' ? parseFloat(`${num()}.${num()}`) : num()
			}
			case 'boolean':
				return faker.random.boolean()
			case 'string': {
				switch (format) {
					case 'date-time':
					case 'date': {
						let value: any = faker.date.recent()
						if (faker.random.boolean()) value = faker.date.past()
						if (faker.random.boolean()) value = faker.date.future()
						if (format === 'date') {
							return DateTime.fromJSDate(value).toFormat('yyyy-MM-dd')
						}
						return DateTime.fromJSDate(value).toISO()
					}
					case 'email':
						return faker.internet.email()
					case 'password':
						return faker.internet.password()
					case 'binary':
						return faker.random.number({ max: this._int32 }).toString(2)
					default: {
						let value = faker.random.word()
						const isMin = hasValue(minLength)
						const min = isMin ? minLength : randomize ? rndNum(0, 4) : 0
						do {
							value = faker.random.word()
						} while (value.length < min)
						return value
					}
				}
			}
		}
	}

	/**
	 * @summary
	 * Generates a person/user. Uses gender to determine name, email, etc.
	 *
	 * @param schema Schema Object
	 * @param options GeneratorOptions object
	 * @param randomize randomize amount of items to generate
	 *
	 * @returns
	 * """"Person""""
	 */
	private generateUser(
		schema: GeneratorSchema,
		options?: GeneratorOptions,
		randomize?: boolean,
		includes?: string,
	): any {
		const { properties, nullify } = schema
		const gender = faker.random.boolean() ? 'male' : 'female'
		const nulls = asArray(nullify)

		const object: any = {}
		const types = [
			null,
			null,
			null,
			null,
			null,
			null,
			'van',
			'de',
			'den',
			'ter',
			'te',
			'van der',
			'van de',
			"in't",
			"op't",
		]

		let firstName = faker.name.firstName(gender as any)
		let lastName = faker.name.lastName(gender as any)
		if (includes) {
			const fnI = this.getCustomPropertyIncluding('name', 'first_name', includes, gender)
			if (fnI) firstName = fnI

			const lnI = this.getCustomPropertyIncluding('name', 'last_name', includes, gender)
			if (lnI) lastName = lnI

			if (!fnI && !lnI) return null
		}

		const infix = faker.random.boolean() ? types[faker.random.number(types.length - 1)] : null
		const joined = [infix, lastName].filter((a) => !!a).join(' ')
		const fullName = faker.name.findName(firstName, joined)
		const email = faker.internet.email(firstName, joined)

		if (!('avatar' in properties) && !('image' in properties)) {
			properties['avatar'] = {
				type: 'string',
				title: 'Avatar',
			}
		}

		for (const prop in properties) {
			const { type } = properties[prop]
			if (type === 'array' || type === 'object') {
				const result = this.parseSchema(properties[prop], options, randomize)
				object[prop] = result
				continue
			}

			const key = this.tlc(prop)
			const setter = (val) => {
				object[prop] = val
			}

			if (nullify && isNaB(nullify) && nulls.includes(prop)) {
				setter(null)
				continue
			}

			if (/username|user/gi.test(key)) {
				setter(faker.internet.userName(firstName, joined))
				continue
			}
			if (/lastname|surname|familyname/gi.test(key)) {
				setter(lastName)
				continue
			}
			if (/firstname|givenname/gi.test(key)) {
				setter(firstName)
				continue
			}
			if (/fullname|namefull|name/gi.test(key)) {
				setter(fullName)
				continue
			}
			if (/email/gi.test(key)) {
				setter(email)
				continue
			}
			if (/gender|sex/gi.test(key)) {
				setter(gender === 'male' ? 1 : 2)
				continue
			}
			if (/infix|suffix/gi.test(key)) {
				setter(infix)
				continue
			}
			if (/initial/gi.test(key)) {
				setter(firstName.charAt(0) + '.')
				continue
			}
			if (/image|avatar/gi.test(key)) {
				const choose = [
					'abstract',
					'animals',
					'business',
					'cats',
					'city',
					'food',
					'nightlife',
					'fashion',
					'people',
					'nature',
					'sports',
					'technics',
					'transport',
				]
				const iPick = choose[faker.random.number(choose.length)]
				setter(faker.image.imageUrl(128, 128, iPick))
				continue
			}

			if (prop in options) {
				const { rangeMin, rangeMax, nullify } = options[prop]
				if (rangeMin || rangeMax) {
					const range = rndNum(rangeMin ?? 0, rangeMax ?? 3)
					setter(range)
					continue
				}

				if (nullify === true) setter(null)
				continue
			}

			setter(this.generateData(properties[prop], options, randomize, prop))
		}
		return object
	}

	/**
	 * @summary
	 * Use a rather direct approach to customize searching for a specific value
	 * in a certain property. Not exactly supported behavior from Faker, but
	 * whatever, can't fake a search like this ey?
	 *
	 * @param mod faker module
	 * @param property lowercase, underscore cased property (e.g. firstName
	 * becomes first_name)
	 * @param includes part of the string to find in the array of items
	 * @param gender supplied gender string 'male' or 'female'
	 *
	 * @returns found property value or null
	 */
	private getCustomPropertyIncluding(
		mod: string,
		property: string,
		includes: string,
		gender?: string,
	): any {
		const { nl, en } = (faker as any).locales ?? {}

		const nlMod = nl[mod]
		const enMod = en[mod]

		if (!nlMod && !enMod) return null

		let array

		if (gender) {
			const gendered = `${gender}_${property}`
			if (gendered in nlMod) array = nlMod[gendered]
			else if (gendered in enMod) array = enMod[gendered]
		}

		if (!array) {
			if (property in nlMod) array = nlMod[property]
			else if (property in enMod) array = enMod[property]
			else return null
		}

		const included = asArray(array).filter((p) => p.includes(includes))
		const randomized = faker.random.number(included.length)
		const idx = randomized === included.length ? randomized - 1 : randomized

		return included[idx] ?? null
	}
}
