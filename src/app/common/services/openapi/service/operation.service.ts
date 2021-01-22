import { Injectable } from '@angular/core'
import { ExMap } from '@quebble/models'
import { asArray, hasValue, isNaB, parseBool } from '@quebble/scripts'

import { LoadingService } from '../../loading/service/loading.service'
import { OpenApiObject } from '../interfaces/openapi.interface'
import { OperationObject } from '../interfaces/operation.interface'
import { ParameterObject } from '../interfaces/parameter.interface'
import { PathItemObject } from '../interfaces/pathitem.interface'
import { SchemaObject } from '../interfaces/schema.interface'
import { ServerObject } from '../interfaces/server.interface'
import { Operation } from '../models/operation.model'
import {
	OperationId,
	OperationType,
	OperationTypes,
	SchemaName,
	SchemaRef,
	SchemaType,
	SecurityScheme,
} from '../types/openapi.types'
import { OpenApiCoreService } from './core.service'
import { OpenApiPathService } from './path.service'
import { OpenApiSchemaService } from './schema.service'

@Injectable({
	providedIn: 'root',
})
export class OpenApiOperationService {
	/**
	 * Map with all OperationIds from the OpenAPI JSON, with the OperationModel
	 * that was made for that specific operation.
	 */
	private _operations: Map<OperationId, Operation> = new Map()

	constructor(
		private core: OpenApiCoreService,
		private loading: LoadingService,
		private path: OpenApiPathService,
		private schema: OpenApiSchemaService,
	) {}

	get map() {
		return this._operations
	}

	/**
	 * @summary
	 * Initializer function that (re)sets the map and calls the functions in the
	 * service class that fill all relevant information.
	 *
	 * @param openapi OpenApiObject
	 * @param reinit restart the service
	 *
	 * @returns Promise with an (empty) array of errors
	 */
	public async init(openapi: OpenApiObject, reinit?: boolean): Promise<any> {
		if (!openapi) return Promise.resolve(['Operations could not find OpenAPI Spec'])
		if (reinit) this.clear()
		const errors = []
		const operations = await this.setOperations(openapi)
		if (!operations) errors.push(`Operations could not be set`)

		return Promise.resolve(errors)
	}

	/**
	 * Clear the map
	 */
	private clear(): void {
		this._operations.clear()
	}

	// ::DEV::
	// Toggle the loading state of all known operation ids
	public __loading(state: boolean): void {
		this._operations.forEach((op) => {
			this.loading.set(op.id, state)
		})
	}

	/**
	 * @summary
	 * Traverse the PathsObject in the OpenApiObject and create OperationModels
	 * with all relevant info for that action. Each method (e.g. POST, PATCH...)
	 * with an operation id gets an OperationModel that is supplied with extra
	 * details, including SchemaObjects for all known replies and/or payload
	 * options.
	 *
	 * @param spec OpenApiObject
	 *
	 * @returns Promise with success state
	 */
	private setOperations(spec: OpenApiObject): Promise<boolean> {
		return new Promise((resolve, reject) => {
			if (!spec?.paths) return resolve(false)

			const pathmap: ExMap<string, PathItemObject> = new ExMap(spec.paths)
			let pcount = 0

			let apiPrefix: string = ''
			if (this.core._openapi.servers) {
				const srv = asArray(this.core._openapi.servers)[0]
				const url = srv?.url ?? null
				if (url) {
					apiPrefix = url
				}
			}

			const prefixServer = (p: string, s: ServerObject[]) => {
				const servers = asArray(s)
				if (servers.length) {
					const first = servers[0]
					return first?.url
				}

				if (!p.startsWith('/api')) return ''
				return apiPrefix
			}

			pathmap.forEach((item, path) => {
				const methods = new ExMap<OperationType, OperationObject>(item)
				let mcount = 0

				methods.forEach((operation, type) => {
					if (operation.parameters) {
						operation.parameters = (operation.parameters as ParameterObject[]).map(
							(param: ParameterObject) => {
								if (param.schema)
									param.schema = this.schema.extractExtraProperties(param.schema)
								return param
							},
						)
					}

					const model = new Operation(operation)
					const [sname, stype] = this.getSchemaNameType(operation.operationId, type)

					model.id = operation.operationId
					model.type = type
					model.path = prefixServer(path, item.servers) + path
					model.route = this.getRouteForOperation(operation.operationId)
					model.security = this.getPathSecurity(operation)
					model.prefix = this.schema.stripMethodFromSchema(sname)

					if (sname) {
						const jsonapi = this.schema.getJsonApiSchemaNames(sname)

						if (jsonapi?.attributes) {
							const { attributes, dataType } = jsonapi
							model.jsonapi = jsonapi
							model.schema = attributes
							model.view = dataType
						} else {
							model.schema = sname
							model.view = stype
						}
					}

					const schemas = this.getAllSchemas(operation.operationId)
					this.setNestedSchemas(model, schemas)
					this.setProperties(model)

					this._operations.set(operation.operationId, model)
					this.loading.make(operation.operationId)

					if (mcount < methods.size) mcount++
				})

				if (pcount < pathmap.size) pcount++
				if (mcount === methods.size && pcount === pathmap.size) {
					resolve(true)
				}
			})

			resolve(false)
		})
	}

	/**
	 * @summary
	 * Recursively create a map of all nested SchemaRef objects for the given
	 * SchemaName.
	 *
	 * @param schemaName The SchemaName for which nested SchemaRef objects
	 * will be mapped.
	 * @param schemaRefMap Optional ExMap that the SchemaRefs will be mapped into,
	 * used by the function itself to recursively build the ExMap.
	 *
	 * @returns The schemaRefMap filled with SchemaRef objects.
	 */
	private mapNestedSchemaRefs(
		schemaName: SchemaName,
		schemaRefMap: ExMap<SchemaName, SchemaRef> = new ExMap(),
	): ExMap<SchemaName, SchemaRef> {
		const schemaRef = this.schema.refs.get(schemaName)
		if (!schemaRef || !schemaRef.refs.length) return schemaRefMap
		schemaRef.refs.forEach((ref) => {
			if (!schemaRefMap.has(ref)) {
				schemaRefMap.set(ref, this.schema.refs.get(ref))
				this.mapNestedSchemaRefs(ref, schemaRefMap)
			}
		})
		return schemaRefMap
	}

	/**
	 * @summary
	 * Setup the propDefs of the given model.
	 *
	 * @param model The model on which the propDefs will be setup.
	 *
	 * @returns The OperationModel with its propDefs.
	 */
	private setProperties(model: Operation): Operation {
		if (!model?.schema) return
		const schemaRef = this.schema.refs.get(model.schema)
		if (!schemaRef) return

		const schema = this.schema.getSchema(model.schema)
		const { subject, info } = this.schema.getSchemaSubjectInfo(schema)
		model.subject = subject
		model.info = info

		// for (const propDef of schemaRef.propDefs) {
		// 	if (propDef.ref) {
		// 		model.refs.set(propDef.prop, this.schema.getSchema(propDef.schema))
		// 	}
		// }
		// model.propDefs = schemaRef.propDefs

		return model
	}

	/**
	 *
	 * @param model
	 * @param schemas
	 *
	 * @todo
	 * REFACTOR
	 */
	private setNestedSchemas(
		model: Operation,
		schemas: [number | OperationType, SchemaObject][],
	): Operation {
		schemas.forEach(([type, schema]) => {
			if (typeof type === 'number' && type > 210) return
			model.schemas.set(type, schema)
			// model.multi = this.schema.multi.get(model.id) ?? new Map()
			// if (typeof type !== 'number')
			// model.differ = this.schema.getNestedAnyAllOneOfSchemaRefs(schema)
		})

		return model
	}

	/**
	 * @summary
	 * Return a tuple with the Schema's title and type for a given operation id.
	 * The SchemaName and SchemaType are stored in the OperationModel, to be
	 * used mostly by the WebService. The SchemaType determines how the app
	 * shows the content (in case of GET) or how the form is displayed (PATCH,
	 * PUT, POST).
	 *
	 * @param operationId operation id string
	 * @param type REST method
	 *
	 * @returns Tuple with SchemaName and SchemaType
	 */
	private getSchemaNameType(operationId: string, type: string): [SchemaName, SchemaType] {
		if (!operationId || !type) return [null, null]
		const tuple: [SchemaName, SchemaType] = [null, null]

		const code = this.core.codeToOperation(type)

		this.schema.usedin.forEach((list, schema) => {
			list.forEach(([opId, view, key]) => {
				if (opId === operationId && key === code) {
					if (tuple[1] === 'object') return
					tuple[0] = schema
					tuple[1] = view as SchemaType
				}
			})
		})

		return tuple
	}

	/**
	 * @summary
	 * Find all the schemas related to this operationId and return a tuple array
	 * with the operation's type (or number, in case of non-REST methods) and a
	 * SchemaObject.
	 *
	 * The contents are used by the OperationModel to fill nested schemas as
	 * well as the WebService that utilizes the OperationModel.
	 *
	 * @param operationId OperationId to use
	 *
	 * @returns Tuple array with OperationType or HTTP Response Code and a
	 * SchemaObject
	 */
	private getAllSchemas(operationId: string): [OperationType | number, SchemaObject][] {
		if (!operationId) return []

		const schemas: [OperationType | number, SchemaObject][] = []

		this.schema.usedin.forEach((list, schema) => {
			list.forEach(([opId, , key]) => {
				if (opId === operationId) schemas.push([key as any, this.schema.map.get(schema)])
			})
		})

		return schemas
	}

	/**
	 * @summary
	 * Returns the original route for this specific operation as defined in the
	 * PathService's path map. The route-as-array is used for easier parsing
	 * of the content as well as length matching when finding matches,
	 * decendants and required content.
	 *
	 * @param operationId OperationId to use
	 *
	 * @returns route-as-array
	 */
	private getRouteForOperation(operationId: string): string[] {
		if (!operationId) return []

		let match = []

		this.path.map.forEach((subs) => {
			if (match.length) return
			subs.forEach((map, route) => {
				if (match.length) return
				map.forEach((opId) => {
					if (match.length) return
					if (opId === operationId) match = route
				})
			})
		})

		return match
	}

	/**
	 * @summary
	 * Get the path parameters for this operation
	 *
	 * @param operation the Operation Object
	 *
	 * @returns path params
	 */
	private getPathParameters(operation: OperationObject): ParameterObject[] {
		if (!operation || !operation.responses) return []
		if (!operation.parameters) return []
		if (!Array.isArray(operation.parameters)) return []
		if (!operation.parameters.length) return []

		const parameters = []

		operation.parameters.forEach((param) => {
			if (param.in === 'path') parameters.push(param)
		})

		return parameters
	}

	/**
	 * @summary
	 * Checks for the existence of security schemes and returns
	 * the scheme name. This is stored in the _security map.
	 *
	 * @param operation Operation Object
	 *
	 * @todo
	 * Open Api spec has way more options that just this,
	 * so this needs to be expanded upon for better support.
	 */
	private getPathSecurity(operation: OperationObject): SecurityScheme {
		if (!operation) return
		if (!operation.security) return
		if (!operation.security.length) return

		let scheme

		operation.security.forEach((sec) => {
			if (scheme) return
			for (const key in sec) {
				if (key === this.core.settings.securityName) scheme = key
			}
		})

		return scheme
	}

	/**
	 * @todo
	 * Extend matching of param values
	 *
	 */
	private checkParamValue(param: ParameterObject, value: any): boolean {
		if (!param || !value) return false
		const type = param.schema ? param.schema['type'] : undefined
		const format = param.schema ? param.schema['format'] : undefined

		switch (type) {
			case 'integer':
				return !isNaN(parseInt(value))
			case 'number':
				return !isNaN(parseFloat(value))
			case 'boolean':
				return !isNaB(parseBool(value))
			case 'string':
				switch (format) {
					case 'byte':
					case 'binary':
					case 'date':
					case 'date-time':
					case 'password':
					case 'email':
					default:
						return true
				}
			default:
				return true
		}
	}

	/**
	 * @summary
	 * Find and match the operation's route in the given route, including
	 * basic type check for path params.
	 *
	 * @param operation OperationModel for parts-of-route to match to
	 * @param route full route with (probable) include of operatio route
	 *
	 * @returns the matching part or an empty array
	 */
	public routeContainsMatch(operation: Operation, route: string[]): string[] {
		const match = []
		if (!operation || !route.length) return match
		const idx = route.indexOf(operation.route[0])

		operation.route.forEach((item, index) => {
			const current = route[idx + index]
			if (current === item) {
				match.push(item)
			} else {
				const iparam: ParameterObject = operation.params.find(
					(key: ParameterObject) => key.name && item === `{${key.name}}`,
				)
				if (this.checkParamValue(iparam, current)) match.push(current)
			}
		})

		return match.length === operation.route.length ? match : []
	}

	/**
	 * @summary
	 * Checks the existing paths in _paths for routes with a matching
	 * length. Checks to see if a part is a path param, if so checks
	 * if the incoming route has an int in that place.
	 * Returns the SubPath[] as defined in the _paths if all is correct,
	 * an empty array if there was one or more mismatches
	 *
	 * @param route the route to match
	 * @returns the parsed route
	 *
	 * @todo
	 * Currently the path param is always an int, which is not correct.
	 * Each path should match the schema's property for that part for
	 * the correct param type.
	 */
	private matchParamsToRoute(route: string[]): string[] {
		let match = []
		const map = this.path.map.get(route[0])
		if (!map) return match
		map.filter((listmap, path) => path.length === route.length).forEach((listmap, path) => {
			if (match.length) return
			const matches = []
			path.forEach((item, index) => {
				if (route[index] === item) matches.push(item)
				else {
					if (item.match(/{.+?}/gi) && !isNaN(parseInt(route[index]))) {
						matches.push(item)
					} else {
						matches.push(null)
					}
				}
			})

			if (matches.includes(null)) return
			if (matches.length === route.length) match = matches
			return
		})

		return match.length === route.length ? match : []
	}

	/**
	 * @summary
	 * Finds the simplified OperationModel for the current or
	 * operation id, and returns one whether or not it was found.
	 * Error checking is done later, by checking for the existence
	 * of the model.id.
	 *
	 * @param route the route or operationId
	 * @param method (optional) the operation type, defaults to 'get'
	 *
	 * @returns OperationModel
	 */
	public getOperation(route: string[] | OperationId, method: OperationType = 'get'): Operation {
		if (!route) return
		// Check if the route's an array or a possible operation id
		if (!Array.isArray(route)) {
			// Check if the operation exists in the service and
			// return the model if so
			const operation = this._operations.get(route)
			if (operation) {
				return this._operations.get(route)
			}
			// Otherwise, assume a faulty route and cast it to
			// an array
			route = [route]
		}

		// If the route doesn't exist, return an empty model
		const map = this.path.map.get(route[0])
		if (!map) return new Operation()

		// Get the correct SubPath[] for this route
		const match = this.matchParamsToRoute(route)
		if (match.length) {
			// If we have a match, get the listmap
			const listmap = map.get(match)
			// Just to be sure we have it
			if (!listmap) return new Operation()
			// Get the operation id for the operation type
			// or return the empty model
			const operationId = listmap.get(method)
			if (!operationId) return new Operation()
			// Return the model if it exists or return the
			// empty model
			if (this._operations.has(operationId)) return this._operations.get(operationId)
			else return new Operation()
		} else {
			// No match means no operation, so return the
			// empty model
			return new Operation()
		}
	}

	/**
	 * @summary
	 * For the current route, returns a list of operations that
	 * are allowed. Excludes can be set either as a single string
	 * or an array
	 *
	 * @param operationId current route's operationId
	 * @param exclude (optional) operation type(s) to exclude
	 *
	 * @returns OperationModel array
	 */
	public getOperations(
		operationId: OperationId,
		exclude?: OperationType | OperationType[],
	): Operation[] {
		if (!operationId) return []
		const operation = this._operations.get(operationId)
		if (!operation) return []

		const excluded = asArray(exclude)

		const types = OperationTypes.filter(
			(type: OperationType) => type !== operation.type && !excluded.includes(type),
		)

		const operations = types
			.map((item) => operation.id.replace(operation.type, item))
			.filter((opid) => this._operations.has(opid))
			.map((opid) => this._operations.get(opid))

		if (operation.view === 'array' && !operations.find((op) => op.type === 'post')) {
			const checkId = operationId.replace('_list', '').replace(operation.type, 'post')
			const findOp = this._operations.get(checkId)
			if (findOp) operations.push(findOp)
		}

		const map = this.path.map.get(operation.route[0]) ?? new Map()
		const listmap = map.get(operation.route) ?? new ExMap()
		const pathops = types
			.map((type: OperationType) => listmap.get(type))
			.filter((opid) => !!opid)
			.filter((opid) => {
				return !operations.find((inop) => inop.id === opid) && this._operations.has(opid)
			})
			.map((opid) => this._operations.get(opid))

		return operations.concat(pathops)
	}

	/**
	 * @summary
	 * Find the child operations for the given operation id, by checking for
	 * the exitence of operations that have different methods in their name.
	 *
	 * E.g. `post_somethings` checks for `get_something`, and `get_some_list`
	 * finds if there is a `get_some` and equivalents available.
	 *
	 * @param operationId operation id to use
	 * @param filter types to check for
	 * @param filterIncludes exclude or include given filter types
	 * @param nested check for nested operations (DEPRECATED)
	 *
	 * @todo
	 * Add RESTful path traversal and checks for relations, links, etc. from the
	 * JSONApi spec.
	 */
	public getChildOperations(
		operationId: OperationId,
		filter?: OperationType | OperationType[],
		filterIncludes?: boolean,
		nested?: boolean,
	): Operation[] {
		if (!operationId) return []
		const operation = this._operations.get(operationId)
		if (!operation) return []

		const used = new Set<OperationId>()
		const filtered = hasValue(filter) ? (Array.isArray(filter) ? filter : [filter]) : []
		const types = OperationTypes.filter((type: OperationType) =>
			filterIncludes ? filtered.includes(type) : !filtered.includes(type),
		)

		const typeMatch = (operation: Operation) => {
			if (!operation) return
			const operationId = operation.id.replace('_list', '')

			types
				.map((type) => operationId.replace(operation.type, type))
				.filter((opid) => !used.has(opid) && opid !== operation.id)
				.forEach((opid) => {
					if (this._operations.has(opid)) used.add(opid)
				})
		}

		// if (operation.nested && nested) {
		// 	operation.nested.forEach((nest) => typeMatch(this._operations.get(nest?.id)))
		// } else {
		typeMatch(operation)
		// }

		return Array.from(used).map((opid) => this._operations.get(opid))
	}

	/**
	 * @summary
	 * Uses the operation id to get the route, parses it for path params,
	 * replaces the generic param with the supplied param from the `item` object
	 * if applicable and returns a completely mapped link usable in the Angular
	 * Router.
	 *
	 * @param operationId operation id
	 * @param method (optional) operation type
	 * @param item (optional) schema property object
	 *
	 * @returns an Angular Router compatible link or an empty array
	 *
	 * @todo
	 * More finetuning when selecting the right methods. Check if the OpenAPI
	 * spec allows for more same operation types per endpoint and maybe match to
	 * a response type?
	 *
	 * Also, use the JSONApi links/relations to find more options if available
	 */
	public getNestedRouterLink(
		operationId: OperationId,
		method: OperationType = 'get',
		item?: any,
	): string[] {
		if (!operationId) return []
		// Get all child operations for this operation id
		const methods = this.getChildOperations(operationId).filter((op) => op.type === method)
		if (methods.length) {
			// If we have a list op OperationModels, get the operation for
			// the first one (see @todo), or return an empty
			return this.getRouterLink(methods[0].id, item)
		}

		// Nothing? Well here's nothing back!
		return []
	}

	/**
	 * @summary
	 * Uses the payload item for an operation to create a router link
	 * that uses the operation's route to match parameters from the
	 * payload item.
	 *
	 * @param operationId OperationId
	 * @param item payload item to match
	 *
	 * @returns matched route string from operation
	 */
	private getRouterLink(operationId: OperationId, item: any): string[] {
		if (!operationId) return []

		const operation = this._operations.get(operationId)
		if (!operation) return []
		// if we don't have an item, we just want the route for this
		// operation type
		if (!item) return operation.route
		// Otherwise, map the path and path params to the proper values
		// from the item and return a nice routerLink array
		return operation.route.map((path) => {
			const inpath = operation.params.find((param) => path.indexOf(`{${param.name}}`) > -1)
			if (inpath) {
				return path.replace(/{.+?}/gi, item[inpath.name])
			}
			return path
		})
	}

	/**
	 * @summary
	 * Create an untyped, unfilled object with just properties and non values.
	 *
	 * @param operationId operation id
	 *
	 * @returns schema property object
	 *
	 * @todo
	 * This is used in `operationActionSend`, but that needs a refactor, so when
	 * we get there, might as well add it
	 */
	public operationPayload(
		operationId: OperationId,
		method: OperationType = 'post',
	): Record<string, unknown> {
		if (!operationId) return
		const operation = this._operations.get(operationId)
		if (!operation) return
		const schema = operation.schemas.get(method)
		if (!schema) return

		const obj = {}

		for (const prop in schema.properties) {
			obj[prop] = undefined
		}

		return obj
	}
}
