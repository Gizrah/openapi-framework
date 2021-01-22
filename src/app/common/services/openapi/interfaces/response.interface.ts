import { HeaderObject } from './header.interface'
import { LinkObject } from './link.interface'
import { MediaTypeObject } from './mediatype.interface'
import { ReferenceObject } from './reference.interface'

export interface ResponseObject {
	description: string
	headers?: Record<string, HeaderObject | ReferenceObject>
	content?: Record<string, MediaTypeObject>
	links?: Record<string, LinkObject | ReferenceObject>
}
