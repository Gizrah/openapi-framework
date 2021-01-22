import { OpenApiChunkService } from '../services/openapi/service/chunk.service'
import {
	NgqOpenApiSettings,
	OPEN_API_SETTINGS,
	OpenApiCoreService,
} from '../services/openapi/service/core.service'
import { OpenApiFormlyService } from '../services/openapi/service/formly.service'
import { OpenApiService } from '../services/openapi/service/openapi.service'
import { OpenApiOperationService } from '../services/openapi/service/operation.service'
import { OpenApiPaginationService } from '../services/openapi/service/pagination.service'
import { OpenApiPathService } from '../services/openapi/service/path.service'
import { OpenApiRouteService } from '../services/openapi/service/route.service'
import { OpenApiSchemaService } from '../services/openapi/service/schema.service'
import { OpenApiSecurityService } from '../services/openapi/service/security.service'
import { OpenApiWebService } from '../services/openapi/service/web.service'
import { WebService } from '../services/web/web.service'

function OpenApiInitializer(web: WebService, settings: NgqOpenApiSettings): OpenApiCoreService {
	return new OpenApiCoreService(web, settings)
}

const settings: NgqOpenApiSettings = {
	apiStorageKey: 'oa|',
	apiPrefix: '/core/api/',
	apiJsonUrl: '/core/openapi.json',
	securityName: 'OAuth2AuthorizationCodeBearer',
	securityType: 'oauth2',
	securityFlow: 'authorizationCode',
	customPrefix: 'x-quebble',
	linkProp: 'link',
}

const OpenApiSetupProvider = {
	provide: OPEN_API_SETTINGS,
	useValue: settings,
	multi: false,
}

const OpenApiProvider = {
	provide: OpenApiCoreService,
	useFactory: OpenApiInitializer,
	deps: [WebService, OPEN_API_SETTINGS],
	multi: false,
}

export const OpenApiFactory = [
	OpenApiSetupProvider,
	OpenApiProvider,

	OpenApiSecurityService,
	OpenApiSchemaService,
	OpenApiPathService,
	OpenApiOperationService,
	OpenApiChunkService,
	OpenApiWebService,
	OpenApiPaginationService,
	OpenApiFormlyService,
	OpenApiRouteService,
	OpenApiService,
]
