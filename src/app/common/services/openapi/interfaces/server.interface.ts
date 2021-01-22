import { ServerVariableObject } from './servervariable.interface'

export interface ServerObject {
	url: string
	description?: string
	variables?: Record<string, ServerVariableObject>
}
