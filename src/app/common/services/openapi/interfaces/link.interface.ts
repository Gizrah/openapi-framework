import { ParameterObject } from './parameter.interface'
import { RequestBodyObject } from './requestbody.interface'
import { ServerObject } from './server.interface'

export interface LinkObject {
	operationRef?: string
	operationId?: string
	parameters?: Record<string, ParameterObject>
	requestBody?: Record<string, RequestBodyObject>
	description?: string
	server?: ServerObject
}
