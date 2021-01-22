import { ExMap, List } from '@quebble/models'

import { OperationObject } from '../interfaces/operation.interface'
import { ParameterObject } from '../interfaces/parameter.interface'
import { SchemaObject } from '../interfaces/schema.interface'
import {
	JsonApiOperation,
	OperationId,
	OperationType,
	SchemaName,
	SchemaType,
	SecurityScheme,
} from '../types/openapi.types'

export class Operation {
	public id: OperationId
	public type: OperationType
	public path: string
	public route: string[] = []

	public security: SecurityScheme

	public schema: SchemaName
	public schemas: ExMap<string | number, SchemaObject> = new ExMap()

	public jsonapi: JsonApiOperation

	public params: List<ParameterObject> = new List()

	public view: SchemaType
	public subject: string
	public info: string
	public prefix: string

	// public propDefs: IPropDef[] = []
	// public schemaRefs: ExMap<SchemaName, SchemaRef> = new ExMap()

	// List of nested operations
	// public nested: List<NestedView> = new List()
	/**
	 * If there's a parent operation where this one's
	 * nested in, the operationId is set.
	 */
	public parent: OperationId
	// public refs: ExMap<string, SchemaObject> = new ExMap()
	/**
	 * anyOf, allOf, oneOf
	 * [201]:
	 * 	['anyOf', 'array', 'integer']
	 * 	['anyOf', 'object', schemaObject]
	 */
	// public multi: Map<
	// 	OperationType | number,
	// 	List<[string, SchemaType, SchemaType | SchemaObject]>
	// > = new Map()

	/**
	 * If there are multiple options for a call
	 * with either post or patch models they are
	 * stored as [propname]: [patch|post]: [schemaname]
	 */
	// public differ: Map<string, Map<OperationType, string>> = new Map()

	constructor(operation?: OperationObject) {
		if (!operation) return

		this.params = new List(operation.parameters)
	}
}
