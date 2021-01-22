import { SchemaObject } from './schema.interface'

export namespace JsonApi {
	export interface Base {
		meta?: Meta
		links?: Links
	}

	export interface Data extends Base {
		data: ResourceObject | ResourceObject[] | null
	}

	export interface JsonApi extends Data {
		jsonapi?: Record<string, any>
		included?: ResourceObject[]
	}

	export type Meta = Record<string, any>
	export interface LinkMeta {
		href: string
		meta?: Record<string, any>
	}
	export type Link = string | LinkMeta

	export interface Links {
		self?: Link
		next?: Link
		previous?: Link
		last?: Link
		related?: Link
		collection?: Link[]
	}

	export interface ResourceObject extends Base {
		id?: string
		type: string
		attributes?: Attribute
		relations?: Record<string, Data>
	}

	export type Attribute = Record<string, any>

	export const MediaType = 'application/vnd.api+json'

	export interface BaseSchema {
		meta?: SchemaObject
		links?: SchemaObject
	}

	export interface DataSchema extends BaseSchema {
		data?: SchemaObject
	}

	export interface ResourceSchema extends BaseSchema {
		attributes?: SchemaObject
		relations?: SchemaObject
		description?: string
		type: string
		id?: string
	}
}
