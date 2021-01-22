import { SecuritySchemeType } from '../types/openapi.types'
import { OAuthFlowsObject } from './oauthflows.interface'

export interface SecuritySchemeObject {
	type: SecuritySchemeType
	description?: string
	name?: string
	in?: string
	scheme?: string
	bearerFormat?: string
	flows?: OAuthFlowsObject
	openIdConnectUrl?: string
}
