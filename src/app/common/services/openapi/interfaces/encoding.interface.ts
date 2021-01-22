import { StyleType } from '../types/openapi.types'
import { HeaderObject } from './header.interface'
import { ReferenceObject } from './reference.interface'

export interface EncodingObject {
	contentType?: string
	headers?: Record<string, ReferenceObject | HeaderObject>
	style?: StyleType
	explode?: boolean
	allowReserved?: boolean
}
