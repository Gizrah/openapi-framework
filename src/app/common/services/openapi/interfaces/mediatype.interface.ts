import { EncodingObject } from './encoding.interface'
import { ExampleObject } from './example.interface'
import { ReferenceObject } from './reference.interface'
import { SchemaObject } from './schema.interface'

export interface MediaTypeObject {
	schema?: SchemaObject
	example?: any
	examples?: Record<string, ExampleObject | ReferenceObject>
	encoding?: Record<string, EncodingObject>
}
