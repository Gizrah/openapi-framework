import { ReferenceObject } from './reference.interface'
import { ResponseObject } from './response.interface'

export type ResponsesObject = Record<string, ResponseObject | ReferenceObject>
