import { HttpClient } from '@angular/common/http'

import { NgqWebServiceConfig, WEB_SERVICE_SETTINGS, WebService } from '../services/web/web.service'

export const WebServiceConfigProvider = {
	provide: WEB_SERVICE_SETTINGS,
	useValue: {
		prefix: '/core/api/',
	} as NgqWebServiceConfig,
	multi: false,
}

export const WebServiceProvider = {
	provide: WebService,
	useFactory: (http: HttpClient, settings: NgqWebServiceConfig) => new WebService(http, settings),
	deps: [HttpClient, WEB_SERVICE_SETTINGS],
	multi: false,
}
