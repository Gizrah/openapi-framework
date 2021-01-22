import { OAuthFlowObject } from './oauthflow.interface'

export interface OAuthFlowsObject {
	implicit?: OAuthFlowObject
	password?: OAuthFlowObject
	clientCredentials?: OAuthFlowObject
	authorizationCode?: OAuthFlowObject
}
