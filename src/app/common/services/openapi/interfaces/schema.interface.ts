import { DataFormatType, EnumType, SchemaType } from '../types/openapi.types'
import { DiscriminatorObject } from './discriminator.interface'
import { ExternalDocumentObject } from './externaldocument.interface'
import { XmlObject } from './xml.interface'

export interface SchemaObject {
	title?: string
	multipleOf?: any
	maximum?: number
	exclusiveMaximum?: any
	minimum?: number
	exclusiveMinimum?: any
	maxLength?: number
	minLength?: number
	pattern?: string | string[]
	maxItems?: number
	minItems?: number
	uniqueItems?: number | string[]
	maxProperties?: number
	minProperties?: number
	required?: boolean | string[]
	enum?: EnumType
	type?: SchemaType

	allOf?: SchemaObject[]
	oneOf?: SchemaObject[]
	anyOf?: SchemaObject[]
	not?: SchemaObject

	discriminator?: DiscriminatorObject

	items?: SchemaObject
	properties?: Record<string, SchemaObject>
	additionalProperties?: boolean | SchemaObject | SchemaObject[] | Record<string, any>
	description?: string
	format?: DataFormatType
	default?: any
	nullable?: boolean | string[]
	readOnly?: boolean
	writeOnly?: boolean
	xml?: XmlObject
	externalDocs?: ExternalDocumentObject
	example?: any
	deprecated?: boolean | string[]

	$ref?: string
}
