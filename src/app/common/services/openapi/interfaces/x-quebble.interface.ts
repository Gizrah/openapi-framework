import { OperationId, SchemaName } from '../types/openapi.types'

export type XQuebbleItem = 'display' | 'link' | 'input' | 'params' | 'enum'
export type XQuebbleRole =
	| 'list'
	| 'grouping'
	| 'search'
	| 'pagination'
	| 'filter'
	| 'search'
	| 'union'
export type XQuebbleType =
	| 'any'
	| 'tree'
	| 'tiles'
	| 'offset'
	| 'input'
	| 'limit'
	| 'hidden'
	| 'textarea'
	| 'select'
	| 'datetime'
	| 'avatar'
	| 'address'
	| 'radio'
	| 'ignore'
	| 'header'

export type XQuebble = Partial<Record<XQuebbleItem, IXQuebbleContent>>

type LabelValues = Record<string, string[] | LabelValues[]>
type XQuebbleKey = string | LabelValues
export type XQuebbleKeys = XQuebbleKey[]
export type XQuebbleContent = IXQuebbleContent

export interface IXQuebbleContent {
	role?: XQuebbleRole
	type?: XQuebbleType
	for?: string
	size?: 'XS' | 'S' | 'M' | 'L' | 'XL'

	label?: string
	value?: string
	keys?: XQuebbleKeys

	properties?: string[]
	schema?: SchemaName
	operationId?: OperationId
	params?: XQuebbleContent[]

	default?: number
	wildcard?: boolean
}
