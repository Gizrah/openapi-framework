import { ExMap } from '@quebble/models'

import { IPropDef } from '../interfaces/prop-def.interface'
import { XQuebbleRole, XQuebbleType } from '../interfaces/x-quebble.interface'

export type OperationType =
	| 'post'
	| 'put'
	| 'get'
	| 'delete'
	| 'options'
	| 'head'
	| 'patch'
	| 'trace'

export const OperationTypes = ['post', 'put', 'get', 'delete', 'options', 'head', 'patch', 'trace']

export type SchemaType = 'integer' | 'number' | 'string' | 'boolean' | 'array' | 'object' | 'header'

export type WidgetType = 'keyvalue' | 'address' | 'avatar' | 'image' | 'description'

export const WidgetTypes = ['keyvalue', 'address', 'avatar', 'image', 'description']

export type DataFormatType =
	| 'int32'
	| 'int64'
	| 'float'
	| 'double'
	| 'string'
	| 'byte'
	| 'binary'
	| 'boolean'
	| 'date'
	| 'date-time'
	| 'password'
	| 'email'
	| 'textarea'
	| 'uuid'
	| 'uri'
	| 'multiline'

export type StyleType =
	| 'matrix'
	| 'label'
	| 'form'
	| 'simple'
	| 'spaceDelimited'
	| 'pipeDelimited'
	| 'deepObject'

export type EnumType = string[] | number[]
export type SecuritySchemeType = 'apiKey' | 'http' | 'oauth2' | 'openIdConnect'

export type ParameterIn = 'path' | 'query' | 'header' | 'cookie'

export type ResponseCode = '200' | '201' | '400' | '401' | '404' | '422'

export type OperationId = string
export type SchemaName = string

export type PathParameter = string
export type SecurityScheme = string

export interface ObjectDef {
	key: string
	title?: string
	refs: IPropDef[]
	data: any
	subject?: string
	info?: string
}
export interface SchemaRef {
	prefix: string
	propDefs: IPropDef[]
	refs: SchemaName[]
}

export interface JsonApiOperation {
	response: SchemaName
	resource: SchemaName
	attributes: SchemaName
	dataType: SchemaType
}

export type Path = string
export type SubPath = string

export type RouteItem = any
export type Route = RouteItem[]
export type ViewType = 'tiles' | 'details' | 'person' | 'list'

export interface NestedView {
	id?: OperationId
	property: string
	role: XQuebbleRole
	type: XQuebbleType
	view: SchemaType
}

export type ViewTypeMap = Map<SchemaType, XQuebbleType[]>
export type ViewMap = ExMap<SchemaType[] | string[], ViewTypeMap>

export type ServerTag = string
export type RequiresLogin = boolean

export type PathMenuItem = [ServerTag | ServerTag[], OperationId, RequiresLogin, PathMenuItem[]?]
