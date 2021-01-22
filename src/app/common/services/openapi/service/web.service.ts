import { catchError, defaultIfEmpty, filter, finalize, first, map, switchMap } from 'rxjs/operators'

import { HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { EmailValidator } from '@angular/forms'
import { MatSnackBar } from '@angular/material/snack-bar'
import { Params } from '@angular/router'
import { asArray, hasValue, isNaB } from '@quebble/scripts'
import * as _moment from 'moment'
import { Observable, of, throwError } from 'rxjs'

import { HttpError } from '../../interceptor/model/httperror.model'
import { LoadingService } from '../../loading/service/loading.service'
import { ResponseService } from '../../response/service/response.service'
import { StorageService } from '../../storage/storage.service'
import { TransLinkService } from '../../translation/service/translink.service'
import { IWebOptions, WebService } from '../../web/web.service'
import { ParameterObject } from '../interfaces/parameter.interface'
import { SchemaObject } from '../interfaces/schema.interface'
import { Chunk } from '../models/chunk.model'
import { Operation } from '../models/operation.model'
import { OperationId, OperationType } from '../types/openapi.types'
import { OpenApiCoreService } from './core.service'
import { OpenApiOperationService } from './operation.service'
import { OpenApiPaginationService } from './pagination.service'
import { OpenApiSchemaService } from './schema.service'
import { OpenApiSecurityService } from './security.service'

const moment = _moment

interface IThrowError {
	message: string
	in: string
	required?: string
	missing?: string
	allowed?: string
	schema?: SchemaObject
	model?: any

	nested?: { [key: string]: IThrowError }
}

@Injectable({
	providedIn: 'root',
})
export class OpenApiWebService {
	private _rxmap: Map<string, RegExp> = new Map()

	constructor(
		private web: WebService,
		private core: OpenApiCoreService,
		private operation: OpenApiOperationService,
		private schema: OpenApiSchemaService,
		private security: OpenApiSecurityService,
		private pagination: OpenApiPaginationService,
		private loading: LoadingService,
		private response: ResponseService,
		private snackbar: MatSnackBar,
		private translate: TransLinkService,
		private storage: StorageService,
	) {
		this.setupRegExpMap()
	}

	/**
	 * @summary
	 * Assign certain specific RegExp settings for binary, decimal and word
	 * character checks. These are used for each POST to check the validity of
	 * the payload, when the supplied Schema Object type is specified
	 */
	private setupRegExpMap(): void {
		this._rxmap.set('binary', new RegExp(/[^0-1]+/gi))
		this._rxmap.set('number', new RegExp(/[^0-9]+/gi))
		this._rxmap.set('character', new RegExp(/[^a-zA-Z]+/gi))
	}

	/**
	 * @summary
	 * Using the supplied OperationId, the Material Snackbar is called and a
	 * prompt is shown to the user.
	 *
	 * @param operationId operation id
	 * @param method type of REST call
	 * @param subject the subject value for the payload
	 * @param duration how long the snackar should be shown
	 */
	public openSnackbar(
		operationId: OperationId,
		method: OperationType,
		subject?: string,
		duration: number = 3000,
	): void {
		if (!operationId && !subject) return
		if (!method) return
		switch (method) {
			case 'get':
				return
		}

		const operationtl = 'operation.operationId.' + operationId
		const methodtl = 'operation.operationType.' + method.toLowerCase()
		const typetl = 'response.type.success'

		this.translate
			.get([operationtl, methodtl, typetl])
			.pipe(
				switchMap((keys: Record<string, unknown>) =>
					this.translate.get('response.construct.item', {
						subject: subject || keys[operationtl],
						operationType: keys[methodtl],
						responseType: keys[typetl],
					}),
				),
				switchMap((message: string) => {
					const snack = this.snackbar.open(message, '✓', {
						duration,
						panelClass: ['ngq_snackbar', 'ngq_snackbar-' + method],
						horizontalPosition: 'left',
					})

					return snack.afterDismissed()
				}),
				first(),
			)
			.subscribe()
	}

	/**
	 * @summary
	 * Retrieve the Parameter Object for this operation, where the
	 * name of the parameter is `parameter`
	 * @param operationId operation id
	 * @param parameter (required if not `custom`) parameter name string
	 * @param custom (required if not `parameter`) custom property to find
	 * in the customPrefix + 'params'
	 * @param value (optional if `custom`) custom property value
	 * (e.g. `role` as custom and `search` as value)
	 *
	 * @returns
	 * Full Parameter Object, since we need the embedded schema for
	 * pattern and validation
	 */
	public getOperationParameter(
		operationId: OperationId,
		parameter?: any,
		custom?: string,
		value?: any,
	): ParameterObject[] {
		if (!operationId || (!parameter && !custom)) return []

		// Usual check if operation and required params exist
		const operation = this.operation.map.get(operationId)
		const params = operation.params.map((item) => item)
		if (!params.length) return []

		if (parameter) {
			// If we check for a param, just return it
			return operation.params
				.filter((param: ParameterObject) => param.name === parameter)
				.toArray()
		} else if (custom) {
			const prefix = this.core.settings.customPrefix
			// If we have custom, split between value-based or
			// just property finding
			const filtered = params.filter((item) => {
				const prefixed = item.schema ? item.schema[prefix] : item[prefix]
				const params = prefixed ? prefixed['params'] : null
				if (params) {
					if (value) {
						return params[custom] === value
					} else {
						return params[custom]
					}
				}
			})
			return filtered
		}
	}

	/**
	 * @summary
	 * Preface for returning a web call observable, by sorting between
	 * retrieving and sending information. When an `item` object is present,
	 * the method assumes a send operation type. If a route is present, the
	 * method assumes a retrieve operation type.
	 *
	 * @param model OperationModel
	 * @param item (required without route) schema property object
	 * @param route (required without item) SubPath[] with prefilled parameters
	 * @param params (optional) key/value pairs with query params for the call
	 *
	 * @returns Observable web call
	 */
	public operationActionByModel(
		model: Operation,
		item?: any,
		route?: string[],
		params?: Params,
	): Observable<any> {
		if (item) return this.operationActionSend(model, item, params)
		if (route) return this.operationActionGet(model, route, params)
	}

	/**
	 * @summary
	 * Method for sending data. Uses the operation id in the OperationModel
	 * to validate the `item` schema property object, checks required fields
	 * are filled in and if it matches the schema from the OperationModel.
	 * Maps the `item` key/value pairs to the RequestBody Object as defined
	 * in the Operation Object and does the same checks for required and
	 * matching fields according to the Schema Object.
	 *
	 * @param model OperationModel
	 * @param item schema property object
	 * @param params (optional) key/value pairs with query params for the call
	 *
	 * @returns Observable web call
	 *
	 * @todo
	 * There's no check for the requirements as defined in the schema fields
	 * like the length of an array, string or number.
	 * This should become its own seperate method in the SupportService,
	 * with extensive type and error validation checking, combining both the
	 * `matchSchema` and `hasRequired` nested methods.
	 * Also use `operationPayload` from below to get the schema property
	 * objects used.
	 */
	private operationActionSend(operation: Operation, item: any, params?: Params): Observable<any> {
		if (!this.operation.map.has(operation.id)) return throwError('Operation ID not found')

		// Extract the required properties from the schema. Checks if the
		// required field in the Schema Object is set as an array, a string
		// or a boolean.
		const extractRequired = (inschema: SchemaObject): string[] => {
			// Check all properties if the required field is absent for
			// nested required fields and return an array of matches
			if (!inschema.required) {
				if (inschema.properties) {
					const required = []
					for (const key in inschema.properties) {
						const prop = inschema.properties[key]
						if (prop.required) required.push(key)
					}

					return required
				} else {
					return []
				}
			}

			// Otherwise check if it's an array, a string or a boolean and
			// return the array, casted array or empty array
			return Array.isArray(inschema.required)
				? inschema.required
				: isNaB<string>(inschema.required)
				? [inschema.required]
				: []
		}

		// Method to quickly check if the Schema Object fields that are
		// required are present and filled in the `initem` object
		const hasRequired = (inschema: SchemaObject, initem: any): boolean => {
			if (!initem) return false
			if (!inschema) return true

			const required = extractRequired(inschema)
			if (!required.length) return true

			let matches: boolean = true
			required.forEach((req, index) => {
				if (index > 0 && !matches) return
				// see @todo, since there needs to be way more checking
				// in this part. This should become its own extensive
				// method in the SupportService.
				matches = req in initem && hasValue(initem[req], true)
			})

			if (!matches && operation.params.size) {
				const filtered = operation.params.filter(
					(param) => param.in === 'path' && hasValue(initem[param.name]),
				)
				matches = filtered.size === operation.params.size
			}

			return matches
		}

		const matchSchema = (inschema: SchemaObject, initem: any): boolean => {
			if (!initem) return false
			if (!inschema) return true
			if (!inschema.properties) return true
			if (!hasRequired(inschema, initem)) return false

			let matches: boolean = true

			for (const prop in initem) {
				if (!matches) return
				matches = prop in inschema.properties
			}

			return matches
		}

		// Get the schema
		const schema = this.schema.getSchema(operation.schema)
		// Get the requestbody schema from the operation
		const opschema = operation.schemas.get(operation.type)
		// Check if the `item` object has all required properties
		// as set in the RequestBody Object
		const required = hasRequired(schema, item)
		// Store path for later changes
		let path: string = operation.path

		// Return an Observable error if required fails
		if (!required) {
			return throwError({
				message: 'Required property not found or empty',
				in: 'model',
				required: opschema.required,
				model: item,
			})
		}

		const opparams = operation.params.map((param) => param.name && param.in === 'path')

		// Check for path parameters
		if (opparams.length) {
			const inpath = opparams.filter((param) => {
				if (path.indexOf(`{${param}}`) > -1) {
					return !hasValue(item[param])
				}
				return true
			})

			// If not present in the `item` object, throw an Observable error
			if (inpath.length !== opparams.length) {
				return throwError({
					message: 'Required property not found or empty',
					in: 'path',
					required: inpath.join(', '),
					model: item,
				})
			}

			// Check if the param is in the path itself, or should be
			// appended
			if (inpath.length) {
				opparams.forEach((param) => {
					path = path.replace(`{${param}}`, item[param])
				})
			} else {
				// Check if the path ends with a `/`, then add it after
				// Otherwise add the `/` and append it
				const joined = opparams.map((param) => item[param]).join('/')
				if (path.match(/\/$/gi)) path = path + joined
				else path = path + '/' + joined
			}
		} else {
			// If no path params are required, make sure to remove the params
			// altogether, just in case
			// This could probably do with a bit of error handling.
			path = path.replace(/{.+?}/gi, '')
		}

		// Craft the payload based on the RequestBody Object
		const payload = {}
		if (opschema && opschema.properties) {
			for (const prop in opschema.properties) {
				payload[prop] = item[prop]
			}
		}

		// Make sure all properties are present as a last
		// check.
		const match = matchSchema(opschema, payload)
		if (opschema && !match) {
			return throwError({
				message: `Schema '${operation.schema}' mismatch`,
				in: 'payload',
				schema: opschema,
				model: payload,
			})
		}

		return this.operationAction(operation.id, payload, path, params)
	}

	/**
	 * @summary
	 * Method for retrieving data. Uses the operation id and the route
	 * to conjure up a path that the WebService can use and returns the
	 * associated Observable
	 *
	 * @param model OperationModel
	 * @param route SubPath[] with prefilled parameters
	 * @param params (optional) key/value pairs with query params for the call
	 *
	 * @returns Observable web call
	 */
	private operationActionGet(
		operation: Operation,
		route: string[],
		params?: Params,
	): Observable<any> {
		if (!this.operation.map.has(operation.id)) return throwError('Operation ID not found')

		// Split the prefix by `/` if it's not an array and remove empty
		// strings (`/api/` returns `["", "api", ""]` for example)
		const prefix = Array.isArray(this.core.settings.apiPrefix)
			? this.core.settings.apiPrefix
			: this.core.settings.apiPrefix.split('/').filter((item) => hasValue(item))
		// Split the operation path by `/`
		const expanded = operation.path.split('/')

		// Map the operation path to fill in the possible path params
		const matches = expanded
			.map((item, index) => {
				// Make sure the item has a value and isn't in the
				// prefix array before continuing
				if (!hasValue(item) || prefix.includes(item)) return item
				// Get the correct index in the route for the current
				// item
				const inpath = operation.route.indexOf(item)
				// If it's the same string, return the item
				if (route[inpath] === item) return item
				else {
					// Match for path params curly braces
					if (item.match(/{.+?}/gi)) {
						// Get the index of the previous item to match for
						// the right positioning
						const idx = operation.route.indexOf(expanded[index - 1])
						// Check if it has a value and return the prefilled
						// parameter from the route, according to the index
						// of the previous item + 1
						if (hasValue(idx)) return route[idx + 1]
						return item
					} else {
						return item
					}
				}
			})
			// Join everything back in to a proper, full path
			.join('/')

		// Return the web call with the full path
		return this.operationAction(operation.id, null, matches, params)
	}

	/**
	 * @summary
	 * Create an Observable based on the oparation id, while checking
	 * for path security and authorization. Uses the default path settings
	 * of the OperationModel
	 *
	 * @note If possible, use `operationActionByModel` instead if you
	 * have the OperationModel.
	 *
	 * @param operationId operation id
	 * @param payload (optional) verified request body object
	 * @param path (optional) the path to use
	 * @param params (optional) key/value pairs with query params for the call
	 */
	public operationAction(
		operationId: OperationId,
		payload?: any,
		path?: string | string[],
		params?: Params,
	): Observable<any> {
		const operation = this.operation.map.get(operationId)
		if (!operation) return throwError('Operation ID not found')
		// Get the security flow for the operation's security scheme
		const flow = this.security.getFlow(operation.security)
		// Use the support service to check for authorization and
		// Switchmap the results on to the web call
		const state = this.security.authStatus(flow).pipe(
			filter((token) => (!!flow && !!token) || !flow),
			switchMap((token) => this.getWebMethod(operationId, payload, path, token, params)),
		)

		return state
	}

	/**
	 * @summary
	 * Creates the web call Observable based on pass-through data
	 *
	 * @param operationId operation id
	 * @param payload (optional) verfied request body object
	 * @param path (optional) direct path
	 * @param token (optional) Bearer token
	 * @param params (optional) key/value pairs with query params for the call
	 *
	 * @returns WebService Observable
	 */
	private getWebMethod(
		operationId: OperationId,
		payload?: any,
		path?: string | string[],
		token?: string,
		params?: Params,
	): Observable<any> {
		const operation = this.operation.map.get(operationId)
		if (!operation) return throwError('Operation ID not found')
		// Parse the path and join it if it's not an array,
		// use the operation path by default
		const endpoint = path
			? Array.isArray(path)
				? path.length > 1
					? path.join('/')
					: path[0]
				: path
			: operation.path

		// Set the loader and clear the response message
		this.loading.set(operationId, true)
		this.response.clear(operationId)

		// Create empty headers
		const headers: Params = {}

		if (token) {
			headers['Authorization'] = 'bearer ' + token
		}

		// Create WebService options
		const options: IWebOptions = {
			headers,
			params,
			noPrefix: true,
			// adds `observe: 'response'` to the Angular HttpClient call
			observe: true,
		}

		// Based on the prefix settings, check if there are parameters in the path related
		// to search and pagination
		const searchparams = this.getOperationParameter(operationId, null, 'role', 'search')
		const pageparams = this.getOperationParameter(operationId, null, 'role', 'pagination')
		// Convert the params to a simple map
		const parammap = params ? new Map(Object.entries(params)) : new Map()
		// Set the limit for pagination results if applicable
		const paramLimit = parammap.get('limit')
		const limit = paramLimit ? parseInt(paramLimit) : 10
		// If there are params, we can determine whether we are searching
		const searching = searchparams.filter((param) => parammap.has(param.name)).length > 0

		// Preset some variables as undefined
		let call
		let offset
		// Empty pagination item, will be an observable if there is pagination
		let paginated

		// Pagination go!
		if (pageparams.length) {
			// If there are pagination params, extract the possible limit and
			// offset values and make Params object of it. If there are pagination
			// values in the current `params` map, use those as a base.
			// If the current params are below the max known offsets, just ignore;
			// So if we know we have 3 pages and we get page 2, no new call for
			// the next page-check is made.
			const getparams = this.pagination.params(operationId, parammap, pageparams)

			// If we don't know the next page yet, retrieve it.
			if (getparams) {
				// Set the offset to what is in the Params object, or 0
				offset = getparams.offset ?? 0
				// Clone the current options
				const pageoptions = { ...options }
				// Overwrite or add the pagination params with the current
				// offset + 1 limit (e.g. 20 becomes 30)
				// And setting the limit to 1
				pageoptions['params'] = getparams
				// Create an observable that gets the next page, limited
				// to 1 result -- { limit: 1, offset: (current + original limit) }

				paginated = this.web[operation.type](endpoint, pageoptions)
			}
		}

		// Switch the method to match the call. A send operation
		// has a payload, a retrieve operation does not.
		switch (operation.type) {
			case 'post':
			case 'put':
			case 'patch':
				call = this.web[operation.type](endpoint, payload, options)
				break
			case 'delete':
				options.progress = true
				call = this.web[operation.type](endpoint, options)
				break
			case 'get':
				call = this.web[operation.type](endpoint, options)
				break
			case 'head':
				return this.operationFromHead(endpoint, options)
			default:
				call = of().pipe(defaultIfEmpty(null))
				break
		}

		// First we return the call and pipe it to check some variables
		return call.pipe(
			// Catch the error and update the response service
			catchError((error: HttpError) => {
				// Set the response message based on the reply
				if (operation.type !== 'get') this.response.update(operationId, error)
				return throwError(error)
			}),
			// Otherwise, map the result to itself and do some checks
			// to update the snackbar and/or response
			map((result: HttpEvent<any>) => {
				// Make sure the result type is a response
				if (result?.type === HttpEventType.Response) {
					// If it's a good response, open the MatSnackbar
					// The method in Support filters out the `get` operation
					if (result.status >= 200 && result.status <= 210) {
						this.openSnackbar(operationId, operation.type)

						// We're searching apparently
						if (searching) {
							// But no results?
							if (!result.body || (result.body && !result.body.length)) {
								// Fire the response service with an empty warning
								this.response.update(
									operationId,
									'response.default.search.empty',
									'warning',
								)
							}
						}

						// Seems like there's pagination
						// Let's check the length vs the limit and see if we need
						// another pagination call
						if (paginated && asArray(result.body).length === limit) {
							this.pagination.monitor(paginated, operationId, limit, offset)
						}
					}

					// Return the body
					return result.body
				}
				// Apparently it's not a response, so return a
				// default-empty Observable
				return of().pipe(defaultIfEmpty(null))
			}),
			// When the call is done, unset the loader
			finalize(() => {
				this.loading.set(operationId, false)
			}),
		)
	}

	/**
	 * @summary
	 * Makes a HEAD call and returns a mapped response for the call,
	 * putting all headers and values in to a map.
	 *
	 * @param endpoint path string
	 * @param options web options/headers/params
	 *
	 * @returns
	 * Observable with Map of headers/values
	 */
	private operationFromHead(endpoint: string, options: any): Observable<Map<string, string>> {
		return this.web.head(endpoint, options).pipe(
			filter((event) => event.type === HttpEventType.Response),
			map((event: HttpResponse<any>) => {
				const map = new Map<string, string>()
				const headers = event.headers
				if (headers) {
					headers.keys().forEach((key) => {
						map.set(key, headers.get(key))
					})
				}

				return map
			}),
		)
	}

	/**
	 * @summary
	 * Using the Chunk to fill in missing data not found in the model, but
	 * needed in the path and/or payload, create a web call that uses the
	 * other methods in this class
	 *
	 * @param chunk the Chunk with the data
	 * @param type type of operation
	 * @param item payload
	 *
	 * @returns
	 * Web call observable
	 */
	public chunkOperation(chunk: Chunk, type?: OperationType, item?: any): Observable<any> {
		if (!chunk)
			return throwError({
				message: `No chunk for operation ${type}`,
				in: 'operation',
				model: item ?? null,
			})

		const operation =
			chunk.operation.type === type
				? chunk.operation
				: chunk.operations.find((op) => op.type === type) ??
				  chunk.linkops.find((op) => op.type === type)

		// If you decide to POST on a GET only path? No.
		if (!operation) {
			return throwError({
				message: `The ${type} operation is not supported for this chunk`,
				in: 'operation',
				allowed: [chunk.operation.type, ...chunk.operations.map((op) => op.type)].join(
					', ',
				),
			})
		}

		const payload = this.chunkValuesForItem(chunk, item)
		if (['post', 'patch', 'put'].includes(operation.type)) {
			if (!item) {
				return throwError({
					message: `Cannot ${operation.type} without payload`,
					in: 'operation',
					// required: operation.required.join(', '),
					schema: operation.schema,
				})
			} else {
				const matches = this.chunkMatchItem(chunk, operation, payload)
				if (isNaB<IThrowError>(matches)) return throwError(matches)
			}
		}

		const path = this.chunkMatchPathAndValues(chunk, operation, payload)
		if (path.match(/{.+?}/gi) || !path) {
			return throwError({
				message: 'Path parameters missing from chunk or payload',
				in: 'operation',
				required:
					operation?.params.map((p) => p.name && p.in === 'path').join(', ') ??
					'No operation found',
				missing: path.match(/{.+?}/gi).join(', '),
			})
		}

		return this.operationAction(operation.id, payload, path as string)
	}

	/**
	 * @summary
	 * Going to be used to add values from the chunk and payload to the
	 * Parameter Objects found in the OperationModel.
	 *
	 * @param chunk
	 * @param operation
	 *
	 * @returns ?
	 *
	 * @todo
	 * Make this function work with the new data structure.
	 */
	private chunkValuesForParams(chunk: Chunk, operation: Operation /* , item?: any */): any {
		if (!chunk || !operation) return

		// const params: Record<string, unknown> = {}

		if (operation.params.size) {
			operation.params.forEach((param: SchemaObject) => {
				if (param.required) {
					/**
					 * @todo
					 * Add values from nested parent to valuemap of chunk
					 */
				}
			})
		}
	}

	/**
	 * @summary
	 * Parse the path in the OperationModel -- a value straight from the Paths
	 * Object -- and prefill the required path parameters with values from the
	 * Chunk, if found. Next, the operation payload is parsed for properties
	 * that match the path.
	 *
	 * @param chunk Current Chunk
	 * @param operation OperationModel to use the path from
	 * @param item operation payload
	 *
	 * @returns Path string
	 *
	 * @todo
	 * The `provider_id` is now always supplanted with the current workspace,
	 * but this limits the usability of admin actions. Find a better way.
	 */
	private chunkMatchPathAndValues(chunk: Chunk, operation: Operation, item?: any): string {
		if (!chunk || !operation || !operation.id) return

		let path = operation.path
		chunk.values.forEach((value, key) => {
			if (!key.includes('{')) return
			if (path.includes(key)) path = path.replace(key, value)
		})

		if (item) {
			for (const prop in item) {
				const param = `{${prop}}`
				if (path.includes(param)) {
					if (hasValue(item[prop])) path = path.replace(param, item[prop])
				}
			}
		}

		if (path.includes('{provider_id}')) {
			const workspace = this.storage.cache.val('workspace')?.workspace ?? null
			if (hasValue(workspace?.id)) return path.replace('{provider_id}', workspace.id)
		}

		return path
	}

	/**
	 * @summary
	 * Set certain values in the operation payload based on the values from the
	 * Chunk, if they're not already set. Values from the Chunk are those found
	 * in the current URL, so these are purely contextual. Making a POST to a
	 * Provider entity doesn't require the user to fill in the `provider_id`,
	 * instead these types of values are taken from the Chunk.
	 *
	 * @param chunk Chunk to use values from
	 * @param item operation payload
	 *
	 * @returns operation payload
	 *
	 * @todo
	 * This seems 1-dimensional 🤔
	 * Also, the easy-mode to json api converter is ... ok-ish
	 */
	private chunkValuesForItem(chunk: Chunk, item: any): any {
		if (!chunk)
			return throwError({
				message: `No chunk or operation found`,
				in: 'operation',
			})

		if (item) {
			for (const prop in item) {
				if (chunk.values.has(prop)) {
					const val = chunk.values.get(prop)
					if (!hasValue(item[prop])) {
						item[prop] = val
					} else {
						// Because the ids are still numbers there's some overlap
						// between provider.id = 1 and unit.id = 1, so the id is
						// replaced with `tree_1` where there's the both of em.
						// Gotta fix that back, otherwise we gots errors.
						if (prop === 'id' || prop === 'provider_id')
							item[prop] = item[prop] !== val ? val : item[prop]
					}
				}
			}
		}

		if (chunk.operation.jsonapi) {
			return {
				data: {
					attributes: item,
				},
			}
		}

		return item
	}

	/**
	 * @summary
	 * Inbetween function that finds the right Schema Object for the supplied
	 * Chunk, OperationModel and operation payload. If found, the payload is
	 * matched to the schema in the function `matchItemToSchema`, when the
	 * operation is either POST, PATCH or PUT.
	 *
	 * @param chunk Chunk to use for values
	 * @param operation OperationModel to use as base
	 * @param item operation payload
	 *
	 * @returns boolean or IThrowError
	 *
	 * @todo
	 * schema getter (operations.schemas.get(operation.type)) needs to be able
	 * to get anyOf/oneOf/allOf, but not through the operation model
	 */
	private chunkMatchItem(chunk: Chunk, operation: Operation, item: any): boolean | IThrowError {
		if (!chunk || !operation || !operation.id)
			return {
				message: `No chunk or operation found`,
				in: 'operation',
			}

		if (['post', 'patch', 'put'].includes(operation.type)) {
			const schema = operation.schemas.get(operation.type)
			const matched = this.matchItemToSchema(schema, item)
			return matched
		}

		return true
	}

	/**
	 * @summary
	 * Supplied Schema Object is used to match the values for each part of the
	 * payload to the expected value format as defined by the Schema Object
	 * properties hashmap.
	 *
	 * Error messages are generated for a mismatch in type (e.g. expected a
	 * number, but got 'NaN'), format (e.g. got only a date when date-time was
	 * expected) or when an item is missing that was required.
	 *
	 * @param schema Schema Object
	 * @param item operation payload
	 *
	 * @returns boolean or IThrowError
	 */
	private matchItemToSchema(schema: SchemaObject, item?: any): boolean | IThrowError {
		const error = {
			message: [],
			in: 'model',
			required: [],
			nested: {},
		}

		const mismatchType = (key: string, needs: string, got: string): void => {
			const message = this.translate.instant('system.operation.error.type', {
				key,
				needs,
				got,
			})
			error.message.push(message)
		}

		const mismatchFormat = (key: string, needs: string, got: string): void => {
			const message = this.translate.instant('system.operation.error.format', {
				key,
				needs,
				got,
			})
			error.message.push(message)
		}

		const requiredMissing = (key: string): void => {
			const reqs = error.required
			if (!reqs.includes(key)) {
				error.required.push(key)

				const message = this.translate.instant('system.operation.error.required', { key })
				error.message.push(message)
			}
		}

		const noSchema = () => {
			const message = this.translate.instant('system.operation.error.noschema')
			error.message.push(message)
		}

		if (!item) {
			if (!schema) return true
			if (schema || !schema.properties) {
				noSchema()

				return {
					message: asArray(error.message).join('\r\n'),
					in: 'operation',
				}
			}
		}

		const nested = (ref: string, item: any): void => {
			const schema = this.schema.getSchema(ref)
			const result = this.matchItemToSchema(schema, item)
			if (isNaB<IThrowError>(result)) Object.assign(error.nested, { [schema.title]: result })
		}

		error.required = isNaB(schema.required) ? asArray(schema.required) : []

		for (const key in schema.properties) {
			const prop = schema.properties[key]
			const req = prop.required
			const type = prop.type
			const format = prop.format

			if (key === 'id') {
				item[key] = hasValue(item[key]) ? item[key] : null
				if (item[key] === null) delete item[key]
				continue
			}

			if (!hasValue(item[key])) {
				if (req) requiredMissing(key)
				else delete item[key]
				continue
			}

			const ref = prop.$ref
			if (ref) {
				nested(ref, item[key])
				continue
			}

			switch (prop.type) {
				case 'integer': {
					const parsed = parseInt(item[key])
					if (isNaN(parsed)) mismatchType(key, type, typeof item[key])
					break
				}
				case 'number': {
					const parsed = parseFloat(item[key])
					if (isNaN(parsed)) mismatchType(key, type, typeof item[key])
					break
				}
				case 'string': {
					switch (format) {
						case 'binary': {
							const rx = this._rxmap.get(format)
							const match = rx.test(item[key])
							if (!match) {
								const numbers = !isNaN(parseInt(item[key]))
								if (numbers) mismatchFormat(key, format, 'string')
								else mismatchFormat(key, format, 'number')
							}
							break
						}
						case 'date': {
							const parsed = moment(item[key]).isValid()
							if (!parsed) mismatchFormat(key, format, typeof item[key])
							break
						}
						case 'date-time': {
							const parsed = moment(item[key])
							if (!parsed.isValid()) mismatchFormat(key, format, typeof item[key])
							const isostr = parsed.toISOString()
							const datetime = isostr.split('T')
							if (datetime.length > 1) {
								const time = datetime[1]
								if (time.indexOf('00:00') === 0) mismatchFormat(key, format, 'date')
							} else mismatchFormat(key, format, 'date')
							break
						}
						case 'email': {
							const valid = new EmailValidator().validate(item[key])
							if (!valid) mismatchFormat(key, format, typeof item[key])
							break
						}

						default:
							break
					}
				}
			}
		}

		if (error.message.length) {
			const inerror: any = {
				message: error.message.join('\r\n'),
				in: error.in,
			}

			if (error.required.length) inerror.required = error.required.join(', ')
			if (error.nested) inerror.nested = error.nested
			return inerror
		}

		return true
	}
}
