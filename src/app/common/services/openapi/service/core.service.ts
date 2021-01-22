import { HttpResponse } from '@angular/common/http'
import { Inject, Injectable, InjectionToken } from '@angular/core'
import { environment } from '@quebble/environment'
import { asArray, dolog, hasValue } from '@quebble/scripts'
import { DateTime } from 'luxon'
import { FrankenJson } from 'test/franken.json'
import { openApiJson } from 'test/openapi.json'

import { HttpError } from '../../interceptor/model/httperror.model'
import { WebService } from '../../web/web.service'
import { OpenApiObject } from '../interfaces/openapi.interface'
import { SchemaObject } from '../interfaces/schema.interface'

/**
 * Service settings
 */
export interface NgqOpenApiSettings {
	// Storage key prefix
	apiStorageKey: string
	// Direct json url
	apiJsonUrl: string
	// Prefix for all calls
	apiPrefix: string
	// Security scheme default
	securityName: string
	// Security scheme typ
	securityType: string
	// Security flow default
	securityFlow: string
	// What is the default `x-...` name to prepend
	// before all other custom properties
	customPrefix: string
	// Property to look for in Schema Objects that links
	// properties to other operations
	linkProp?: string
}

/**
 * Injection token for the settings, so it can be injected in
 * the service
 */
export const OPEN_API_SETTINGS = new InjectionToken<NgqOpenApiSettings>('OpenApiSettings')

@Injectable({
	providedIn: 'root',
})
export class OpenApiCoreService {
	/**
	 * Last update timestamp
	 */
	private _lastupdate: string

	/**
	 * _openapi
	 * The entire parsed JSON
	 */
	public _openapi: OpenApiObject

	/**
	 * _settings
	 * Default settings, overwritten by the Inject in the constructor if
	 * applicable -- in case we open source this
	 */
	private _settings: NgqOpenApiSettings = {
		apiStorageKey: 'oa|',
		apiJsonUrl: 'openapi.json',
		apiPrefix: '/core/api/',
		securityName: 'default_auth',
		securityType: 'oauth2',
		securityFlow: 'authorizationCode',
		customPrefix: 'x-quebble',
		linkProp: 'link',
	}

	/**
	 * _storage
	 * Different stored items, for now just the json.
	 * Combined with the apiStorageKey.
	 */
	public _storage = {
		json: 'oa|json',
		headers: 'oa|headers',
	}

	constructor(
		private web: WebService,
		@Inject(OPEN_API_SETTINGS) private __settings: NgqOpenApiSettings,
	) {
		if (this.__settings) this._settings = this.__settings
		const options = ['json', 'headers']
		options.forEach((item) => {
			this._storage[item] = this._settings.apiStorageKey + item
		})
	}

	/**
	 * @returns current settings
	 */
	get settings(): NgqOpenApiSettings {
		return this._settings
	}

	/**
	 * @returns latest update timestamp
	 */
	get head(): string {
		return this._lastupdate
	}

	/**
	 * @summary
	 * Simple async init that returns the JSON spec if found or null
	 */
	public async init(withspec?: OpenApiObject): Promise<OpenApiObject> {
		const custom = true
		const specs: OpenApiObject = custom
			? FrankenJson ?? openApiJson
			: // ? openApiJson ?? FrankenJson
			  withspec ?? (await this.getOpenApiJson())
		this._openapi = specs ?? ({} as any)
		this._lastupdate = DateTime.utc().toString()

		return Promise.resolve(specs ?? null)
	}

	/**
	 * Promise-based getter for a list of JSON files
	 */
	private async getOpenApiJson(): Promise<any> {
		const urls =
			!environment.production && !environment.test && !environment.dev
				? [this._settings.apiJsonUrl, 'person/api-json']
				: [this._settings.apiJsonUrl]
		const logs = ['Core', 'Person']
		const promisemapper = (): Promise<OpenApiObject>[] => {
			return urls.map((url, index) => {
				const call = this.web.get(['http', url], { observe: true, responseType: 'text' })
				return call
					.toPromise()
					.then((result: HttpResponse<any>) => {
						try {
							const parsed = JSON.parse(result?.body)
							if (parsed) dolog('info', logs[index], 'OpenAPI JSON retrieved')
							return Promise.resolve(parsed)
						} catch (error) {
							dolog('error', `${logs[index]} OpenAPI JSON file not valid`)
							return Promise.resolve({ status: 'json-invalid' })
						}
					})
					.catch((err: HttpError) => {
						dolog('error', `${logs[index]} OpenAPI JSON file not found`)
						return Promise.resolve({ status: 'json-error' })
					}) as Promise<OpenApiObject>
			})
		}

		const results: OpenApiObject[] = await Promise.all(promisemapper())
		const spec = this.joinSpecs(...results.filter((a) => !!a))
		return Promise.resolve(spec)
	}

	private joinSpecs(...specs: OpenApiObject[]): OpenApiObject {
		if (!hasValue(specs)) return null
		const initial: OpenApiObject = specs[0] ?? ({} as any)
		if (specs.length === 1) return initial

		const paths = initial?.paths ?? {}
		const tags = initial?.tags ?? []
		const servers = initial?.servers ?? []
		const components = initial?.components ?? {}
		const schemas = components?.schemas ?? {}
		const security = components?.securitySchemes ?? {}

		specs.slice(1).forEach((spec) => {
			if (!spec) return
			const addserver = () => {
				const server = [spec?.servers[0]]
				for (const pathsobj in spec?.paths) {
					const path = spec?.paths[pathsobj]
					if (!path?.servers && server) path.servers = server
				}
			}

			addserver()

			initial.paths = { ...paths, ...(spec?.paths ?? {}) }
			initial.tags = [...tags, ...asArray(spec?.tags)]
			initial.servers = [...servers, ...asArray(spec?.servers)]
			initial.components.schemas = { ...schemas, ...(spec?.components?.schemas ?? {}) }
			initial.components.securitySchemes = {
				...security,
				...(spec?.components?.securitySchemes ?? {}),
			}
		})

		return initial
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
		const prefix = schema[this._settings.customPrefix]
		if (prefix) return prefix['params']

		return prefix
	}

	/**
	 * @summary
	 * Map the response code to something readable and useable
	 *
	 * @param response response code
	 *
	 * @returns
	 * Simple operationtypes or the original code
	 */
	public codeToOperation(response: string): string {
		const code = parseInt(response)
		switch (code) {
			case 200:
				return 'get'
			case 201:
				return 'post'
			default:
				return response
		}
	}
}
