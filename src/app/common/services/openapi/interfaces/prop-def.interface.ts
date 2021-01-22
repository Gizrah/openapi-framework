import { OperationId, SchemaName, SchemaType, WidgetType } from '../types/openapi.types'

export interface IPropDef {
	prop: string
	type: SchemaType | WidgetType

	subject?: string
	info?: string

	ref?: boolean
	id?: OperationId

	schema?: SchemaName
	prefix?: string
	tlstring?: string
}
