import { ResponseCode } from '../types/openapi.types'
import { CallbackObject } from './callback.interface'
import { ExampleObject } from './example.interface'
import { HeaderObject } from './header.interface'
import { LinkObject } from './link.interface'
import { ParameterObject } from './parameter.interface'
import { ReferenceObject } from './reference.interface'
import { RequestBodyObject } from './requestbody.interface'
import { ResponseObject } from './response.interface'
import { SchemaObject } from './schema.interface'
import { SecuritySchemeObject } from './securityscheme.interface'

export interface ComponentObject {
	schemas?: Record<string, SchemaObject>
	responses?: Record<ResponseCode, ResponseObject | ReferenceObject>
	parameters?: Record<string, ParameterObject | ReferenceObject>
	examples?: Record<string, ExampleObject | ReferenceObject>
	requestBodies?: Record<string, RequestBodyObject | ReferenceObject>
	headers?: Record<string, HeaderObject | ReferenceObject>
	securitySchemes?: Record<string, SecuritySchemeObject | ReferenceObject>
	links?: Record<string, LinkObject | ReferenceObject>
	callbacks?: Record<string, CallbackObject | ReferenceObject>
}
