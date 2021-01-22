import {
	HTTP_INTERCEPTORS,
	HttpErrorResponse,
	HttpEvent,
	HttpHandler,
	HttpInterceptor,
	HttpRequest,
} from '@angular/common/http'
import { ExistingProvider, Injectable } from '@angular/core'
import { ActivationEnd, Router } from '@angular/router'
import { isGuid } from '@quebble/scripts'
import { Observable, OperatorFunction, pipe, throwError } from 'rxjs'
import { catchError, filter, takeUntil } from 'rxjs/operators'

import { OperationType } from '../../openapi/types/openapi.types'
import { WebCancelService } from '../../web-cancel/web-cancel.service'
import { HttpError } from '../model/httperror.model'

@Injectable({
	providedIn: 'root',
})
export class InterceptorService implements HttpInterceptor {
	private _jsonrx: RegExp = new RegExp(/((core|assets)(\/[\S]*\/)*[\S]*\.json)|(\/api-json)/gi)

	constructor(private cancel: WebCancelService, private router: Router) {
		this.watch()
	}

	private watch(): void {
		this.router.events
			.pipe(filter((event) => event instanceof ActivationEnd))
			.subscribe(() => this.cancel.cancel())
	}

	public intercept<T>(request: HttpRequest<T>, next: HttpHandler): Observable<HttpEvent<T>> {
		const pipeList: OperatorFunction<HttpEvent<any>, HttpEvent<T>>[] = [
			takeUntil(this.cancel.watch()),
			catchError((error: HttpErrorResponse) => {
				const httperror = new HttpError()
				httperror.method = request.method.toLowerCase() as OperationType
				httperror.error = error
				httperror.url = request.url

				return throwError(httperror)
			}),
		]

		const matchjson = request.url.match(this._jsonrx)
		if (matchjson) pipeList.splice(0, 1)

		const pipes = pipe.apply(null, pipeList) // eslint-disable-line
		return next.handle(request).pipe(pipes)
	}

	private extractUrl(fullUrl: string): string {
		if (fullUrl.includes('i18n')) return
		let url = this.stripGuid(fullUrl)
			.filter((urlPart) => urlPart !== 'core' && urlPart !== 'api')
			.join('/')

		url = url.replace(/\/$/, '').replace(/^\//, '')

		return url
	}

	private stripGuid(link: string): string[] {
		const urls = link.split('/')
		return urls.filter((url) => !isGuid(url))
	}
}

export const AppHttpInterceptor: ExistingProvider[] = [
	{
		provide: HTTP_INTERCEPTORS,
		useExisting: InterceptorService,
		multi: true,
	},
]
