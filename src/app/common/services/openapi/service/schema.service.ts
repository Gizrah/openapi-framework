import { Injectable } from '@angular/core'
import { ExMap, List } from '@quebble/models'
import { asArray, hasValue, isNaB } from '@quebble/scripts'

import { MediaTypeObject } from '../interfaces/mediatype.interface'
import { OpenApiObject } from '../interfaces/openapi.interface'
import { OperationObject } from '../interfaces/operation.interface'
import { PathItemObject } from '../interfaces/pathitem.interface'
import { IPropDef } from '../interfaces/prop-def.interface'
import { RequestBodyObject } from '../interfaces/requestbody.interface'
import { ResponseObject } from '../interfaces/response.interface'
import { SchemaObject } from '../interfaces/schema.interface'
import {
	JsonApiOperation,
	OperationId,
	OperationType,
	OperationTypes,
	SchemaName,
	SchemaRef,
	SchemaType,
	WidgetType,
} from '../types/openapi.types'
import { OpenApiCoreService } from './core.service'

@Injectable({
	providedIn: 'root',
})
export class OpenApiSchemaService {
	// Simple Name + Schema map
	private _schemas: ExMap<SchemaName, SchemaObject> = new ExMap()

	// Storage for all operations where the schema is used as well as
	// the type of data (array/object) and the method or response type
	private _usedin: ExMap<
		SchemaName,
		List<[OperationId, SchemaType, OperationType | string | number]>
	> = new ExMap()

	// Storage for all instances where an operation has multiple
	// implementations with same and/or different schemas or schema
	// types (e.g. anyOf -> 'object', ISchema | 'array', integer)
	private _multi: ExMap<
		OperationId,
		Map<OperationType | number, List<[string, SchemaType, SchemaType | SchemaObject]>>
	> = new ExMap()

	/**
	 * @summary
	 * An ExMap containing references a list of referenced schemas for each
	 * SchemaName.
	 * Can be used to easily retrieve all nested schemas wthout having to
	 * recursively traverse a schema.
	 *
	 * This map is filled by the setReferences method.
	 */
	private _refs: ExMap<SchemaName, SchemaRef> = new ExMap()

	constructor(private core: OpenApiCoreService) {}

	get map() {
		return this._schemas
	}

	get usedin() {
		return this._usedin
	}

	get multi() {
		return this._multi
	}

	get refs() {
		return this._refs
	}

	public async init(openapi: OpenApiObject, reinit?: boolean): Promise<any> {
		if (!openapi?.components) return Promise.resolve(['Schema could not find OpenAPI Spec'])
		if (reinit) this.clear()

		const errors = []

		const components = await this.setComponentsSchemas(openapi)
		if (!components) errors.push(`Schemas could not be set`)
		const nested = await this.setNestedSchemas(openapi)
		if (!nested) errors.push(`Nested schemas could not be set`)
		const props = await this.setProperties()
		if (!props) errors.push(`Schema properties could not be normalized`)
		const links = await this.normalizeLinks()
		if (!links) errors.push(`Schema links could not be normalized`)
		const refs = await this.setReferences()
		if (!refs) errors.push(`Schema references could not be set`)

		return Promise.resolve(errors)
	}

	private clear(): void {
		this._schemas.clear()
		this._usedin.clear()
		this._multi.clear()
	}

	/**
	 * @summary
	 * Set the schemas by title and set the usedin map keys based on
	 * the schema titles
	 *
	 * @param spec OpenApi Object
	 *
	 * @returns Promise
	 */
	private async setComponentsSchemas(spec: OpenApiObject): Promise<boolean> {
		if (!spec.components.schemas) return Promise.resolve(false)

		this._usedin = new ExMap()
		this._schemas = new ExMap(spec.components.schemas)
		this._schemas.forEach((schema, key) => {
			schema.title = schema.title ?? key
			this._usedin.set(key, new List())
		})

		return Promise.resolve(this._schemas.size === this._usedin.size)
	}

	/**
	 * @summary
	 * Parse schemas for nested schemas in properties and set the
	 * maps accordingly
	 *
	 * @param spec OpenApi Object
	 *
	 * @returns Promise
	 */
	private async setNestedSchemas(spec: OpenApiObject): Promise<boolean> {
		if (!spec.paths) return Promise.resolve(false)

		const pathmap: Map<string, PathItemObject> = new Map(Object.entries(spec.paths))
		let pcount = 0

		return new Promise((resolve) => {
			pathmap.forEach((method) => {
				if (typeof method === 'string') return
				const operationmap: Map<string, OperationObject> = new Map(Object.entries(method))

				operationmap.forEach((iop, type) => {
					if (iop.requestBody)
						this.findNestedSchemas(
							iop.requestBody as RequestBodyObject,
							iop.operationId,
							type,
						)

					if (iop.responses) {
						const resmap = new Map(Object.entries(iop.responses))
						resmap.forEach((response, rtype) => {
							const operationtype = this.core.codeToOperation(rtype)
							this.findNestedSchemas(
								response as ResponseObject,
								iop.operationId,
								iop.requestBody ? rtype : operationtype,
							)
						})
					}
				})

				if (pcount < pathmap.size) pcount++
				if (pcount === pathmap.size) {
					resolve(true)
				}
			})

			resolve(false)
		})
	}

	/**
	 * @summary
	 * Checks for an array of required items in the Schema Object
	 * and applies it to each property Schema Object, to make
	 * parsing for forms much easier
	 *
	 * @returns Promise
	 */
	private async setProperties(): Promise<boolean> {
		if (!this._schemas.size) return Promise.resolve(false)

		return new Promise((resolve) => {
			let scount = 0

			this._schemas.forEach((inschema, name) => {
				if (inschema.properties) {
					const schema = this.extractExtraProperties(inschema)
					const prefix = this.core.settings.customPrefix

					for (const prop in schema.properties) {
						const item = this.extractExtraProperties(
							schema.properties[prop] as SchemaObject,
						)

						if (
							!('required' in item) &&
							'required' in schema &&
							Array.isArray(schema.required)
						) {
							item.required = schema.required.includes(prop)
						}

						if (item[prefix]?.input?.type) {
							item.format = item[prefix]?.input?.type
						}
					}

					this._schemas.set(name, schema)
				}

				if (scount < this._schemas.size) scount++
				if (scount === this._schemas.size) {
					resolve(true)
				}
			})

			resolve(false)
		})
	}

	/**
	 * @summary
	 * Checks the schema for links between the current schema object's
	 * properties and operationIds. This is entirely opinionated and
	 * only applicable to our own situation, so there's room for some
	 * improvement.
	 *
	 * @returns Promise
	 */
	private async normalizeLinks(): Promise<boolean> {
		const methods = ['post', 'put', 'patch']
		let scount = 0

		return new Promise((resolve, reject) => {
			this._schemas.forEach((schema: SchemaObject, name: SchemaName) => {
				const prefix = this.core.settings.customPrefix
				const propmap = schema.properties
					? new Map(Object.entries(schema.properties))
					: new Map()
				let pcount = 0

				propmap.forEach((prop, key) => {
					if (!prop[prefix] || (prop[prefix] && !prop[prefix]['link'])) {
						if (pcount < propmap.size) pcount++
						return
					}

					this._usedin
						.get(name)
						.map(([operationId]) => operationId.split('_'))
						.map((tuple) =>
							methods
								.filter((meth) => meth !== tuple[0])
								.map((meth) => {
									const rest = [...tuple]
									rest[0] = meth
									return rest.join('_')
								}),
						)
						.reduce((acc, val) => acc.concat(val), [])
						.forEach((id) => {
							this._usedin.forEach((list, schemaname) => {
								const usedin = list
									.map(([opId]) => opId)
									.filter((opId) => opId === id)

								if (usedin.length) {
									const schema = this._schemas.get(schemaname)
									if (schema && schema.properties) {
										const current = schema.properties[key]
										if (
											current &&
											current['type'] &&
											prop['type'] &&
											current.type === prop.type
										) {
											Reflect.defineProperty(current, prefix, {
												value: prop[prefix],
											})

											this._schemas.set(schemaname, schema)
										}
									}
								}
							})
						})

					if (pcount < propmap.size) pcount++
				})

				if (scount < this._schemas.size) scount++
				if (scount === this._schemas.size && pcount === propmap.size) {
					resolve(true)
				}
			})

			resolve(false)
		})
	}

	/**
	 * @summary
	 * Fill the _refs ExMap with SchemaNames and SchemaRef objects.
	 * After calling this function the _refs ExMap will be filled with SchemaRef
	 * objects for all schemas.
	 *
	 * @returns a Promise<boolean> which returns false when no schema's were
	 * found, or true when the _refs map was succesfully filled.
	 */
	private async setReferences(): Promise<boolean> {
		if (!this._schemas.size) return Promise.resolve(false)

		const addressRx = new RegExp(/address/gi)
		const avatarRx = new RegExp(/avatar/gi)
		const imageRx = new RegExp(/image|picture/gi)
		const descriptionRx = new RegExp(/description/gi)

		/**
		 * Try to determine the widget type for a given schema name or prop key.
		 * This affects how the prop is displayed in ngq-object.
		 * @param name of a property or a schema name
		 * @returns the matched WidgetType or null if name is not a WidgetType.
		 */
		const getWidgetType = (name: string): WidgetType => {
			if (addressRx.test(name)) return 'address'
			if (avatarRx.test(name)) return 'avatar'
			if (imageRx.test(name)) return 'image'
			if (descriptionRx.test(name)) return 'description'
			return null
		}

		/**
		 * Determine the schema type for a given prop or schema.
		 * @param type of the prop or schema itself.
		 * @param compare another SchemaType or WidgetType of its propDef.
		 * @param schemaName a SchemaName or prop title to determine a possible widget type.
		 * @returns The SchemaType or WidgetType.
		 */
		const getSchemaType = (
			type: SchemaType,
			compare?: SchemaType | WidgetType,
			schemaName?: SchemaName,
		): SchemaType | WidgetType => {
			if (compare === 'object' || compare === 'array') return compare
			const widgetType = getWidgetType(schemaName)
			if (widgetType) return widgetType
			if (type !== 'object' && type !== 'array') return 'keyvalue'
			return type
		}

		/**
		 * Extend the propDef with all the relevant information
		 *
		 * @param $ref
		 * @param schemaRef
		 * @param propDef
		 */
		const addRefToSchemaRef = ($ref: string, schemaRef: SchemaRef, propDef: IPropDef): void => {
			const schemaName = this.getSchemaName($ref)
			if (hasValue(schemaName) && schemaName !== $ref) {
				if (!schemaRef.refs.includes(schemaName)) schemaRef.refs.push(schemaName)
				const schema = this.getSchema(schemaName)
				const type: SchemaType | WidgetType = getSchemaType(
					schema.type,
					propDef.type,
					schema.title,
				)
				const { subject, info } = this.getSchemaSubjectInfo(schema)
				propDef.ref = true
				propDef.type = type
				propDef.schema = schemaName
				if (subject) propDef.subject = subject
				if (info) propDef.info = info

				const operationId = this.getOperationIdForSchema(schema, type as SchemaType, 'get')
				if (operationId) propDef.id = operationId
			}
		}

		return new Promise((resolve) => {
			// Order preference for properties
			const orderedKeys: string[] = ['image', 'picture', 'avatar', 'description', 'address']
			this._schemas.forEach((schema) => {
				const schemaRef: SchemaRef = {
					prefix: this.stripMethodFromSchema(schema.title),
					propDefs: [],
					refs: [],
				}

				const { properties } = schema
				if (properties) {
					for (const key in properties) {
						if (key === 'id') continue
						const prop = properties[key]

						// check if schema object contains the $ref property
						const $ref: string = prop?.$ref ?? prop?.items?.$ref ?? null
						const propDef: IPropDef = {
							prop: key,
							type: getSchemaType(prop.type, null, prop?.title),
							tlstring: schemaRef.prefix,
						}

						if ($ref) {
							addRefToSchemaRef($ref, schemaRef, propDef)
						} else {
							// check if schema object contains the oneOf anyOf or allOf property
							const ofKeys = ['oneOf', 'anyOf', 'allOf'].filter((p) => p in prop)
							if (ofKeys.length) {
								for (const ofKey of ofKeys) {
									const nestedSchemas = asArray(prop[ofKey])

									nestedSchemas.forEach((nestedSchema: SchemaObject) => {
										const $ref: string =
											nestedSchema?.$ref ?? nestedSchema?.items?.$ref ?? null

										if ($ref) {
											addRefToSchemaRef($ref, schemaRef, propDef)
										}
									})
								}
							}
						}

						const keyIndex = orderedKeys.indexOf(key)
						if (keyIndex > -1) {
							// Loop through the list of propDefs until finding
							// a propDef that is not in the ordered keys list,
							// or has a higher position in the ordered keys list.
							// Then insert the new propDef object.
							let insertIndex = 0
							for (const existingPropDef of schemaRef.propDefs) {
								const existingKeyIndex = orderedKeys.indexOf(existingPropDef.prop)
								if (existingKeyIndex < 0 || existingKeyIndex > keyIndex) break
								insertIndex++
							}
							schemaRef.propDefs.splice(insertIndex, 0, propDef)
						} else {
							schemaRef.propDefs.push(propDef)
						}
					}
				}

				this._refs.set(schema.title, schemaRef)
			})

			resolve(true)
		})
	}

	/**
	 * @summary
	 * Checks for references or nested schemas in the requestBody and
	 * response items, and adds the schemas to the map, as well as the
	 * reference for where it's used in the UsedIn map.
	 *
	 * @param item either the request body or response object
	 *
	 * @todo
	 * Add override logic as described in the Open Api spec
	 */
	private findNestedSchemas(
		item: RequestBodyObject | ResponseObject,
		operationId: OperationId,
		operationType?: string,
	): void {
		if (!item || !item.content) return

		const parsed = isNaN(parseInt(operationType)) ? operationType : parseInt(operationType)

		const setUsedIn = (ref: string | SchemaObject, definedtype?: SchemaType) => {
			if (typeof ref !== 'string') return
			const name = this.getSchemaName(ref)
			if (!this._usedin.has(name)) this._usedin.set(name, new List())
			const schematype: SchemaType = definedtype ?? this._schemas.get(name).type
			const list = this._usedin.get(name)
			list.add([operationId, schematype, parsed])
		}

		// Loop through each mime type, e.g. `application/json`, and check for
		// a schema
		const mimes = new ExMap<string, MediaTypeObject>(Object.entries(item.content))
		mimes
			.filter((mime) => mime.schema && Object.entries(mime.schema).length > 0)
			.forEach((mime) => {
				// If it's a ref, it exists, or will exist later.
				if (mime.schema.$ref) {
					setUsedIn(mime.schema.$ref)
					return
				}

				// Check if it's a Schema Object
				const inschema = mime.schema as SchemaObject
				if (inschema.type === 'array') {
					// No items means its broken, items is required by the spec
					// if the type is array
					if (!inschema.items) return
					// If it's a ref it should exist
					if (inschema.items.$ref) {
						setUsedIn(inschema.items.$ref, inschema.type)
						return
					}

					// Otherwise, check for Schema Object again
					const itemschema = inschema.items as SchemaObject
					if (itemschema.title) {
						// Set the return value and add the schema to the map
						if (!this._schemas.has(itemschema.title)) {
							this._schemas.set(itemschema.title, itemschema)
							this._usedin.set(itemschema.title, new List())
						}

						const list = this._usedin.get(itemschema.title)
						list.add([operationId, inschema.type, parsed])
						this._usedin.set(itemschema.title, list)
					}
				} else if (inschema.type === 'object') {
					// If it's not an array, expect it to be a Schema Object
					if (inschema.title) {
						// Add the schema to the map if it doesn't exist
						if (!this._schemas.has(inschema.title)) {
							this._schemas.set(inschema.title, inschema)
							this._usedin.set(inschema.title, new List())
						}

						const list = this._usedin.get(inschema.title)
						list.add([operationId, inschema.type, parsed])
						this._usedin.set(inschema.title, list)
					}
				} else {
					const map = this.getAnyOfAllOfOneOfSchemas(parsed as any, inschema)
					if (map.size) {
						this._multi.set(operationId, map)
						map.forEach((list) => {
							list.forEach(([, stype, value]) => {
								if (typeof value !== 'object') return

								const schema = value as SchemaObject
								if ('title' in schema) {
									if (!this._schemas.has(schema.title)) {
										this._schemas.set(schema.title, schema)
										this._usedin.set(schema.title, new List())
									}

									const list = this._usedin.get(schema.title)
									list.add([operationId, stype, parsed])
								}
							})
						})
					}
				}
			})
	}

	/**
	 * @summary
	 * Attempts to extract all items from additionalParameters
	 * in the Schema Object and applies it to the Schema Object
	 * itself, if they start with `x-`, as defined in the spec
	 * for Specification Extention Object.
	 *
	 * This isn't the right approach, but since FastAPI doesn't
	 * support the Spec.Ext.Object yet, this is _an_ approach.
	 *
	 * @param schema Schema Object
	 * @returns Schema Object
	 */
	public extractExtraProperties(schema: SchemaObject): SchemaObject {
		if (!schema) return

		const proper = new RegExp(/^x-/gi)
		if (!schema.additionalProperties) return schema
		if (!isNaB(schema.additionalProperties)) return schema

		if (Array.isArray(schema.additionalProperties)) {
			schema.additionalProperties.forEach((prop) => {
				for (const key in prop) {
					if (proper.test(key)) {
						Reflect.defineProperty(schema, key, {
							value: prop[key],
						})
					}
				}
			})
		} else {
			const props = schema.additionalProperties as SchemaObject
			for (const key in props) {
				if (proper.test(key)) {
					Reflect.defineProperty(schema, key, {
						value: props[key],
					})
				}
			}
		}

		delete schema.additionalProperties

		return schema
	}

	/**
	 * @summary
	 * Extract the schema name from the $ref string, by splitting
	 * it on the forward slash and returning the last item in the
	 * array.
	 *
	 * @param ref $ref string
	 *
	 * @returns
	 * Schema name string
	 */
	public getSchemaName(ref: any): string {
		if (typeof ref !== 'string') return ref

		const extract = ref.split('/')
		const model = extract.length > 0 ? extract[extract.length - 1] : null
		return model
	}

	/**
	 * @summary
	 * Get the Schema Object by either schema name string, or $ref string. Does
	 * a simple check if the given schema name includes brackets (JSONApi).
	 *
	 * @param ref either the $ref string, or a schema name
	 *
	 * @returns Schema Object
	 */
	public getSchema(ref: string): SchemaObject {
		if (typeof ref !== 'string') return

		const schemaName = this.getSchemaName(ref)
		const schema = this._schemas.get(schemaName)

		if (!schema && schemaName.includes('[')) {
			const name = schemaName.replace('[', '_').replace(']', '_')
			const schema = this._schemas.get(name)
			return schema
		}

		return schema
	}

	/**
	 * @summary
	 * Get the Schema Object by either schema name string, or $ref string and
	 * parses the property fields for nested schemas and merges them.
	 *
	 * @param ref either the $ref string, or a schema name
	 *
	 * @returns Schema Object
	 */
	public getCompoundSchema(ref: string, ancestors?: Set<string>): SchemaObject {
		const schemaName = this.getSchemaName(ref)
		const schema = this._schemas.get(schemaName)
		if (ancestors?.has(schemaName) && !/address/gi.test(schemaName)) return { $ref: ref }

		ancestors = ancestors ?? new Set()
		ancestors.add(schemaName)

		if (schema?.properties) {
			for (const key in schema.properties) {
				const prop = schema.properties[key]
				if (prop.$ref) {
					schema.properties[key] = this.getCompoundSchema(prop.$ref, ancestors)
				} else if (prop.items?.$ref) {
					schema.properties[key].items = this.getCompoundSchema(
						prop.items.$ref,
						ancestors,
					)
				}
			}
		}

		return schema
	}

	/**
	 * @summary
	 * Get all schemas that include the (partial) ref or name supplied
	 *
	 * @param ref either the $ref string, or a (partial)
	 * schema name
	 *
	 * @returns Array with schemas
	 */
	public getSchemas(ref: string): SchemaObject[] {
		if (typeof ref !== 'string') return
		const includes = this.getSchemaName(ref)
		const schemas = this._schemas
			.filter((a, name) => name.toLowerCase().includes(includes.toLowerCase()))
			.map((schema) => schema)

		return schemas
	}

	/**
	 * @summary
	 * Find the different steps of schema's based on the JSONApi spec for the
	 * given schema name or reference string and return an object with the
	 * different names for each step (response, resource, attributes) as well
	 * as the type of data (object/array) that is expected.
	 *
	 * @param ref $ref string or schema name
	 *
	 * @returns JsonApiOperation object
	 */
	public getJsonApiSchemaNames(ref: string): JsonApiOperation {
		const resRef = this.getSchemaName(ref)
		const response = this.getSchema(resRef)
		if (!response) return null

		const jsonop: JsonApiOperation = {
			response: resRef,
			resource: null,
			attributes: null,
			dataType: null,
		}

		const data = response?.properties?.data
		const type = data?.type
		if (type) jsonop.dataType = type
		const dataRef = data?.$ref ?? data?.items?.$ref
		const resource = dataRef ? this.getSchema(dataRef) : data
		jsonop.resource = this.getSchemaName(dataRef)

		if (!resource) return jsonop
		else {
			if (!jsonop.dataType) jsonop.dataType = resource.type

			const data = resource?.properties?.attributes
			const dataRef = data?.$ref ?? data?.items?.$ref
			jsonop.attributes = this.getSchemaName(dataRef)
		}

		return jsonop
	}

	/**
	 *
	 * @param ref the $ref or schema name
	 *
	 * @returns array of properties as defined by the schema
	 */
	public getProperties(ref: string): string[] {
		const list = []
		if (!ref) return list
		const schema = this.getSchema(ref)
		if (!schema) return list
		if (!schema.properties) return list

		for (const key in schema.properties) {
			list.push(key)
		}

		return list
	}

	/**
	 * @summary
	 * Extract the 'base' name of a schema by stripping the operation
	 * types from the name, for example: `UserPost` becomes `User`.
	 *
	 * This allows for grouped-by-base-schema references for things
	 * like translations.
	 *
	 * @param schema schema name string
	 *
	 * @returns base schema name
	 */
	public stripMethodFromSchema(schema: SchemaName, lower?: boolean): SchemaName {
		if (!schema) return

		const pascal = (str): string => {
			const rx = new RegExp(/(\w)(\w*)/g)
			const matches = rx.exec(str)
			if (!matches) return str
			const result = matches[1].toUpperCase() + matches[2].toLowerCase()
			return result
		}

		let replaced = schema
		const items = [...OperationTypes, 'base', 'list', 'attributes', 'collection', 'data', '_']
		items.forEach((method) => {
			// if (replaced) return
			const type = pascal(method)
			replaced = replaced.replace(new RegExp(type, 'g'), '')

			// if (type === '_') {
			// } else {
			// 	const typex = new RegExp(`\(\w\*\)\(${type}\)$`, 'g') // eslint-disable-line
			// 	if (replaced.match(typex)) {
			// 		const replace = replaced.replace(type, '')
			// 		replaced = lower ? replace.toLowerCase() : replace
			// 	}
			// }
		})

		if (replaced !== schema) return lower ? replaced.toLowerCase() : replaced
		else return lower ? schema.toLowerCase() : schema
	}

	public paramIncludesSchema(param: string): boolean {
		if (!param) return false
		if (!param.includes('_')) return false
		const splat = param.split('_')

		const matches = splat.map((item) => {
			const pascal = item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()
			return this._schemas.has(pascal)
		})

		return matches.includes(true)
	}

	/**
	 * @summary
	 * Get all nested schemas for the operationId, by checking links in the
	 * property supplied. Assumes `HTTP 200` response as successful response
	 * type for a `get` operation type and finds if there's a $ref, or items
	 * with a $ref.
	 *
	 * @param operationId operation id
	 * @param property schema property name
	 *
	 * @returns tuple with the operation id and the Schema Object
	 */
	public getNestedSchemaForOperation(
		operationId: OperationId,
		property: string,
		schemaType: string = 'array',
	): [OperationId, SchemaObject] {
		// const operation = this._operations.get(operationId)
		const tuple: [OperationId, SchemaObject] = [null, null]
		if (!operationId) return tuple

		// Filter a list based on operationId and responsetype/operationtype
		const filterlist = (list, operation, mtype_ = 'get') => {
			return list.filter(([opId, , mtype]) => opId === operation && mtype === mtype_)
		}

		this._usedin
			.filter((list) => !!filterlist(list, operationId, 'get').size)
			.map((list, schema) => this._schemas.get(schema))
			.filter((schema) => !!schema && !!schema.properties)
			.forEach((schema) => {
				const props = schema.properties
				// Set the relation Schema Object
				const rel: SchemaObject = props[property]
				if (!rel) return

				// Get the $ref string
				const ref = rel.items?.$ref ?? rel.$ref ?? null
				if (!ref) return

				// Get the schema name
				const name = this.getSchemaName(ref)
				if (!name) return

				const nestedId = this._usedin
					.get(name)
					.filter(([, stype, mtype]) => stype === schemaType && mtype === 'get')
					.map(([opId]) => opId)[0]

				if (nestedId) {
					tuple[0] = nestedId
					tuple[1] = this._schemas.get(name)
				}
			})

		return tuple
	}

	/**
	 * @summary
	 * Parses the UsedIn map to find a matching OperationId for the
	 * supplied parameters.
	 *
	 * @param schema Schema Object
	 * @param schemaType schema's type value
	 * @param operationType operation method
	 *
	 * @returns
	 * OperationId or nothing
	 */
	public getOperationIdForSchema(
		schema: SchemaObject,
		schemaType: SchemaType,
		operationType: OperationType = 'get',
	): OperationId {
		if (!schema) return
		const uselist = this._usedin.get(schema.title)
		if (!uselist || !uselist.size) return

		for (const item of uselist) {
			const [opid, type, method] = item
			if (type === schemaType && method === operationType) return opid
		}

		return undefined
	}

	/**
	 * @summary
	 * Find all referenced schemas in a schema's property list and
	 * return a map with the property + schema for easy access.
	 *
	 * @param schema Schema object
	 *
	 * @returns
	 * Map with property name and referenced schemas
	 */
	public getNestedSchemas(schema: SchemaObject): Map<string, SchemaObject> {
		if (!schema) return

		const refmap: Map<string, SchemaObject> = new Map()

		const props = schema.properties
		if (props) {
			for (const property in props) {
				const rel: SchemaObject = props[property]

				// Get the $ref string
				const ref = rel?.$ref ?? rel?.items?.$ref ?? null
				if (!ref) continue
				const name = this.getSchemaName(ref)
				if (name && name !== ref) refmap.set(property, this.getSchema(name))
			}
		}

		return refmap
	}

	/**
	 * @summary
	 * Parse the properties of a schema object for anyOf, allOf, oneOf
	 * and not properties and find the associated schemas and/or values
	 * that are requested.
	 *
	 * @param operationType Operation Type
	 * @param schema Schema Object
	 *
	 * @returns
	 * Map with the operation type or http response code and a list of
	 * tuples with the property name, the schema type and the expected
	 * value -- either a schema object or a primitive
	 *
	 * @example
	 * Posting a list of providers needs a full object, but the return
	 * value when successful is a list of ids
	 *
	 * ```
	 * 	[ 'post', ['provider', 'array', Provider ]]
	 *  [ '201', ['provider', 'array', 'number']]
	 * ```
	 */
	public getAnyOfAllOfOneOfSchemas(
		operationType: OperationType | number,
		schema: SchemaObject,
	): Map<OperationType | number, List<[string, SchemaType, SchemaType | SchemaObject]>> {
		const map = new Map()
		const names = ['anyOf', 'allOf', 'oneOf']

		names.forEach((property) => {
			const list = asArray(schema[property])
			list.filter((item) => hasValue(item)).forEach((item: SchemaObject) => {
				const ref = item.$ref ? item.$ref : item.items ? item.items.$ref : null
				const name = this.getSchemaName(ref)
				const schema = name !== ref ? this.getSchema(name) : null
				const type = item.type ?? schema?.type ?? undefined

				if (!map.has(operationType)) map.set(operationType, new List())

				const inlist = map.get(operationType)

				if (!schema) {
					const itemschema = item.items as SchemaObject
					const intype = itemschema.type
					if (intype) {
						inlist.add([property, type, intype])
					}
				} else {
					inlist.add([property, type, schema])
				}

				if (!inlist.size) map.delete(operationType)
			})
		})

		return map
	}

	/**
	 * @summary
	 * Check if the schema's property is any/all/one of and check if there
	 * are two schemas involved of which one has an ID property and one
	 * does not, to distinguish POST and PATCH actions for this nested
	 * schema object
	 *
	 * @param schema Schema Object
	 *
	 * @returns
	 * Map with operation types and associated schemas
	 */
	public getNestedAnyAllOneOfSchemaRefs(
		schema: SchemaObject,
		forkey?: string,
	): Map<string, Map<OperationType, string>> {
		const map: Map<string, Map<OperationType, string>> = new Map()
		const names = ['anyOf', 'allOf', 'oneOf']

		const parseprops = (prop: SchemaObject, key: string): any => {
			const filtered = names.filter((item) => hasValue(prop[item]))
			if (!filtered.length) return

			filtered.forEach((propname) => {
				const list = asArray(prop[propname])
					.map((item: SchemaObject) => {
						return item.$ref ?? item.items?.$ref ?? null
					})
					.filter((ref) => hasValue(ref))
					.sort((a, b) => a.length - b.length)

				const listmap: ExMap<number, string> = new ExMap(list)

				listmap.forEach((ref: string, b, c, next: number, previous: number) => {
					const name = this.getSchemaName(ref)
					const parsed = this.stripMethodFromSchema(name)
					const schema = this.getSchema(ref)
					const propmap = new ExMap(schema.properties ?? null)
					if (!propmap.size) return
					const nxt = this.getSchemaName(listmap.get(next))
					const prv = this.getSchemaName(listmap.get(previous))

					const partofnext = String(nxt).includes(parsed)
					const partofprev = String(prv).includes(parsed)

					if (!partofnext && !partofprev) return

					if (!map.has(key)) map.set(key, new Map())
					const keymap = map.get(key)

					if (propmap.has('id')) {
						keymap.set('patch', ref)
					} else {
						keymap.set('post', ref)
					}

					if (schema.properties) {
						for (const property in schema.properties) {
							const prop = schema.properties[property]
							if (!map.has(property)) parseprops(prop, property)
						}
					}
				})
			})
		}

		if (!schema.properties) parseprops(schema, forkey ?? schema.title)
		else {
			for (const property in schema.properties) {
				const prop = schema.properties[property]
				parseprops(prop, property)
			}
		}

		return map
	}

	/**
	 * @summary
	 * Check schema for subject and info fields that are displayed as headers and
	 * description items, by matching properties to a regexp. The order in the
	 * arrays determines the preference order as well.
	 *
	 * @param schema Schema Object
	 *
	 * @returns
	 * Object with subject and info properties
	 */
	private _checks: RegExp[] = [new RegExp(/(name)$/gi), new RegExp(/(email)/gi)]
	private _descri: RegExp[] = [new RegExp(/(description)$/gi), new RegExp(/(email)/gi)]
	private _prefs: string[] = ['fullName', 'firstName']
	public getSchemaSubjectInfo(schema: SchemaObject): { subject: string; info: string } {
		const si = { subject: null, info: null }
		if (!schema?.properties) return si

		for (const key of this._prefs) {
			if (schema.properties[key]) {
				si.subject = key
				break
			}
		}

		for (const key in schema.properties) {
			if (this._checks.some((rx) => rx.test(key.toLowerCase())) && !si.subject) {
				si.subject = key
				continue
			}

			if (this._descri.some((rx) => rx.test(key.toLowerCase()))) {
				si.info = key
				continue
			}
		}

		return si
	}
}
