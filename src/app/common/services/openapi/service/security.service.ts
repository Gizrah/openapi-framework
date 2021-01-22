import { Injectable } from '@angular/core'
import { ExMap, List } from '@quebble/models'
import { KeycloakService } from 'app/common/classes/keycloak-service.class'
import { from, Observable, of, throwError } from 'rxjs'

import { OAuthFlowObject } from '../interfaces/oauthflow.interface'
import { OpenApiObject } from '../interfaces/openapi.interface'
import { SecuritySchemeObject } from '../interfaces/securityscheme.interface'
import { SecurityScheme, SecuritySchemeType } from '../types/openapi.types'
import { OpenApiCoreService } from './core.service'

@Injectable({
	providedIn: 'root',
})
export class OpenApiSecurityService {
	private _keycloak: KeycloakService = new KeycloakService()
	private _security: Map<
		SecurityScheme,
		[SecuritySchemeType, Map<string, OAuthFlowObject>]
	> = new Map()

	private _skipsec: boolean = false

	constructor(private core: OpenApiCoreService) {}

	get map() {
		return this._security
	}

	public async init(openapi: OpenApiObject, reinit?: boolean, nosec?: boolean): Promise<any> {
		if (!openapi?.components) return Promise.resolve(['Security could not find OpenAPI Spec'])
		if (reinit) this.clear()
		this._skipsec = nosec ?? false

		const errors = []
		const sec = await this.setSecurity(openapi)
		if (!sec) errors.push(`Security could not be set`)

		return Promise.resolve(errors)
	}

	private clear(): void {
		this._security.clear()
	}

	/**
	 * @summary
	 * Checks for the existence of SecurityScheme Objects
	 * Stores it in _security
	 *
	 * @returns Promise
	 */
	private async setSecurity(spec: OpenApiObject): Promise<boolean> {
		if (!spec?.components?.securitySchemes) return Promise.resolve(true)
		if (this._skipsec) return Promise.resolve(true)

		this._security = new Map()

		const { components } = spec ?? {}
		const { securitySchemes } = components ?? {}
		const mapped = new ExMap<string, SecuritySchemeObject>(securitySchemes)
		const flows = new List<string>()

		mapped.forEach((scheme, key) => {
			if ('$ref' in scheme) return

			const flowmap = new ExMap<string, OAuthFlowObject>(scheme.flows)
			const hastype = flowmap.get(this.core.settings.securityFlow)
			if (hastype && scheme.type === this.core.settings.securityType)
				flows.add(hastype.authorizationUrl)

			this._security.set(key, [scheme.type, flowmap])
		})

		let validflow: boolean = true
		let hasflow: boolean = false

		const instanced: boolean = !!this._keycloak.getKeycloakInstance()

		for (const flow of flows) {
			if (instanced) break
			if (!flow) continue

			hasflow = true
			validflow = await this.setKeycloak(flow)
			break
		}

		return Promise.resolve(hasflow ? hasflow && validflow : true)
	}
	/**
	 *
	 * @param url auth flow url
	 *
	 * @returns
	 * Observable with state, which is either true if keycloak is already
	 * set with the same url, or the init was succesful, or false if KC
	 * is borked.
	 */
	private async setKeycloak(url: string): Promise<boolean> {
		const reg = new RegExp(/(\/realms\/)([\S]*)(\/protocol\/)/gim)
		const rx = reg.exec(url) ?? []
		const realmIdx = rx.indexOf('/realms/')
		const protIdx = rx.indexOf('/protocol/')
		const idxOf = realmIdx + 1 === protIdx - 1 ? realmIdx + 1 : null
		const realm = idxOf ? rx[idxOf] : null

		if (!realm) return Promise.resolve(true)
		if (!!this._keycloak.getKeycloakInstance() && this._keycloak.instanceUrl === url)
			return Promise.resolve(true)
		if (!this._keycloak) return Promise.reject(false)

		this._keycloak.instanceUrl = url
		const uri = url.split(reg)
		const configUrl = uri.length ? uri[0] : null

		return this._keycloak.init({
			config: {
				url: configUrl,
				realm,
				clientId: 'yolo-frontend',
			},
			initOptions: {
				onLoad: 'check-sso',
				silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
			},
			enableBearerInterceptor: false,
			loadUserProfileAtStartUp: false,
		})
	}

	/**
	 * @summary
	 * Check the current login status and get the return the KC token
	 * via observable.
	 *
	 * @param scheme requested auth flow
	 *
	 * @returns
	 * Observable with token or empty
	 */
	public authStatus(scheme: OAuthFlowObject): Observable<string> {
		if (!scheme) return of(null)
		if (!this._keycloak?.getKeycloakInstance() && !this._skipsec)
			return throwError({
				message: 'Keycloak is not available',
				in: 'application',
			})

		return new Observable((subscriber) => {
			if (this._skipsec) {
				subscriber.next('SECURITY_SKIPPED_BY_GENERATOR')
			}
			const gettoken = this._keycloak.getToken()

			gettoken
				.then((token) => subscriber.next(token))
				.catch(() =>
					this._keycloak
						.login()
						.then(() => gettoken.then((token) => subscriber.next(token))),
				)
		})
	}

	/**
	 * @summary
	 * Find OAuthFlow by name
	 *
	 * @param name flow name
	 *
	 * @returns
	 * OAuthFlow or nothing
	 */
	public getFlow(name: string): OAuthFlowObject {
		if (!name) return
		if (!this._security.has(name)) return
		const [, map] = this._security.get(name)
		const flow = map.get(this.core.settings.securityFlow)

		return flow
	}

	public getUser(): Promise<Keycloak.KeycloakProfile> {
		if (!this._keycloak?.instanceUrl) return Promise.resolve(null)
		return this._keycloak?.loadUserProfile()
	}

	/**
	 * @summary
	 * Login via keycloak
	 */
	public login(options?: Keycloak.KeycloakLoginOptions): Promise<void> {
		if (!this._keycloak?.instanceUrl) return Promise.resolve(null)
		return this._keycloak?.login(options)
	}

	/**
	 * @summary
	 * Logout from keycloak
	 */
	public logout(): Promise<void> {
		if (!this._keycloak?.instanceUrl) return Promise.resolve()
		return this._keycloak.logout()
	}

	/**
	 * @summary
	 * Check login status in KC via observable
	 */
	public loggedin(): Observable<boolean> {
		if (this._skipsec) return of(true)
		if (!this._security.size) return of(true)
		if (!this._keycloak) return of(false)

		return from(this._keycloak.isLoggedIn())
	}
}
