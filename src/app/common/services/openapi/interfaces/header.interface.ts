import { ExternalDocumentObject } from './externaldocument.interface'

export interface HeaderObject {
	name: string
	description?: string
	externalDocs?: ExternalDocumentObject
}
