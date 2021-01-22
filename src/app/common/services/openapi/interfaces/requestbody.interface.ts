import { MediaTypeObject } from './mediatype.interface'

export interface RequestBodyObject {
	description?: string
	content: Record<string, MediaTypeObject>
	required?: boolean
}
