import { OperationObject } from './operation.interface'
import { ParameterObject } from './parameter.interface'
import { ReferenceObject } from './reference.interface'
import { ServerObject } from './server.interface'

export interface PathItemObject extends ReferenceObject {
	summary?: string
	description?: string
	get?: OperationObject
	put?: OperationObject
	post?: OperationObject
	delete?: OperationObject
	options?: OperationObject
	head?: OperationObject
	patch?: OperationObject
	trace?: OperationObject
	servers?: ServerObject[]
	parameters?: ParameterObject[] | ReferenceObject[]
}
