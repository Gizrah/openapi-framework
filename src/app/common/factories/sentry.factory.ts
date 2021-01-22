import { ErrorHandler, Injectable } from '@angular/core'
import { environment } from '@quebble/environment'
import * as Sentry from '@sentry/browser'

if (environment.production || environment.test) {
	Sentry.init({
		dsn: 'https://09bc905822e04a499c5f5fa679419327@sentry.quebble-dev.io/9',
	})
}

@Injectable()
export class SentryErrorHandler implements ErrorHandler {
	constructor() {}
	public handleError(error) {
		Sentry.captureException(error.originalError || error)
		throw error
	}
}

export function provideErrorHandler() {
	if (environment.production || environment.test) {
		return new SentryErrorHandler()
	} else {
		return new ErrorHandler()
	}
}
