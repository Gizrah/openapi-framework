import { Injectable } from '@angular/core'
import { Params, Router } from '@angular/router'
import { StorageKeys } from '@quebble/consts'
import { environment } from '@quebble/environment'
import { DisplayItem } from '@quebble/interfaces'
import { ExMap } from '@quebble/models'
import { asArray, dolog, hasValue } from '@quebble/scripts'
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs'
import { filter, map, takeUntil } from 'rxjs/operators'

import { ResponseEvent, ResponseService } from '../../response/service/response.service'
import { StorageService } from '../../storage/storage.service'
import { OpenApiObject } from '../interfaces/openapi.interface'
import { ParameterObject } from '../interfaces/parameter.interface'
import { IPropDef } from '../interfaces/prop-def.interface'
import { SchemaObject } from '../interfaces/schema.interface'
import { ChunkGroup } from '../models/chunk-group.model'
import { Chunk } from '../models/chunk.model'
import { Operation } from '../models/operation.model'
import {
	OperationId,
	OperationType,
	PathMenuItem,
	Route,
	SchemaName,
	SchemaRef,
	SchemaType,
	ViewMap,
	ViewType,
} from '../types/openapi.types'
import { OpenApiChunkService } from './chunk.service'
import { OpenApiCoreService } from './core.service'
import { GeneratorService } from './generator.service'
import { OpenApiOperationService } from './operation.service'
import { OpenApiPathService } from './path.service'
import { OpenApiRouteService } from './route.service'
import { OpenApiSchemaService } from './schema.service'
import { OpenApiSecurityService } from './security.service'
import { OpenApiWebService } from './web.service'

interface WorkSpace {
	workspace: any
}

@Injectable({
	providedIn: 'root',
})
export class OpenApiService {
	/**
	 * Workspace storage key
	 */
	private _provkey: string = StorageKeys.General.Workspace

	/**
	 * Update stream, used by components to determine time-to-act
	 */
	private update$: BehaviorSubject<boolean> = this.storage.cache.get<boolean>(
		StorageKeys.OpenApi.State,
	)

	/**
	 * Observable cleanup subject
	 */
	private destroy$: Subject<void> = new Subject()

	constructor(
		private core: OpenApiCoreService,
		private security: OpenApiSecurityService,
		private schema: OpenApiSchemaService,
		private path: OpenApiPathService,
		private operation: OpenApiOperationService,
		private chunk: OpenApiChunkService,
		private web: OpenApiWebService,
		private storage: StorageService,
		private response: ResponseService,
		private genny: GeneratorService,
		private openroute: OpenApiRouteService,
		private router: Router,
	) {
		this.primeSubscriptions()
	}

	/**
	 * @returns the update stream, the signal that the service
	 * has initialized for component init.
	 */
	get update(): BehaviorSubject<boolean> {
		return this.update$
	}

	/**
	 * @returns the current workspace value
	 */
	get workspace(): Record<string, unknown> {
		return this.storage.cache.get<WorkSpace>(this._provkey)?.getValue()?.workspace
	}

	/**
	 * @param provider Set the current workspace
	 */
	set workspace(provider: Record<string, unknown>) {
		this.storage.cache.get<WorkSpace>(this._provkey)?.next({ workspace: provider })
		this.storage.local.set(this._provkey, { workspace: provider })
	}

	/**
	 * @returns Observable with workspace, default to object with an empty
	 * workspace to prevent errors
	 */
	get workspacestream(): Observable<WorkSpace> {
		return this.storage.cache.get<WorkSpace>(this._provkey, { workspace: null })
	}

	/**
	 * @returns Keycloak user profile
	 */
	get user(): Promise<Keycloak.KeycloakProfile> {
		return this.security.getUser()
	}

	/**
	 * @returns The current menu items
	 */
	get paths(): PathMenuItem[] {
		return this.path.paths
	}

	/**
	 * @returns The menu items that require no authentication
	 */
	get passing(): PathMenuItem[] {
		return this.path.passing
	}

	/**
	 * @returns the latest update time
	 */
	get head(): string {
		return this.core.head
	}

	/**
	 * @returns Chunk view map
	 */
	get views(): ExMap<string, ViewMap> {
		return this.chunk.views
	}

	set view(view: [string, ViewMap]) {
		this.chunk.view = view
	}

	/**
	 * @returns Current chunkgroup as an observable
	 */
	get chunkgroup(): BehaviorSubject<ChunkGroup> {
		return this.chunk.current
	}

	/**
	 * @returns Current view Chunk's route
	 */
	get chunkroute(): Route {
		return this.chunk.chunkroute
	}

	get viewchunk(): Observable<Chunk> {
		return this.chunk.viewchunk
	}

	/**
	 * @summary
	 * Cancel and unsub all open Subscriptions from the primeSubscriptions
	 * function.
	 */
	public ngOnDestroy(): void {
		this.destroy$.next()
		this.destroy$.complete()
	}

	/**
	 * @summary
	 * Initizialization function that starts up the OpenAPI framework and sets
	 * all relevant subsidiary services. Using async/await to determine the
	 * validity of each service. Has options to re-init the application with or
	 * without a custom OpenAPI JSON spec (e.g. when testing) and allows the
	 * SecurityService to be disabled altogether. If `nosec` is active and a
	 * request is sent to the backend, it will return a 403: Forbidden.
	 *
	 * When the GeneratorService is activated in the environment variables, the
	 * SecurityService will also be disabled. No calls will be made to the
	 * backend this way.
	 *
	 * @param reinit Re-init the app
	 * @param withspec Supply custom OpenAPI JSON spec
	 * @param nosec disable SecurityService
	 *
	 * @returns Promise
	 */
	public async init(
		reinit?: boolean,
		withspec?: OpenApiObject,
		nosec?: boolean,
	): Promise<boolean> {
		this.storage.cache.set(StorageKeys.OpenApi.State, false)
		console.clear()

		if (reinit) dolog('warning', 'Reloading application')
		if (withspec) dolog('info', 'Custom OpenAPI JSON', 'Using supplied OpenAPI JSON spec')
		if (environment.generate) nosec = environment.generate

		const workspace = this.storage.local.get<WorkSpace>(this._provkey)
		if (workspace) this.workspace = workspace.workspace

		const existing = this.storage.local.get<OpenApiObject>(this.core._storage.json)

		let errors = []
		const core: OpenApiObject | ResponseEvent = await this.core.init(withspec)
		if ('status' in core) {
			const { status } = core
			errors.push(`OpenApi JSON could not be loaded: ${status}`)
			this.storage.cache.set(StorageKeys.Response.Global, core)
		}
		const schema: any[] = await this.schema.init(core, reinit)
		const paths: any[] = await this.path.init(core, reinit)
		const security: any[] = await this.security.init(core, reinit, nosec)
		const operation: any[] = await this.operation.init(core, reinit)
		const chunk: any[] = await this.chunk.init(reinit, this.core.head)

		errors = errors.concat([...schema, ...paths, ...security, ...operation, ...chunk])

		if (!errors.length) {
			const env = environment.production
				? 'production'
				: environment.test
				? 'test'
				: 'localhost'
			dolog('success', 'All services are ready')
			dolog('success', 'Current environment is', null, null, env)

			if (environment.generate) {
				dolog('info', '[GeneratorService]', 'is generating 🗑 data')
				dolog('info', '[SecurityService]', null, null, 'is', 'ignored')
			}

			this.storage.cache.set(StorageKeys.OpenApi.State, true)

			return Promise.resolve(true)
		} else {
			errors.forEach((err) => {
				dolog('error', err)
			})

			return Promise.resolve(false)
		}
	}

	/**
	 * @summary
	 * Check for changes in the workspace and the open api spec by observing the
	 * LocalStorage for changes. When a different tab changes the workspace or
	 * the OpenAPI JSON is updated, the subscribing tab will auto-update itself.
	 */
	private primeSubscriptions(): void {
		this.storage.local
			.observe<WorkSpace>(this._provkey)
			.pipe(takeUntil(this.destroy$))
			.subscribe((result: WorkSpace) =>
				this.storage.cache.set<WorkSpace>(this._provkey, result),
			)

		this.storage.local
			.observe<OpenApiObject>(this.core._storage.json)
			.pipe(takeUntil(this.destroy$))
			.subscribe((api) => this.init(true, api))
	}

	/**
	 * @augments ::DEV::
	 * @summary
	 * Force reload the application in the background. The OpenAPI JSON is
	 * fetched and the subsidiary services are cleared and rebuilt.
	 */
	public __reload(): void {
		this.init(true)
	}

	/**
	 * @augments ::DEV::
	 * @summary
	 * Force toggle all currently known operations' loading states.
	 *
	 * @param state boolean toggle
	 */
	public __loading(state: boolean): void {
		this.operation.__loading(state)
	}

	/**
	 * @augments ::DEV::
	 * @summary
	 * Toggle random data generation on or off. Changing the state re-inits all
	 * services with the current OpenAPI JSON as stored in the Core service.
	 *
	 * @returns boolean with current generate state
	 */
	public async __random(): Promise<boolean> {
		environment.generate = !environment.generate
		const reinit = await this.init(true, this.core._openapi, environment.generate)
		if (hasValue(reinit)) this.resolveChunkData(true)

		return Promise.resolve(environment.generate)
	}

	/**
	 * @augments ::DEV::
	 * @summary
	 * Fancy logger of all services including self
	 */
	public __log(): void {
		console.groupCollapsed('OpenAPI Services')
		dolog('success', 'CoreService', this.core)
		dolog('success', 'SchemaService', this.schema)
		dolog('success', 'PathsService', this.path)
		dolog('success', 'SecurityService', this.security)
		dolog('success', 'OperationService', this.operation)
		dolog('success', 'ChunkService', this.chunk)
		dolog('success', 'WebService', this.web)
		dolog('success', 'OpenApiService', this)
		console.groupEnd()

		console.groupCollapsed('General Services')
		dolog('success', 'StorageService', this.storage)
		dolog('success', 'ResponseService', this.response)
		dolog('success', 'GeneratorService', this.genny)
		dolog('success', 'Angular Router', this.router)
		console.groupEnd()
	}

	/**
	 * @summary
	 * Get the Schema Object by either schema name string, or $ref string
	 *
	 * @param ref either the $ref string, or a schema name
	 *
	 * @returns the Schema Object if it exists
	 */
	public getSchema(ref: string): SchemaObject {
		return this.schema.getSchema(ref)
	}

	/**
	 * @summary
	 * Get all schemas that include the (partial) ref or name supplied
	 *
	 * @param ref either the $ref string, or a (partial) schema name
	 *
	 * @returns Array with schemas
	 */
	public getSchemas(ref: string): SchemaObject[] {
		return this.schema.getSchemas(ref)
	}

	/**
	 * @summary
	 * Convert the url provided to a ChunkGroup that splits up all parts of the
	 * url in their own respective chunks, with the operations associated with
	 * each part. Based on the last part of the url, the view is decided and the
	 * application can show the right page.
	 *
	 * @param route current route
	 * @param type operation type
	 * @param component current view component
	 *
	 * @returns ChunkGroup
	 */
	public getChunkGroup(route: Route, type: OperationType = 'get', component: string): ChunkGroup {
		return this.chunk.getChunkGroup(route, type, component)
	}

	/**
	 * @summary
	 * Use the Chunk model to get a webcall going
	 *
	 * @param chunk current Chunk
	 * @param type operation type
	 * @param item payload
	 */
	public chunkOperation(chunk: Chunk, type?: OperationType, item?: unknown): Observable<any> {
		return this.web.chunkOperation(chunk, type, item)
	}

	/**
	 * @summary
	 * Finds the simplified OperationModel for the current or operation id, and
	 * returns one whether or not it was found. Error checking is done later, by
	 * checking for the existence of the model.id.
	 *
	 * @param route the route or operationId
	 * @param method (optional) the operation type, defaults to 'get'
	 *
	 * @returns OperationModel
	 */
	public getOperation(route: string[] | OperationId, method: OperationType = 'get'): Operation {
		return this.operation.getOperation(route, method)
	}

	/**
	 * @summary
	 * For the current route, returns a list of operations that are allowed.
	 * Excludes can be set either as a single string or an array
	 *
	 * @param route the route array
	 * @param exclude (optional) operation type(s) to exclude
	 *
	 * @returns OperationModel array
	 */
	public getOperations(
		operationId: OperationId,
		exclude?: OperationType | OperationType[],
	): Operation[] {
		return this.operation.getOperations(operationId, exclude)
	}

	/**
	 * @summary
	 * Finds and returns similar operation models based on schema, operation
	 * type etc.
	 *
	 * @param operationId operationId of current route
	 * @param filter (optional) the operation type to exclude
	 * @param filterIncludes (optional) reverse filter to include
	 *
	 * @returns an array of OperationModels
	 */
	public getChildOperations(
		operationId: OperationId,
		filter?: OperationType | OperationType[],
		filterIncludes?: boolean,
	): Operation[] {
		return this.operation.getChildOperations(operationId, filter, filterIncludes)
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
		method?: OperationType,
		item?: unknown,
	): string[] {
		return this.operation.getNestedRouterLink(operationId, method, item)
	}

	/**
	 * @summary
	 * Returns all nested schemas and attached operationIds.
	 *
	 * @param operationId operation id
	 * @param property schema property name
	 *
	 * @returns tuple with the operation id and the Schema Object
	 */
	public getNestedSchemaForOperation(
		operationId: OperationId,
		property: string,
	): [OperationId, SchemaObject] {
		return this.schema.getNestedSchemaForOperation(operationId, property)
	}

	/**
	 * @summary
	 * Form web call for send and retrieve operations.
	 *
	 * Send: model, item, params?
	 * Retrieve: model, route, params?
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
		item?: unknown,
		route?: string[],
		params?: Params,
	): Observable<any> {
		if (environment.generate) {
			// Generate data based on search params if found and remove the
			// wildcard before sending it
			// TODO: sync searchable props with(out) wildcard to Generator
			// Service and add options for more flexibility
			const { search } = params ?? {}
			const searchFor = search ? params.search.replace('*', '') : null
			const generated = this.openroute.generateDataForSchema(
				model.schema,
				model.view,
				null,
				searchFor,
			)
			return of(generated)
		} else return this.web.operationActionByModel(model, item, route, params)
	}

	/**
	 * @summary
	 * Create an Observable based on the oparation id, while checking for path
	 * security and authorization. Uses the default path settings of the
	 * OperationModel
	 *
	 * @note If possible, use `operationActionByModel` instead if you have the
	 * OperationModel.
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
		if (environment.generate) {
			// Generate data based on search params if found and remove the
			// wildcard before sending it
			// TODO: sync searchable props with(out) wildcard to Generator
			// Service and add options for more flexibility
			const model = this.operation.map.get(operationId)
			if (!model) return throwError('Operation ID not found')
			const generated = this.openroute.generateDataForSchema(model.schema, model.view, null)
			return of(generated)
		} else return this.web.operationAction(operationId, payload, path, params)
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
	 * This is used in `operationActionSend`, but that needs a refactor,
	 * so when we get there, might as well add it
	 */
	public operationPayload(
		operationId: OperationId,
		method: OperationType = 'post',
	): Record<string, unknown> {
		return this.operation.operationPayload(operationId, method)
	}

	/**
	 * @summary
	 * Extract the 'base' name of a schema by stripping the operation types from
	 * the name, for example: `UserPost` becomes `User`.
	 *
	 * This allows for grouped-by-base-schema references for things like
	 * translations.
	 *
	 * @param schema schema name string
	 *
	 * @returns base schema name
	 */
	public stripMethodFromSchema(schema: SchemaName): SchemaName {
		return this.schema.stripMethodFromSchema(schema)
	}

	/**
	 * @summary
	 * Retrieve the Parameter Object for this operation, where the name of the
	 * parameter is `parameter`
	 *
	 * @param operationId operation id
	 * @param parameter (required if not `custom`) parameter name string
	 * @param custom (required if not `parameter`) custom property to find in
	 * the customPrefix + 'params'
	 * @param value (optional if `custom`) custom property value (e.g. `role` as
	 * custom and `search` as value)
	 *
	 * @returns
	 * Full Parameter Object, since we need the embedded schema for pattern and
	 * validation
	 */
	public getOperationParameter(
		operationId: OperationId,
		parameter?: any,
		custom?: string,
		value?: any,
	): ParameterObject[] {
		return this.web.getOperationParameter(operationId, parameter, custom, value)
	}

	/**
	 * @summary
	 * Find the custom prefix values in the schema object
	 *
	 * @param schema Schema Object
	 *
	 * @returns object with custom properties
	 */
	public getCustomParamField(schema: SchemaObject): any {
		return this.core.getCustomParamField(schema)
	}

	/**
	 * @summary
	 * Login via keycloak
	 */
	public login(options?: Keycloak.KeycloakLoginOptions): Promise<void> {
		return this.security.login(options)
	}

	/**
	 * @summary
	 * Logout from keycloak
	 */
	public logout(): Promise<void> {
		this.storage.local.clear(this._provkey)
		this.storage.cache.clear(this._provkey)
		return this.security?.logout()
	}

	/**
	 * @summary
	 * Check login status in KC via observable
	 */
	public loggedin(): Observable<boolean> {
		return this.security.loggedin()
	}

	/**
	 * @summary
	 * Clears the current operation's response to prevent sticky response
	 * components
	 *
	 * @param operationId Operation ID
	 */
	public clearResponse(operationId: OperationId): void {
		if (!operationId) return
		this.response.clear(operationId)
	}

	/**
	 * @summary
	 * Find the component preference based on the route
	 *
	 * @param route the current route or part of it
	 *
	 * @returns Component view type
	 */
	public weighPreference(route: Route): ViewType {
		return this.chunk.weighPreference(route)
	}

	/**
	 * @summary
	 * Check if the parameter is either entity or provider id
	 *
	 * @param item the paramater
	 *
	 * @returns True or false
	 */
	private isEntityOrProvider(item: any): boolean {
		return String(item).match(/{provider_id|entity_id}/gi) !== null
	}

	/**
	 * @summary
	 * Find and return the Property Definitions for the given schema name
	 *
	 * @param schema schema name
	 *
	 * @returns IPropDef array
	 */
	public getPropDefsForSchema(schema: SchemaName): IPropDef[] {
		const schemaref = this.schema.refs.get(schema)
		const { propDefs } = schemaref
		return propDefs ?? []
	}

	/**
	 * @summary
	 * Find and return the SchemaRef object for the given schema name
	 *
	 * @param schema
	 *
	 * @returns SchemaRef
	 */
	public getSchemaRefForSchema(schema: SchemaName): SchemaRef {
		const schemaref = this.schema.refs.get(schema)
		return schemaref
	}

	/**
	 * @summary
	 * Find the right property name that defines the image or avatar of a given
	 * schema or given content. If data is generated and items are artificially
	 * given an avatar, this remedies that flaw somewhat for nested components
	 * like the AvatarRow.
	 *
	 * @param operation current Operation
	 * @param content single or multiple (generated) items
	 *
	 * @returns string
	 */
	public getImageProperty(operation: Operation, content?: any | any[]): string {
		const options = ['avatar', 'image', 'picture', 'pfp']
		if (!operation && !content) return null

		if (operation) {
			let schema

			if (operation.jsonapi) {
				schema = this.schema.getSchema(operation.jsonapi.attributes)
			} else {
				schema = this.schema.getSchema(operation.schema)
			}

			if (!schema?.properties) return null
			const { properties } = schema

			for (const opt of options) {
				if (opt in properties) return opt
			}
		}

		if (!hasValue(content)) return null

		const items = asArray(content)
		for (const item of items) {
			for (const opt of options) {
				if (opt in item) return opt
			}
		}

		return null
	}

	/**
	 * @summary
	 * Use the given Chunk and its linkroute or changeroute to navigate to a
	 * different part of the app and generate new Chunks accordingly.
	 *
	 * @param chunk Chunk to use
	 * @param payload payload to grab the path params from
	 * @param change use the changeroute, even if a linkroute is available
	 * @param back traverse back to previous Chunk if available
	 */
	public chunkNavigation(chunk: Chunk, payload: any, change?: boolean, back?: boolean): void {
		this.openroute.chunkNavigation(chunk, payload, change, back)
	}

	/**
	 * @summary
	 * Change the current view with the given Chunk and update the url
	 * accordingly.
	 *
	 * @param chunk Chunk to change view to
	 */
	public chunkSwitch(chunk: Chunk): void {
		this.openroute.chunkSwitch(chunk)
	}

	/**
	 * @summary
	 * Parse an object or XQuebbleKeys and map them to a DisplayItem array.
	 *
	 * @param parse XQuebbleKeys or Object
	 *
	 * @returns
	 * Array of DisplayItems that can go in to the ngq-item-by-keys
	 */
	public getDisplayItems(parse: any): DisplayItem {
		const item: DisplayItem = {
			type: 'key',
			label: undefined,
			value: undefined,
		}

		if (typeof parse === 'object' && parse !== null && !Array.isArray(parse)) {
			item.type = 'object'
			for (const key in parse) {
				item.label = key
				if (typeof parse[key] === 'string') {
					item.type = 'description'
					item.value = parse[key]
				} else {
					const mapped = this.getDisplayItems(parse[key])
					item.value = mapped
				}
				break
			}
		} else if (Array.isArray(parse)) {
			item.type = 'row'
			item.value = parse.map((initem) => {
				const mapped = this.getDisplayItems(initem)
				if (mapped.type === 'key') {
					return {
						type: 'value',
						value: mapped.value,
						label: mapped.label,
					}
				}
				return mapped
			})
		} else if (typeof parse === 'string') {
			item.type = 'key'
			item.label = parse
			item.value = parse
		}

		return item
	}

	/**
	 * @summary
	 * Parses the current chunk group's chunks, then loops through the chunk's
	 * viewchunks to assign data to each chunk in the list.
	 *
	 * This method is used by all components that require the data from the
	 * chunk stack. The current view's chunk is ignored, since that data is
	 * loaded in the component that determines the current user interface's data
	 * streams.
	 */
	public resolveChunkData(force?: boolean): void {
		this.openroute.resolveChunkData(force)
	}

	/**
	 * @summary
	 * Default getter method for Chunk-based call that is auto-mapped to the
	 * right type of value and sets the data to the chunk. If a match is
	 * supplied to check params agains, the stream is automatically selected
	 * based on cached data in the Chunk.
	 *
	 * @param chunk selected Chunk
	 * @param viewkey optional SchemaType/view key
	 * @param params possible params
	 * @param paramsmatch params to match with
	 * @param force force a call regardless of match
	 *
	 * @returns
	 * Tuple with the stream and the updated params object
	 */
	public resolveChunkOperation(
		chunk: Chunk,
		viewkey?: SchemaType,
		params?: any,
		parammatch?: any,
		force?: boolean,
	): [Observable<any>, Params] {
		return this.openroute.resolveChunkOperation(chunk, viewkey, params, parammatch, force)
	}
}
