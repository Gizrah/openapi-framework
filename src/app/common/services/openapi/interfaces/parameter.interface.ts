import { ParameterIn, StyleType } from '../types/openapi.types'
import { ExampleObject } from './example.interface'
import { ReferenceObject } from './reference.interface'
import { SchemaObject } from './schema.interface'

export interface ParameterObject {
	name: string
	in: ParameterIn
	description?: string
	required?: boolean
	deprecated?: boolean
	allowEmptyValue?: boolean
	style?: StyleType
	explode?: boolean
	allowReserved?: boolean
	schema?: SchemaObject
	example?: any
	examples?: Record<string, ExampleObject | ReferenceObject>
}
