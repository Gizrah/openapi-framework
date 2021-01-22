export interface OAuthFlowObject {
	authorizationUrl: string
	tokenUrl: string
	refreshUrl?: string
	scopes?: Record<string, string>
}
