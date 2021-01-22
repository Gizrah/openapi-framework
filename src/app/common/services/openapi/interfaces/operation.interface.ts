import { OperationId } from '../types/openapi.types'
import { CallbackObject } from './callback.interface'
import { ExternalDocumentObject } from './externaldocument.interface'
import { ParameterObject } from './parameter.interface'
import { ReferenceObject } from './reference.interface'
import { RequestBodyObject } from './requestbody.interface'
import { ResponsesObject } from './responses.interface'
import { SecurityRequirementObject } from './securityrequirement.interface'
import { ServerObject } from './server.interface'

export interface OperationObject {
	tags?: string[]
	summary?: string
	description?: string
	externalDocs?: ExternalDocumentObject
	operationId?: OperationId
	parameters?: ParameterObject[] | ReferenceObject[]
	requestBody?: RequestBodyObject | ReferenceObject
	responses?: ResponsesObject
	callbacks?: CallbackObject
	deprecated?: boolean
	security?: SecurityRequirementObject[]
	servers?: ServerObject[]

	path?: string
}
