import { HttpClient, HttpEvent, HttpHeaders, HttpParams, HttpRequest } from '@angular/common/http'
import { Inject, Injectable, InjectionToken } from '@angular/core'
import { Params } from '@angular/router'
import { environment } from '@quebble/environment'
import { Observable } from 'rxjs'

import { HttpMethod } from '../interceptor/model/httpmethod.enum'

export const WEB_SERVICE_SETTINGS = new InjectionToken<NgqWebServiceConfig>('WebService')

/**
 *
 * @param headers: key/value pairs in object: { 'key': 'value', 'key': 'value', ...}
 * @param params: key/value pairs in object: { 'key': 'value', 'key': 'value', ...}
 * @param observe: true: returns full xhr response object, default false returns just the parsed body
 * @param responseType: string, response type headers like 'json', 'text/plain', etc.
 * @param rootUrl: change the rootUrl for this call
 */
export interface IWebOptions {
	headers?: Params
	params?: Params
	observe?: boolean
	progress?: boolean
	responseType?: 'arraybuffer' | 'blob' | 'json' | 'text'
	rootUrl?: string
	noPrefix?: boolean
}

export interface NgqWebServiceConfig {
	prefix: string
	headers?: Params
	params?: Params
}

export default function to(promise) {
	return promise
		.then((data) => {
			return [null, data]
		})
		.catch((err) => [err])
}

@Injectable({
	providedIn: 'root',
})
export class WebService {
	private _config: NgqWebServiceConfig = {
		prefix: '/api/',
	}

	constructor(
		private http: HttpClient,
		@Inject(WEB_SERVICE_SETTINGS) private config: NgqWebServiceConfig,
	) {
		if (this.config) this._config = this.config
	}

	public request<T>(
		url: string | any[],
		type: HttpMethod,
		payload?: T,
		options?: IWebOptions,
	): Observable<HttpEvent<any>> {
		let request
		const method = type.toUpperCase() as any
		const joined = this.joinUrl(url, options)
		const init = {
			headers: this.makeHeaders(type, options),
			params: this.makeParams(options),
			reportProgress: options?.progress ?? false,
			responseType: options?.responseType ?? 'json',
			observe: options?.observe ? 'response' : 'body',
		}

		switch (type) {
			case 'get':
			case 'delete':
			case 'head':
			case 'jsonp':
			case 'options':
				request = new HttpRequest(method, joined, init)
			case 'post':
			case 'put':
			case 'patch':
				request = new HttpRequest(method, joined, payload, init)
		}

		return this.http.request(request)
	}

	/**
	 *
	 * @param url The url either as a string, or as an array, with extra options: [ 'http', 'https://your-url.com/' ] will link to a website. Using [ '..', 'what', 'ever' ] allows you to bypass the prefix ('/api/v1')
	 * @param options: IWebOptions type, expects:
	 * ```
	 * headers: key/value pairs for Headers as object: { 'Authorization': 'Token ASDFASDFAFDS', 'Accepts': 'text/plain', ...}
	 * params: key/value pairs for Params as object: { 'search': 'search%20term', 'key': 'value', ...}
	 * observe: true: returns full xhr response object, default false returns just the parsed body
	 * responseType: string, response type headers like 'json', 'text/plain', etc.
	 * ```
	 * @returns Observable<Type> or (if observe is set), Observable<HttpEvent<Type>>
	 */
	public get<T>(
		url: string | any[],
		options?: IWebOptions,
	): Observable<T> | Observable<HttpEvent<T>> {
		return this.http.get<T>(this.joinUrl(url, options), {
			headers: this.makeHeaders('get', options),
			params: this.makeParams(options),
			observe: this.observeType(options) as any,
			responseType: this.responseType(options) as any,
		})
	}

	/**
	 *
	 * @param url The url either as a string, or as an array, with extra options: [ 'http', 'https://your-url.com/' ] will link to a website. Using [ '..', 'what', 'ever' ] allows you to bypass the prefix ('/api/v1')
	 * @param payload any non-stringified object
	 * @param options: IWebOptions type, expects:
	 * ```
	 * headers: key/value pairs for Headers as object: { 'Authorization': 'Token ASDFASDFAFDS', 'Accepts': 'text/plain', ...}
	 * params: key/value pairs for Params as object: { 'search': 'search%20term', 'key': 'value', ...}
	 * observe: true: returns full xhr response object, default false returns just the parsed body
	 * responseType: string, response type headers like 'json', 'text/plain', etc.
	 * ```
	 * @returns Observable<Type> or (if observe is set), Observable<HttpEvent<Type>>
	 */
	public post<T>(
		url: string | any[],
		payload: any,
		options?: IWebOptions,
	): Observable<T> | Observable<HttpEvent<T>> {
		return this.http.post<T>(this.joinUrl(url, options), payload, {
			headers: this.makeHeaders('post', options),
			params: this.makeParams(options),
			observe: this.observeType(options) as any,
			responseType: this.responseType(options) as any,
		})
		// return this.request<T>(url, HttpMethod.POST, payload, options)
	}

	/**
	 *
	 * @param url The url either as a string, or as an array, with extra options: [ 'http', 'https://your-url.com/' ] will link to a website. Using [ '..', 'what', 'ever' ] allows you to bypass the prefix ('/api/v1')
	 * @param payload any non-stringified object
	 * @param options: IWebOptions type, expects:
	 * ```
	 * headers: key/value pairs for Headers as object: { 'Authorization': 'Token ASDFASDFAFDS', 'Accepts': 'text/plain', ...}
	 * params: key/value pairs for Params as object: { 'search': 'search%20term', 'key': 'value', ...}
	 * observe: true: returns full xhr response object, default false returns just the parsed body
	 * responseType: string, response type headers like 'json', 'text/plain', etc.
	 * ```
	 * @returns Observable<Type> or (if observe is set), Observable<HttpEvent<Type>>
	 */
	public put<T>(
		url: string | any[],
		payload: any,
		options?: IWebOptions,
	): Observable<T> | Observable<HttpEvent<T>> {
		return this.http.put<T>(this.joinUrl(url, options), payload, {
			headers: this.makeHeaders('put', options),
			params: this.makeParams(options),
			observe: this.observeType(options) as any,
			responseType: this.responseType(options) as any,
		})
	}

	/**
	 *
	 * @param url The url either as a string, or as an array, with extra options: [ 'http', 'https://your-url.com/' ] will link to a website. Using [ '..', 'what', 'ever' ] allows you to bypass the prefix ('/api/v1')
	 * @param payload any non-stringified object
	 * @param options: IWebOptions type, expects:
	 * ```
	 * headers: key/value pairs for Headers as object: { 'Authorization': 'Token ASDFASDFAFDS', 'Accepts': 'text/plain', ...}
	 * params: key/value pairs for Params as object: { 'search': 'search%20term', 'key': 'value', ...}
	 * observe: true: returns full xhr response object, default false returns just the parsed body
	 * responseType: string, response type headers like 'json', 'text/plain', etc.
	 * ```
	 * @returns Observable<Type> or (if observe is set), Observable<HttpEvent<Type>>
	 */
	public patch<T>(
		url: string | any[],
		payload: any,
		options?: IWebOptions,
	): Observable<T> | Observable<HttpEvent<T>> {
		return this.http.patch<T>(this.joinUrl(url, options), payload, {
			headers: this.makeHeaders('patch', options),
			params: this.makeParams(options),
			observe: this.observeType(options) as any,
			responseType: this.responseType(options) as any,
		})
	}

	/**
	 *
	 * @param url The url either as a string, or as an array, with extra options: [ 'http', 'https://your-url.com/' ] will link to a website. Using [ '..', 'what', 'ever' ] allows you to bypass the prefix ('/api/v1')
	 * @param options: IWebOptions type, expects:
	 * ```
	 * headers: key/value pairs for Headers as object: { 'Authorization': 'Token ASDFASDFAFDS', 'Accepts': 'text/plain', ...}
	 * params: key/value pairs for Params as object: { 'search': 'search%20term', 'key': 'value', ...}
	 * observe: true: returns full xhr response object, default false returns just the parsed body
	 * responseType: string, response type headers like 'json', 'text/plain', etc.
	 * ```
	 * @returns Observable<any> or (if observe is set), Observable<HttpEvent<any>>
	 */
	public delete(
		url: string | any[],
		options?: IWebOptions,
	): Observable<any> | Observable<HttpEvent<any>> {
		// Hack to make it "work" locally. Sometimes.
		if (!environment.production && !environment.test) {
			options.progress = false
			options.observe = true
			return this.request(url, HttpMethod.DELETE, null, options)
		}

		return this.http.delete(this.joinUrl(url, options), {
			headers: this.makeHeaders('delete', options),
			params: this.makeParams(options),
			observe: this.observeType(options) as any,
			responseType: this.responseType(options) as any,
			reportProgress: true,
		})
	}

	/**
	 *
	 * @param url The url either as a string, or as an array, with extra options: [ 'http', 'https://your-url.com/' ] will link to a website. Using [ '..', 'what', 'ever' ] allows you to bypass the prefix ('/api/v1')
	 * @param options: IWebOptions type, expects:
	 * ```
	 * headers: key/value pairs for Headers as object: { 'Authorization': 'Token ASDFASDFAFDS', 'Accepts': 'text/plain', ...}
	 * params: key/value pairs for Params as object: { 'search': 'search%20term', 'key': 'value', ...}
	 * observe: true: returns full xhr response object, default false returns just the parsed body
	 * responseType: string, response type headers like 'json', 'text/plain', etc.
	 * ```
	 * @returns Observable<any> or (if observe is set), Observable<HttpEvent<any>>
	 */
	public head(
		url: string | any[],
		options: IWebOptions = {
			observe: true,
		},
	): Observable<HttpEvent<any>> {
		const opts = options

		return this.http.head(this.joinUrl(url, opts), {
			headers: this.makeHeaders('head', opts),
			params: this.makeParams(opts),
			observe: 'response',
			reportProgress: true,
			responseType: this.responseType(opts) as any,
		}) as Observable<HttpEvent<any>>
	}

	private observeType(options: IWebOptions): string {
		return options && options.observe === true ? 'response' : 'body'
	}

	private responseType(options: IWebOptions): string {
		return options && options.responseType ? options.responseType : 'json'
	}

	private makeHeaders(type: string, options: IWebOptions): HttpHeaders {
		if (!options || !options.headers) return new HttpHeaders()
		let httpHeaders = new HttpHeaders()
		httpHeaders = this.customSettings(httpHeaders, options.headers) as HttpHeaders

		switch (type) {
			case 'get':
			case 'head':
				httpHeaders = httpHeaders.set('Accept', 'application/json')
				break
			case 'post':
			case 'put':
			case 'patch':
				httpHeaders = httpHeaders.set('Content-Type', 'application/json')
				httpHeaders = httpHeaders.set('Accept', 'application/json')
				break
			case 'delete':
				httpHeaders = httpHeaders.set('Content-Type', 'application/json')
				break
		}

		return httpHeaders
	}

	private makeParams(options: IWebOptions): HttpParams {
		return options && options.params
			? (this.customSettings(new HttpParams(), options.params) as HttpParams)
			: new HttpParams()
	}

	private customSettings(
		toSet: HttpHeaders | HttpParams,
		custom: Params,
	): HttpHeaders | HttpParams {
		if (!custom) return toSet

		if (toSet instanceof HttpHeaders) {
			for (const key in custom) {
				toSet = toSet.set(key, custom[key])
			}
		}
		if (toSet instanceof HttpParams) {
			for (const key in custom) {
				toSet = toSet.set(key, custom[key])
			}
		}

		return toSet
	}

	private joinUrl(url: any, options?: IWebOptions): string {
		// Checks if a prefix should be set before the url
		// first from options, or if noPrefix is set none,
		// defaults to settings prefix
		const root =
			options && !options.noPrefix && options.rootUrl
				? options.rootUrl
				: options && options.noPrefix
				? ''
				: this._config.prefix

		if (Array.isArray(url)) {
			if (url[0] === '..') {
				url.shift()
				return url.join('/')
			} else if (url[0] === 'http') {
				url.shift()
				return url.join('/')
			} else return root + url.join('/')
		}

		return root + url
	}
}
