import { EnumType } from '../types/openapi.types'

export interface ServerVariableObject {
	enum?: EnumType
	default: string
	description?: string
}
